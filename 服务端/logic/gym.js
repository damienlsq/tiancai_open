const CBase = require('./base');

class CGym extends CBase {
  customRelease() {
    this.m_Lab = null;
  }
  setLab(oLab) {
    this.m_Lab = oLab;
  }
  onInit() { }

  validTraining(facID, npcID) {
    const dFac = this.m_Lab.getFacDataByFacID(facID);
    if (!dFac) {
      this.logError("[validTraining] no such fac, facID", facID);
      return mbgGame.config.ErrCode.Error;
    }
    // todo 检查npc是否非法
    return mbgGame.config.ErrCode.OK;
  }
  getNPCHappyLvl(npcID, facID) {
    let monsterConfig;
    if (npcID <= 15) {
      monsterConfig = mbgGame.config[`mtpl${4000 + npcID}`];
    } else {
      monsterConfig = mbgGame.config[`mtpl${npcID}`];
    }
    if (!monsterConfig) return 3; // 默认是3档， 加成0
    let lv = 3 + (+monsterConfig[`fac_${facID}`] || 0);
    if (lv < 0) lv = 0;
    if (lv >= 6) lv = 6;
    return lv;
  }
  calcReward(charaID, facID, reward) {
    const nowtime = moment().unix();
    const dFac = this.m_Lab.getFacDataByFacID(facID);

    const passTime = nowtime - dFac.trT - dFac.sP;

    const happyLvl = this.getNPCHappyLvl(charaID, facID);
    const ratio = mbgGame.config.constTable.GymFaces[6 - happyLvl];
    if (charaID <= 15) {
      // 奖励斗币
      let value = Math.floor(this.m_Lab.getConfig(this.m_Lab.getLv()).labMatK * passTime * (1 + ratio) / 60);
      if (value < 0) value = 0;
      reward.mat = value;
    } else {
      // 奖励金币
      if (mbgGame.config.constTable.GymAwardItemPercent && mbgGame.config.award.gymExtraAward) {
        // 判断npc档位
        if (happyLvl >= 6 && passTime + dFac.sP >= dFac.d && _.random(100) < mbgGame.config.constTable.GymAwardItemPercent) {
          const dAward = mbgGame.common.utils.deepClone(mbgGame.config.award.gymExtraAward);
          reward.base = dAward.base;
        }
      }
      let value = Math.floor(this.m_Lab.getConfig(this.m_Lab.getLv()).labCoinsK * passTime * (1 + ratio) / 60);
      if (value < 0) value = 0;
      reward.coins = value;
    }
    dFac.sP += passTime;
  }
  // 这个函数不需要valid，valid在lab.js里调用
  beginTraining(facID) {
    const dFac = this.m_Lab.getFacDataByFacID(facID);
    const nowtime = moment().unix();
    // const npcID = dFac.c && dFac.c[0];
    dFac.trT = nowtime; // 记录开始训练的时间
    dFac.d = mbgGame.config.constTable.GymMaxTime; // 结束时间
    dFac.sP = 0;
    this.m_Lab.onDataChanged();
    return mbgGame.config.ErrCode.OK;
  }
  getReward(facID, dRet, forceRemove) {
    const dFac = this.m_Lab.getFacDataByFacID(facID);
    const charaID = dFac.c && dFac.c[0];

    const pobj = this.pobj();
    this.calcReward(charaID, facID, dRet);
    pobj.giveAward(dRet, `gym_${facID}_${charaID}`);

    if (dFac.sP >= dFac.d || forceRemove) {
      delete dFac.trT;
      delete dFac.d;
      delete dFac.sP;
      dRet.remove = true;
      // 自动下岗
      this.m_Lab.removeFacChara(facID, charaID);
    } else {
      this.m_Lab.onDataChanged();
    }
  }
  // minutes，注意，必须先验证再调用此接口
  getLeftTime(facID) {
    const dFac = this.m_Lab.getFacDataByFacID(facID);
    const nowtime = moment().unix();
    const leftTime = dFac.trT + dFac.d - nowtime;
    return leftTime;
  }

  validGetReward(facID) {
    const dFac = this.m_Lab.getFacDataByFacID(facID);
    const charaID = dFac.c && dFac.c[0];
    if (!charaID) {
      // 没有正在训练的角色
      return mbgGame.config.ErrCode.Lab_NoChara;
    }
    if (!dFac.trT) {
      // 没有训练开始的时间，即玩家还没点击训练
      return mbgGame.config.ErrCode.Lab_NotTraining;
    }
    return mbgGame.config.ErrCode.OK;
  }
  tryGetReward(facID, dRet, forceRemove) {
    const err = this.validGetReward(facID);
    if (err) {
      return err;
    }
    return this.getReward(facID, dRet, forceRemove);
  }
}

module.exports = CGym;