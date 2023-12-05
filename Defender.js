import {defs, tiny} from './examples/common.js';

const { Vector3, vec3, Vector4, vec4, Mat4, Shape, Material, hex_color } = tiny;

const gravity = 20;

const Goalie = defs.Goalie =
    class Goalie extends Shape{
        constructor(){
            super("position","normal","texture_coord");
            // defs.Closed_Cone.insert_transformed_copy_into(this,[10,30],
            //     Mat4.translation(0,0,7).times(Mat4.scale(0.8,0.8,0.8)))
            defs.Capped_Cylinder.insert_transformed_copy_into(this,[30,30],
                Mat4.translation(0,0,4).times(Mat4.scale(0.75,0.75,3)))
            // Sphere on top of the Cylinder
            const sphere_scale = Mat4.scale(1, 1, 1); // Adjust the scale as needed
            const sphere_translation = Mat4.translation(0, 0, 6.6); // Adjust the position above the cylinder
            defs.Subdivision_Sphere.insert_transformed_copy_into(this, [4], sphere_translation.times(sphere_scale));
            // Sphere on the left side of the Cylinder
            const left_sphere_scale = Mat4.scale(0.5, 0.5, 0.5); // Adjust the scale as needed
            const left_sphere_translation = Mat4.translation(-1.5, 0, 4); // Adjust the position
            defs.Subdivision_Sphere.insert_transformed_copy_into(this, [4], left_sphere_translation.times(left_sphere_scale));
            // Sphere on the right side of the Cylinder
            const right_sphere_scale = Mat4.scale(0.5, 0.5, 0.5); // Adjust the scale as needed
            const right_sphere_translation = Mat4.translation(1.5, 0, 4); // Adjust the position
            defs.Subdivision_Sphere.insert_transformed_copy_into(this, [4], right_sphere_translation.times(right_sphere_scale));
        }
    }

export default class Defender {

    constructor(x_range, y_range, speed = 1.0, range = 0.25){
        this.x_range = x_range
        this.y_range = y_range
        this.defender_tr = Mat4.identity
        this.x_pos = this.getRandomInt(this.x_range[0], this.x_range[1])
        this.y_pos = this.getRandomInt(this.y_range[0], this.y_range[1])
        this.move_right = true
        this.movement_change = 0
        this.speed = speed
        this.range = range
        this.materials = {             
            goalie_mat: new Material(new defs.Phong_Shader(),
            {ambient: 0.5, diffusivity: 0.5, specularity: 0, color: hex_color("FCFCFC")})
        }

        this.shapes = {
            goalie: new defs.Goalie(),
        }
    }

    draw(context, program_state) {
        this.defender_tr = Mat4.translation(this.x_pos, -3.5, this.y_pos).times(Mat4.rotation(-Math.PI / 2, 1, 0, 0))
        this.shapes.goalie.draw(context, program_state, this.defender_tr, this.materials.goalie_mat);
        this.defender_tr = Mat4.translation(0,3.5,0).times(this.defender_tr).times(Mat4.scale(1,1,4))
    }


    move(dt) {
        if (this.move_right){
            this.movement_change += this.speed * dt 
        }
        else {
            this.movement_change -= this.speed * dt
        }

        if (this.movement_change > this.range){
            this.move_right = false
        }
        if (this.movement_change < -this.range){
            this.move_right = true
        }

        console.log(this.movement_change)
        console.log(this.move_right)

        // console.log(this.defender_pos[3])

        this.x_pos += this.movement_change
    }

    reset_pos() {
        this.x_pos = this.getRandomInt(this.x_range[0], this.x_range[1])
        this.y_pos = this.getRandomInt(this.y_range[0], this.y_range[1])
        this.move_right = true
        this.movement_change = 0
    }

    get_tr() {
        return this.defender_tr
    }

    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
    }

}
