const defines = require('warDefines');
const fighterBase = require('fighterBase');

/*
    fighter的状态机实现
    TODO：
    每个状态是否应该单独一个组件，
    切换状态时，
    旧状态组件enabled=false、执行leave(),
    新状态组件enabled=true，执行enter(),
    特定状态之间切换的特殊逻辑应放在newState组件里,newState判断oldState是什么然后分支逻辑
*/


cc.Class({
  extends: fighterBase,
  properties: {
    // 这个文件不需要关联任何UI的东西
  },
  onLoad() {
  },
  // 当前动作播放完后自动进入下一个state
  setNextState(state) {
    if (state == null) {
      this.spineCtrl().setComplteCB();
      return;
    }
    this.spineCtrl().setComplteCB(() => {
      this.setState(state, { force: true });
    });
  },
  onEnterState(oldState, state, dOption) {
    const fighter = this.fighter();
    const ctrl = this.ctrl();
    const spineCtrl = this.spineCtrl();
    this.setNextState(null);
    // mbgGame.log("onEnterState", oldState, state, fighter.charaID());
    switch (state) {
      case 'revive': {
        spineCtrl.doRevive();
        this.setNextState("stand");
        break;
      }
      case 'stand': {
        spineCtrl.doAction('stand', true);
        break;
      }
      case 'attack': { // 普攻
        const nowtime = mbgGame.netCtrl.getServerNowTime();
        fighter.setLastAtkTime(nowtime);
        if (dOption.critic) {
          ctrl.addBuff({
            stobjID: -1,
            buffname: "criticeffect",
            noIcon: true,
          });
        }
        const iAtkType = fighter.getAtkType();
        if (iAtkType === 0) {
          dOption.flyspine = fighter.getFlySpineName();
          this.farAtkCtrl().doAttack(dOption);
        } else {
          this.nearAtkCtrl().doAttack(dOption);
        }
        if (dOption.t > 0) {
          this.scheduleOnce(() => {
            this.setState('stand');
          }, dOption.t);
        } else {
          this.setNextState("stand");
        }
        break;
      }
      case 'skill': {
        const target = dOption.target;
        const skillID = dOption.skillID;
        const tplID = dOption.tplID;
        const duration = +dOption.duration;
        const repeat = defines.getSkill_IsSkillAniRepeat(skillID, tplID);
        spineCtrl.resetNodeState();
        let action = 'skill';
        if (fighter.getSpineName().startsWith("chara")) {
          action = `skill${dOption.skillID}`;
        }
        if (duration > 0) {
          this.scheduleOnce(() => {
            this.setState('stand', { force: true });
          }, duration);
        } else {
          this.setNextState("stand");
        }
        const dMTplConfig = this.fighter().getMTplConfig();
        // 是否需要生成飞行物
        const noTarget = dMTplConfig.noTarget;
        const flyspine = dMTplConfig.SkillFlySpine;
        const flytime = dMTplConfig.FlyFrames / defines.FPS;
        const delayTime = dMTplConfig.MainFrame / defines.FPS;
        this.farAtkCtrl().doAttack({
          action,
          repeat,
          canRotate: !dMTplConfig.FlyNoRot,
          skillID,
          flyspine,
          delayTime,
          flytime,
          target,
          allowNoTarget: noTarget,
        });
        // 可能有定点动画
        ctrl.playFixPosEffect(skillID);
        // 喊话
        let skillname = '';
        if (this.fighter().isMonster()) {
          skillname = this.fighter().getSkillName(skillID, 0);
          if (!skillname) {
            skillname = mbgGame.getString(`skillname${skillID}`);
          }
        } else {
          skillname = mbgGame.getString(`skillname${skillID}`);
        }
        this.ctrl().effectCtrl().yell(skillname);
        break;
      }
      case 'miss': {
        if (this.fighter().isDie()) break;
        const effect = dOption.effect;
        if (effect) {
          ctrl.showHurtEffect(effect);
        }
        spineCtrl.doAction('miss', false);
        this.rushCtrl().doMissRush();
        ctrl.hurt({ type: 'miss', numType: 'miss' });
        this.setNextState("stand");
        break;
      }
      case 'walk': {
        spineCtrl.doAction('walk', true);
        break;
      }
      case 'win': {
        if (oldState === 'die') {
          fighter.cleanDieFlag();
          this.btnCtrl() && this.btnCtrl().updateSkillBtn("win");
          fighter.spineCtrl().doSequenceAction('resurrection', 'win', 'stand');
        } else {
          fighter.spineCtrl().doSequenceAction('win', 'stand');
        }
        fighter.spineCtrl().setVoidWeapon();
        this.setNextState("stand");
        break;
      }
      case 'die': {
        fighter.spineCtrl().doDie(!fighter.isMonster());
        break;
      }
      default:
        break;
    }
  },
  getState() {
    return this.curState;
  },
  setState(state, dOption) {
    if (!this.node || !this.node.isValid) return;

    if (this.curState === state) {
      return;
    }
    if (!dOption || !dOption.force) {
      if (this.curState === "die" && state !== "revive") {
        return;
      }
      if (this.curState === "skill" && state !== "die") {
        // 技能除了force和die，不能被中断
        return;
      }
    }
    const oldState = this.curState;
    this.curState = state;
    this.onEnterState(oldState, state, dOption);
    // mbgGame.log("setState,", this.curState, "->", state, "ID:", this.fighter().charaID());
    emitter.emit("FSM.setState", this.fighter(), this.curState);
  },
});