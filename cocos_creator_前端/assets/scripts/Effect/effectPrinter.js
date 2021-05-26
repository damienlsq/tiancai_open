// 打字机效果

cc.Class({
  extends: cc.Component,

  onLoad() {
    let com = this.node.getComponent(cc.Label);
    if (!com) {
      com = this.node.getComponent(cc.RichText);
    }
    this.labelCom = com;
  },

  print(str) {
    this.t = 0;
    this.strArr = str.split('');
    // 先填充空格，不然排版有问题
    // this.labelCom.string = ' ';// _.repeat(' ', this.strArr.length);
  },

  update(dt) {
    if (!this.strArr || this.strArr.length <= 0) return;
    this.t += dt;
    if (this.t >= 0.02) {
      const char = this.strArr.shift();
      this.labelCom.string += char;
      this.t = 0;
    }
  },
});
