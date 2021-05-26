cc.Class({
  extends: cc.Component,
  properties: {
    spine: cc.Node,
    timeLabel: cc.Label,
  },
  onLoad() {
    this.spineObject().loadSpine('charasleep');
  },
  setTime(leftTime) {
    let timeCom = this.timeLabel.node.getComponent('effectTimerString');
    if (!timeCom) {
      timeCom = this.timeLabel.node.addComponent('effectTimerString');
    }
    timeCom.initMe({
      duration: leftTime,
      endStr: '完成',
      interval: 1,
    });
  },
  spineObject() {
    const so = this.spine.getComponent("spineObject");
    return so;
  },
  setUnlockState(b) {
    const so = this.spineObject();
    so.setSkin(`skin${this.charaID}`);
    so.playAnimation(b ? 'sleep2' : 'sleep1');
  },
  setClickCB(cb) {
    this.m_cb = cb;
  },
  onClick() {
    if (this.m_cb) this.m_cb(this);
  },
});
