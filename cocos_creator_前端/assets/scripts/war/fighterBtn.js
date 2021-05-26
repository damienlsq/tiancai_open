const defines = require('warDefines');
const fighterBase = require('fighterBase');

const calResult = (dResult1, dResult2) => {
  if (dResult1 && dResult2) {
    if (dResult1.lefttime > dResult2.lefttime) {
      return dResult1;
    }
    return dResult2;
  } else if (dResult1) {
    return dResult1;
  } else if (dResult2) {
    return dResult2;
  }
  return null;
};


cc.Class({
  extends: fighterBase,
  properties: {
  },
  onLoad() {
    this.m_Enabled = false;
    emitter.on(this, "updateSkillBtn", this.updateSkillBtn);
    emitter.on(this, "onClickBtn", this.onClickBtn);
  },
  onDestroy() {
    this.m_Enabled = false;
    emitter.off(this, "updateSkillBtn");
    emitter.off(this, "onClickBtn");
  },
  bindBtnCom(com) {
    this.m_BtnCom = com;
  },
  btnCom() {
    return this.m_BtnCom;
  },
  // 在这里操控buttonSkill组件
  update() {
    if (!mbgGame.warMgr) {
      return;
    }
    if (!this.btnCom()) {
      return;
    }
    const fighter = this.fighter();
    if (fighter.isDie()) {
      this.update_die();
      return;
    }
    if (!this.m_Enabled) {
      this.btnCom().setCdPercent(1);
      return;
    }
    this.update_skill();
  },
  // 死亡状态时
  update_die() {
    this.btnCom().setCdPercent(1);
  },
  // 非死亡状态时
  update_skill() {
    const worldIdx = this.fighter().worldIdx();
    let dState;
    if (worldIdx === 99) {
      dState = this.getSkillCDState_PVP();
    } else {
      dState = this.getSkillCDState();
    }
    if (!dState) {
      return;
    }
    this.btnCom().setCdPercent(this.fighter().isDie() ? 1 : 1 - dState.progress);
  },
  onClickBtn(objID) {
    const fighter = this.fighter();
    if (objID !== fighter.objID()) {
      return;
    }
    if (!this.validUseSkill()) {
      return;
    }
    this.useSkill();
    defines.addTrackTag('使用技能', 1, 'count');
  },
  validUseSkill() {
    const fighter = this.fighter();
    const warCom = fighter.warCom();
    if (warCom.isReplayMode()) {
      return false;
    }
    if (fighter.isDie()) {
      if (defines.CanReviveWorlds.indexOf(fighter.worldIdx()) !== -1) {
        this.onReviveChara();
      }
      return false;
    }
    // 判断是否处于不可施放状态，弹提示
    if (!this.m_Enabled) {
      let err;
      if (this.fighter().getAttr("btn") <= 0) {
        if (this.fighter().getAttr("dizzy") > 0) {
          err = mbgGame.getString(`errcode${mbgGame.config.ErrCode.UseSkill_Dizzy}`);
        }
        if (this.fighter().getAttr("silent") > 0) {
          err = mbgGame.getString(`errcode${mbgGame.config.ErrCode.UseSkill_Silent}`);
        }
      }
      if (err) {
        mbgGame.managerUi.floatMessage(err);
      }
      return false;
    }
    const e = warCom.warEnergy.getEnergy();
    const iCost = fighter.getSkillCostEnergy();
    if (iCost > e) {
      // mbgGame.managerUi.floatMessage(mbgGame.getString("errcode" + 115));
      return false;
    }
    return true;
  },
  onReviveChara() {
    const self = this;
    const iCost = this.fighter().getReviveCost();
    mbgGame.managerUi.createConfirmDialog(
      mbgGame.getString("revivecost", {
        d: iCost,
      }),
      () => {
        self.onReviveChara2();
      });
  },
  onReviveChara2() {
    mbgGame.netCtrl.sendMsg("war.revive", {
      data: {
        worldIdx: this.fighter().worldIdx(),
        charaID: this.fighter().charaID(),
      },
    }, (data) => {
      mbgGame.log("[onReviveChara]", data);
      if (data.code === "ok") {
        //
      } else {
        mbgGame.managerUi.floatMessage(data.err);
      }
    });
  },
  useSkill() {
    if (this.FSM().getState() === "attack") {
      // 普攻时不能放技能，不然普攻动作会被覆盖
      // 先把按钮设为disable，给玩家即时反馈
      this.setEnabled(false);
      emitter.on(this, "FSM.setState", (fighter, state) => {
        if (fighter === this.fighter() && state === "stand") {
          this.useSkillReal();
        }
      });
    } else {
      this.useSkillReal();
    }
  },
  useSkillReal() {
    emitter.off(this, "FSM.setState");
    const fighter = this.fighter();
    const warCom = fighter.warCom();
    const iSkillID = fighter.getActiveSkillID();
    mbgGame.log("useSkillReal", fighter.charaID(), iSkillID);
    warCom.callBSWarFunc("useSkill", fighter.charaID(), iSkillID);
    this.updateSkillBtn("useSkillReal");
  },
  updateSkillBtn(reason) {
    mbgGame.log("updateSkillBtn reason", reason, this.fighter().charaID());
    const fighter = this.fighter();
    const com = this.btnCom();
    if (!com) {
      return;
    }
    const warCom = fighter.warCom();
    const iEnergy = fighter.getSkillCostEnergy();
    com.setEnergy(iEnergy);

    let enabled = true;
    if (fighter.getAttr("btn") <= 0 && (
      fighter.getAttr("dizzy") > 0 || fighter.getAttr("silent") > 0)) {
      enabled = false;
    } else if (fighter.isDie()) {
      enabled = false;
    }
    if (!warCom.isStarted()) {
      enabled = false;
    }
    mbgGame.log("updateSkillBtn enabled", enabled, this.fighter().charaID());
    this.setEnabled(enabled, reason);
  },
  setEnabled(enabled, reason) {
    mbgGame.log("setEnabled enabled", enabled, reason, this.fighter().charaID());
    this.m_Enabled = enabled;
    const com = this.btnCom();
    if (!com) {
      return;
    }
    com.setEnabled(enabled);
  },
  getSkillCDState_PVP() {
    const fighter = this.fighter();
    const iBeginTime = fighter.getSkillLastUsedTime();
    const iCostTime = mbgGame.config.constTable.SkillCD;
    const dResult1 = this.calProgress(iCostTime, iBeginTime);
    // 2.能量
    const dResult2 = this.calProgress_Energy();
    if (dResult1 && dResult2) {
      if (dResult1.lefttime > dResult2.lefttime) {
        return dResult1;
      }
      return dResult2;
    } else if (dResult1) {
      return dResult1;
    } else if (dResult2) {
      return dResult2;
    }
    return null;
  },
  // 技能读条进度
  getSkillCDState() {
    const fighter = this.fighter();
    const warCom = fighter.warCom();
    let iBeginTime = 0;
    let iCostTime = 0;

    if (!warCom.isStarted()) {
      iBeginTime = warCom.getWarEndTime();
      iCostTime = mbgGame.config.constTable.WarCD;
      // 1.
      const dResult1 = this.calProgress(iCostTime, iBeginTime);
      // 2.能量
      const dResult2 = this.calProgress_Energy();
      return calResult(dResult1, dResult2);
    }
    // 分能量和CD两种情况
    // 1.CD
    if (fighter) {
      iBeginTime = fighter.getSkillLastUsedTime();
    }
    iCostTime = mbgGame.config.constTable.SkillCD;
    const dResult1 = this.calProgress(iCostTime, iBeginTime);
    // 2.能量
    const dResult2 = this.calProgress_Energy();
    return calResult(dResult1, dResult2);
  },
  calProgress(iCostTime, iBeginTime) {
    if (!iBeginTime) {
      return null;
    }
    const now = mbgGame.netCtrl.getServerNowTime();
    const iEndTime = iBeginTime + iCostTime;
    const lefttime = Math.max(0, iEndTime - now);
    const progress = (iCostTime - lefttime) / iCostTime;
    return {
      progress,
      lefttime,
    };
  },
  calProgress_Energy() {
    const fighter = this.fighter();
    const warCom = fighter.warCom();
    const iCostEnergy = fighter.getSkillCostEnergy();
    if (iCostEnergy <= 0) {
      return {
        progress: 1,
        lefttime: 0,
      };
    }
    const iCurEnergy = warCom.warEnergy.getEnergy();
    const iLackEnergy = Math.max(0, iCostEnergy - iCurEnergy);
    const lefttime = iLackEnergy / warCom.getEnergyAddPerSecond(fighter.getTeam());
    const progress = (iCostEnergy - iLackEnergy) / iCostEnergy;
    return {
      progress,
      lefttime,
    };
  },
});