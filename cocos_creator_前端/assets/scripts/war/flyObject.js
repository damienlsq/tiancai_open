const mbgGame = require("mbgGame");

cc.Class({
  extends: cc.Component,

  properties: {
    spineObj: cc.Node,
    img: cc.Sprite,
  },

  // use this for initialization
  onLoad() {
    this.spineObj.active = false;
    this.img.node.active = false;
  },

  initMe(flyspine, root) {
    if (flyspine.indexOf('.png') === -1) {
      // spineObj
      this.spineObj.active = true;
      this.img.node.active = false;
      const com = this.spineObj.getComponent("spineObject");
      com.loadSpine(flyspine);
    } else {
      this.spineObj.active = false;
      this.img.node.active = true;
      const imgname = flyspine.substr(0, flyspine.length - 4);
      mbgGame.resManager.setImageFrame(this.img, 'images', imgname);
    }
  },
});