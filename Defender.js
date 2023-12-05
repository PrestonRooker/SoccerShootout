import {defs, tiny} from './examples/common.js';

const { Vector3, vec3, Vector4, vec4, Mat4, Shape, Material, hex_color, Texture } = tiny;

const gravity = 20;

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
            {ambient: 0.5, diffusivity: 0.5, specularity: 0, color: hex_color("FCFCFC")}),
            ball_mat: new Material(new defs.Phong_Shader(),
                {ambient: 0.7, diffusivity: 0.6, specularity: 0, color: hex_color("#FFFFFF")}),
            face_texture: new Material(new defs.Textured_Phong(),
                {color: hex_color("#000000"), ambient: 0.9, diffusivity: 0.6, specularity: 0.1,
                texture: new Texture("assets/angry2.png", "NEAREST")}),
        }

        this.shapes = {
            ball: new defs.Subdivision_Sphere(4),
            cylinder: new defs.Capped_Cylinder(30, 30),
        }
    }

    draw(context, program_state) {
        this.defender_tr = Mat4.translation(this.x_pos, -3.5, this.y_pos).times(Mat4.rotation(-Math.PI / 2, 1, 0, 0))
        let d_head = this.defender_tr.times(Mat4.translation(0, 0, 6.6).times(Mat4.rotation(Math.PI / 2, 1, 0, 0).times(Mat4.rotation(-Math.PI / 2, 0, 1, 0).times(Mat4.scale(1, 1, 1)).times(Mat4.identity()))));
        let d_body = this.defender_tr.times(Mat4.translation(0,0,4).times(Mat4.scale(0.75,0.75,3)).times(Mat4.identity()));
        let d_left_hand = this.defender_tr.times(Mat4.translation(-1.5,0,4).times(Mat4.scale(0.5,0.5,0.5)).times(Mat4.identity()));
        let d_right_hand = this.defender_tr.times(Mat4.translation(1.5,0,4).times(Mat4.scale(0.5,0.5,0.5)).times(Mat4.identity()));

        //draw defender 
        this.shapes.ball.draw(context, program_state, d_head, this.materials.face_texture);
        this.shapes.ball.draw(context, program_state, d_left_hand, this.materials.ball_mat.override(hex_color("#f1c27d")));
        this.shapes.ball.draw(context, program_state, d_right_hand, this.materials.ball_mat.override(hex_color("#f1c27d")));
        this.shapes.cylinder.draw(context, program_state, d_body, this.materials.ball_mat.override(hex_color("#00ffff")));
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

        // console.log(this.movement_change)
        // console.log(this.move_right)

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
