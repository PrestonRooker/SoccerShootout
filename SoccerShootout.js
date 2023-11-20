import {defs, tiny} from './examples/common.js';
import Ball from './Ball.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

const Arrow = defs.Arrow =
    class Arrow extends Shape {
        // Combine a cone and cylinder to make an arrow
        constructor() {
            super("position", "normal", "texture_coord");
            // can use .insert_transformed_copy_into to add smaller obj to overall shape
            defs.Closed_Cone.insert_transformed_copy_into(this,[10,30],
                Mat4.translation(0,0,2.5).times(Mat4.scale(0.8,0.8,0.8)))
            defs.Capped_Cylinder.insert_transformed_copy_into(this,[30,30],
                Mat4.translation(0,0,0.5).times(Mat4.scale(0.4,0.4,2.5)))
        }
    }

export class SoccerShootout extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        this.arrow_ang_x = 0
        this.arrow_ang_y = 0
        // this.i = vec4(0,0,1,0)        

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            grass: new defs.Cube(),
            ball: new defs.Subdivision_Sphere(4),
            arrow: new defs.Arrow(),
        };

        this.ball = new Ball(vec4(0, 30, 0, 1), 1);

        // *** Materials
        this.materials = {
            grass_mat: new Material(new defs.Phong_Shader(),
                {ambient: 0.4, diffusivity: 0.8, specularity: 0, color: hex_color("#7CFC00")}),
            ball_mat: new Material(new defs.Phong_Shader(),
                {ambient: 0.6, diffusivity: 0.6, specularity: 0, color: hex_color("#FFFFFF")}),
            arrow_mat: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.5, specularity: 0, color: hex_color("#FF0000")}),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 5, 50), vec3(0, 0, 0), vec3(0, 1, 0));
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Aim Left", ["ArrowLeft"], () => this.arrow_ang_x = Math.min(this.arrow_ang_x + Math.PI/48,Math.PI/2));
        this.key_triggered_button("Aim Right", ["ArrowRight"], () => this.arrow_ang_x = Math.max(this.arrow_ang_x - Math.PI/48,-Math.PI/2));
        this.new_line();
        this.key_triggered_button("Aim Up", ["ArrowUp"], () => this.arrow_ang_y = Math.min(this.arrow_ang_y + Math.PI/48,Math.PI/2));
        this.key_triggered_button("Aim Down", ["ArrowDown"], () => this.arrow_ang_y = Math.max(this.arrow_ang_y - Math.PI/48,0));
        this.new_line();
        this.key_triggered_button("Kick right", ["B"], () => {
            this.ball.velocity[0] += 10;
        });
        this.key_triggered_button("Kick right", ["N"], () => {
            this.ball.velocity[0] += 10;
        });
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            
            program_state.set_camera(this.initial_camera_location);
        }
        
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);
        
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        
        const light_position = vec4(0, 100, 0, 1);
        program_state.lights = [new Light(light_position, hex_color("#ffffff"), 10000)];

        let S1 = Mat4.scale(50,0.4,50)
        let T1 = Mat4.translation(0,-1.4,0)
        let grass_tr = T1.times(S1.times(Mat4.identity()))
        
        this.ball.update(dt);
        console.log(...this.ball.velocity);

        let arrow_tr = Mat4.rotation(Math.PI,1,0,0).times(Mat4.identity())
        arrow_tr = Mat4.translation(0,0,-5).times(arrow_tr)
        arrow_tr = Mat4.rotation(this.arrow_ang_x,0,1,0).times(arrow_tr)
        arrow_tr = Mat4.rotation(this.arrow_ang_y,1,0,0).times(arrow_tr)

        this.shapes.arrow.draw(context, program_state, arrow_tr, this.materials.arrow_mat)
        this.shapes.ball.draw(context, program_state, this.ball.transform, this.materials.ball_mat)
        this.shapes.grass.draw(context, program_state, grass_tr, this.materials.grass_mat)

    }
}