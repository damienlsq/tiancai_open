const defines = require('warDefines');
const fighterBase = require('fighterBase');

/*
    rush效果的控制代码

    TODO rush应该指近战攻击 远程攻击不要混在rush里

    目前有：
    普通攻击rush:
        远程普攻: 生成一个子弹对象让子弹rush到目标处
        近战普攻：角色自己rush到目标处
    技能攻击rush:

    闪避rush


*/

cc.Class({
  extends: fighterBase,
  properties: {
    flyObject: cc.Node,
  },
  onLoad() {

  },
  runAction(action) {
    this.node.stopAllActions();
    this.node.runAction(action);
  },
  rushBackWithDelay(delay) {
    this.scheduleOnce(this.rushBack, delay);
  },
  rushBack() {
    if (!this.node || !this.node.isValid) return;

    if (this.fighter().isDie()) return;
    const ttt = this.ttt();
    if (ttt) {
      ttt.stopTrace();
    }
    this.spineCtrl().doAction('walk', true);
    const move = cc.moveTo(mbgGame.config.constTable.AtkBackTime, this.fighter().getPos());
    this.runAction(cc.sequence(move, cc.callFunc(this.onRushBackEnd.bind(this))));
  },
  onRushBackEnd() {
    if (this.m_RushEndCB) {
      this.m_RushEndCB();
    }
    this.m_RushEndCB = null;
  },
  setRushEndCB(cb) {
    this.m_RushEndCB = cb;
  },
  doMissRush() {
    // 闪避动作
    if (this.FSM().getState() === 'stand') {
      const dis = 75;
      this.runAction(
        cc.sequence(cc.moveBy(0.1, this.fighter().getStandTeam() === defines.TEAM_RIGHT ? dis : -dis, 0),
          cc.moveBy(0.1, this.fighter().getStandTeam() === defines.TEAM_RIGHT ? -dis : dis, 0)));
    }
  },
});