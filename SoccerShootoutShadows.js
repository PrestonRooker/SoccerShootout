import {defs, tiny} from './examples/common.js';
// Pull these names into this module's scope for convenience:
const {Vector, vec3, vec4, vec, color, hex_color, Matrix, Mat4, Light, Shape, Material, Shader, Texture, Scene, Vector3, Vector4} = tiny;
const {Cube, Axis_Arrows, Textured_Phong, Phong_Shader, Basic_Shader, Subdivision_Sphere} = defs

const ball_initial_position = vec4(0,15,0,1)
const domeRadius = 300;

import {Color_Phong_Shader, Shadow_Textured_Phong_Shader,
    Depth_Texture_Shader_2D, Buffered_Texture, LIGHT_DEPTH_TEX_SIZE} from './shadow-demo-shaders.js'
import Ball from './BallShadows.js';
import { Defender, Ball_Chaser, Speed_Bump } from './DefenderShadows.js';
import * as texteditor from './text-manager.js';


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
    


// The scene
export class SoccerShootoutShadows extends Scene {
    constructor() {
        super();
        // Load the model file:

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
        this.points = 0;
        this.lost = false;
        this.misses = 0;
        this.level_obstaces = [{"goalies": 0, "defenders": 0, "ball_chasers": 0, "speed_bumps": 0}, {"goalies": 1, "defenders": 0, "ball_chasers": 0, "speed_bumps": 0}, {"goalies": 1, "defenders": 0, "ball_chasers": 0, "speed_bumps": 2}, {"goalies": 1, "defenders": 1, "ball_chasers": 0, "speed_bumps": 2}, {"goalies": 1, "defenders": 1, "ball_chasers": 1, "speed_bumps": 2}, {"goalies": 1, "defenders": 2, "ball_chasers": 1, "speed_bumps": 2}, {"goalies": 1, "defenders": 2, "ball_chasers": 2, "speed_bumps": 2}]
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

        this.shapes = {
            grass: new defs.Cube(),
            ball: new defs.Subdivision_Sphere(4),
            arrow: new defs.Arrow(),
            circle: new defs.Regular_2D_Polygon(30,30),
            net: new defs.OpenCube(),
            goal: new defs.SoccerGoal(),
            cylinder: new defs.Capped_Cylinder(30, 30),
        };

        this.materials = {
            grass_texture: new Material(new Shadow_Textured_Phong_Shader(1), {
                color: color(.27, 0.74, .26, 1), ambient: 0.5, diffusivity: 0.5, specularity: 0, smoothness: 0,
                light_depth_texture: null,
                color_texture: new Texture("assets/grass4.png", "LINEAR_MIPMAP_LINEAR")
            }),
            ball_texture: new Material(new Shadow_Textured_Phong_Shader(1), {
                color: color(0.5, .5, .5, 1), ambient: .5, diffusivity: 0.3, specularity: 0.2, smoothness: 100,
                light_depth_texture: null,
                color_texture: new Texture("assets/soccerball.png", "NEAREST")
            }),
            arrow_mat: new Material(new Shadow_Textured_Phong_Shader(1), {
                color: hex_color("#FF0000"), ambient: .3, diffusivity: 0.6, specularity: 0.4, smoothness: 64,
                light_depth_texture: null,
            }),
            net_texture: new Material(new Shadow_Textured_Phong_Shader(1), {
                color: color(.5, .5, .5, 1), ambient: .3, diffusivity: 0.6, specularity: 0.4, smoothness: 64,
                light_depth_texture: null,
                color_texture: new Texture("assets/net.png", "LINEAR_MIPMAP_LINEAR")
            }),
            face_texture: new Material(new Shadow_Textured_Phong_Shader(1), {
                color: hex_color("#f1c27d"), ambient: .45, diffusivity: 0.1, specularity: 0.2, smoothness: 64,
                light_depth_texture: null,
                color_texture: new Texture("assets/angry2.png", "LINEAR_MIPMAP_LINEAR")
            }),
            post_color: new Material(new Shadow_Textured_Phong_Shader(1), {
                color: color(.5, .5, .5, 1), ambient: .3, diffusivity: 0.6, specularity: 0.4, smoothness: 64,
                light_depth_texture: null,
                color_texture:  hex_color("#FFFFFF")
            }),
            hands_mat: new Material(new Shadow_Textured_Phong_Shader(1), {
                color: hex_color("#f1c27d"), ambient: .7, diffusivity: 0.6, specularity: 0.4, smoothness: 64,
                light_depth_texture: null, 
            }),
            body_mat: new Material(new Shadow_Textured_Phong_Shader(1), {
                color: hex_color("#f25003"), ambient: .7, diffusivity: 0.1, specularity: 0.1, smoothness: 100,
                light_depth_texture: null
            }),
            speed_bump_mat: new Material(new Shadow_Textured_Phong_Shader(1), {
                color: hex_color("#985713"), ambient: .7, diffusivity: 0.4, specularity: 0.1, smoothness: 30,
                light_depth_texture: null
            }),
            dome_mat: new Material(new Shadow_Textured_Phong_Shader(1), {
                color: color(.5, .5, .8, 1), ambient: 0.6, diffusivity: 0.6, specularity: 0.4, smoothness: 64,
                light_depth_texture: null,
                color_texture:  new Texture("assets/sky12.jpg", "NEAREST")
            }),
            power_mat: new Material(new defs.Phong_Shader(),
            {ambient: 0.6, diffusivity: 0.6, specularity: 0, color: hex_color("#FFFFFF")}),
            pure: new Material(new Color_Phong_Shader(), {
            }),
        }

        this.shapes.grass.arrays.texture_coord = this.shapes.grass.arrays.texture_coord.map(x => x.times(4));

        this.power = 0;
        this.ball = new Ball(ball_initial_position)

        this.initial_camera_location = Mat4.look_at(vec3(0, 15, 40), vec3(0, 0, 0), vec3(0, 1, 0));

        // For the first pass
        this.pure = new Material(new Color_Phong_Shader(), {
        })
        // For light source
        this.light_src = new Material(new Phong_Shader(), {
            color: color(1, 1, 1, 1), ambient: 1, diffusivity: 0, specularity: 0
        });
        // For depth texture display
        this.depth_tex =  new Material(new Depth_Texture_Shader_2D(), {
            color: color(0, 0, .0, 1),
            ambient: 1, diffusivity: 0, specularity: 0, texture: null
        });

        // To make sure texture initialization only does once
        this.init_ok = false;
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

    texture_buffer_init(gl) {
        // Depth Texture
        this.lightDepthTexture = gl.createTexture();
        // Bind it to TinyGraphics
        this.light_depth_texture = new Buffered_Texture(this.lightDepthTexture);
        this.materials.grass_texture.light_depth_texture = this.light_depth_texture

        this.lightDepthTextureSize = LIGHT_DEPTH_TEX_SIZE;
        gl.bindTexture(gl.TEXTURE_2D, this.lightDepthTexture);
        gl.texImage2D(
            gl.TEXTURE_2D,      // target
            0,                  // mip level
            gl.DEPTH_COMPONENT, // internal format
            this.lightDepthTextureSize,   // width
            this.lightDepthTextureSize,   // height
            0,                  // border
            gl.DEPTH_COMPONENT, // format
            gl.UNSIGNED_INT,    // type
            null);              // data
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Depth Texture Buffer
        this.lightDepthFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightDepthFramebuffer);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,       // target
            gl.DEPTH_ATTACHMENT,  // attachment point
            gl.TEXTURE_2D,        // texture target
            this.lightDepthTexture,         // texture
            0);                   // mip level
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // create a color texture of the same size as the depth texture
        // see article why this is needed_
        this.unusedTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.unusedTexture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            this.lightDepthTextureSize,
            this.lightDepthTextureSize,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null,
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // attach it to the framebuffer
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,        // target
            gl.COLOR_ATTACHMENT0,  // attachment point
            gl.TEXTURE_2D,         // texture target
            this.unusedTexture,         // texture
            0);                    // mip level
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    render_scene(context, program_state, shadow_pass, draw_light_source=false, draw_shadow=false) {
        // shadow_pass: true if this is the second pass that draw the shadow.
        // draw_light_source: true if we want to draw the light source.
        // draw_shadow: true if we want to draw the shadow
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

        let light_position = this.light_position;

        texteditor.displayTitleScreen(this.title);

        //Eliminates shadow for some reason
        // program_state.projection_transform = Mat4.perspective(
        //     Math.PI / 4, context.width / context.height, .1, 1000);

        const t = program_state.animation_time / 1000;
        let dt = program_state.animation_delta_time / 2000;

        // Cap dt to prevent explosions
        if (dt > 0.05)
            dt = 0.05;

        program_state.draw_shadow = draw_shadow;

        if (draw_light_source && shadow_pass) {
            this.shapes.ball.draw(context, program_state,
                Mat4.translation(light_position[0], light_position[1], light_position[2]).times(Mat4.scale(.5,.5,.5)),
                this.light_src.override(hex_color("#f1c27d")));
        }

        let grass_tr = Mat4.translation(0,-51.4,0).times(Mat4.scale(domeRadius,50,domeRadius).times(Mat4.identity()))
        this.shapes.grass.draw(context, program_state, grass_tr, shadow_pass? this.materials.grass_texture : this.pure)

        //Draw aiming arrow
        let arrow_tr = Mat4.rotation(Math.PI,1,0,0).times(Mat4.identity())
        arrow_tr = Mat4.translation(0,0,-5).times(arrow_tr)
        arrow_tr = Mat4.rotation(this.arrow_ang_y,1,0,0).times(arrow_tr)
        arrow_tr = Mat4.rotation(this.arrow_ang_x,0,1,0).times(arrow_tr)
        this.arrow_tr = arrow_tr
        this.shapes.arrow.draw(context, program_state, arrow_tr, shadow_pass? this.materials.arrow_mat : this.pure)

        //set power meter function
        let r = this.power;
        if(!this.already_kicked){
            r = 0.8*Math.sin((Math.PI/2)*t) + 1.2; // goes from 0.4 to 2
        }
        this.power = r;

        //Draw power meter circle
        let power_tr = Mat4.scale(r, r, r).times(Mat4.identity());
        power_tr = Mat4.translation(0, -0.9, 0).times(Mat4.rotation(Math.PI/2,1,0,0)).times(power_tr);
        const r_n = r/2; 
        const red = r_n;
        const green = 1-r_n;
        const blue = 0;
        let power_color = color(red, blue, green, 1);
        this.shapes.circle.draw(context, program_state, power_tr, this.materials.power_mat.override(power_color))

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

        this.shapes.net.draw(context, program_state, net_tr, shadow_pass? this.materials.net_texture : this.pure)
        this.shapes.goal.draw(context, program_state, goal_tr, this.materials.post_color)

        const backnet_transform = net_tr.times(Mat4.translation(0, -1, 0)).times(Mat4.scale(1, 0.01, 1));
        const leftnet_transform = net_tr.times(Mat4.translation(-1, 0, 0)).times(Mat4.scale(0.01, 1, 1));
        const rightnet_transform = net_tr.times(Mat4.translation(1, 0, 0)).times(Mat4.scale(0.01, 1, 1));
        const topnet_transform = net_tr.times(Mat4.translation(0, 0, -1)).times(Mat4.scale(1, 1, 0.01));

        let goalie_tr = Mat4.identity()

        // Draw a blue dome around the field
        let bt = Mat4.scale(domeRadius,domeRadius,domeRadius).times(Mat4.identity())
        this.shapes.ball.draw(context,program_state,bt,this.materials.dome_mat)

        // //Draw Goalie
        if (this.level_obstaces[this.level]["goalies"] == 1){
            goalie_tr = Mat4.translation(this.goalie_pos[0], this.goalie_pos[1], this.goalie_pos[2]).times(Mat4.rotation(-Math.PI / 2, 1, 0, 0));
            this.goalie_tr = goalie_tr;
             //initialize the location of goalie's body
             let head = goalie_tr.times(Mat4.translation(0, 0, 6.6).times(Mat4.rotation(Math.PI / 2, 1, 0, 0).times(Mat4.rotation(-Math.PI / 2, 0, 1, 0).times(Mat4.scale(1, 1, 1)).times(Mat4.identity()))));
            let body = goalie_tr.times(Mat4.translation(0,0,4).times(Mat4.scale(0.75,0.75,3)).times(Mat4.identity()));
            let left_hand = goalie_tr.times(Mat4.translation(-1.5,0,4).times(Mat4.scale(0.5,0.5,0.5)).times(Mat4.identity()));
            let right_hand = goalie_tr.times(Mat4.translation(1.5,0,4).times(Mat4.scale(0.5,0.5,0.5)).times(Mat4.identity()));

            //draw the goalie
            this.shapes.ball.draw(context, program_state, head, shadow_pass? this.materials.face_texture : this.pure);
            this.shapes.ball.draw(context, program_state, left_hand, shadow_pass? this.materials.hands_mat : this.pure);
            this.shapes.ball.draw(context, program_state, right_hand, shadow_pass? this.materials.hands_mat : this.pure);
            this.shapes.cylinder.draw(context, program_state, body, shadow_pass? this.materials.body_mat : this.pure);
            this.moveGoalie(dt)

        }

        for (let index = 0; index < this.defenders.length; index++){
            this.defenders[index].move(dt)
            this.defenders[index].draw(context, program_state, this.shapes, this.materials, shadow_pass)
        }

        for (let index = 0; index < this.speed_bumps.length; index++){
            this.speed_bumps[index].draw(context, program_state, this.shapes, this.materials, shadow_pass)
        }

        for (let index = 0; index < this.ball_chasers.length; index++){
            if (this.already_kicked){
                this.ball_chasers[index].move(dt, this.ball.position)
            }
            this.ball_chasers[index].draw(context, program_state, this.shapes, this.materials, shadow_pass)
        }

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
                this.points+=Math.round((Math.max(1,this.level)*100)/Math.max(this.misses,1));
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
                // texteditor.updateLifeCounter(this.misses);
                if(this.misses > 3){
                    this.lost = true;
                    this.level = 0;
                    this.misses = 0;
                    this.points = 0;
                    //texteditor.youLose(this.lost);
                    // document.getElementById('score-container').style.display = 'none';
                    // document.getElementById('miss-container').style.display = 'none';
                    // document.getElementById('point-container').style.display = 'none';
                    // document.getElementById('level-container').style.display = 'none';
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

        
        this.shapes.ball.draw(context, program_state, this.ball.transform, shadow_pass? this.materials.ball_texture : this.pure);

        texteditor.updateGoalText(this.ball.goal);
        texteditor.updateMisses(this.misses);
        texteditor.updateLevels(this.level)
        texteditor.youLose(this.lost);
        texteditor.updateLifeCounter(this.misses);
        texteditor.updateScore(this.level);
        texteditor.updatePoints(this.points);

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

    display(context, program_state) {
        const t = program_state.animation_time;
        const gl = context.context;

        if (!this.init_ok) {
            const ext = gl.getExtension('WEBGL_depth_texture');
            if (!ext) {
                return alert('need WEBGL_depth_texture');  // eslint-disable-line
            }
            this.texture_buffer_init(gl);

            this.init_ok = true;
        }

        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.look_at(
                vec3(0, 12, 12),
                vec3(0, 2, 0),
                vec3(0, 1, 0)
            )); // Locate the camera here
        }

        // The position of the light
        //this.light_position = vec4(0, 100, 0, 1);
        this.light_position = Mat4.rotation(t / 1500, 0, 1, 0).times(vec4(30, 6, 1, 1));
        // The color of the light
        this.light_color = color(1,1,1,0);

        // This is a rough target of the light.
        // Although the light is point light, we need a target to set the POV of the light
        this.light_view_target = vec4(0, 0, 0, 1);
        this.light_field_of_view = 300 * Math.PI / 180; // 130 degree

        program_state.lights = [new Light(this.light_position, this.light_color, 10000)];

        // Step 1: set the perspective and camera to the POV of light
        const light_view_mat = Mat4.look_at(
            vec3(this.light_position[0], this.light_position[1], this.light_position[2]),
            vec3(this.light_view_target[0], this.light_view_target[1], this.light_view_target[2]),
            vec3(0, 1, 0), // assume the light to target will have a up dir of +y, maybe need to change according to your case
        );
        const light_proj_mat = Mat4.perspective(this.light_field_of_view, 1, 0.5, 500);
        // Bind the Depth Texture Buffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightDepthFramebuffer);
        gl.viewport(0, 0, this.lightDepthTextureSize, this.lightDepthTextureSize);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // Prepare uniforms
        program_state.light_view_mat = light_view_mat;
        program_state.light_proj_mat = light_proj_mat;
        program_state.light_tex_mat = light_proj_mat;
        program_state.view_mat = light_view_mat;
        program_state.projection_transform = light_proj_mat;
        this.render_scene(context, program_state, false,false, false);

        // Step 2: unbind, draw to the canvas
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        program_state.view_mat = program_state.camera_inverse;
        program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 0.5, 500);
        this.render_scene(context, program_state, true,true, true);

    }

    // show_explanation(document_element) {
    //     document_element.innerHTML += "<p>This demo loads an external 3D model file of a teapot.  It uses a condensed version of the \"webgl-obj-loader.js\" "
    //         + "open source library, though this version is not guaranteed to be complete and may not handle some .OBJ files.  It is contained in the class \"Shape_From_File\". "
    //         + "</p><p>One of these teapots is lit with bump mapping.  Can you tell which one?</p>";
    // }
}

