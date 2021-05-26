const defines = require('./w_defines');
const CBase = require('./base');

const MType2Num = {
  101: 1,
  102: 1,
  103: 3,
};


// ///////////////////////////////////////////////////////////////////////////
/*  爬塔 (单机玩法)
    每天只能打一次
    所有角色的生命值每次战斗结束不能回满,保存结束时的生命值
    死亡角色不可以再用
    总共15关，每一关从关卡表中对应类型中随机不放回抽取，小怪从列表中随机抽取4只
    关卡等级根据玩家等级决定，例如第一关为玩家等级-5，第二关为玩家等级-4，配在常数表
    打完15关给予已通关标签
    远征模式给予金币与道具奖励，金币奖励根据怪物等级读取英雄升级表中的金币基础产出*60（配常数表），根据怪物等级/5（向下取整）随机产出一个道具
*/
// ////////////////////////////////////////////////////////////////////////////
class CWheelWar extends CBase {
  getDBData() {
    const pobj = this.pobj();
    const nPlayer = pobj.dataObj();
    let dDayData = nPlayer.getTimeVar('wheel');
    if (!dDayData) {
      dDayData = {
        avglv: pobj.getAvgLv(), // 当天第一次初始化时的平均等级
        r: 0, // r  第几场 0-14
        myhp: { // 自己15个角色的血量信息（hp百分比）  没有设置时为满血
          // ID: x%
        },
        rivalhp: { // 当前场次对手的血量信息, 打赢时删除
          // ID: x%
        },
        // rt: { // revive times
        // charaID: n
        // },
        stages: _.shuffle(_.range(1, 16)), // 1-15个数字打乱
        mIDs: [],  // 当前回合的小怪ID，ID可重复，顺序不能动
      };
      nPlayer.setTodayVar('wheel', dDayData);
      this.refreshRoundMonsterInfo(dDayData);
    }
    return dDayData;
  }
  onInit() {
    this.getDBData();
  }
  getWheelWarData() {
    let dDBData = this.pobj().getVal('wheel');
    if (!dDBData) {
      dDBData = {
        scheme: {},
      };
      this.pobj().setValOnly('wheel', dDBData);
    }
    return dDBData;
  }
  // 只需要一套布阵
  getSchemeData() {
    return this.getWheelWarData().scheme;
  }
  onSendWheelWarData() {
    this.getDBData();
    this.pobj().sendCmd("wheel", this.getWheelWarData());
  }
  getCurStageIdx() {
    const dDBData = this.getDBData();
    return dDBData.stages[dDBData.r];
  }
  getCurStageLv() {
    const dDBData = this.getDBData();
    const avglv = dDBData.avglv;
    const offset = mbgGame.config.constTable.WheelWarLv[this.pobj().m_WheelWar.getRound()];
    return Math.min(Math.max(1, avglv + offset), 100);
  }
  getGroup() {
    const dDBData = this.getDBData();
    return dDBData.group;
  }
  getLv() {
    const dDBData = this.getDBData();
    return dDBData.lv;
  }
  setGroup(group) {
    const dDBData = this.getDBData();
    dDBData.group = group;
  }
  setLv(lv) {
    const dDBData = this.getDBData();
    dDBData.lv = lv;
  }
  getMonsterIDs() {
    return this.getDBData().mIDs;
  }
  getRound() {
    const dData = this.getDBData();
    return dData.r;
  }
  setRound(r) {
    const dData = this.getDBData();
    dData.r = r;
  }
  getMyHpData() {
    const dData = this.getDBData();
    return dData.myhp;
  }
  getRivalHpData() {
    const dData = this.getDBData();
    return dData.rivalhp;
  }
  refreshRoundMonsterInfo(dDayData) {
    dDayData = dDayData || this.getDBData();
    if (dDayData.r >= 15) {
      return;
    }
    dDayData.mIDs = [];
    dDayData.rivalhp = {};
    // 更新mIDs, 清空血量信息
    const dStageConfig = this.pobj().m_DayWarCtrl.getStageConfig("wheelwar");
    if (!dStageConfig) {
      this.pobj().logError("[wheelwar] no stage", this.pobj().m_DayWarCtrl.getCurStageID("wheelwar"));
      return;
    }
    let mIDs = dStageConfig.mIDs;
    mIDs = (_.shuffle(mIDs)).slice(0, 4);
    dDayData.mIDs = mIDs;
  }
  validAtkTeam(atkCharaIDs) {
    if (_.isEmpty(atkCharaIDs)) {
      return false;
    }
    const pobj = this.pobj();
    let hasChara = false;
    for (let i = 0; i < atkCharaIDs.length; i++) {
      const charaID = atkCharaIDs[i];
      if (!charaID) {
        continue;
      }
      if (!pobj.hasChara(charaID)) {
        return false;
      }
      hasChara = true;
    }
    if (!hasChara) {
      return false;
    }
    return true;
  }
  validSchemeParam(dScheme, dParam) {
    const charaIDs = dParam.charaIDs;
    if (charaIDs) {
      const myhp = this.getMyHpData();
      // 验证生命值
      for (let i = 0; i < charaIDs.length; i++) {
        const charaID = charaIDs[i];
        if (!charaID) {
          continue;
        }
        const hpPercent = myhp[charaID];
        if (hpPercent != null && hpPercent <= 0) {
          charaIDs[i] = 0;
        }
      }
    }
    return null;
  }
  setScheme(dParam) {
    // this.logInfo("setScheme", JSON.stringify(dParam));
    const dScheme = this.getSchemeData();
    let err = this.validSchemeParam(dScheme, dParam);
    if (err) return err;
    err = this.pobj().m_WarCommon.validSchemeParam(dScheme, dParam);
    if (err) return err;
    this.pobj().m_WarCommon.setScheme(dScheme, dParam);
    this.checkScheme();
    this.onSendWheelWarData();
    return null;
  }
  onRemoveItem(sid) {
    const dScheme = this.getSchemeData();
    if (!dScheme || !dScheme.bag) {
      return;
    }
    for (let posIdx = 0; posIdx < 5; posIdx++) {
      const sidList = dScheme.bag[posIdx];
      if (_.isEmpty(sidList)) {
        continue;
      }
      const idx = sidList.indexOf(sid);
      if (idx !== -1) {
        sidList.splice(idx, 1);
        this.onSendWheelWarData();
        break;
      }
    }
  }
  reviveChara(charaID) {
    const dHp = this.getMyHpData();
    if (_.isEmpty(dHp)) {
      return mbgGame.config.ErrCode.Error;
    }
    if (dHp[charaID] != null && dHp[charaID] <= 0) {
      const pobj = this.pobj();
      const nPlayer = pobj.dataObj();
      // 可以复活
      const dDBData = this.getDBData();
      if (!dDBData.rt) {
        dDBData.rt = {};
      }
      let n = dDBData.rt[charaID] || 0; // 已复活几次
      const needDiamonds = 10 + (n * 20);
      // 判断钻石
      if (!pobj.hasDiamonds(needDiamonds)) {
        return mbgGame.config.ErrCode.LackDiamond;
      }
      pobj.addDiamonds(-needDiamonds, null, 'wheelrevive');
      n += 1;
      dDBData.rt[charaID] = n;
      delete dHp[charaID];
      nPlayer.syncTimeVar('wheel');
      return null;
    }
    return mbgGame.config.ErrCode.Error;
  }
  validHp(atkCharaIDs) {
    const dHp = this.getMyHpData();
    if (_.isEmpty(dHp)) {
      return true;
    }
    for (let i = 0; i < atkCharaIDs.length; i++) {
      const charaID = atkCharaIDs[i];
      if (dHp[charaID] != null && dHp[charaID] <= 0) {
        return false;
      }
    }
    return true;
  }
  setTeamHp(iTeam, dTeamData) {
    const dHp = iTeam === defines.TEAM_LEFT ? this.getMyHpData() : this.getRivalHpData();
    for (let posIdx = 0; posIdx < 5; posIdx++) {
      const dChara = dTeamData[posIdx];
      if (!dChara) {
        continue;
      }
      const hpPercent = dHp[dChara.ID];
      if (hpPercent != null) {
        if (hpPercent <= 0) {
          delete dTeamData[posIdx];
        } else {
          dChara.hpPercent = hpPercent;
        }
      }
    }
  }
  validBeginWar() {
    if (!this.pobj().isWheelWarUnlocked()) {
      return mbgGame.config.ErrCode.Error;
    }
    const r = this.getRound();
    if (r >= 15) {
      return mbgGame.config.ErrCode.WheelWar_AllFinished;
    }
    const dScheme = this.getSchemeData();
    if (!this.validAtkTeam(dScheme.charaIDs)) {
      return mbgGame.config.ErrCode.WheelWar_InvalidTeam;
    }
    if (!this.validHp(dScheme.charaIDs)) {
      return mbgGame.config.ErrCode.WheelWar_HasDeadChara;
    }
    const dDayData = this.getDBData();
    if (_.isEmpty(dDayData.mIDs)) {
      return mbgGame.config.ErrCode.Error;
    }
    return null;
  }
  checkScheme() {
    const dMyHp = this.getMyHpData();
    const dScheme = this.getSchemeData();
    if (!_.isEmpty(dScheme.charaIDs)) {
      // 去掉已死的角色
      for (let i = 0; i < dScheme.charaIDs.length; i += 1) {
        const charaID = dScheme.charaIDs[i];
        if (!charaID) {
          continue;
        }
        if (dMyHp[charaID] != null && dMyHp[charaID] === 0) {
          dScheme.charaIDs[i] = 0;
        }
      }
    }
    if (_.isArray(dScheme.botting)) {
      dScheme.botting = _.filter(dScheme.botting, (charaID) => {
        return dScheme.charaIDs.indexOf(charaID) !== -1;
      });
    }
  }
  onWarEnd(dData) {
    const pobj = this.pobj();
    const r = this.getRound();
    // 保存双方Hp
    const bFail = dData.result === defines.WarFail;
    const bDraw = dData.result === defines.WarDraw;
    const bWin = dData.result === defines.WarWin;
    const dMyHp = this.getMyHpData();
    const dRivalHp = this.getRivalHpData();
    const dLeft = dData.hpinfo.left;
    const dRight = dData.hpinfo.right;
    if (bWin) {
      // 打赢该场了，进入下一场
      const nextRound = r + 1;
      this.setRound(nextRound);
      this.refreshRoundMonsterInfo();
      for (const charaID in dLeft) {
        dMyHp[charaID] = Math.round(100 * dLeft[charaID].hp / dLeft[charaID].maxHp);
      }
    } else if (bFail) { // 战败 意味着对手hp有不为0的
      for (const mID in dRight) {
        dRivalHp[mID] = Math.round(100 * dRight[mID].hp / dRight[mID].maxHp);
      }
      for (const charaID in dLeft) {
        dMyHp[charaID] = 0; // 战败 肯定HP为0
      }
    } else if (bDraw) { // 打平，只处理hp
      for (const charaID in dLeft) {
        dMyHp[charaID] = Math.round(100 * dLeft[charaID].hp / dLeft[charaID].maxHp);
      }
      for (const mID in dRight) {
        dRivalHp[mID] = Math.round(100 * dRight[mID].hp / dRight[mID].maxHp);
      }
    }
    const nPlayer = pobj.dataObj();
    nPlayer.syncTimeVar('wheel');
    this.checkScheme();
    this.onSendWheelWarData();
    // this.logInfo("[wheelwar.onWarEnd] dMyHp:", JSON.stringify(dMyHp),
    //    "dRight", JSON.stringify(dRivalHp));
  }
}


module.exports = CWheelWar;