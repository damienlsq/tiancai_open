const defines = require('warDefines');

cc.Class({
  extends: cc.Component,
  properties: {
  },
  removeMe() {
    this.node.destroy();
  },
  warCom() {
    return mbgGame.warMgr.getWarCom(this.worldIdx());
  },
  worldIdx() {
    return this.fighter().getVar("WorldIdx");
  },
  spine() {
    return this.node.getChildByName('spine');
  },
  spineCtrl() {
    return this.spine().getComponent('spineCtrl');
  },
  fighter() {
    return this.node.getComponent("fighter");
  },
  ctrl() {
    return this.node.getComponent("fighterctrl");
  },
  FSM() {
    return this.node.getComponent("fighterFSM");
  },
  buffIconCtrl() {
    return this.node.getComponent("fighterBuffIcon");
  },
  cmdCtrl() {
    return this.node.getComponent("fighterCmd");
  },
  walkCtrl() {
    return this.node.getComponent("fighterWalk");
  },
  rushCtrl() {
    return this.node.getComponent("fighterRush");
  },
  effectCtrl() {
    return this.node.getComponent("fighterEffect");
  },
  barCtrl() {
    return this.node.getComponent("fighterBar");
  },
  nearAtkCtrl() {
    let com = this.node.getComponent("fighterNearAtk");
    if (!com) {
      com = this.node.addComponent("fighterNearAtk");
    }
    return com;
  },
  farAtkCtrl() {
    let com = this.node.getComponent("fighterFarAtk");
    if (!com) {
      com = this.node.addComponent("fighterFarAtk");
    }
    return com;
  },
  btnCtrl() {
    let com = this.node.getComponent("fighterBtn");
    if (!com) {
      if (!this.fighter().isMonster() &&
        this.fighter().getStandTeam() === defines.TEAM_LEFT) {
        com = this.node.addComponent("fighterBtn");
      }
    }
    return com;
  },
  ttt() {
    return this.node.getComponent('traceToTarget');
  },
  logInfo(...args) {
    mbgGame.log(`[${this.fighter().charaID()}]`, ...args);
  },
});