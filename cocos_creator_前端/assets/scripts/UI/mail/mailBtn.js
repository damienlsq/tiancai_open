const mbgGame = require("mbgGame");

cc.Class({
  extends: cc.Component,

  properties: {
    redTip: cc.Node,
  },

  onLoad() {
    this.redTip.active = false;
    emitter.on(this, "newMailCome", this.newMailCome);
  },

  newMailCome(count) {
    const mailsData = mbgGame.getCache('player.mailList');
    if (count == null) {
      if (mailsData) {
        count = _.filter(mailsData, { rf: 0 }).length;
      }
    }
    // mbgGame.log('count', count);
    if (count) {
      this.redTip.active = true;
    } else {
      this.redTip.active = false;
    }
  },
});
