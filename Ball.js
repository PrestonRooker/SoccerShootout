import { tiny } from "./tiny-graphics.js";

const { Vector3, vec3, Vector4, vec4, Mat4 } = tiny;

const gravity = 20;

export default class Ball {
    constructor(initialPosition) {
        this.position = initialPosition;
        this.velocity = vec4(0, 0, 0, 0);
        this.radius = 1;
    }

    update(dt) {
        // Cap dt to prevent explosions
        if (dt > 0.05)
            dt = 0.05;
        
        if (this.position[1] < 0)
        {
            // Friction
            if (this.velocity[0] > 0)
                this.velocity[0] -= Math.min(2 * dt, this.velocity[0]);
            if (this.velocity[0] < 0)
                this.velocity[0] += Math.min(2 * dt, -this.velocity[0]);
            if (this.velocity[2] > 0)
                this.velocity[2] -= Math.min(2 * dt, this.velocity[2]);
            if (this.velocity[2] < 0)
                this.velocity[2] += Math.min(2 * dt, -this.velocity[2]);

            // Bounce
            this.position[1] = 0;
            this.velocity[1] = this.velocity[1] * -0.5;
        }

        this.velocity = this.velocity.plus(vec4(0, -gravity, 0, 0).times(dt));
        this.position = this.position.plus(this.velocity.times(dt));
    }

    get transform() {
        return Mat4.translation(...this.position);
    }
}
