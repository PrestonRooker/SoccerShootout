import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

const SoccerGoal = defs.SoccerGoal =
    class SoccerGoal extends Shape {
        constructor() {
            super("position", "normal", "texture_coord");


            // Dimensions for the soccer goal
            const post_height = 6; // Adjust as needed
            const post_radius = 0.2; // Adjust as needed
            const crossbar_length = 80; // Distance between two posts
            
            const post_scale = Mat4.scale(post_radius, post_radius, post_height);
            
            const sideways_rotate = Mat4.rotation(Math.PI / 2,0,1,0)

            defs.Capped_Cylinder.insert_transformed_copy_into(this, [30, 30], post_scale.times(Mat4.translation(-crossbar_length / 2, 0, post_height / 2)));
            defs.Capped_Cylinder.insert_transformed_copy_into(this, [30, 30], post_scale.times(Mat4.translation(crossbar_length / 2, 0, post_height / 2)));

            // // Crossbar
            const crossbar_scale = Mat4.scale(post_radius, post_radius, crossbar_length / 5);
            const crossbar_translation = Mat4.translation(0, 0, 15)

            defs.Capped_Cylinder.insert_transformed_copy_into(this, [30, 30], crossbar_translation.times(sideways_rotate.times(crossbar_scale)));

            const panel_width = crossbar_length / 5; // Same as the crossbar length
            const panel_height = post_height; // Same as the post height

            // Create and position the back panel
            const panel_scale = Mat4.scale(panel_width / 2, 5, panel_height / 2);
            const panel_translation = Mat4.translation(0, -5, 18); // Slightly behind the goal

            // Use a Square or Rectangle shape for the panel
            defs.OpenCube.insert_transformed_copy_into(this, [], panel_translation.times(panel_scale));

            // // Diagonal Triangle Support (example with a simple diagonal bar)
            // const diagonal_length = 4; // Adjust as needed
            // const diagonal_transform = Mat4.scale(post_radius, post_radius, diagonal_length).times(Mat4.rotation(-Math.PI / 4, Vector.of(0, 1, 0)));
            // defs.Capped_Cylinder.insert_transformed_copy_into(this, [30, 30], diagonal_transform, Mat4.translation(0, 0, post_height / 2));
        }
    }


export class SoccerShootout extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            grass: new defs.Cube(),
            ball: new defs.Subdivision_Sphere(4),
            aim_arrow: new defs.Arrow(),
            cylinder: new defs.Capped_Cylinder(30, 30),
            goal: new defs.SoccerGoal()
        };

        // *** Materials
        this.materials = {
            grass_mat: new Material(new defs.Phong_Shader(),
                {ambient: 0.4, diffusivity: 0.8, specularity: 0, color: hex_color("#7CFC00")}),
            ball_mat: new Material(new defs.Phong_Shader(),
                {ambient: 0.6, diffusivity: 0.6, specularity: 0, color: hex_color("#FFFFFF")}),
            arrow_mat: new Material(new defs.Phong_Shader(),
                {ambient: 0.6, diffusivity: 0.6, specularity: 0, color: hex_color("#FF5349")}),
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

        const upright_tilt = Mat4.rotation(Math.PI / 2,1,0,0)
        let goal_translation = Mat4.translation(0,20,-40).times(upright_tilt)
        let goal_tr = goal_translation.times(Mat4.identity())

        let a = -2.5
        let b = 1
        let w = 1

        // let left_post_translation =  Mat4.translation(0,0,-5);
        // let left_post_scale = Mat4.scale(0.5,0.5,10)
        // let left_post_rotation = Mat4.rotation(this.rotation_angle(t, a, b, w), 0, 0, 1)
        // // let arrow_rotate = Mat4.rotation(this.rotation_angle(t, a, b, w), 0, 0, 1)
        // let left_post_tr = left_post_scale.times(left_post_translation.times(left_post_rotation.times(Mat4.identity())))
    
        this.shapes.ball.draw(context, program_state, Mat4.identity(), this.materials.ball_mat)
        this.shapes.grass.draw(context, program_state, grass_tr, this.materials.grass_mat)
        // this.shapes.aim_arrow.draw(context, program_state, arrow_tr, this.materials.arrow_mat)
        // this.shapes.cylinder.draw(context, program_state, left_post_tr, this.materials.arrow_mat)


        this.shapes.goal.draw(context, program_state, goal_tr, this.materials.ball_mat)

    }

    rotation_angle (t, a, b, w) {
        return a + b * Math.sin(w * t)
    }
}