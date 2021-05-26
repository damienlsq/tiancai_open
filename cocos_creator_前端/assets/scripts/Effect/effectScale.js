//缩放动画
cc.Class({
  extends: cc.Component,

  properties: {
    usingTime: 1,
  },

  // use this for initialization
  onLoad: function() {

  },
  start: function() {
    this.extend = true;
    this.actionFinish = true;
    this.node.scale = 0;
  },
  // called every frame, uncomment this function to activate update callback
  // update: function (dt) {

  // },
  runEffect: function() {
    if (this.actionFinish) {
      this.actionFinish = false;
      var setFinish = cc.callFunc(function() { this.setActionFinish(true) }.bind(this));
      var action;
      if (this.extend) {
        let go = cc.scaleTo(this.usingTime, 1, 1);
        go.easing(cc.easeBackOut());
        action = cc.sequence(go, setFinish);
      }
      else {
        let go = cc.scaleTo(this.usingTime, 0, 0);
        go.easing(cc.easeBackIn());
        action = cc.sequence(go, setFinish);
      }
      this.node.runAction(action);
      this.extend = !this.extend;
    }
  },

  runEffectUnFinish: function(extend) {
    var action;
    if (extend) {
      let go = cc.scaleTo(this.usingTime, 1, 1);
      go.easing(cc.easeBackOut());
      action = go;
    }
    else {
      let go = cc.scaleTo(this.usingTime, 0, 0);
      go.easing(cc.easeBackIn());
      action = go;
    }
    this.node.runAction(action);
  },

  setActionFinish: function(val) {
    this.actionFinish = val;
  },
  setZIndex: function(z) {
    this.node.zIndex = z;
  },
});
