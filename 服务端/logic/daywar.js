const utils = require("../gameserver/utils");
const defines = require('./w_defines');
const CBase = require('./base');

const worldIdx = defines.dayWorldIdx;

// ///////////////////////////////////////////////////////////////////////////
// 各种活动副本
// ////////////////////////////////////////////////////////////////////////////
class CDayWarCtrl extends CBase {
  onInit() {
    //
  }
  getTypeIdx(type) {
    let typeIdx = 0;
    if (type === 'coinwar') {
      typeIdx = 1;
    } else if (type === 'matwar') {
      typeIdx = 7;
    } else if (type === 'wheelwar') {
      typeIdx = 8;
    } else if (type.startsWith('herowar')) {
      typeIdx = +(type.substr(-1)); // 2 - 6
    }
    return typeIdx;
  }
  getCurStageIdx(type) {
    const typeIdx = this.getTypeIdx(type);
    let idx;
    if (type === "wheelwar") {
      idx = this.pobj().m_WheelWar.getCurStageIdx();
    } else {
      idx = this.pobj().getAvgLv();
    }
    return +(`${typeIdx}${utils.pad(idx, 3)}`);
  }
  getStageLvByType(type) {
    if (type === "wheelwar") {
      return this.pobj().m_WheelWar.getCurStageLv();
    }
    return null;
  }
  getCurStageID(type) {
    return +(`30${this.getCurStageIdx(type)}`);
  }
  getStageConfig(type) {
    return mbgGame.config[`stage${this.getCurStageID(type)}`];
  }
  getStageStarLv(type) {
    const dConfig = this.getStageConfig(type);
    return Math.max(1, Math.floor(dConfig.lv / 5));
  }
  getStageConfigByID(stageID) {
    return mbgGame.config[`stage${stageID}`];
  }
  isWarBegan() {
    return this.m_WarBegan;
  }
  validBeginWarCommon(dParam) {
    if (this.m_WarBegan) {
      return mbgGame.config.ErrCode.DayWar_WarBegan;
    }
    const pobj = this.pobj();
    if (dParam.type !== "wheelwar") {
      if (!this.pobj().m_WarCommon.validSchemeBeforeWar(99, dParam.schemeIdx)) {
        return mbgGame.config.ErrCode.Error;
      }
    }
    const dStageConfig = this.getStageConfig(dParam.type);
    if (_.isEmpty(dStageConfig)) {
      return mbgGame.config.ErrCode.DayWar_NoStage;
    }
    const costSta = dStageConfig.costSta;
    if (pobj.getSta() < costSta) {
      return mbgGame.config.ErrCode.LackSta;
    }
    return mbgGame.config.ErrCode.OK;
  }
  validBeginDayWar(dParam) {
    const pobj = this.pobj();
    // 验证类型
    if ((["coinwar", "matwar", "wheelwar"].indexOf(dParam.type) === -1)
      && !dParam.type.startsWith('herowar')) {
      return mbgGame.config.ErrCode.DayWar_WrongType;
    }
    // 验证开放时间
    const days = mbgGame.config.constTable.OpenDay[dParam.type];
    if (!days) {
      pobj.logError("[daywar] no OpenDay", JSON.stringify(dParam));
      return mbgGame.config.ErrCode.Error;
    }
    const curDay = moment().day();
    if (days.indexOf(curDay) === -1) {
      return mbgGame.config.ErrCode.Error;
    }
    if (dParam.type === 'coinwar') {
      if (!pobj.isCoinWarUnlocked()) {
        return mbgGame.config.ErrCode.Error;
      }
      if (this.pobj().getLeftTimes(dParam.type) <= 0) {
        return mbgGame.config.ErrCode.DayWar_NoTimes3;
      }
    }
    if (dParam.type === 'matwar') {
      if (!pobj.isMatWarUnlocked()) {
        return mbgGame.config.ErrCode.Error;
      }
      if (this.pobj().getLeftTimes(dParam.type) <= 0) {
        return mbgGame.config.ErrCode.DayWar_NoTimes3;
      }
    }
    if (dParam.type === 'wheelwar') {
      const err = pobj.m_WheelWar.validBeginWar();
      if (err) {
        return err;
      }
    }
    if (dParam.type.startsWith('herowar')) {
      if (!this.pobj().isHeroWarUnlocked()) {
        return mbgGame.config.ErrCode.Error;
      }
      if (this.pobj().getLeftTimes(dParam.type) <= 0) {
        return mbgGame.config.ErrCode.DayWar_NoTimes10;
      }
    }
    const err = this.validBeginWarCommon(dParam);
    if (err) {
      return err;
    }
    return mbgGame.config.ErrCode.OK;
  }
  getSchemeDataForWar(dParam) {
    const pobj = this.pobj();
    const type = dParam.type;
    if (type === "wheelwar") {
      return pobj.m_WheelWar.getSchemeData();
    }
    const schemeIdx = Math.round(+dParam.schemeIdx); // 哪一个阵型
    return pobj.m_WarCommon.getSchemeData(99, schemeIdx);
  }
  // 发送战场信息
  beginDayWar(dParam) {
    const errCode = this.validBeginDayWar(dParam);
    if (errCode) {
      return errCode;
    }
    const pobj = this.pobj();
    const dStageConfig = this.getStageConfig(dParam.type);
    const stageIdx = this.getCurStageIdx(dParam.type);
    const dScheme = this.getSchemeDataForWar(dParam);
    // this.logInfo("beginDayWar, dScheme", JSON.stringify(dScheme));
    const dItem = {};
    dItem[defines.TEAM_LEFT] = mbgGame.WarData.packWarData_Item(dScheme.bag, pobj.m_ItemBag.getItemDBData());
    const dBotting = {};
    dBotting[defines.TEAM_LEFT] = dScheme.botting;
    const stageID = this.getCurStageID(dParam.type);
    const stageLv = this.getStageLvByType(dParam.type);
    const dLeftTeam = pobj.m_PVECtrl.getLeftTeamWarData(dScheme.charaIDs);
    let dRightTeam;
    if (dParam.type === "wheelwar") {
      dRightTeam = pobj.m_PVECtrl.getMonsterTeamData(worldIdx, stageID, stageLv,
        pobj.m_WheelWar.getMonsterIDs());
      pobj.m_WheelWar.setTeamHp(defines.TEAM_LEFT, dLeftTeam);
      pobj.m_WheelWar.setTeamHp(defines.TEAM_RIGHT, dRightTeam);
    } else {
      dRightTeam = pobj.m_PVECtrl.getMonsterTeamData(worldIdx, stageID);
    }
    const dData = {
      ft: defines.getForceEndTime(worldIdx),
      worldIdx,
      stageID,
      stageIdx,
      lt: "PVE",
      record: true,
      bg: dStageConfig.bg,
      shortid: pobj.getShortID(),
      item: dItem,
      team: {
        left: dLeftTeam,
        right: dRightTeam,
      },
      botting: dBotting,
      auto: pobj.isBottingEnabled(),
      sendInit: true,
      send: true,
      canstop: dParam.type !== "wheelwar",
      cinfo: pobj.m_PVECtrl.getClientInfo({
        stageID,
        charaID: defines.getFirstCharaID(dScheme.charaIDs),
      }),
    };
    mbgGame.bsmgr.createWar(pobj, dData);
    mbgGame.bsmgr.beginWar(pobj, {
      worldIdx,
    });
    this.m_WarBegan = true;
    this.m_WarType = dParam.type;
    this.m_StageID = stageID;
    return null;
  }
  onWarEnd(dData) {
    this.m_WarBegan = false;
    // this.logInfo("daywar end", this.m_WarType, this.m_StageID, dData);
    if (this.m_WarType === 'coinwar') {
      this.onWarEnd_CoinWar(this.m_WarType, dData);
    } else if (
      this.m_WarType === 'matwar' ||
      this.m_WarType === 'wheelwar' ||
      this.m_WarType.startsWith("herowar")) {
      this.onWarEnd_Common(this.m_WarType, dData);
    }
    delete this.m_WarType;
    delete this.m_StageID;
  }
  onWarEnd_CoinWar(type, dData) {
    const pobj = this.pobj();
    const stageID = this.m_StageID;
    const dStageConfig = this.getStageConfigByID(stageID);
    const percent = 1 - dData.percent;
    const result = percent > 0 ? defines.WarWin : defines.WarFail;
    if (result === defines.WarWin) {
      const dDrop = {};
      pobj.m_PVECtrl.calStageDrop(stageID, dData.charaIDs, dDrop);
      const costSta = dStageConfig.costSta;
      pobj.addSta(-costSta, null, 'coinwar');
      this.pobj().addLeftTimes(type, -1);
      //   pobj.logInfo("[coinwar] coins", dDrop.coins, "percent", percent);
      dDrop.coins *= percent;
      dDrop.coins = Math.round(dDrop.coins);
      const dWarResult = pobj.m_WarCommon.giveAwardForWar(worldIdx, dData.charaIDs, dDrop, "storywar");
      pobj.sendCmd("warresult", dWarResult);
    } else {
      pobj.sendCmd("warresult", {
        worldIdx,
        result: 2,
      });
    }
  }
  // 一般流程的结算
  onWarEnd_Common(type, dData) {
    const pobj = this.pobj();
    const stageID = this.m_StageID;
    const dStageConfig = this.getStageConfigByID(stageID);
    const result = dData.result;
    if (result === defines.WarWin) {
      let dDrop = {};
      const costSta = dStageConfig.costSta;
      if (costSta > 0) pobj.addSta(-costSta, null, 'daywar');
      if (type === "matwar" || type.startsWith('herowar')) {
        pobj.addLeftTimes(type, -1);
      }
      if (type !== "wheelwar") {
        const starLv = this.getStageStarLv(type);
        dDrop.maxStarLv = starLv;
        pobj.m_PVECtrl.calStageDrop(stageID, dData.charaIDs, dDrop);
        if (dStageConfig.firstDrop) {
          dDrop = pobj.concatAwardData(dDrop, dStageConfig.firstDrop);
        }
      } else {
        // 车轮战，给予金币与道具奖励，金币奖励根据怪物等级读取英雄升级表中的金币基础产出*60（配常数表）
        // 根据怪物等级/5（向下取整）随机产出一个道具
        const lv = pobj.m_WheelWar.getCurStageLv();
        const dHeroup = mbgGame.config[`heroup${lv}`];
        dDrop.coins = Math.round(dHeroup.coinsRate * mbgGame.config.constTable.wheelWarCoinsRatio);
        const starLv = Math.max(1, Math.floor(lv / 5));
        const dWeightForBase = pobj.m_ItemBag.getRewardItemWeightDict(mbgGame.config.constTable.CWType3);
        const itemID = defines.chooseOne(dWeightForBase);
        // 102x1x2x10 = 道具102一个, 固定品质为2, 固定星级10
        dDrop.items = `${itemID}x1x0x${starLv}`;
        // 经验
        dDrop.charaexp = {};
        for (let i = 0; i < dData.charaIDs.length; i++) {
          const charaID = dData.charaIDs[i];
          if (!charaID) {
            continue;
          }
          dDrop.charaexp[charaID] = Math.round(dHeroup.wheelExp);
        }
        this.logInfo("[wheelwar] drop", JSON.stringify(dDrop), lv, starLv, itemID);
      }
      const dWarResult = pobj.m_WarCommon.giveAwardForWar(worldIdx, dData.charaIDs, dDrop, type);

      pobj.sendCmd("warresult", dWarResult);
    } else {
      pobj.sendCmd("warresult", {
        worldIdx,
        result: 2,
      });
    }
    if (type === "wheelwar") {
      this.pobj().m_WheelWar.onWarEnd(dData);
    }
  }
}

module.exports = CDayWarCtrl;