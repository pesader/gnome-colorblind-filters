/**
 * ColorBlind Filters
 * Shaders
 *
 * @author     GdH <G-dH@github.com>
 * @copyright  2022
 * @license    GPL-3.0
 */

'use strict';

const { GObject, Clutter } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

var   InvertLightnessEffect = GObject.registerClass(
class InvertLightnessEffect extends Clutter.ShaderEffect {
    vfunc_get_static_shader_source() {
        return ShaderLib.getInversion(0);
    }

    vfunc_paint_target(node, paint_context) {
        this.set_uniform_value('tex', 0);
        if (paint_context === undefined)
            super.vfunc_paint_target(node);
        else
            super.vfunc_paint_target(node, paint_context);
    }
});

var   InvertLightnessShiftEffect = GObject.registerClass(
class InvertLightnessShiftEffect extends Clutter.ShaderEffect {
    vfunc_get_static_shader_source() {
        return ShaderLib.getInversion(1);
    }

    vfunc_paint_target(node, paint_context) {
        this.set_uniform_value('tex', 0);
        if (paint_context === undefined)
            super.vfunc_paint_target(node);
        else
            super.vfunc_paint_target(node, paint_context);
    }
});

var   ColorInversionEffect = GObject.registerClass(
class ColorInversionEffect extends Clutter.ShaderEffect {
    vfunc_get_static_shader_source() {
        return ShaderLib.getInversion(2);
    }

    vfunc_paint_target(node, paint_context) {
        this.set_uniform_value('tex', 0);
        if (paint_context === undefined)
            super.vfunc_paint_target(node);
        else
            super.vfunc_paint_target(node, paint_context);
    }
});

var   ColorMixerGBREffect = GObject.registerClass(
class ColorMixerGbrEffect extends Clutter.ShaderEffect {
    vfunc_get_static_shader_source() {
        return ShaderLib.getChannelMix(1);
    }

    vfunc_paint_target(node, paint_context) {
        this.set_uniform_value('tex', 0);
        if (paint_context === undefined)
            super.vfunc_paint_target(node);
        else
            super.vfunc_paint_target(node, paint_context);
    }
});

var   ColorMixerBRGEffect = GObject.registerClass(
class ColorMixerBrgEffect extends Clutter.ShaderEffect {
    vfunc_get_static_shader_source() {
        return ShaderLib.getChannelMix(2);
    }

    vfunc_paint_target(node, paint_context) {
        this.set_uniform_value('tex', 0);
        if (paint_context === undefined)
            super.vfunc_paint_target(node);
        else
            super.vfunc_paint_target(node, paint_context);
    }
});

var   DaltonismEffect = GObject.registerClass(
class DaltonismEffect extends Clutter.ShaderEffect {
    _init(mode, strength) {
        super._init();
        this._mode = mode % 3;
        this._simulation = mode > 2 ? 1 : 0;
        this._strength = strength;

        this.set_shader_source(ShaderLib.getDaltonism(this._mode, this._simulation, this._strength));
    }

    vfunc_get_static_shader_source() {
        return ShaderLib.getDaltonism(this._mode, this._simulation, this._strength);
    }

    vfunc_paint_target(node, paint_context) {
        this.set_uniform_value('tex', 0);
        if (paint_context === undefined)
            super.vfunc_paint_target(node);
        else
            super.vfunc_paint_target(node, paint_context);
    }
});


var ShaderLib = class {
    constructor() {
    }

    static getDaltonism(mode = 1, simulation = 1, strength = 1) {
        return `
            uniform sampler2D tex;
            #define COLORBLIND_MODE ${mode}
            #define SIMULATE ${simulation}
            #define STRENGTH ${strength}
            void main() {
                vec4 c = texture2D(tex, cogl_tex_coord_in[0].st);
            // RGB to LMS matrix
                float L = (17.8824f * c.r) + (43.5161f * c.g) + (4.11935f * c.b);
                float M = (3.45565f * c.r) + (27.1554f * c.g) + (3.86714f * c.b);
                float S = (0.0299566f * c.r) + (0.184309f * c.g) + (1.46709f * c.b);
            // Simulate color blindness
                #if ( COLORBLIND_MODE == 0) // Protanope - reds are greatly reduced (1% men)
                    float l = 0.0f * L + 2.02344f * M + -2.52581f * S;
                    float m = 0.0f * L + 1.0f * M + 0.0f * S;
                    float s = 0.0f * L + 0.0f * M + 1.0f * S;
                #endif
                #if ( COLORBLIND_MODE == 1) // Deuteranope - greens are greatly reduced (8% men)
                    float l = 1.0f * L + 0.0f * M + 0.0f * S;
                    float m = 0.494207f * L + 0.0f * M + 1.24827f * S;
                    float s = 0.0f * L + 0.0f * M + 1.0f * S;
                #endif
                #if ( COLORBLIND_MODE == 2) // Tritanope - blues are greatly reduced (0.003% population)
                    float l = 1.0f * L + 0.0f * M + 0.0f * S;
                    float m = 0.0f * L + 1.0f * M + 0.0f * S;
                    // GdH - trinatope vector is calculated by me
                    float s = -0.012491378299329402f * L + 0.07203451899279534f * M + 0.0f * S;
                #endif
            // LMS to RGB matrix conversion
                vec4 error;
                error.r = (0.0809444479f * l) + (-0.130504409f * m) + (0.116721066f * s);
                error.g = (-0.0102485335f * l) + (0.0540193266f * m) + (-0.113614708f * s);
                error.b = (-0.000365296938f * l) + (-0.00412161469f * m) + (0.693511405f * s);
                error = error * STRENGTH + c * (1 - STRENGTH); // ratio between original and error colors
                error.a = 1;

            // The error is what they see
                #if (SIMULATE == 1)
                    error.a = c.a;
                    cogl_color_out = error.rgba;
                    return;
                #endif
                #if (SIMULATE == 0)
            // Isolate invisible colors to color vision deficiency (calculate error matrix)
                    error = (c - error);
            // Shift colors similar to Android colorblind filters
                    vec4 correction;
                #if ( COLORBLIND_MODE == 0 )
                    correction.r = -error.r/4 - error.g;
                    correction.g = -error.g;
                    correction.b = (error.r/3 + error.b);

                #elif ( COLORBLIND_MODE == 1 )
                // this one needs more work
                    correction.r = -0.7 * error.r;
                    correction.g = error.r/2 + error.g;
                    correction.b = -error.r/3 + error.b;
                #elif ( COLORBLIND_MODE == 2 )
                    correction.r = (error.b + error.r) * 0.3;
                    correction.g = (error.b + error.g) * 0.3;
                    correction.b = -error.b * 0.7;
                #endif
                // Add compensation to original values
                    correction = c + correction;
                    correction.a = c.a;
                    cogl_color_out = correction.rgba;
                #endif
            }
        `;
    }

    static getChannelMix(mode) {
        return `
            uniform sampler2D tex;
            #define MIX_MODE ${mode}
            void main() {
                vec4 c = texture2D(tex, cogl_tex_coord_in[0].st);
                #if (MIX_MODE == 1)
                    c = vec4(c.g, c.b, c.r, c.a);
                #elif (MIX_MODE == 2)
                    c = vec4(c.b, c.r, c.g, c.a);
                #endif
                cogl_color_out = c;
            }
        `;
    }

    static getInversion(mode) {
        return `
            uniform sampler2D tex;
            // Modes: 0 = Lightness
            //        1 = Lightness - white bias
            //        2 = Color
            #define INVERSION_MODE ${mode}

            // based on shift_whitish.glsl https://github.com/vn971/linux-color-inversion

            void main() {
                vec4 c = texture2D(tex, cogl_tex_coord_in[0].st);
                #if (INVERSION_MODE < 2)
                    /* INVERSION_MODE ? shifted : non-shifted */
                    float white_bias = INVERSION_MODE * c.a * .02;
                    float m = 1.0 + white_bias;
                    float shift = white_bias + c.a - min(c.r, min(c.g, c.b)) - max(c.r, max(c.g, c.b));
                    c = vec4(  ((shift + c.r) / m), 
                               ((shift + c.g) / m), 
                               ((shift + c.b) / m), 
                               c.a);

                #elif (INVERSION_MODE == 2)
                    c = vec4(c.a * 1 - c.r, c.a * 1 - c.g, c.a * 1 - c.b, c.a);
                #endif

                // gamma has to be compensated to maintain perceived differences in lightness on dark and light ends of the lightness scale
                float gamma = 1.8;
                c.rgb = pow(c.rgb, vec3(1.0/gamma));

                cogl_color_out = c;
            }
        `;
    }
};
