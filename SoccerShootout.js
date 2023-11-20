import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

export class SoccerShootout extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            grass: new defs.Cube(),
            ball: new defs.Subdivision_Sphere(4),
        };

        // *** Materials
        this.materials = {
            grass_mat: new Material(new defs.Phong_Shader(),
                {ambient: 0.4, diffusivity: 0.8, specularity: 0, color: hex_color("#7CFC00")}),
            ball_mat: new Material(new defs.Phong_Shader(),
                {ambient: 0.6, diffusivity: 0.6, specularity: 0, color: hex_color("#FFFFFF")}),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Soccer", ["ArrowLeft"], () => this.attached = () => null);
        this.new_line();
        this.key_triggered_button("Shootout", ["ArrowRight"], () => this.attached = () => null);
        this.new_line();
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

        this.shapes.ball.draw(context, program_state, Mat4.identity(), this.materials.ball_mat)
        this.shapes.grass.draw(context, program_state, grass_tr, this.materials.grass_mat)

    }
}