import {defs, tiny} from './examples/common.js';
import Ball from './Ball.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny;


const SoccerGoal = defs.SoccerGoal =
    class SoccerGoal extends Shape {
        constructor(net_material, post_material) {
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

            // // Diagonal Triangle Support (example with a simple diagonal bar)
            // const diagonal_length = 4; // Adjust as needed
            // const diagonal_transform = Mat4.scale(post_radius, post_radius, diagonal_length).times(Mat4.rotation(-Math.PI / 4, Vector.of(0, 1, 0)));
            // defs.Capped_Cylinder.insert_transformed_copy_into(this, [30, 30], diagonal_transform, Mat4.translation(0, 0, post_height / 2));
        }

    }


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

class Wireframe extends Shape {
    constructor(...args) {
        super("position", "color");
        this.arrays.position = Vector3.cast(
            ...(args.reduce((acc, v, i) => { acc.push(v, args[(i + 1) % args.length]); return acc; }, []))
        );
        this.arrays.color = Array(this.arrays.position.length).fill([1,1,1,1]);
        this.indices = false;
    }
}

export class SoccerShootout extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        this.arrow_ang_x = 0
        this.arrow_ang_y = 0
        this.already_kicked = false
        // this.i = vec4(0,0,1,0)

        // For collision debugging
        this.wireframes = [
            new Wireframe([-1, -1, -1], [-1, 1, -1], [-1, 1, 1], [-1, -1, 1]),
            new Wireframe([-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [1, -1, -1]),
            new Wireframe([-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1]),
            new Wireframe([1, 1, 1], [1, 1, -1], [1, -1, -1], [1, -1, 1]),
            new Wireframe([1, 1, 1], [1, -1, 1], [-1, -1, 1], [-1, 1, 1]),
            new Wireframe([1, 1, 1], [-1, 1, 1], [-1, 1, -1], [1, 1, -1]),
        ];

        this.ball = new Ball(vec4(0, 30, 0, 1), 1);

        // *** Materials
        this.materials = {
            grass_mat: new Material(new defs.Phong_Shader(),
                {ambient: 0.4, diffusivity: 0.8, specularity: 0, color: hex_color("#7CFC00")}),
            grass_texture: new Material(new defs.Textured_Phong(),
                {ambient: 1, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/grass.jpg", "NEAREST")}),
            ball_mat: new Material(new defs.Phong_Shader(),
                {ambient: 0.6, diffusivity: 0.6, specularity: 0, color: hex_color("#FFFFFF")}),
            ball_texture: new Material(new defs.Textured_Phong(),
                {ambient: 1, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/soccerball.png", "NEAREST")}),
            goalie_mat: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.5, specularity: 0, color: hex_color("FCFCFC")}),
            arrow_mat: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.5, specularity: 0, color: hex_color("#FF0000")}),
            net_texture: new Material(new defs.Textured_Phong(),
                {ambient: 1, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/net.png", "NEAREST")}),
            post_color: new Material(new defs.Phong_Shader(),
            {ambient: 0.6, diffusivity: 0.6, specularity: 0, color: hex_color("#FFFFFF")}),
            transparent: new Material(new defs.Phong_Shader(),
            {ambient: 0.6, diffusivity: 0.6, specularity: 0, color: hex_color("#FFFFFF"), }),
            power_mat: new Material(new defs.Phong_Shader(),
            {ambient: 0.6, diffusivity: 0.6, specularity: 0, color: hex_color("#FFFFFF")}),
            obstacle: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.5, specularity: 0, color: hex_color("#0000FF")}),
            wireframe: new Material(new defs.Basic_Shader()),
            dome_mat : new Material(new defs.Textured_Phong(),
                {ambient: 1, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/sky12.jpg", "NEAREST")}),
        }       

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            grass: new defs.Cube(),
            ball: new defs.Subdivision_Sphere(4),
            arrow: new defs.Arrow(),
            cylinder: new defs.Capped_Cylinder(30, 30),
            goal: new defs.SoccerGoal(),
            net: new defs.OpenCube(),
            rectangle: new defs.Square(),
            power: new defs.Subdivision_Sphere(4),
            obstacle: new defs.Cube(),
            goalie: new defs.Goalie(),
        };

        this.ball = new Ball(vec4(0, 30, 0, 1), 1);
        this.power = 0;


        this.initial_camera_location = Mat4.look_at(vec3(0, 15, 40), vec3(0, 0, 0), vec3(0, 1, 0));
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Aim Left", ["ArrowLeft"], () => this.arrow_ang_x = Math.min(this.arrow_ang_x + Math.PI/48,Math.PI/2));
        this.key_triggered_button("Aim Right", ["ArrowRight"], () => this.arrow_ang_x = Math.max(this.arrow_ang_x - Math.PI/48,-Math.PI/2));
        this.new_line();
        this.key_triggered_button("Aim Up", ["ArrowUp"], () => this.arrow_ang_y = Math.min(this.arrow_ang_y + Math.PI/48,Math.PI/2));
        this.key_triggered_button("Aim Down", ["ArrowDown"], () => this.arrow_ang_y = Math.max(this.arrow_ang_y - Math.PI/48,0));
        this.new_line();
        this.key_triggered_button("Kick left", ["j"], () => {
            this.ball.velocity[0] -= 50;
        });
        this.key_triggered_button("Kick right", ["l"], () => {
            this.ball.velocity[0] += 50;
        });
        this.key_triggered_button("Kick forward", ["i"], () => {
            this.ball.velocity[2] -= 50;
        });
        this.key_triggered_button("Kick back", ["k"], () => {
            this.ball.velocity[2] += 50;
        });
        this.key_triggered_button("Kick", ["m"], () => {
            if(!this.already_kicked){
                let dir_vec = this.arrow_tr.times(vec4(0,0,1,0)).times(50*this.power);
                this.ball.velocity[0] += dir_vec[0];
                this.ball.velocity[1] += dir_vec[1];
                this.ball.velocity[2] += dir_vec[2];
                this.already_kicked = true
            }
        });
        this.new_line();
        this.key_triggered_button("Reset ball", ["r"], () => {
            this.ball.reset(vec4(0, 30, 0, 1))
            this.already_kicked = false
        })
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
        
        let r = Math.sin((Math.PI/2)*t) + 1;
        this.power = r; 

        const light_position = vec4(0, 100, 0, 1);
        program_state.lights = [new Light(light_position, hex_color("#fdfbd3"), 10000)];

        let S1 = Mat4.scale(50,0.4,50)
        let T1 = Mat4.translation(0,-1.4,0)
        let grass_tr = T1.times(S1.times(Mat4.identity()))
        
        const obstacle_transform = Mat4.translation(15, 0, 0)
            .times(Mat4.scale(10, 1, 1));
        const obstacle_transform2 = Mat4.translation(-2, 0, 0)
            .times(Mat4.rotation(Math.PI / 4, 0, 1, 0));

        const { i, tr } = this.ball.update(dt, []);
        if (i != null) {
            this.wireframes[i].draw(context, program_state, tr, this.materials.wireframe, "LINES");
        }

        let arrow_tr = Mat4.rotation(Math.PI,1,0,0).times(Mat4.identity())
        arrow_tr = Mat4.translation(0,0,-5).times(arrow_tr)
        arrow_tr = Mat4.rotation(this.arrow_ang_y,1,0,0).times(arrow_tr)
        arrow_tr = Mat4.rotation(this.arrow_ang_x,0,1,0).times(arrow_tr)
        this.arrow_tr = arrow_tr
        // console.log(this.arrow_ang_x)

        // this.shapes.obstacle.draw(context, program_state, obstacle_transform, this.materials.obstacle);
        // this.shapes.obstacle.draw(context, program_state, obstacle_transform2, this.materials.obstacle);

        let power_tr = Mat4.scale(r, r, r).times(Mat4.identity());
        power_tr = Mat4.translation(20, 10, -45).times(power_tr);
        const r_n = r/2; 
        const red = r_n;
        const green = 1-r_n; 
        const blue = 0;
        let power_color = color(red, blue, green, 1);

        this.shapes.arrow.draw(context, program_state, arrow_tr, this.materials.arrow_mat)

        this.shapes.ball.draw(context, program_state, this.ball.transform, this.materials.ball_texture)
        this.shapes.grass.draw(context, program_state, grass_tr, this.materials.grass_texture)
        this.shapes.power.draw(context, program_state, power_tr, this.materials.power_mat.override(power_color))
        
        // Transform Goal:
        const upright_tilt = Mat4.rotation(Math.PI / 2,1,0,0)
        let goal_translation = Mat4.translation(0,20,-40).times(upright_tilt)
        let goal_tr = goal_translation.times(Mat4.identity())
        
        const panel_width = 80 / 5; // Same as the crossbar length
        const panel_height = 6; // Same as the post height

        // Create and position the back panel
        const panel_scale = Mat4.scale(panel_width / 2, 5, panel_height / 2);
        const panel_translation = Mat4.translation(0, 0, -14.3).times(upright_tilt); // Slightly behind the goal
        let net_tr = panel_scale.times(panel_translation).times(Mat4.identity())

        // Use a Square or Rectangle shape for the panel
        this.shapes.net.draw(context, program_state, net_tr, this.materials.net_texture)
        this.shapes.goal.draw(context, program_state, goal_tr, this.materials.post_color)

        //Draw Goalie
        let goalie_tr = Mat4.translation(0, -3.5, -38).times(Mat4.rotation(-Math.PI / 2, 1, 0, 0));
        this.goalie_tr = goalie_tr;
        this.shapes.goalie.draw(context, program_state, goalie_tr, this.materials.goalie_mat);

        
        // let threshold_translation = Mat4.translation(0, 0, -40).times(panel_scale.times(Mat4.identity()))
        // this.shapes.rectangle.draw(context, program_state, threshold_translation, this.materials.post_color)

        // Draw a blue dome around the field
        let bt = Mat4.scale(100,100,100).times(Mat4.identity())
        this.shapes.ball.draw(context,program_state,bt,this.materials.dome_mat)
    }

    rotation_angle (t, a, b, w) {
        return a + b * Math.sin(w * t)
    }
}