const mbgGame = require('mbgGame');

cc.Class({
  extends: cc.Component,

  properties: {
    icon: cc.Sprite,
    frame: cc.Sprite,
  },

  onClick() {
    if (this.onChoose) {
      this.onChoose(this.id);
    }
  },

  setIcon(id) {
    this.id = id;
    const frameID = Math.floor(id / 1000);
    const flagID = Math.floor(id % 1000);
    if (id === -1 || id === 0) {
      mbgGame.resManager.setAutoAtlasFrame(this.icon, 'flagIcon', 'flag0');
      return;
    }
    if (frameID === 0) {
      // 无框
      this.frame.node.active = false;
    } else {
      this.frame.node.active = true;
      mbgGame.resManager.setAutoAtlasFrame(this.frame, 'flagIcon', `flagFrame${frameID}`);
    }

    if (flagID === 0) {
      // 无内容
      this.icon.node.active = false;
    } else {
      this.icon.node.active = true;
      mbgGame.resManager.setAutoAtlasFrame(this.icon, 'flagIcon', `flag${flagID}`);
    }
  },
});
