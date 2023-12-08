import {defs, tiny} from './examples/common.js';
import Ball from './Ball.js';
import * as texteditor from './text-manager.js';
import { Defender, Ball_Chaser, Speed_Bump } from './Defender.js'

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny;

const ball_initial_position = vec4(0,15,0,1)
const domeRadius = 300;

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

        this.background_music = new Audio('assets/backgroundmusic(chosic.com).mp3');
        this.background_music.volume = 0.4;
        this.background_music.loop = true;
        this.has_music_started_playing = false;
        this.mute = false;

        this.dimensions = [0, 0];
        this.arrow_ang_x = 0
        this.arrow_ang_y = 0
        this.x_range = [-7, 7]
        this.y_range = [-10, -38]
        this.goalie_pos = [0, -3.5, -38]
        this.level = 0
        this.lost = false;
        this.misses = 0;
        this.level_obstaces = [{"goalies": 0, "defenders": 0, "ball_chasers": 0, "speed_bumps": 0}, {"goalies": 0, "defenders": 0, "ball_chasers": 0, "speed_bumps": 1}, {"goalies": 1, "defenders": 0, "ball_chasers": 1}, {"goalies": 1, "defenders": 1, "ball_chasers": 0}, {"goalies": 1, "defenders": 1, "ball_chasers": 1}, {"goalies": 1, "defenders": 2, "ball_chasers": 1}, {"goalies": 1, "defenders": 2, "ball_chasers": 2}]
        this.defenders = []
        this.ball_chasers = []
        this.speed_bumps = []
        this.title = true;
        // For collision debugging
        this.wireframes = [
            new Wireframe([-1, -1, -1], [-1, 1, -1], [-1, 1, 1], [-1, -1, 1]),
            new Wireframe([-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [1, -1, -1]),
            new Wireframe([-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1]),
            new Wireframe([1, 1, 1], [1, 1, -1], [1, -1, -1], [1, -1, 1]),
            new Wireframe([1, 1, 1], [1, -1, 1], [-1, -1, 1], [-1, 1, 1]),
            new Wireframe([1, 1, 1], [-1, 1, 1], [-1, 1, -1], [1, 1, -1]),
        ];

        // *** Materials
        this.materials = {
            arrow_mat: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.5, specularity: 0, color: hex_color("#FF0000")}),
            ball_mat: new Material(new defs.Phong_Shader(),
                {ambient: 0.7, diffusivity: 0.6, specularity: 0, color: hex_color("#FFFFFF")}),
            ball_texture: new Material(new defs.Textured_Phong(),
                {ambient: 1, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/soccerball.png", "NEAREST")}),
            dome_mat: new Material(new defs.Textured_Phong(),
                {ambient: 1, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/sky12.jpg", "NEAREST")}),
            face_texture: new Material(new defs.Textured_Phong(),
                {color: hex_color("#000000"), ambient: 0.9, diffusivity: 0.6, specularity: 0.1,
                texture: new Texture("assets/angry2.png", "NEAREST")}),
            grass_mat: new Material(new defs.Phong_Shader(),
                {ambient: 0.4, diffusivity: 0.8, specularity: 0, color: hex_color("#7CFC00")}),
            grass_texture: new Material(new defs.Textured_Phong(),
                {ambient: 1, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/grass.jpg", "LINEAR_MIPMAP_LINEAR")}),
            goalie_mat: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.5, specularity: 0, color: hex_color("FCFCFC")}),
            net_texture: new Material(new defs.Textured_Phong(),
                {ambient: 1, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/net.png", "LINEAR_MIPMAP_LINEAR")}),
            obstacle: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.5, specularity: 0, color: hex_color("#0000FF")}),
            post_color: new Material(new defs.Phong_Shader(),
                {ambient: 0.6, diffusivity: 0.6, specularity: 0, color: hex_color("#FFFFFF")}),
            power_mat: new Material(new defs.Phong_Shader(),
                {ambient: 0.6, diffusivity: 0.6, specularity: 0, color: hex_color("#FFFFFF")}),
            speed_bump_mat: new Material(new defs.Phong_Shader(),
                {ambient: 0.5, diffusivity: 0.5, specularity: 0, color: hex_color("FCFCFC")}),
            transparent: new Material(new defs.Phong_Shader(),
                {ambient: 0.6, diffusivity: 0.6, specularity: 0, color: hex_color("#FFFFFF"), }),
            wireframe: new Material(new defs.Basic_Shader()),
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
            obstacle: new defs.Cube(),
            circle: new defs.Regular_2D_Polygon(30,30),
        };

        this.shapes.grass.arrays.texture_coord = this.shapes.grass.arrays.texture_coord.map(x => x.times(25));

        this.power = 0;
        this.ball = new Ball(ball_initial_position)

        this.initial_camera_location = Mat4.look_at(vec3(0, 15, 40), vec3(0, 0, 0), vec3(0, 1, 0));
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Aim Left", ["ArrowLeft"], () => this.arrow_ang_x = Math.min(this.arrow_ang_x + Math.PI/128,Math.PI/2));
        this.key_triggered_button("Aim Right", ["ArrowRight"], () => this.arrow_ang_x = Math.max(this.arrow_ang_x - Math.PI/128,-Math.PI/2));
        // this.new_line();
        this.key_triggered_button("Aim Up", ["ArrowUp"], () => this.arrow_ang_y = Math.min(this.arrow_ang_y + Math.PI/64,Math.PI/2));
        this.key_triggered_button("Aim Down", ["ArrowDown"], () => this.arrow_ang_y = Math.max(this.arrow_ang_y - Math.PI/64,0));
        // this.new_line();
        this.key_triggered_button("Kick", ["Enter"], () => {
            if(this.title){
                this.title = false;
            }
            if(!this.already_kicked){
                let dir_vec = this.arrow_tr.times(vec4(0,0,1,0)).times(50*this.power);
                this.ball.velocity[0] += dir_vec[0];
                this.ball.velocity[1] += dir_vec[1];
                this.ball.velocity[2] += dir_vec[2];
                this.already_kicked = true;
                
            }
            if(!this.has_music_started_playing){
                this.has_music_started_playing = true;
                this.background_music.play();
                this.background_music.autoplay = true;
            }
        });
        // this.new_line();
        // this.key_triggered_button("Reset ball", ["r"], () => {
        //     //this.level = 0
        //     this.reset()
        // })
    }

    reset() {
        this.ball.reset(ball_initial_position)
        this.already_kicked = false
        this.goalie_pos = [0, -3.5, -38]
        this.defenders = []
        this.ball_chasers = []
        this.speed_bumps = []
        for (let index = 0; index < this.level_obstaces[this.level]["defenders"]; index++){
            let defender = new Defender(this.x_range, this.y_range)
            this.defenders.push(defender)
        }
        for (let index = 0; index < this.level_obstaces[this.level]["ball_chasers"]; index++){
            let ball_chaser = new Ball_Chaser(this.x_range, this.y_range)
            this.ball_chasers.push(ball_chaser)
        }
        for (let index = 0; index < this.level_obstaces[this.level]["speed_bumps"]; index++){
            let speed_bump = new Speed_Bump(this.x_range, this.y_range)
            this.speed_bumps.push(speed_bump)
        }
        this.scored_this_possession = null;
        this.missed_this_possession = null; 
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:

    
        if (!context.scratchpad.controls) {
            context.scratchpad.controls = new defs.Movement_Controls();
            // this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            
            program_state.set_camera(this.initial_camera_location);
        }

        const dimensions = [ window.innerWidth, window.innerHeight];
        if (dimensions.some((val, i) => val !== this.dimensions[i])) {
            context.set_size(dimensions);
            this.dimensions = dimensions;
            // console.log(...dimensions);
        }
        
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);
        
        const t = program_state.animation_time / 1000;
        let dt = program_state.animation_delta_time / 1000;
        
        // Cap dt to prevent explosions
        if (dt > 0.05)
            dt = 0.05;

        const light_position = vec4(0, 100, 0, 1);
        program_state.lights = [new Light(light_position, hex_color("#fdfbd3"), 10000)];

        
        texteditor.displayTitleScreen(this.title);
        
        
        //Draw grass floor
        let grass_tr = Mat4.translation(0,-51.4,0).times(Mat4.scale(domeRadius,50,domeRadius).times(Mat4.identity()))
        this.shapes.grass.draw(context, program_state, grass_tr, this.materials.grass_texture)

        //Draw aiming arrow
        let arrow_tr = Mat4.rotation(Math.PI,1,0,0).times(Mat4.identity())
        arrow_tr = Mat4.translation(0,0,-5).times(arrow_tr)
        arrow_tr = Mat4.rotation(this.arrow_ang_y,1,0,0).times(arrow_tr)
        arrow_tr = Mat4.rotation(this.arrow_ang_x,0,1,0).times(arrow_tr)
        this.arrow_tr = arrow_tr
        this.shapes.arrow.draw(context, program_state, arrow_tr, this.materials.arrow_mat)
        
        //set power meter function
        let r = this.power;
        if(!this.already_kicked){
            r = 0.8*Math.sin((Math.PI/2)*t) + 1.2; // goes from 0.4 to 2
        }
        this.power = r;

        //Draw power meter circle
        let power_tr = Mat4.scale(r, r, r).times(Mat4.identity());
        power_tr = Mat4.translation(0, -0.89, 0).times(Mat4.rotation(Math.PI/2,1,0,0)).times(power_tr);
        const r_n = r/2; 
        const red = r_n;
        const green = 1-r_n;
        const blue = 0;
        let power_color = color(red, blue, green, 1);
        this.shapes.circle.draw(context, program_state, power_tr, this.materials.power_mat.override(power_color))
        
                // Draw circle shadow for ball
                const ball_radius = 1/* Set the actual radius of the ball here */;
                const shadow_radius = ball_radius + this.ball.position[1] * 0.06/* Set a scaling factor here */;
                const transparency_factor = .1/* Set a factor for transparency here */;
                let shadow_tr = Mat4.scale(shadow_radius, shadow_radius, shadow_radius).times(Mat4.identity());
                shadow_tr = Mat4.translation(this.ball.position[0], -0.9, this.ball.position[2]).times(Mat4.rotation(Math.PI / 2, 1, 0, 0)).times(shadow_tr);
                const alpha = 1 - transparency_factor * shadow_radius; // Calculate alpha based on the scaling factor
                const shadow_color = color(0, 0, 0, alpha); // Set power circle color to black with adjusted transparency
                if(this.already_kicked){
                    this.shapes.circle.draw(context, program_state, shadow_tr, this.materials.power_mat.override(shadow_color));
                }

        
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

        const backnet_transform = net_tr.times(Mat4.translation(0, -1, 0)).times(Mat4.scale(1, 0.01, 1));
        const leftnet_transform = net_tr.times(Mat4.translation(-1, 0, 0)).times(Mat4.scale(0.01, 1, 1));
        const rightnet_transform = net_tr.times(Mat4.translation(1, 0, 0)).times(Mat4.scale(0.01, 1, 1));
        const topnet_transform = net_tr.times(Mat4.translation(0, 0, -1)).times(Mat4.scale(1, 1, 0.01));

        let goalie_tr = Mat4.identity()

        //Draw Goalie
        if (this.level_obstaces[this.level]["goalies"] == 1){
            goalie_tr = Mat4.translation(this.goalie_pos[0], this.goalie_pos[1], this.goalie_pos[2]).times(Mat4.rotation(-Math.PI / 2, 1, 0, 0));
            this.goalie_tr = goalie_tr;
             //initialize the location of goalie's body
             let head = goalie_tr.times(Mat4.translation(0, 0, 6.6).times(Mat4.rotation(Math.PI / 2, 1, 0, 0).times(Mat4.rotation(-Math.PI / 2, 0, 1, 0).times(Mat4.scale(1, 1, 1)).times(Mat4.identity()))));
            let body = goalie_tr.times(Mat4.translation(0,0,4).times(Mat4.scale(0.75,0.75,3)).times(Mat4.identity()));
            let left_hand = goalie_tr.times(Mat4.translation(-1.5,0,4).times(Mat4.scale(0.5,0.5,0.5)).times(Mat4.identity()));
            let right_hand = goalie_tr.times(Mat4.translation(1.5,0,4).times(Mat4.scale(0.5,0.5,0.5)).times(Mat4.identity()));

            //draw the goalie
            this.shapes.ball.draw(context, program_state, head, this.materials.face_texture);
            this.shapes.ball.draw(context, program_state, left_hand, this.materials.ball_mat.override(hex_color("#f1c27d")));
            this.shapes.ball.draw(context, program_state, right_hand, this.materials.ball_mat.override(hex_color("#f1c27d")));
            this.shapes.cylinder.draw(context, program_state, body, this.materials.ball_mat.override(hex_color("#f25003")));
            this.moveGoalie(dt)

            const goalie_shadow_radius = 2/* Set the shadow radius for the goalie */;
            let goalie_shadow_tr = Mat4.scale(goalie_shadow_radius, goalie_shadow_radius, goalie_shadow_radius).times(Mat4.identity());
            goalie_shadow_tr = Mat4.translation(this.goalie_pos[0], -0.9, this.goalie_pos[2]).times(Mat4.rotation(Math.PI / 2, 1, 0, 0)).times(goalie_shadow_tr);

            const goalie_shadow_alpha = 0.75/* Set the transparency factor for the goalie shadow */;
            const goalie_shadow_color = color(0, 0, 0, goalie_shadow_alpha);

            this.shapes.circle.draw(context, program_state, goalie_shadow_tr, this.materials.power_mat.override(goalie_shadow_color));


        }
        
        for (let index = 0; index < this.defenders.length; index++){
            this.defenders[index].move(dt)
            this.defenders[index].draw(context, program_state, this.shapes, this.materials)
        }

        for (let index = 0; index < this.speed_bumps.length; index++){
            this.speed_bumps[index].draw(context, program_state, this.shapes, this.materials)
        }

        for (let index = 0; index < this.ball_chasers.length; index++){
            if (this.already_kicked){
                this.ball_chasers[index].move(dt, this.ball.position)
            }
            this.ball_chasers[index].draw(context, program_state, this.shapes, this.materials)
        }

        
        // Draw a blue dome around the field
        let bt = Mat4.scale(domeRadius,domeRadius,domeRadius).times(Mat4.identity())
        this.shapes.ball.draw(context,program_state,bt,this.materials.dome_mat)

        let crossbar_tr = goal_tr.times(Mat4.translation(0, 0, 15)).times(Mat4.scale(8,0.5,0.5))
        let left_post_tr = goal_tr.times(Mat4.rotation(Math.PI / 2, 0, 1, 0)).times(Mat4.scale(4,0.5,0.5)).times(Mat4.translation(-4.6,0,-16))
        let right_post_tr = left_post_tr.times(Mat4.translation(0,0,32))

        let collidable_obstacles = [
            crossbar_tr, left_post_tr, right_post_tr,
            backnet_transform, leftnet_transform, rightnet_transform, topnet_transform
        ]
        let restitution_coefs = [
            0.8, 0.8, 0.8,
            0.3, 0.3, 0.3, 0.3,
        ];
        // console.log(this.level, this.level_obstaces[this.level], this.defenders)
        if (this.level_obstaces[this.level]["goalies"] == 1){
            goalie_tr = Mat4.translation(0,3.5,0).times(goalie_tr).times(Mat4.scale(1,1,4))
            collidable_obstacles.push(goalie_tr)
            restitution_coefs.push(0.8)
        }
        for (let index = 0; index < this.defenders.length; index++){
            collidable_obstacles.push(this.defenders[index].get_tr())
            restitution_coefs.push(0.8)
        }
        for (let index = 0; index < this.ball_chasers.length; index++){
            collidable_obstacles.push(this.ball_chasers[index].get_tr())
            restitution_coefs.push(0.8)
        }
        for (let index = 0; index < this.speed_bumps.length; index++){
            collidable_obstacles.push(this.speed_bumps[index].get_tr())
            restitution_coefs.push(0.8)
        }

        for(let j = 0; j < 15; j++){
            const { i, tr } = this.ball.update(dt/15, collidable_obstacles, restitution_coefs);
            if (i != null) {
                this.wireframes[i].draw(context, program_state, tr, this.materials.wireframe, "LINES");
            }
        }

        if(this.ball.goal){
            if (this.scored_this_possession == null) {
                this.goals++;
                this.misses = 0;
                this.lost = false;
                this.scored_this_possession = t;
            }
            if (this.scored_this_possession != null && t - this.scored_this_possession > 3) {
                this.level += 1
                this.level = this.level % this.level_obstaces.length
                this.reset();
            }
        }   
        if(!this.ball.goal){
            if (this.missed_this_possession == null && this.already_kicked == true) {
                this.missed_this_possession = t;
            }
            if (this.missed_this_possession != null && t - this.missed_this_possession > 3) {
                this.misses += 1;
                if(this.misses > 3){
                    this.lost = true;
                    this.level = 0;
                    this.misses = 0;
                    //texteditor.youLose(this.lost);
                }
                this.reset();
            }
        }
        
        // Do not follow the ball with the camera if it goes out of bounds
        if (this.ball.position.dot(this.ball.position) < domeRadius ** 2)
        {
            let targetCamera = Mat4.inverse(
                Mat4.translation(...this.ball.position)
                    .times(Mat4.rotation(-Math.PI / 12, 1, 0, 0))
                    .times(Mat4.translation(0, 0, 25))
                );
            program_state.set_camera(targetCamera.map((x, i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.05)));
        }
        else{
            //if call goes out of bounds, just slowly go back to the original position until ball respawns
            let targetCamera = Mat4.inverse(
                Mat4.translation(...ball_initial_position)
                    .times(Mat4.rotation(-Math.PI / 12, 1, 0, 0))
                    .times(Mat4.translation(0, -10, 25))
                );
            program_state.set_camera(targetCamera.map((x, i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.01)));
        }
        
        //Draw ball
        this.shapes.ball.draw(context, program_state, this.ball.transform, this.materials.ball_texture)

        texteditor.updateGoalText(this.ball.goal);
        texteditor.updateMisses(this.misses);
        texteditor.updateLevels(this.level)
        texteditor.youLose(this.lost);
        texteditor.updateScore(this.level);
    }


    /////////////////Other functions///////////////////////////////
    moveGoalie(dt) {
        if (this.already_kicked && this.ball.position[0] < 8 && this.ball.position[0] > -8){
            if (this.ball.position[0] > this.goalie_pos[0]){
                this.goalie_pos[0] += dt * 5
            }
            else {
                this.goalie_pos[0] -= dt * 5
            }
        }
    }

    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
      }

    rotation_angle (t, a, b, w) {
        return a + b * Math.sin(w * t)
    }
}