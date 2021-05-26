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

const _frag = `
#ifdef GL_ES  
precision mediump float;  
#endif  
  
varying vec2 v_texCoord;  
uniform float u_dH;  
uniform float u_dS;  
uniform float u_dL;  
  
void main() {  

    vec4 texColor=texture2D(CC_Texture0, v_texCoord).rgba;
    float r=texColor.r;
    float g=texColor.g;
    float b=texColor.b;
    float a=texColor.a;
    float h;  
    float s;  
    float l;  
    {  
        float max=max(max(r,g),b);  
        float min=min(min(r,g),b);  

        if(max==min){  
  
            h=0.0;  
        }else if(max==r&&g>=b){  
            h=60.0*(g-b)/(max-min)+0.0;  
        }else if(max==r&&g<b){  
            h=60.0*(g-b)/(max-min)+360.0;  
        }else if(max==g){  
            h=60.0*(b-r)/(max-min)+120.0;  
        }else if(max==b){  
            h=60.0*(r-g)/(max-min)+240.0;  
        }  

        l=0.5*(max+min);  

        if(l==0.0||max==min){  
            s=0.0;  
        }else if(0.0<=l&&l<=0.5){  
            s=(max-min)/(2.0*l);  
        }else if(l>0.5){  
            s=(max-min)/(2.0-2.0*l);  
        }  
    }  

    h=h+u_dH;  
    s=min(1.0,max(0.0,s+u_dS));  


    vec4 finalColor;  
    {  
        float q;  
        if(l<0.5){  
            q=l*(1.0+s);  
        }else if(l>=0.5){  
            q=l+s-l*s;  
        }  
        float p=2.0*l-q;  
        float hk=h/360.0;  
        float t[3];  
        t[0]=hk+1.0/3.0;t[1]=hk;t[2]=hk-1.0/3.0;  
        for(int i=0;i<3;i++){  
            if(t[i]<0.0)t[i]+=1.0;  
            if(t[i]>1.0)t[i]-=1.0;  
        }
        float c[3];  
        for(int i=0;i<3;i++){  
            if(t[i]<1.0/6.0){  
                c[i]=p+((q-p)*6.0*t[i]);  
            }else if(1.0/6.0<=t[i]&&t[i]<0.5){  
                c[i]=q;  
            }else if(0.5<=t[i]&&t[i]<2.0/3.0){  
                c[i]=p+((q-p)*6.0*(2.0/3.0-t[i]));  
            }else{  
                c[i]=p;  
            }  
        }  
        finalColor=vec4(c[0],c[1],c[2],a);  
    }  
  
    finalColor+=vec4(u_dL,u_dL,u_dL,0.0);  
  
    gl_FragColor=finalColor;  
  
}  
`;

cc.Class({
  extends: cc.Component,

  properties: {
    dH: {
      default: 0,
      type: cc.Integer,
      range: [0, 360, 1],
      slide: true,
    },
    dS: {
      default: 0,
      type: cc.Integer,
      range: [-1, 1, 0.01],
      slide: true,
    },
    dL: {
      default: 0,
      type: cc.Integer,
      range: [-1, 1, 0.01],
      slide: true,
    },
    // affectChildren: {
    //     default: true,
    //     notify: function () {

    //     }
    // },
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
    this.render(this.dH, this.dS, this.dL, false);
  },

  editor: {
    requireComponent: cc.Sprite,
    executeInEditMode: true,
  },

  onFocusInEditor() {
    if (this.previewId != null) {
      clearInterval(this.previewId);
    }
    const self = this;
    this.previewId = setInterval(() => {
      self.render(self.dH, self.dS, self.dL, false);
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
    this.dH = this.dL = this.dS = 0;
    this.render(this.dH, this.dS, this.dL, false);
  },

  render(h, s, l, enforce) {
    if (!this._program) {
      this._program = new cc.GLProgram();
    }
    if (cc.sys.isNative) {
      this._program.initWithString(_vert, _frag);
      this._program.link();
      this._program.updateUniforms();
      const glProgramState = cc.GLProgramState.getOrCreateWithGLProgram(this._program);
      glProgramState.setUniformFloat("u_dH", h);
      glProgramState.setUniformFloat("u_dS", s);
      glProgramState.setUniformFloat("u_dL", l);
    } else {
      this._program.initWithVertexShaderByteArray(_vert, _frag);
      this._program.addAttribute(cc.macro.ATTRIBUTE_NAME_POSITION, cc.macro.VERTEX_ATTRIB_POSITION);
      this._program.addAttribute(cc.macro.ATTRIBUTE_NAME_COLOR, cc.macro.VERTEX_ATTRIB_COLOR);
      this._program.addAttribute(cc.macro.ATTRIBUTE_NAME_TEX_COORD, cc.macro.VERTEX_ATTRIB_TEX_COORDS);
      this._program.link();
      this._program.updateUniforms();
      this._program.setUniformLocationWith1f(this._program.getUniformLocationForName("u_dH"), h);
      this._program.setUniformLocationWith1f(this._program.getUniformLocationForName("u_dS"), s);
      this._program.setUniformLocationWith1f(this._program.getUniformLocationForName("u_dL"), l);
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
});