const spineBase = require('spineBase');

// spineCtrl 只是角色spine使用，包括主角和怪物，NPC
cc.Class({
  extends: spineBase,

  onLoad() {
  },
  setMyAnimation(trackIndex, name, loop) {
    if (!this.isValid) {
      return null;
    }
    const ret = this.spine().setAnimation(trackIndex, name, !!loop);
    if (!ret) {
      this.logError(name, 'setMyAnimation');
    }
    return ret;
  },
  // ANIMATIONS
  stop() {
    if (!this.isValid) {
      return;
    }
    this.spine().clearTracks && this.spine().clearTracks();
    this.spine().setBonesToSetupPose && this.spine().setBonesToSetupPose();
    this.spine().setSlotsToSetupPose && this.spine().setSlotsToSetupPose();
  },
  resetNodeState() {
    this.node.stopAllActions();
    this.node.color = cc.Color.WHITE;
  },
  getCurrentAniName() {
    if (!this.isValid) {
      return null;
    }
    const entry = this.spine().getCurrent(0);
    const name = (entry && entry.animation) ? entry.animation.name : 0;
    return name;
  },
  randIdle() {
    if (!this.isValid) {
      return;
    }
    this.doOnceAction(`idle${mbgGame.getRandomInt(1, 2)}`, 'stand');
    this.scheduleOnce(this.randIdle,
      mbgGame.getRandomInt(30, 60)); // 30, 60
  },
  doIdle() {
    this.stop();
    this.doAction('stand', true);
    if (this._doingRandIdle) return;
    this._doingRandIdle = true;
    this.scheduleOnce(this.randIdle,
      mbgGame.getRandomInt(30, 60));
  },
  randDie() {
    if (!this.isValid) {
      return;
    }
    const action = `die${mbgGame.getRandomInt(1, 3)}`;
    const node = this.node.parent;
    const fighter = node.getComponent('fighter');
    if (!fighter.isDie()) {
      // 已经复活了
      return;
    }
    this.doOnceAction(action, 'die0');
    this.unschedule(this.randDie);
    this.scheduleOnce(this.randDie,
      mbgGame.getRandomInt(10, 30)); // 10, 30
  },
  doDie(doRand) {
    if (!this.isValid) {
      return;
    }
    const name = this.getCurrentAniName();
    if (name === 'die') return;
    this.resetNodeState();
    this.stop();
    this.spine().setCompleteListener(() => { });
    this.doAction("die", false);
    if (doRand) {
      this.unschedule(this.randDie);
      this.scheduleOnce(this.randDie,
        mbgGame.getRandomInt(10, 30));
    }
  },
  doRevive() {
    if (!this.isValid) {
      return;
    }
    const name = this.getCurrentAniName();
    if (name === 'resurrection') return;
    this.resetNodeState();
    this.stop();
    this.doOnceAction('resurrection', 'stand');
  },
  removeMe() {
    this.turnLeft();
    if (this._spine) {
      delete this._spine;
    }
    delete this._doingRandIdle;
    this.unscheduleAllCallbacks();
    delete this.onCompleteCB;
    delete this.onSpineLoad;
  },
  setVoidWeapon() {
    this.setLeftWeapon('void');
    this.setRightWeapon('void');
  },
  setLeftWeapon(lweapon) {
    try {
      this.spine().setAttachment("lweapon", lweapon);
    } catch (e) {
      cc.warn("[setLeftWeapon] lweapon failed, ", lweapon, this.spineName());
    }
  },
  setRightWeapon(rweapon) {
    try {
      this.spine().setAttachment("rweapon", rweapon);
    } catch (e) {
      cc.warn("[setRightWeapon] rweapon failed, ", rweapon, this.spineName());
    }
  },
});