const spineBase = require('spineBase');

cc.Class({
  extends: spineBase,
  properties: {},
  onLoad() {
  },
  setMyAnimation(trackIndex, name, loop) {
    const ret = this.spine().setAnimation(trackIndex, name, loop);
    if (!ret) {
      mbgGame.warn("setMyAnimation 缺少动作:", trackIndex, this.spineName(), name);
    }
    return ret;
  },
  // ANIMATIONS
  stop() {
    this.spine().clearTracks();
    this.spine().setBonesToSetupPose();
    this.spine().setSlotsToSetupPose();
  },
  playAnimation(act) {
    this.stop();
    this.doAction(act, true);
  },
  animationDestroy() {
    this.beforeRemove();
    if (this._destroyCB) {
      this._destroyCB(this.node);
    }
    if (!this.node || !this.node.isValid) return;
    this.node.destroy();
  },
  playAnimationAndDestroy(act, destroyCB) {
    this.stop();
    if (destroyCB) {
      this._destroyCB = destroyCB;
    }
    this.spine().setCompleteListener(this.animationDestroy.bind(this));
    const ret = this.doAction(act, false);
    if (!ret) {
      mbgGame.error('playAnimationAndDestroy failed', act);
    }
  },
  beforeRemove() {
    if (this.onSpineLoad) {
      delete this.onSpineLoad;
    }
  },
  doShakeAni() {
    const degree = 5;
    const t = 0.1;
    this.node.skewX = 0;
    this.node.skewY = 0;
    this.node.stopAllActions();
    this.node.runAction(cc.sequence(
      cc.skewBy(t, -degree, 0),
      cc.skewBy(t * 2, degree * 2, 0),
      cc.skewBy(t, -degree, 0),
      cc.skewBy(t, -degree, 0),
      cc.skewBy(t * 2, degree * 2, 0),
      cc.skewBy(t, -degree, 0),
      cc.delayTime(1)).repeatForever());
  },
});