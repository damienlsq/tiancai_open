
const defines = require('./w_defines');
const CBase = require('./base');
const md5 = require("md5");

// ///////////////////////////////////////////////////////////////////////////
/*
    pvp:{
        season: 缓存当前是第几个赛季
        score: 积分
        maxscore: 历史赛季最高积分
        rank: 排名
        maxrank: 历史赛季最高排名
        grade: 段位 即k值表的编号
        chest: {段位: 【0/null: 奖励未解锁 1: 奖励解锁，可领取 2: 奖励已领取】 }
        maxgrade: 历史赛季最高段位
        rtime: 最近一次刷新的时间
        defSch:
        frdSch:
        scheme:{
            schemeIdx: { } 查看warcommon
        }
        d: 可领取的钻石
        day: 每日奖励时间标记，<=day的奖励是已给奖励 （防止重复给奖励）
        sIdx: 赛季奖励标记，<=sIdx的奖励是已给奖励 （防止重复给奖励）
    }
*/
// ////////////////////////////////////////////////////////////////////////////
class CPVPCtrl extends CBase {
  // 这个返回的是永久存储的数据
  getDBData() {
    let dDBData = this.pobj().getVal("pvp");
    if (!dDBData) {
      dDBData = {
        score: 0, // 初始0分
        grade: 1, // 初始段位1
        scheme: {},
      };
      this.pobj().setValOnly("pvp", dDBData);
    }
    return dDBData;
  }
  onSendPVPData() {
    mbgGame.common.timer.timerMgr.removeCallOut(this, `sendPVPData`);
    mbgGame.common.timer.timerMgr.callOut(this, this.onSendPVPDataReal.bind(this), {
      time: 0.1,
      flag: `sendPVPData`,
      forever: false,
    });
  }
  onSendPVPDataReal() {
    const dPVPDBData = this.getDBData();
    this.pobj().sendCmd("pvpdata", dPVPDBData);
  }
  getSchemeData(schemeIdx) {
    if (schemeIdx == null) {
      schemeIdx = 0;
    }
    const dDBData = this.getDBData();
    if (!dDBData.scheme[schemeIdx]) {
      dDBData.scheme[schemeIdx] = {};
    }
    return dDBData.scheme[schemeIdx];
  }
  // 当前段位
  getPVPCurGrade() {
    const dPVPDBData = this.getDBData();
    return dPVPDBData.grade || 1;
  }
  setPVPCurGrade(g) {
    const dPVPDBData = this.getDBData();
    if (dPVPDBData.grade === g) {
      return;
    }
    this.markGradeMove(dPVPDBData.grade, g);
    dPVPDBData.grade = g;
    if (!dPVPDBData.maxgrade || g > dPVPDBData.maxgrade) {
      dPVPDBData.maxgrade = g;
      this.pobj().m_Stat.setStatVal("maxGrade", g);
    }
  }
  // 标记玩家上次打开争霸界面到现在，段位变化
  markGradeMove(oldGrade, newGrade) {
    const dPVPDBData = this.getDBData();
    if (!dPVPDBData.ginfo) {
      dPVPDBData.ginfo = [oldGrade, newGrade];
    } else {
      dPVPDBData.ginfo[1] = newGrade;
    }
  }
  // 清除段位变化标记
  cleanGradeMoveMark() {
    const dPVPDBData = this.getDBData();
    if (dPVPDBData.ginfo) {
      delete dPVPDBData.ginfo;
    }
  }
  addArenaDiamonds(diamonds) {
    const dPVPDBData = this.getDBData();
    dPVPDBData.d = (dPVPDBData.d || 0) + diamonds;
  }
  getArenaDiamonds() {
    const dPVPDBData = this.getDBData();
    return dPVPDBData.d || 0;
  }
  cleanArenaDiamonds() {
    const dPVPDBData = this.getDBData();
    dPVPDBData.d = 0;
  }
  getSavedDay() {
    const dPVPDBData = this.getDBData();
    return dPVPDBData.day || 0;
  }
  saveDay(day) {
    const dPVPDBData = this.getDBData();
    dPVPDBData.day = day;
  }
  getSavedSeasonIdx() {
    const dPVPDBData = this.getDBData();
    return dPVPDBData.sIdx || 0;
  }
  saveSeasonIdx(sIdx) {
    const dPVPDBData = this.getDBData();
    dPVPDBData.sIdx = sIdx;
  }
  setCurSeasonIdx(seasonIdx) {
    const dPVPDBData = this.getDBData();
    dPVPDBData.season = +seasonIdx;
  }
  getCurSeasonIdx() {
    const dPVPDBData = this.getDBData();
    return dPVPDBData.season;
  }
  getPVPCurScore() {
    const dPVPDBData = this.getDBData();
    return dPVPDBData.score || 0;
  }
  setPVPCurScore(score, curSeasonIdx) {
    if (!_.isNumber(score) || score < 0) return;
    const dPVPDBData = this.getDBData();
    let newSeason = false;
    if (this.getCurSeasonIdx() != null && curSeasonIdx !== this.getCurSeasonIdx()) {
      newSeason = true;
      // 重置段位
      const newGrade = defines.getArenaGradeByScore(score);
      // newGrade后面的宝箱标记要清掉(Note 未领取的清掉？)
      this.setPVPCurGrade(newGrade);
      // 重置宝箱
      const dChest = dPVPDBData.chest;
      if (dChest) {
        for (let grade = newGrade + 1; grade <= 100; grade++) {
          if (dChest[grade]) {
            delete dChest[grade];
          }
        }
      }
    }
    this.setCurSeasonIdx(curSeasonIdx);
    if (score === dPVPDBData.score) {
      return;
    }
    const oldScore = dPVPDBData.score;
    dPVPDBData.score = score;
    this.pobj().m_Stat.setStatVal("curScore", score);
    if (!dPVPDBData.maxscore || dPVPDBData.score > dPVPDBData.maxscore) {
      dPVPDBData.maxscore = dPVPDBData.score;
      this.pobj().m_Stat.setStatVal("MaxScore", dPVPDBData.maxscore);
    }
    this.onSendPVPData();
    if (newSeason) {
      // 赛季分数调整，不需要执行onScoreChanged
      return;
    }
    this.onScoreChanged(oldScore, score);
  }
  onScoreChanged(oldScore, score) {
    const curGrade = this.getPVPCurGrade();
    if (score > oldScore) {
      // 加分，尝试更新段位
      const newGrade = defines.getArenaGradeByScore(score);
      if (newGrade > curGrade) {
        this.setPVPCurGrade(newGrade);
        this.giveGradeChest(newGrade);
      }
    } else {
      // 减分，检查是否掉出保护区
      const dConfig = defines.getArenaKConfigByGrade(curGrade);
      const scoreRange = dConfig.scoreRange;
      const rangeMin = scoreRange[0] - 100; //  如果是段位1，rangeMin会小于0
      this.logInfo("onScoreChanged rangeMin", rangeMin, 'oldScore', oldScore, 'score', score);
      if (rangeMin > 0 && score < rangeMin) {
        const newGrade = defines.getArenaGradeByScore(score);
        this.setPVPCurGrade(newGrade);
        this.giveGradeChest(newGrade);
      }
    }
  }
  giveGradeChest(newGrade) {
    const dPVPDBData = this.getDBData();
    if (!dPVPDBData.chest) {
      dPVPDBData.chest = {};
    }
    const dChest = dPVPDBData.chest;
    if (!dChest[newGrade]) {
      // 未获得这个段位的宝箱，解锁之
      dChest[newGrade] = 1;
    }
  }
  // 领取某个段位的宝箱
  recvGradeChest(grade) {
    const dPVPDBData = this.getDBData();
    if (!dPVPDBData.chest) {
      return false;
    }
    const dChest = dPVPDBData.chest;
    if (dChest[grade] === 1) {
      dChest[grade] = 2;
      this.onSendPVPData();
      // 给奖励
      const pobj = this.pobj();
      const dAward = mbgGame.common.utils.deepClone(mbgGame.config.award[`pvpchest${grade}`]);
      dAward.id = 'chest3';
      dAward.chestType = mbgGame.config.constTable.CWType5;
      pobj.giveAward(dAward, `pvpchest${grade}`);
      return true;
    }
    return false;
  }
  getPVPCurRank() {
    const dPVPDBData = this.getDBData();
    return dPVPDBData.rank;
  }
  setPVPCurRank(rank) {
    const dPVPDBData = this.getDBData();
    dPVPDBData.rank = rank;
    this.pobj().m_Stat.setStatVal("curRank", rank);
    if (!dPVPDBData.maxrank || rank < dPVPDBData.maxrank) {
      dPVPDBData.maxrank = rank;
      this.pobj().m_Stat.setStatVal("MaxRank", rank);
    }
    this.onSendPVPData();
  }
  getPVPMaxScore() {
    const dPVPDBData = this.getDBData();
    return dPVPDBData.maxscore;
  }
  getPVPMaxRank() {
    const dPVPDBData = this.getDBData();
    return dPVPDBData.maxrank;
  }
  getPVPRefreshLeftCD() {
    const dPVPDBData = this.getDBData();
    const iNowTime = moment().valueOf();
    let iLeftCD = dPVPDBData.rtime + (mbgGame.config.PVPData.expire * 60 * 1000) - iNowTime; // ms
    iLeftCD = Math.max(0, iLeftCD * 0.001);
    return iLeftCD;
  }
  setPVPRefreshTargetTime() {
    const dPVPDBData = this.getDBData();
    dPVPDBData.rtime = moment().valueOf(); // refresh time
    this.onSendPVPData();
  }
  // 设置该套阵型为防守阵型
  setPVPDefSchemeIdx(schemeIdx) {
    const err = this.validScheme(schemeIdx);
    if (err) {
      return err;
    }
    const dPVPDBData = this.getDBData();
    dPVPDBData.defSch = schemeIdx;
    this.onSendPVPData();
    return null;
  }
  gettPVPDefSchemeIdx() {
    const dPVPDBData = this.getDBData();
    return dPVPDBData.defSch || 0;
  }
  getFriendWarSchemeIdx() {
    const dPVPDBData = this.getDBData();
    return dPVPDBData.frdSch || 0;
  }
  validScheme(schemeIdx) {
    if (!(schemeIdx >= 0 && schemeIdx < this.pobj().getSchemeNum())) {
      return mbgGame.config.ErrCode.WrongParam;
    }
    const dScheme = this.getSchemeData(schemeIdx);
    if (!dScheme || _.isEmpty(dScheme.charaIDs)) {
      return mbgGame.config.ErrCode.NoSchemeScheme;
    }
    return null;
  }
  setFriendWarSchemeIdx(schemeIdx) {
    const err = this.validScheme(schemeIdx);
    if (err) {
      return err;
    }
    const dPVPDBData = this.getDBData();
    dPVPDBData.frdSch = schemeIdx;
    this.onSendPVPData();
    return null;
  }
  // 当天有效的pvp数据
  getDayData() {
    const nPlayer = this.pobj().dataObj();
    let dDayData = nPlayer.getTimeVar("pvpdata");
    if (!dDayData) {
      dDayData = {
        resettimes: 0, // 重置次数
        pvptimes: 0, // 当前已挑战多少个对手（Note: 用钻石可以清零)
        manualtimes: 0,
      };
      nPlayer.setTodayVar("pvpdata", dDayData);
    }
    return dDayData;
  }
  // 下线时删除的pvp数据
  getCacheData() {
    if (!this.m_CacheData) {
      this.m_CacheData = {
        /*
          targets: { idx: data }
          otTarget: 对手数据过期时间
          flag: {idx: flag }
        */
      };
    }
    return this.m_CacheData;
  }
  // 缓存和获取缓存接口
  setTargetsData(dTargets, duration) {
    /*
    {
      idx: dTargetData
    }
    */
    const dCache = this.getCacheData();
    if (dTargets == null) {
      if (dCache.targets) {
        delete dCache.targets;
      }
      return;
    }
    dCache.targets = dTargets;
    const now = moment().unix();
    dCache.otTarget = now + duration; // 过期时间
  }
  getTargetsData() {
    const dCache = this.getCacheData();
    const now = moment().unix();
    if (dCache.otTarget && dCache.otTarget <= now) {
      delete dCache.otTarget;
      if (dCache.targets) {
        delete dCache.targets;
      }
    }
    return dCache.targets;
  }
  getTargetDataByIdx(idx) {
    const dTargets = this.getTargetsData();
    if (!dTargets) {
      return null;
    }
    return dTargets[idx];
  }
  // 记录是否和这个对手打过（最多记录3个人）
  getFoughtFlagData() {
    const dCache = this.getCacheData();
    return dCache.flag;
  }
  cleanFoughtFlag() {
    const dCache = this.getCacheData();
    if (dCache.flag) {
      delete dCache.flag;
    }
    this.onSendFoughtFlag();
  }
  // 是否打赢了这个对手
  hasFoughtFlag(idx) {
    const dCache = this.getCacheData();
    if (!dCache.flag) {
      return false;
    }
    return dCache.flag[idx] != null;
  }
  // 该对手已打完的标志
  // flag  1: 胜利 null: 未胜利
  setFoughtFlag(idx, flag) {
    const dCache = this.getCacheData();
    if (!dCache.flag) {
      dCache.flag = {};
    }
    if (dCache.flag[idx] === flag) {
      this.logError("setFoughtFlag repeat", idx, flag);
      return;
    }
    dCache.flag[idx] = flag;
    this.onSendFoughtFlag();
  }
  onSendFoughtFlag() {
    const dCache = this.getCacheData();
    this.pobj().sendCmd("pvpflag", {
      idx2flag: dCache.flag,
    });
  }
  // 目前有 争霸、友谊赛会调用这个
  createPVPWar(dPVPData) {
    // this.logInfo("createPVPWar", JSON.stringify(dPVPData));
    const pobj = this.pobj();
    const dLeftTeamData = mbgGame.WarData.getPVPTeamWarData(dPVPData.attacker.charaIDs, dPVPData.attacker.team);
    const dRightTeamData = mbgGame.WarData.getPVPTeamWarData(dPVPData.defender.charaIDs, dPVPData.defender.team);
    const worldIdx = 99;
    const dItem = {};
    const dAttackerItem = dPVPData.attacker.item;
    const dDefenderItem = dPVPData.defender.item;
    dItem[defines.TEAM_LEFT] = mbgGame.WarData.packWarData_Item(dAttackerItem.bag, dAttackerItem.data, 'atk');
    dItem[defines.TEAM_RIGHT] = mbgGame.WarData.packWarData_Item(dDefenderItem.bag, dDefenderItem.data, 'def');

    const dInfo = defines.getPVPInfoForClient(dPVPData, pobj);
    if (dPVPData.friendwar) {
      dInfo.friendwar = true;
    }
    dInfo.mydesc = pobj.describe();
    dInfo.targetdesc = dPVPData.defender.desc;
    const dBotting = {};
    dBotting[defines.TEAM_LEFT] = dPVPData.attacker.botting;
    dBotting[defines.TEAM_RIGHT] = dPVPData.defender.botting;
    const dData = {
      worldIdx,
      bg: mbgGame.config.constTable.PVPBg,
      ft: defines.getForceEndTime(worldIdx),
      lt: "PVP",
      record: true,
      shortid: pobj.getShortID(),
      targetUUID: dPVPData.defender.uuid,
      item: dItem,
      team: {
        left: dLeftTeamData,
        right: dRightTeamData,
      },
      botting: dBotting,
      auto: pobj.isBottingEnabled(),
      cinfo: dInfo,
      sendInit: true,
      send: true,
    };
    if (dPVPData.noEnchant) {
      dData.noEnchant = dPVPData.noEnchant;
    }
    mbgGame.bsmgr.createPVPWar(pobj, dData);
    mbgGame.bsmgr.beginPVPWar(pobj, {
      worldIdx: 99,
      defenderFwdPair: dPVPData.defenderFwdPair,
      realtime: dPVPData.realtime,
    });
    return true;
  }
  onWarEnd(dData) {
    const pobj = this.pobj();
    if (dData.friendwar) {
      mbgGame.FrdWarCtrl.onWarEnd(pobj, dData);
    } else {
      pobj.m_Stat.addStatVal("PVPTimes", 1);
      if (dData.result === defines.WarWin) {
        pobj.m_Stat.addStatVal("WinTimes", 1);
      } else {
        pobj.m_Stat.addStatVal("LostTimes", 1);
      }
      mbgGame.Arena.onWarEnd(pobj, dData);
    }
  }
}

module.exports = CPVPCtrl;