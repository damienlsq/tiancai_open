
cc.Class({
  extends: cc.Component,

  properties: {
    hour: cc.Node,
    minute: cc.Node,
  },

  onLoad() {
    this.schedule(this.refrehMe, 60, cc.macro.REPEAT_FOREVER, 0.1);
  },
  // use this for initialization
  refrehMe() {
    // mbgGame.log("clock refresh");
    this.hour.angle = -moment().hour() * 360 / 12;
    this.minute.angle = -moment().minute() * 360 / 60;
  },
});