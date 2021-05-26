cc.Class({
  extends: cc.Component,

  properties: {
    gameUI: cc.Prefab,
    gameUINode: cc.Node,
  },

  // use this for initialization
  onLoad() {
    const gameUI = cc.instantiate(this.gameUI);
    this.gameUINode.addChild(gameUI);
  },
});