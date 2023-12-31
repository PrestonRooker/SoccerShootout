import {defs, tiny} from './examples/common.js';
// Pull these names into this module's scope for convenience:
const {Vector, vec3, vec4, color, hex_color, Mat4, Light, Shape, Material, Texture, Scene, Vector3} = tiny;
const {Phong_Shader,} = defs

const ball_initial_position = vec4(0,15,0,1)
const domeRadius = 300;

import {Color_Phong_Shader, Shadow_Textured_Phong_Shader,
     Buffered_Texture, LIGHT_DEPTH_TEX_SIZE} from './shadow-demo-shaders.js'
import Ball from './Ball.js';
import { Defender, Ball_Chaser, Speed_Bump } from './Defender.js';
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
export class SoccerShootout extends Scene {
    constructor() {
        super();
        // Load the model file:

        this.background_music = new Audio('assets/backgroundmusic(chosic.com).mp3');
        this.background_music.volume = 0.4;
        this.background_music.loop = true;
        this.has_music_started_playing = false;
        this.mute = false;
        this.goals = 0;

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
            rectangle: new defs.Square(),
        };

        const angry_smile = new Material(new Shadow_Textured_Phong_Shader(1), {
            color: hex_color("#f1c27d"), ambient: .5, diffusivity: 0.1, specularity: 0.2, smoothness: 64,
            light_depth_texture: null,
            color_texture: new Texture("assets/angry2.png", "LINEAR_MIPMAP_LINEAR")
        });
        this.materials = {
            grass_texture: new Material(new Shadow_Textured_Phong_Shader(1), {
                color: hex_color("#669c2a"), ambient: 0.5, diffusivity: 0.5, specularity: 0, smoothness: 0,
                light_depth_texture: null,
                color_texture: new Texture("assets/grass.jpg", "LINEAR_MIPMAP_LINEAR")
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
            face_texture: angry_smile,
            angry_smile,
            angry_frown: new Material(new Shadow_Textured_Phong_Shader(1), {
                color: hex_color("#f1c27d"), ambient: .45, diffusivity: 0.1, specularity: 0.2, smoothness: 64,
                light_depth_texture: null,
                color_texture: new Texture("assets/angry3.png", "LINEAR_MIPMAP_LINEAR")
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
                color: hex_color("#8B0000"), ambient: .7, diffusivity: 0.1, specularity: 0.1, smoothness: 100,
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
            line_mat: new Material(new defs.Phong_Shader(),
            {ambient: 1, diffusivity: 0.6, specularity: 0, color: hex_color("#FFFFFF")}),
            pure: new Material(new Color_Phong_Shader(), {
            }),
        }

        this.shapes.grass.arrays.texture_coord = this.shapes.grass.arrays.texture_coord.map(x => x.times(25));

        this.power = 0;
        this.ball = new Ball(ball_initial_position)

        this.initial_camera_location = Mat4.look_at(vec3(0, 15, 40), vec3(0, 0, 0), vec3(0, 1, 0));

        this.pure = new Material(new Color_Phong_Shader(), {
        })

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
        this.key_triggered_button("Skip to Final Level", ["6"], () => {this.level = 6; this.reset()})
        this.key_triggered_button("Kick", ["Enter"], () => {
            if(this.title){
                this.title = false;
                document.body.classList.remove('blurred');
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
        this.materials.face_texture = this.materials.angry_smile;
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

        if (!context.scratchpad.controls) {
            context.scratchpad.controls = new defs.Movement_Controls();
            program_state.set_camera(this.initial_camera_location);
        }

        const dimensions = [ window.innerWidth, window.innerHeight];
        if (dimensions.some((val, i) => val !== this.dimensions[i])) {
            context.set_size(dimensions);
            this.dimensions = dimensions;
        }

        let light_position = this.light_position;

        texteditor.displayTitleScreen(this.title);

        const t = program_state.animation_time / 1000;
        let dt = program_state.animation_delta_time / 2000;

        // Cap dt to prevent explosions
        if (dt > 0.05)
            dt = 0.05;

        program_state.draw_shadow = draw_shadow;

        if (draw_light_source && shadow_pass) {
            this.shapes.ball.draw(context, program_state,
                Mat4.translation(light_position[0], light_position[1], light_position[2]).times(Mat4.scale(.5,.5,.5)),
                this.materials.line_mat.override(hex_color("#f1c27d")));
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

        //Draw Field Lines
        const width = 0.4;
        const inner_length = 8;
        const mid_length = 24.5;
        const outer_length = 60;
        const rotation_angle = Math.PI / 2;

        //Draw Horizontal Lines
        const translation_vectorH1 = vec3(0, -1.3, -39); 
        const rectangle_transformH1 = Mat4.translation(...translation_vectorH1)
            .times(Mat4.rotation(rotation_angle, 1, 0, 0))
            .times(Mat4.rotation(rotation_angle, 0, 0, 1))
            .times(Mat4.scale(0.5, 70, 1));
        this.shapes.rectangle.draw(context, program_state, rectangle_transformH1, this.materials.line_mat);

        const translation_vectorH2 = vec3(0, -1.3, 10); 
        const rectangle_transformH2 = Mat4.translation(...translation_vectorH2)
            .times(Mat4.rotation(rotation_angle, 1, 0, 0))  // Rotate about the x-axis
            .times(Mat4.rotation(rotation_angle, 0, 0, 1))  // Rotate about the z-axis
            .times(Mat4.scale(0.5, 40, 1));
        this.shapes.rectangle.draw(context, program_state, rectangle_transformH2, this.materials.line_mat);
        
        const translation_vectorH3 = vec3(0, -1.3, -23); 
        const rectangle_transformH3 = Mat4.translation(...translation_vectorH3)
            .times(Mat4.rotation(rotation_angle, 1, 0, 0))
            .times(Mat4.rotation(rotation_angle, 0, 0, 1))
            .times(Mat4.scale(0.5, 18, 1));
        this.shapes.rectangle.draw(context, program_state, rectangle_transformH3, this.materials.line_mat);

        //Draw inner bounds
        const translation_vectorIL = vec3(-18, -1.35, -31); 
        const rectangle_transformIL = Mat4.translation(...translation_vectorIL)
            .times(Mat4.rotation(rotation_angle, 1, 0, 0))
            .times(Mat4.scale(width, inner_length, 1));
        this.shapes.rectangle.draw(context, program_state, rectangle_transformIL, this.materials.line_mat);

        const translation_vectorIR = vec3(18, -1.35, -31); 
        const rectangle_transformIR = Mat4.translation(...translation_vectorIR)
            .times(Mat4.rotation(rotation_angle, 1, 0, 0))
            .times(Mat4.scale(width, inner_length, 1));
        this.shapes.rectangle.draw(context, program_state, rectangle_transformIR, this.materials.line_mat);

        //Draw mid bounds
        const translation_vectorMR = vec3(40, -1.35, -14.5); 
        const rectangle_transformMR = Mat4.translation(...translation_vectorMR)
            .times(Mat4.rotation(rotation_angle, 1, 0, 0))
            .times(Mat4.scale(width, mid_length, 1));
        this.shapes.rectangle.draw(context, program_state, rectangle_transformMR, this.materials.line_mat);

        const translation_vectorML = vec3(-40, -1.35, -14.5); 
        const rectangle_transformML = Mat4.translation(...translation_vectorML)
            .times(Mat4.rotation(rotation_angle, 1, 0, 0))
            .times(Mat4.scale(width, mid_length, 1));
        this.shapes.rectangle.draw(context, program_state, rectangle_transformML, this.materials.line_mat);

        //Draw outer bounds
        const translation_vectorOR = vec3(70, -1.35, 21); 
        const rectangle_transformOR = Mat4.translation(...translation_vectorOR)
            .times(Mat4.rotation(rotation_angle, 1, 0, 0))
            .times(Mat4.scale(width, outer_length, 1));
        this.shapes.rectangle.draw(context, program_state, rectangle_transformOR, this.materials.line_mat);

        const translation_vectorOL = vec3(-70, -1.35, 21); 
        const rectangle_transformOL = Mat4.translation(...translation_vectorOL)
            .times(Mat4.rotation(rotation_angle, 1, 0, 0))
            .times(Mat4.scale(width, outer_length, 1));
        this.shapes.rectangle.draw(context, program_state, rectangle_transformOL, this.materials.line_mat);

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
            if(this.ball.goal){
                this.shapes.ball.draw(context, program_state, head, shadow_pass? this.materials.angry_frown : this.pure);
            }
            this.shapes.ball.draw(context, program_state, head, shadow_pass? this.materials.angry_smile : this.pure);
            this.shapes.ball.draw(context, program_state, left_hand, shadow_pass? this.materials.hands_mat.override({color:hex_color("#353631")}) : this.pure);
            this.shapes.ball.draw(context, program_state, right_hand, shadow_pass? this.materials.hands_mat.override({color:hex_color("#353631")}) : this.pure);
            this.shapes.cylinder.draw(context, program_state, body, shadow_pass? this.materials.body_mat.override({color:hex_color("#FDDA0D")}) : this.pure);
            this.moveGoalie(dt)

        }
        //Draw Defenders
        for (let index = 0; index < this.defenders.length; index++){
            this.defenders[index].move(dt)
            if (this.ball.goal){
                this.materials.face_texture = this.materials.angry_frown;
            }
            this.defenders[index].draw(context, program_state, this.shapes, this.materials, shadow_pass)
        }
        //Draw Speed Bumps
        for (let index = 0; index < this.speed_bumps.length; index++){
            this.speed_bumps[index].draw(context, program_state, this.shapes, this.materials, shadow_pass)
        }
        //Draw Ball Chasers
        for (let index = 0; index < this.ball_chasers.length; index++){
            if (this.already_kicked){
                this.ball_chasers[index].move(dt, this.ball.position)
            }
            if (this.ball.goal){
                this.materials.face_texture = this.materials.angry_frown;
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
                this.level = Math.min(this.level, this.level_obstaces.length - 1)
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
                    this.points = 0;
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
            //if ball goes out of bounds, just slowly go back to the original position until ball respawns
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
        texteditor.updateScore(this.goals);
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

        this.light_position = Mat4.rotation(t / 1500, 0, 1, 0).times(vec4(30, 6, 1, 1));
        this.light_color = color(1,1,1,0);

        this.light_view_target = vec4(0, 0, 0, 1);
        this.light_field_of_view = 300 * Math.PI / 180; 

        program_state.lights = [new Light(this.light_position, this.light_color, 1000000)];

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

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        program_state.view_mat = program_state.camera_inverse;
        program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 0.5, 500);
        this.render_scene(context, program_state, true,true, true);

    }


}

