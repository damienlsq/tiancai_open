var mbgGame = require('mbgGame');
cc.Class({
  extends: cc.Component,

  properties: {
    m_CharaID: 0,
    spriteChara: cc.Sprite,
    dnowPosition: cc.Vec2,
  },

  // use this for initialization
  onLoad: function() {},

  // called every frame, uncomment this function to activate update callback
  // update: function (dt) {

  // },
  getSprite: function() {
    return this.spriteChara;
  },

  clearSprite: function() {
    this.spriteChara.spriteFrame = null;
  },

  moveDnow: function() {
    this.node.setPosition(new cc.Vec2(this.node.x, 0));
    //图片下降
    let actionMove = cc.moveTo(0.5, new cc.Vec2(this.node.x, this.dnowPosition.y));
    actionMove.easing(cc.easeBounceIn());
    this.spriteChara.node.runAction(actionMove);
  },

  moveUp: function() {
    this.node.setPosition(new cc.Vec2(this.node.x, this.dnowPosition.y));
    //图片升上
    let move = cc.moveTo(0.5, new cc.Vec2(0, 0));
    move.easing(cc.easeBounceOut());
    this.spriteChara.node.runAction(move);
  },

  moveLeft: function() {
    let move = cc.moveTo(0.5, new cc.Vec2(this.node.x - mbgGame.designWidth / 5, this.node.y));
    move.easing(cc.easeBounceOut());
    this.spriteChara.node.runAction(move);
  },

  moveRight: function() {
    let move = cc.moveTo(0.5, new cc.Vec2(this.node.x + mbgGame.designWidth / 5, this.node.y));
    move.easing(cc.easeBounceOut());
    this.spriteChara.node.runAction(move);
  },
});
