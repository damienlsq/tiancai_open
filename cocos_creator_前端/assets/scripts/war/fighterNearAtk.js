const fighterBase = require('fighterBase');

/*
    近战普、技攻击的代码

*/

cc.Class({
  extends: fighterBase,
  properties: {
  },
  onLoad() {
    emitter.on(this, "stopTrace", this.onStopTrace);
  },
  onDestroy() {
    emitter.off(this, "stopTrace");
  },
  onStopTrace(ttt) {
    if (ttt !== this.ttt()) {
      return;
    }
    if (this.m_ArriveCB) {
      this.m_ArriveCB();
      delete this.m_ArriveCB;
    }
  },
  doAttack(dOption) {
    const fighter = this.fighter();
    this.m_ArriveCB = () => {
      this.spineCtrl().doActionNoClear('attack', false);
      this.spineCtrl().setComplteCB(() => {
        this.spineCtrl().doActionNoClear('stand', true);
        this.rushCtrl().rushBack();
        this.rushCtrl().setRushEndCB(() => {
          this.FSM().setState("stand");
        });
      });
    };
    this.spineCtrl().doAction('walk', true);
    const target = dOption.target;
    const hitPos = target.getHitPos();
    const ttt = this.ttt();
    const offset = new cc.Vec2(hitPos.x + (hitPos.x > 0 ? 60 : -60), 0); // y值忽略掉
    ttt.startTrace({
      target,
      duration: fighter.getRushTime() / mbgGame.replaySpeed,
      offset,
    });
  },
});