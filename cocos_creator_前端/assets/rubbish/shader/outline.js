const _vert = `
attribute vec4 a_position;
 attribute vec2 a_texCoord;
 attribute vec4 a_color;
 varying vec2 v_texCoord;
 varying vec4 v_fragmentColor;
 void main()
 {
     gl_Position = CC_PMatrix  * a_position;
     v_fragmentColor = a_color;
     v_texCoord = a_texCoord;
 }
`;

// 如果是spine的node,网页版需要用这个才会位置正确，但native版本还是需要用上面的
const _actorVert = `
attribute vec4 a_position;
 attribute vec2 a_texCoord;
 attribute vec4 a_color;
 varying vec2 v_texCoord;
 varying vec4 v_fragmentColor;
 void main()
 {
     gl_Position = (CC_PMatrix * CC_MVMatrix) * a_position;
     v_fragmentColor = a_color;
     v_texCoord = a_texCoord;
 }
`;

const _frag = `
varying vec2 v_texCoord;
varying vec4 v_fragmentColor;

uniform vec3 u_outlineColor;
uniform float u_threshold;
uniform float u_radius;

void main()
{
    float radius = u_radius;
    vec4 accum = vec4(0.0);
    vec4 normal = vec4(0.0);
    
    normal = texture2D(CC_Texture0, vec2(v_texCoord.x, v_texCoord.y));
    
    accum += texture2D(CC_Texture0, vec2(v_texCoord.x - radius, v_texCoord.y - radius));
    accum += texture2D(CC_Texture0, vec2(v_texCoord.x + radius, v_texCoord.y - radius));
    accum += texture2D(CC_Texture0, vec2(v_texCoord.x + radius, v_texCoord.y + radius));
    accum += texture2D(CC_Texture0, vec2(v_texCoord.x - radius, v_texCoord.y + radius));
    
    accum *= u_threshold;
    accum.rgb = u_outlineColor * accum.a;
    
    normal = ( accum * (1.0 - normal.a)) + (normal * normal.a);
    
    gl_FragColor = v_fragmentColor * normal;
}
`;


cc.Class({
  extends: cc.Component,

  properties: {
    threshold: {
      default: 1.75,
      type: cc.Float,
    },
    radius: {
      default: 0,
      type: cc.Float,
    },
    colorR: {
      default: 0,
      type: cc.Integer,
      range: [0, 255, 1],
      slide: true,
    },
    colorG: {
      default: 0,
      type: cc.Integer,
      range: [0, 255, 1],
      slide: true,
    },
    colorB: {
      default: 0,
      type: cc.Integer,
      range: [0, 255, 1],
      slide: true,
    },
    needUpdate: {
      default: false,
      displayName: "update",
      tooltip: "是否需要Update",
    },
    previewId: {
      default: null,
      editorOnly: true,
      visible: false,
    },
    _program: {
      default: null,
      visible: false,
    },
  },

  editor: {
    executeInEditMode: true,
  },

  onLoad() {
    if (this.node.getComponent(cc.Sprite)) {
      this._useVert = _vert;
    } else {
      this._useVert = _actorVert;
    }

    this.render(this.threshold,
      this.radius,
      this.colorR,
      this.colorG,
      this.colorB, false);
  },

  onFocusInEditor() {
    if (this.previewId != null) {
      clearInterval(this.previewId);
    }
    const self = this;
    this.previewId = setInterval(() => {
      self.render(self.threshold,
        self.radius,
        self.colorR,
        self.colorG,
        self.colorB, false);
    }, 1 / 60);
  },

  onLostFocusInEditor() {
    if (this.previewId != null) {
      clearInterval(this.previewId);
    }
  },

  onDestroy() {
    if (this.previewId != null) {
      clearInterval(this.previewId);
    }
    this.threshold = this.radius = this.colorR = this.colorG = this.colorB = 0;
    this.render(0, 0, 0, 0, 0, false);
  },

  render(threshold, radius, colorR, colorG, colorB, enforce) {
    if (!this._program) {
      this._program = new cc.GLProgram();
    }
    if (cc.sys.isNative) {
      this._program.initWithString(_vert, _frag);
      this._program.link();
      this._program.updateUniforms();
      const glProgramState = cc.GLProgramState.getOrCreateWithGLProgram(this._program);
      glProgramState.setUniformFloat("u_threshold", threshold);
      glProgramState.setUniformVec3(
        "u_outlineColor",
        {
          x: colorR / 255,
          y: colorG / 255,
          z: colorB / 255,
        }
      );
      glProgramState.setUniformFloat("u_radius", radius);
    } else {
      this._program.initWithVertexShaderByteArray(this._useVert, _frag);
      this._program.addAttribute(cc.macro.ATTRIBUTE_NAME_POSITION, cc.macro.VERTEX_ATTRIB_POSITION);
      this._program.addAttribute(cc.macro.ATTRIBUTE_NAME_COLOR, cc.macro.VERTEX_ATTRIB_COLOR);
      this._program.addAttribute(cc.macro.ATTRIBUTE_NAME_TEX_COORD, cc.macro.VERTEX_ATTRIB_TEX_COORDS);
      this._program.link();
      this._program.updateUniforms();
      this._program.setUniformLocationWith1f(this._program.getUniformLocationForName("u_threshold"), threshold);
      this._program.setUniformLocationWith3f(this._program.getUniformLocationForName("u_outlineColor"), colorR / 255, colorG / 255, colorB / 255);
      this._program.setUniformLocationWith1f(this._program.getUniformLocationForName('u_radius'), radius);
    }
    this.setProgram(this.node._sgNode, this._program, enforce);
  },

  setProgram(node, program, enforce) {
    if (cc.sys.isNative) {
      const glProgramState = cc.GLProgramState.getOrCreateWithGLProgram(program);
      node.setGLProgramState(glProgramState);
    } else {
      node.setShaderProgram(program);
    }

    const children = node.children;
    if (!children) return;
    for (let i = 0; i < children.length; i++) {
      this.setProgram(children[i], program);
    }
  },

  update(dt) {
    if (!this.needUpdate) return;
    this.render(this.threshold,
      this.radius,
      this.colorR,
      this.colorG,
      this.colorB, false);
  },
});