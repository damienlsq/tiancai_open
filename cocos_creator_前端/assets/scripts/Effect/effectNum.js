cc.Class({
  extends: cc.Component,

  properties: {},

  // use this for initialization
  onLoad() {
    this.numStr = this.node.getComponent(cc.Label);
    this.needAdd = false;
    this.add = 0;
    this.timeCount = 0;
  },

  // called every frame, uncomment this function to activate update callback
  update(dt) {
    this.timeCount += dt;
    if (this.needAdd && this.numStr) {
      if (this.current < this.to) {
        this.current += this.add;
        this.numStr.string = mbgGame.smartNum(Math.round(this.current));
        if (this.timeCount > 100) {
          mbgGame.playSound('UI_XpGet');
          this.timeCount = 0;
        }
      } else {
        this.numStr.string = mbgGame.smartNum(Math.round(this.to));
        this.needAdd = false;
      }
    }
  },

  setNumTo(num, time) {
    if (time === 0) {
      this.needAdd = false;
      this.numStr.string = num;
    } else {
      if (this.numStr) {
        this.from = parseInt(this.numStr.string);
        this.to = num;
        this.current = this.from;
        this.add = (this.to - this.from) / time / 60;
        this.needAdd = true;
      }
    }
  },
});