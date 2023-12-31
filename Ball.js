import { tiny } from "./tiny-graphics.js";

const { Vector3, vec3, Vector4, vec4, Mat4 } = tiny;

const gravity = 20;

export default class Ball {
    constructor(initialPosition) {
        this.goal_sound = new Audio('assets/goal.mp3')
        this.collision_sound = new Audio('assets/collision.wav')
        this.collision_sound.volume = 0.6;
        this.reset(initialPosition);
    }

    reset(initialPosition){
        this.position = initialPosition;
        this.velocity = vec4(0, 0, 0, 0);
        this.radius = 1;
        this.goal = false;
        this.roll_tr = Mat4.identity()
        this.roll_ang_x = 0
        this.roll_ang_z = 0
        this.roll_sp = 0
    }

    roll(dt){
        this.roll_ang_x = this.velocity[0]
        this.roll_ang_z = this.velocity[2]
        this.roll_sp += Math.sqrt(this.roll_ang_x**2 + this.roll_ang_z**2) * dt * 0.3
        if(this.roll_ang_x != 0 || this.roll_ang_z != 0){
            this.roll_tr = Mat4.rotation(this.roll_sp,this.roll_ang_z,0,-this.roll_ang_x)
        }
    }

    update(dt, obstacle_transforms, restitution_coefs) {

        this.velocity = this.velocity.plus(vec4(0, -gravity, 0, 0).times(dt));
        this.position = this.position.plus(this.velocity.times(dt));

        if (this.position[1] < 0)
        {
            // Friction
            if (this.velocity[0] ** 2 > 0 || this.velocity[2] ** 2 > 0) {
                const friction_coefficient = 30;
                const xzMagnitude = Math.sqrt(this.velocity[0] ** 2 + this.velocity[2] ** 2);
                const friction = vec4(-this.velocity[0] / xzMagnitude, 0, -this.velocity[2] / xzMagnitude, 0)
                    .times(Math.min(friction_coefficient * dt, xzMagnitude));
                this.velocity = this.velocity.plus(friction);
            }

            // Bounce
            this.position[1] = 0;
            this.velocity[1] = this.velocity[1] * -0.5;
        }

        if (this.position[0] > -8 && this.position[0] < 8 && this.position[2] < -40 && this.position[2] > -45 && this.position[1] < 6){
            this.goal = true
        }

        if (this.goal) {
            console.log("GOOOOOAAAAALLLLL")
            if(!this.playing_goal_sound){
                this.goal_sound.play()
                this.playing_goal_sound = true
            }
            // console.log(this.position)
        }
        else{
            this.playing_goal_sound = false
        }

        let collided_face = {};
        for (const [obs, restitution] of zip(obstacle_transforms, restitution_coefs)) {
            const collision = this.getCollision(obs);
            if (collision == null)
                continue;

            this.collision_sound.play()

            collided_face = collision.face;
            
            // console.log(collision.direction, collision.distance, collision.face.i);
            this.position = this.position.plus(collision.direction.times(collision.distance));

            // Reflect velocity across the vector (coeff of restitution = 0.8)
            const velocityProjected = collision.direction.times(collision.direction.dot(this.velocity) / collision.direction.dot(collision.direction));
            this.velocity = this.velocity.minus(velocityProjected.times(1 + restitution));
        }

        this.roll(dt)

        return {
            debug: {
                wireframe_index: collided_face.i,
                transform: collided_face.tr
            }
        };
    }

    // Assume obstacle is an arbitrarily-transformed 2x2x2 cube
    getCollision(obstacle_transform) {
        const points = [
            vec4(-1, -1, -1, 1),
            vec4(-1, -1, 1, 1),
            vec4(-1, 1, -1, 1),
            vec4(-1, 1, 1, 1),
            vec4(1, -1, -1, 1),
            vec4(1, -1, 1, 1),
            vec4(1, 1, -1, 1),
            vec4(1, 1, 1, 1),
        ];

        const transformedPoints = points.map(point => obstacle_transform.times(point));
        const obstacleBoundingBox = points.reduce(([lln, urf], pt) => {
            const transformed = obstacle_transform.times(pt);
            lln[0] = Math.min(transformed[0], lln[0]);
            lln[1] = Math.min(transformed[1], lln[1]);
            lln[2] = Math.min(transformed[2], lln[2]);
            urf[0] = Math.max(transformed[0], urf[0]);
            urf[1] = Math.max(transformed[1], urf[1]);
            urf[2] = Math.max(transformed[2], urf[2]);
            return [lln, urf];
        },
        [obstacle_transform.times(points[0]), obstacle_transform.times(points[0])]);

        const sphereBoundingBox = [this.position.minus(vec4(1, 1, 1, 0)), this.position.plus(vec4(1, 1, 1, 0))];
        if (!doAxisAlignedBoundingBoxesCollide(sphereBoundingBox, obstacleBoundingBox))
            return null;

        const faces = [
            [0, 1, 3, 2],
            [0, 4, 5, 1],
            [0, 2, 6, 4],
            [7, 5, 4, 6],
            [7, 3, 1, 5],
            [7, 6, 2, 3],
        ];

        let i = 0;
        let minimum = null;
        for (const face of faces) {
            const p = face.map(i => transformedPoints[i]);
            const v1 = p[1].minus(p[0]);
            const v2 = p[2].minus(p[1]);
            let normal = v1.to3().cross(v2.to3());
            normal = normal.times(1 / Math.sqrt(normal.dot(normal)));
            const distance = normal.dot(p[0]);

            const planeToCenter = this.position.minus(p[0]);
            const closestPointOnPlane = this.position.minus(vec4(...(normal.times(normal.dot(planeToCenter) / normal.dot(normal))), 0));

            // Realign face with the xy-plane, constrain it to the parallelogram, then rotate it back.a
            const phi = Math.atan2(normal[1], normal[0] ** 2 + normal[2] ** 2);
            const theta = Math.atan2(normal[0], normal[2]);
            const m = Mat4.rotation(phi, 1, 0, 0).times(Mat4.rotation(- theta, 0, 1, 0));            

            const alignedP = p.map(pt => m.times(pt));

            let al = m.times(closestPointOnPlane);
            const savedAl = al;
            for (const [a, b] of [[alignedP[0], alignedP[1]], [alignedP[1], alignedP[2]], [alignedP[2], alignedP[3]], [alignedP[3], alignedP[0]]]) {
                const dist = (al[0] - a[0]) * (b[1] - a[1]) - (b[0] - a[0]) * (al[1] - a[1]);
                if (dist > 0) {
                    const projected = projectPointOntoLine(al, a, b);
                    al = vec4(projected[0], projected[1], al[2], al[3]);
                }
            }
            const closestPointOnFace = Mat4.inverse(m).times(al);

            const faceToCenter = this.position.minus(closestPointOnFace);
            
            if (faceToCenter.dot(faceToCenter) < this.radius ** 2 &&
                faceToCenter.to3().dot(normal) > 0) // To prevent weird sucky behaviors on the corners of objects
            {
                const magnitude = Math.sqrt(faceToCenter.dot(faceToCenter));
                const distance = this.radius - magnitude;
                if (minimum == null || minimum.distance > distance)
                minimum = {
                    direction: faceToCenter.times(1 / magnitude),
                    distance,
                    face: {
                        i,
                        tr: obstacle_transform
                    }
                }
            }
            i++;
        }
        return minimum;
    }

    get transform() {
        return Mat4.translation(...this.position).times(this.roll_tr);
    }
}

function zip(a, b) {
    return a.map(function(el, i) {
        return [el, b[i]];
    });
}

// A bounding box should be an array of two points
function doAxisAlignedBoundingBoxesCollide(bb1, bb2) {
    // Simply check if x, y, and z ranges overlap
    return !(bb1[1][0] < bb2[0][0] || bb1[0][0] > bb2[1][0]) &&
        !(bb1[1][1] < bb2[0][1] || bb1[0][1] > bb2[1][1]) &&
        !(bb1[1][2] < bb2[0][2] || bb1[0][2] > bb2[1][2]);
}

function projectPointOntoLine(point, a, b) {
    const ab = b.minus(a);
    const ap = point.minus(a);
    const projectedVector = ab.times(ap.dot(ab) / ab.dot(ab));
    return a.plus(projectedVector);
}
