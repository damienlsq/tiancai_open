const defines = require('warDefines');
const fighterBase = require('fighterBase');

/*
    远程普、技攻击的代码

*/

cc.Class({
  extends: fighterBase,
  properties: {
  },
  onLoad() {
    this.m_FlyObjs = [];
    emitter.on(this, "stopTrace", this.onStopTrace);
  },
  onDestroy() {
    emitter.off(this, "stopTrace");
  },
  onStopTrace(ttt) {
    if (!this.m_tttOfFlyObj || ttt !== this.m_tttOfFlyObj) {
      return;
    }
    const node = this.m_tttOfFlyObj.node;
    if (node.isValid) {
      node.destroy();
    }
    delete this.m_tttOfFlyObj;
  },
  halt() {
    if (this.m_tttOfFlyObj) {
      const node = this.m_tttOfFlyObj.node;
      if (node.isValid) {
        node.destroy();
      }
      delete this.m_tttOfFlyObj;
    }
    this.unscheduleAllCallbacks();
    if (this.m_FlyObjs) {
      for (let i = 0; i < this.m_FlyObjs.length; i++) {
        const node = this.m_FlyObjs[i];
        if (node.isValid) {
          node.destroy();
        }
      }
      this.m_FlyObjs = [];
    }
  },
  doAttack(dOption) {
    const fighter = this.fighter();
    dOption.action = dOption.action || 'airAttack';
    if (dOption.repeat) {
      fighter.spineCtrl().doActionNoClear(dOption.action, true);
    } else {
      fighter.spineCtrl().doOnceAction(dOption.action, 'stand');
    }
    if (dOption.target || dOption.allowNoTarget) { // 有的加buff技能就不会有飞行物
      this.scheduleOnce(this.addFlyObj.bind(this, dOption), dOption.delayTime || fighter.getFlyDelay());
    }
  },
  addFlyObj(dOption) {
    if (!this.node || !this.node.isValid) return;

    const fighter = this.fighter();
    const target = dOption.target;
    const allowNoTarget = dOption.allowNoTarget;
    const canRotate = dOption.canRotate;
    const flytime = (dOption.flytime || fighter.getFlyTime()) / mbgGame.replaySpeed;
    const flyspine = dOption.flyspine;
    if (!flyspine) {
      // mbgGame.error('[no fly spine]', fighter.getSpineName(), fighter.charaID());
      return;
    }
    let targetPos = null;
    let offset = null;
    if (target) {
      offset = target.getHitPos();
      targetPos = target.node.getPosition();
    } else if (allowNoTarget) {
      targetPos = this.fighter().getEnemyCenterPos();
    } else {
      cc.warn("[addFlyObj] fail, flyspine", flyspine);
      return;
    }
    const fly = cc.instantiate(this.rushCtrl().flyObject);
    fly.active = true;
    this.node.parent.parent.addChild(fly);
    this.m_FlyObjs.push(fly);
    fly.zIndex = 999;
    const com = fly.getComponent('flyObject');
    com.initMe(flyspine, fly);
    const spineObj = com.spineObj.getComponent("spineObject");
    if (this.fighter().getDir() === defines.DIR_RIGHT) {
      spineObj.turnRight();
    } else {
      spineObj.turnLeft();
    }
    spineObj.playAnimationAndDestroy(flyspine, (_fly) => {
      const idx = this.m_FlyObjs.indexOf(_fly);
      if (idx !== -1) {
        this.m_FlyObjs.splice(idx, 1);
      }
    });

    // 放飞行物到攻击发出位置
    const flyPos = fighter.getFlyPos();
    if (flyPos) {
      fly.setPosition(this.node.getPosition().add(flyPos));
    }
    const dConfig = mbgGame.config[`effect${flyspine}`];
    // 追踪受击位置
    const ttt = fly.getComponent('traceToTarget');
    this.m_tttOfFlyObj = ttt;
    ttt.canRotate = canRotate;
    ttt.startTrace({
      parabolic: dConfig && dConfig.parabo,
      duration: flytime,
      canRotate: true,
      target,
      targetPos,
      offset,
      fly,
    });
  },
});