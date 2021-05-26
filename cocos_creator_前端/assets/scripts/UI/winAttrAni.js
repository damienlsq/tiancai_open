cc.Class({
  extends: cc.Component,

  properties: {
    itemAttrAni: cc.Node,
    skillAttrAni: cc.Node,
    container: cc.Node,
  },
  onLoad() {
  },
  initAttrAni(dData, type) {
    this.effectGradually = this.node.getComponent('effectGradually');
    this.effectGradually.setPassActionCB(this.onPassAction.bind(this));
    const attrs = dData.attrs;
    const objs = [];
    const doAni = (obj) => {
      obj.opacity = 0;
      obj.y -= 30;
      obj.runAction(cc.moveBy(0.1, 0, 30));
      obj.runAction(cc.fadeIn(0.1));
    };
    for (let i = 0; i < attrs.length; i++) {
      let obj;
      if (type === 'itemAttrAni') {
        obj = cc.instantiate(this.itemAttrAni);
        obj.active = true;
      } else if (type === 'skillAttrAni') {
        obj = cc.instantiate(this.skillAttrAni);
        obj.active = true;
      }
      this.container.addChild(obj);
      objs.push(obj);
      this.effectGradually.pushAction(
        () => {
          obj.active = false;
        },
        () => {
          obj.active = true;
          doAni(obj);
          const c = obj.getComponent(type);
          c.playAni(attrs[i], 1.0);
        },
        () => {
        }, 0.3);
    }
    this.effectGradually.pushAction(
      () => {
      },
      () => {
      },
      () => {
      }, 0.9);
    for (let i = 0; i < objs.length; i++) {
      const obj = objs[i];
      this.effectGradually.pushAction(
        () => {
        },
        () => {
          obj.runAction(cc.fadeOut(0.3));
        },
        () => {
        });
    }
    this.effectGradually.pushAction(
      () => {
      },
      () => {
        this.node.runAction(cc.fadeOut(0.3));
      },
      () => {
      }, 0.3);
    this.effectGradually.readyAction();
    this.effectGradually.startAction();
  },
  onPassAction() {
    this.node.destroy();
  },
});
