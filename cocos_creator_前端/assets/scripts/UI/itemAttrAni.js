const warDefines = require('warDefines');

cc.Class({
  extends: cc.Component,

  properties: {
    icon: cc.Sprite,
    fromLabel: cc.RichText,
    toLabel: cc.RichText,
    addLabel: cc.RichText,
  },
  onLoad() {
  },
  playAni(dData, duration) {
    this.attr = dData.attr;
    this.from = dData.from;
    this.to = dData.to;
    this.attrType = dData.type;
    this.duration = duration;
    this.t = 0;
    this.fromLabel.string = mbgGame.getBoldStr(this.transVal(this.from));
    const add = this.transVal(this.to - this.from);
    this.addLabel.string = mbgGame.getBoldStr(`(+${add})`);
    mbgGame.resManager.setAutoAtlasFrame(this.icon, 'uiBase', warDefines.iconName[this.attr]);
  },
  update(dt) {
    this.t += dt;
    const p = Math.min(this.t / this.duration, 1);
    const current = this.from + (p * (this.to - this.from));
    const c = this.transVal(current);
    this.toLabel.string = mbgGame.getBoldStr(`${c}`);
  },
  transVal(val) {
    return warDefines.transValToStr(Math.round(val), this.attr, this.attrType);
  },
});
