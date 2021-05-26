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

const _fragDefaultParam = `
uniform vec3      iResolution;           // viewport resolution (in pixels)
uniform float     iGlobalTime;           // shader playback time (in seconds)
uniform vec4      iMouse;                // mouse pixel coords. xy: current (if MLB down), zw: click
uniform vec4      iDate;                 // (year, month, day, time in seconds)
uniform float     iFrame;                // shader playback frame

//uniform float     iTimeDelta;            // render time (in seconds)
//uniform float     iChannelTime[4];       // channel playback time (in seconds)
//uniform vec3      iChannelResolution[4]; // channel resolution (in pixels)
//uniform samplerXX iChannel0..3;          // input channel. XX = 2D/Cube
//uniform float     iSampleRate;           // sound sample rate (i.e., 44100)

#define iChannel0 CC_Texture0
#define iChannel1 CC_Texture0
#define iChannel2 CC_Texture0
#define iChannel3 CC_Texture0
#define iChannel4 CC_Texture0
`;

const _fragMain = `
void main()
{
	mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

cc.Class({
  extends: cc.Component,

  properties: {
    shaderNode: cc.Node,
    fragmentURL: {
      default: null,
      type: cc.Asset,
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

  onLoad() {
    if (!this.shaderNode) {
      this.shaderNode = this.node;
    }
    if (this.shaderNode.getComponent(cc.Sprite)) {
      this._useVert = _vert;
    } else {
      this._useVert = _actorVert;
    }
    this.iGlobalTime = 0;
    this.iFrame = 1;
    this.iMouse = {
      x: 0.0,
      y: 0.0,
      z: 0.0,
      w: 0.0,
    };
    this.iDate = {
      x: moment().year(),
      y: moment().month(),
      z: moment().date(),
      w: moment().second(),
    };

    if (this.fragmentURL) {
      const self = this;
      let fileName = this.fragmentURL.nativeUrl.split('/');
      fileName = `shader/${fileName[fileName.length - 1]}`;
      fileName = fileName.split('.')[0];
      cc.loader.loadRes(fileName, (err, txt) => {
        this.fragment = `${_fragDefaultParam} ${txt} ${_fragMain}`;
        // mbgGame.log("fragment:", this.fragment);
        self.render();
      });
    }
  },

  onDestroy() {
    this.iGlobalTime = 0;
    this.iFrame = 1;
    this.iMouse = {
      x: 0.0,
      y: 0.0,
      z: 0.0,
      w: 0.0,
    };
    this.iDate = {
      x: moment().year(),
      y: moment().month(),
      z: moment().date(),
      w: moment().second(),
    };
  },

  render() {
    if (!this.fragment) return;
    if (!this._program) {
      this._program = new cc.GLProgram();
    }
    if (cc.sys.isNative) {
      this._program.initWithString(_vert, this.fragment);
      this._program.link();
      this._program.updateUniforms();
      const glProgramState = cc.GLProgramState.getOrCreateWithGLProgram(this._program);
      glProgramState.setUniformFloat("iGlobalTime", this.iGlobalTime);
      glProgramState.setUniformFloat("iFrame", this.iFrame);
      glProgramState.setUniformVec3(
        "iResolution",
        {
          x: this.shaderNode.width,
          y: this.shaderNode.height,
          z: 1,
        }
      );
      glProgramState.setUniformVec4("iMouse", this.iMouse);
      glProgramState.setUniformVec4("iDate", this.iDate);
    } else {
      this._program.initWithVertexShaderByteArray(this._useVert, this.fragment);
      this._program.addAttribute(cc.macro.ATTRIBUTE_NAME_POSITION, cc.macro.VERTEX_ATTRIB_POSITION);
      this._program.addAttribute(cc.macro.ATTRIBUTE_NAME_COLOR, cc.macro.VERTEX_ATTRIB_COLOR);
      this._program.addAttribute(cc.macro.ATTRIBUTE_NAME_TEX_COORD, cc.macro.VERTEX_ATTRIB_TEX_COORDS);
      this._program.link();
      this._program.updateUniforms();
      this._program.setUniformLocationWith1f(this._program.getUniformLocationForName("iGlobalTime"), this.iGlobalTime);
      this._program.setUniformLocationWith1f(this._program.getUniformLocationForName("iFrame"), this.iFrame);
      this._program.setUniformLocationWith3f(this._program.getUniformLocationForName("iResolution"), this.shaderNode.width, this.shaderNode.height, 1);
      this._program.setUniformLocationWith4f(this._program.getUniformLocationForName("iMouse"), this.iMouse.x, this.iMouse.y, this.iMouse.z, this.iMouse.w);
      this._program.setUniformLocationWith4f(this._program.getUniformLocationForName("iDate"), this.iDate.x, this.iDate.y, this.iDate.z, this.iDate.w);
    }
    this.setProgram(this.shaderNode._sgNode, this._program);
  },

  setProgram(node, program) {
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
    this.iGlobalTime += dt;
    this.iFrame += 1;
    this.render();
  },
});