const co = require('co');
const defines = require('../logic/w_defines');

// //////////////////////////////////////////////////////////
//      天才电竞 （不需要设置防守阵容的异步PVP）
//  特点：
//  1. 没有积分，没有赛季，没有排行榜，没有对战记录
//  2. 给黑市点券
//  3. 点挑战时立即匹配一个对手（竞技场是先匹配三个对手）
// //////////////////////////////////////////////////////////


// 天才电竞动态，每次战斗结算，进攻方加一个记录
// 动态要设过期时间
const NBattleRecords = mbgGame.common.db_mgr.CList.extend({
  // tc_battle_l_records:uuid
  // key: uuid
  FuncType: "battle",
  SubType: "records",
});

// 对手数据，一小时过期，开战前、客户端查询才需要获取
const NBattleTargets = mbgGame.common.db_mgr.CHash.extend({
  // tc_battle_h_targets:uuid
  // key: uuid
  FuncType: "battle",
  SubType: "tgt",
});

const NBattleTier = mbgGame.common.db_mgr.CSet.extend({
  // tc_battle_s_tier:tierLv 各个研究所等级的玩家的uuid的分段集合，用来做匹配
  // key: tierLv
  FuncType: "battle",
  SubType: "tier",
});


const tierLv = 1; // x级一个tier
const tierTotal = Math.ceil(100 / tierLv); // 总tier数

let searchOffsets = [];
_.times(10, () => {
  searchOffsets = searchOffsets.concat([0, -1, 1, -2, 2, -3, 3]);
});

// 天才电竞管理器
class TCBattleMgr {
  constructor() {
    this.onInit();
  }
  onInit() {
    this.m_BattleTier = {};
    this.m_IsRefreshing = {}; // uuid:bool，标志，防止同时进行多个刷新操作
    this.m_refreshTimer = mbgGame.common.timer.setRepeatTimer(10 * 60 * 1000, this.onRefresh.bind(this));
  }
  getAvgLv(pobj) {
    return pobj.getAvgLv();
  }
  // 把玩家加进天才电竞
  * hasPlayer(nPlayer, battleLv) {
    const uuid = nPlayer.getUUID();
    const iTier = this.getTierByAvgLv(battleLv);
    const nTier = this.getBattleTierObj(iTier);
    return yield nTier.sismember(uuid);
  }
  * addPlayer(nPlayer) {
    const pobj = nPlayer.getPlayerLogic();
    const battleLv = this.getAvgLv(pobj);
    const has = yield this.hasPlayer(nPlayer, battleLv);
    if (has) {
      // mbgGame.logError("[battle] addPlayer, already exists");
      return;
    }
    const uuid = nPlayer.getUUID();
    yield this.updatePlayerAvgLv(uuid, battleLv);
  }
  // 把玩家T出天才电竞
  * removePlayer(nPlayer) {
    const pobj = nPlayer.getPlayerLogic();
    const uuid = nPlayer.getUUID();
    const avglv = this.getAvgLv(pobj);
    yield this.removePlayerByUUID(uuid, avglv);
  }
  * removePlayerByUUID(uuid, avglv) {
    const iTier = this.getTierByAvgLv(avglv);
    const nTier = this.getBattleTierObj(iTier);
    yield nTier.srem(uuid);
  }
  getTierByAvgLv(lv) {
    return Math.floor(lv / tierLv) * tierLv;
  }
  onAvgLvChanged(pobj, oldLv, newLv) {
    pobj.logInfo("[battle] onAvgLvChanged", oldLv, newLv);
    const self = this;
    co(function* () {
      yield self.doTierMove(pobj.getUUID(), oldLv, newLv);
    }).catch((err, result) => {
      pobj.logError(`[battle] onAvgLvChanged occur error:${err}, result: ${result}`);
    });
  }
  * doTierMove(uuid, oldLv, newLv) {
    if (newLv > 0 && oldLv > 0 && newLv !== oldLv) {
      const iOldTier = this.getTierByAvgLv(oldLv);
      const iNewTier = this.getTierByAvgLv(newLv);
      if (iOldTier !== iNewTier) {
        const nOldTier = this.getBattleTierObj(iOldTier);
        const nNewTier = this.getBattleTierObj(iNewTier);
        // 把玩家从一个tier移动到另一个tier
        // smove的特性是，如果源tier不存在这个uuid，就不发生移动
        const ret = yield nOldTier.smove(nNewTier.key(), uuid);
        mbgGame.logger.info("[battle] doTierMove ret:", ret, iOldTier, iNewTier);
      }
    }
  }
  * updatePlayerAvgLv(uuid, newLv, hasOldLv, oldLv) {
    const iNewTier = this.getTierByAvgLv(newLv);
    // 更新tier集合
    if (hasOldLv) {
      if (oldLv == null) {
        mbgGame.logError("no oldLv");
        return;
      }
      if (oldLv > 0) {
        const iOldTier = this.getTierByAvgLv(oldLv);
        if (iOldTier !== iNewTier) {
          const nOldTier = this.getBattleTierObj(iOldTier);
          const nNewTier = this.getBattleTierObj(iNewTier);
          const ret = yield nOldTier.smove(nNewTier.key(), uuid);
          mbgGame.logger.info("[battle] updatePlayerAvgLv ret:", ret, "iOldTier", iOldTier, "iNewTier", iNewTier, "newLv", newLv);
        }
      }
    } else {
      const nTier = this.getBattleTierObj(iNewTier);
      const ret = yield nTier.sadd(uuid);
      mbgGame.logger.info("[battle] updatePlayerAvgLv ret:", ret, "iNewTier", iNewTier, "newLv", newLv);
    }
  }
  getBattleTierObj(iTier) {
    if (!this.m_BattleTier[iTier]) {
      this.m_BattleTier[iTier] = new NBattleTier(iTier);
    }
    return this.m_BattleTier[iTier];
  }
  * randTargets(iTier, num) {
    const nTier = this.getBattleTierObj(iTier);
    const uuids = yield nTier.srandmember(num);
    return uuids;
  }
  // 一次性返回该iTier的n份不同人的数据，looptimes是重试次数
  // 因为是同iTier，所以n过大时就很难抽足，所以looptimes也不能过大，不然也是做无用功
  // excludeUUIDs会被修改
  * matchMultiTarget(iTier, n, looptimes, excludeUUIDs, tag) {
    // mbgGame.logger.info("matchMultiTarget", iTier, n, looptimes, excludeUUIDs, tag);
    excludeUUIDs = excludeUUIDs || [];
    const c = this.m_TierCount[iTier];
    if (c <= 0) {
      return [];
    }
    const datalist = [];
    for (; ;) {
      let uuids = yield this.randTargets(iTier, n);
      if (looptimes > 0) {
        looptimes -= 1;
      }
      // mbgGame.logger.info("uuids", uuids, excludeUUIDs);
      if (excludeUUIDs.length > 0) {
        uuids = _.without(uuids, ...excludeUUIDs);
      }
      // mbgGame.logger.info("matchMultiTarget uuids=", uuids);
      for (let k = 0; k < uuids.length; k++) {
        const uuid = uuids[k];
        if (!uuid) {
          mbgGame.logError(`matchMultiTarget no uuid ${uuid}`);
          continue;
        }
        const dData = yield this.packTargetData(uuid);
        if (!dData) {
          mbgGame.logger.warn(`matchMultiTarget no dData ${uuid}`);
          continue;
        }
        datalist.push(dData);
        excludeUUIDs.push(uuid);
        if (datalist.length >= n) {
          break;
        }
      }
      if (datalist.length >= n) {
        break;
      }
      if (!looptimes) {
        break;
      }
    }
    return datalist;
  }
  // 期望返回n份不同人的数据（可能返回0-n份)，且自动排除'自己'
  * matchMultiTarget2(nPlayer, iTier, n) {
    const datalist = [];
    const myuuid = nPlayer.getUUID();
    const c = this.m_TierCount[iTier];
    // nPlayer.logInfo("[battle] matchMultiTarget2, iTier", iTier, 'c ', c);
    if (c <= 0) {
      return datalist;
    }
    let uuids = yield this.randTargets(iTier, n);
    // nPlayer.logInfo("[battle] matchMultiTarget2, uuids", uuids);
    uuids = _.without(uuids, myuuid);
    for (let k = 0; k < uuids.length; k++) {
      const uuid = uuids[k];
      if (!uuid) {
        continue;
      }
      const dData = yield this.packTargetData(uuid);
      if (!dData) {
        continue;
      }
      datalist.push(dData);
    }
    return datalist;
  }
  * tryMatchTargets(nPlayer, n, result) {
    const myuuid = nPlayer.getUUID();
    const pobj = nPlayer.getPlayerLogic();
    if (!pobj.isTCBattleUnlocked()) {
      return mbgGame.config.ErrCode.Arena_Locked;
    }
    if (this.m_IsRefreshing[myuuid]) {
      return mbgGame.config.ErrCode.Arena_Refreshing;
    }
    const curLv = this.getAvgLv(pobj);
    const iCurTier = this.getTierByAvgLv(curLv);
    // pobj.logInfo("[battle] match, cur tier", iCurTier, 'avgLv', curLv);
    let dataList = [];
    const excludeUUIDs = [nPlayer.getUUID()];
    this.m_IsRefreshing[myuuid] = true;
    for (let i = 0; i < searchOffsets.length; i += 1) {
      const iTierOffset = searchOffsets[i];
      // pobj.logInfo("[battle] iTierOffset", iTierOffset, 'iCurTier', iCurTier);
      const lst = yield this.matchMultiTarget(
        Math.max(1, iCurTier + iTierOffset),
        n - dataList.length,
        10,
        excludeUUIDs,
        'battle1');
      dataList = dataList.concat(lst);
      if (dataList.length >= n) {
        break;
      }
    }
    // 保底机制
    if (dataList.length < n) {
      // 往下找
      for (let iTier = iCurTier - 1; iTier >= 1; iTier -= tierLv) {
        const lst = yield this.matchMultiTarget(
          iTier,
          n - dataList.length,
          10,
          excludeUUIDs,
          'battle2');
        dataList = dataList.concat(lst);
        if (dataList.length === n) {
          break;
        }
      }
    }
    if (dataList.length < n) {
      // 往上找
      for (let iTier = iCurTier + 1; iTier <= tierTotal; iTier += tierLv) {
        const lst = yield this.matchMultiTarget(
          iTier,
          n - dataList.length,
          10,
          excludeUUIDs,
          'battle3');
        dataList = dataList.concat(lst);
        if (dataList.length === n) {
          break;
        }
      }
    }

    // mbgGame.logger.info("excludeUUIDs", excludeUUIDs);
    delete this.m_IsRefreshing[myuuid];
    if (dataList.length < n) {
      mbgGame.logError(`[tcbattle] dataList.length  ${dataList.length} < n ${n}, curLv: ${curLv} ${iCurTier} `);
    }
    result.dataList = dataList;
    return mbgGame.config.ErrCode.OK;
  }
  onPlayerTCBattleUnlocked(nPlayer) {
    const self = this;
    co(function* () {
      yield self.addPlayer(nPlayer);
    }).catch((err, result) => {
      mbgGame.logError("[onPlayerTCBattleUnlocked] err ", err);
    });
  }
  validBeginWar(pobj, targetIdx, schemeIdx) {
    if (!pobj.nickName()) {
      return mbgGame.config.ErrCode.Arena_NoName;
    }
    if (!pobj.getBSID()) {
      return mbgGame.config.ErrCode.Error;
    }
    if (!(targetIdx >= 0 && targetIdx < 5)) {
      return mbgGame.config.ErrCode.Battle_WrongIdx;
    }
    if (pobj.m_BattleCtrl.isWarBegan()) {
      return mbgGame.config.ErrCode.Battle_WarBegan;
    }
    if (pobj.getSta() < mbgGame.config.constTable.TCBattleSta) {
      return mbgGame.config.ErrCode.Battle_LackSta;
    }
    if (pobj.m_WarCommon.isEmptyScheme(defines.battleWorldIdx, schemeIdx)) {
      return mbgGame.config.ErrCode.Battle_NoAttackTeamData;
    }
    return mbgGame.config.ErrCode.OK;
  }
  * cacheTargetInfos(nPlayer, dResult) {
    const nBattleTargets = new NBattleTargets(nPlayer.getUUID());
    const err = yield this.tryMatchTargets(nPlayer, 5, dResult);
    if (err) {
      return err;
    }
    // 在随便打打表中,类型1按权重抽取两个额外奖励,随机对应在5个对手中等级最高的两个对手
    // 在随便打打表中,类型2按权重抽取两个额外奖励,随机对应剩下的三个对手(宝箱的掉落改在这里)
    const tcbattle = mbgGame.config.tcbattle;
    const dWeight1 = {};
    const dWeight2 = {};
    for (const id in tcbattle) {
      const dConfig = tcbattle[id];
      if (dConfig.type === 1) {
        dWeight1[id] = dConfig.w;
      } else {
        dWeight2[id] = dConfig.w;
      }
    }
    const idList = [
      defines.chooseOne(dWeight1),
      defines.chooseOne(dWeight1),
      defines.chooseOne(dWeight2),
      defines.chooseOne(dWeight2),
    ];
    mbgGame.logger.info("idList", idList);
    const dataList = [];
    // 排序
    dResult.dataList = _.sortBy(dResult.dataList, (dData) => { // 升序
      return dData.avglv || 0;
    });
    dResult.dataList = dResult.dataList.reverse();
    for (let i = 0; i < dResult.dataList.length; i++) {
      const dTarget = dResult.dataList[i];
      if (i < idList.length) {
        dTarget.rID = +idList[i];
      }
      // 转成字符串 才能存redis
      dataList.push(JSON.stringify(dTarget));
    }
    dResult.dataList = dataList;
    yield nBattleTargets.del();
    // 缓存起来
    const dData = {};
    for (let idx = 0; idx < dResult.dataList.length; idx++) {
      dData[idx] = dResult.dataList[idx];
    }
    yield nBattleTargets.hmset(dData);
    yield nBattleTargets.setExpireBySeconds(60 * 60);
    return null;
  }
  * removeTargetInfo(nPlayer, targetIdx) {
    const nBattleTargets = new NBattleTargets(nPlayer.getUUID());
    yield nBattleTargets.hdel(targetIdx);
  }
  * getTargetAliveIdxes(nPlayer) {
    const nBattleTargets = new NBattleTargets(nPlayer.getUUID());
    const idxes = yield nBattleTargets.hkeys();
    return idxes;
  }
  * getTargetInfos(nPlayer, dResult) {
    const nBattleTargets = new NBattleTargets(nPlayer.getUUID());
    // debug
    // yield nBattleTargets.del();
    // 先查是否有缓存
    let isExists = yield nBattleTargets.selfExists();
    let dData;
    if (isExists) {
      const _dData = yield nBattleTargets.hgetall();
      let allWin = true;
      for (let i = 0; i < 5; i++) {
        if (_dData && _dData[i]) {
          allWin = false;
          break;
        }
      }
      if (!allWin) {
        dData = _dData;
      } else {
        isExists = false;
      }
    }
    if (!isExists) {
      // 没缓存，开始匹配
      const _dResult = {};
      const err = yield this.cacheTargetInfos(nPlayer, _dResult);
      if (err) {
        return err;
      }
      dData = {};
      for (let i = 0; i < 5; i++) {
        dData[i] = _dResult.dataList[i];
      }
    }
    const leftTime = yield nBattleTargets.ttl();
    dResult.t = leftTime;
    for (let i = 0; i < 5; i++) {
      if (!dData[i]) {
        continue;
      }
      const dTargetData = JSON.parse(dData[i]);
      delete dTargetData.uuid;
      delete dTargetData.botting;
      delete dTargetData.robot;
      delete dTargetData.rank;
      delete dTargetData.score;
      dData[i] = dTargetData;
    }
    dResult.dData = dData;
    return null;
  }
  * getTargetData(nPlayer, targetIdx) {
    const nBattleTargets = new NBattleTargets(nPlayer.getUUID());
    const sTargetData = yield nBattleTargets.hget(targetIdx);
    if (!sTargetData) {
      return null;
    }
    const dTargetData = JSON.parse(sTargetData);
    return dTargetData;
  }
  * beginWar(nPlayer, targetIdx, schemeIdx) {
    const pobj = nPlayer.getPlayerLogic();
    let err;
    err = this.validBeginWar(pobj, targetIdx, schemeIdx);
    if (err) {
      return err;
    }
    mbgGame.logger.info("[battle.beginWar]", targetIdx);
    const dTargetData = yield this.getTargetData(nPlayer, targetIdx);
    if (!dTargetData) {
      return mbgGame.config.ErrCode.Error;
    }
    if (_.isEmpty(dTargetData)) {
      return mbgGame.config.ErrCode.Battle_NoTarget;
    }
    const dPVPData = {};
    const dScheme = pobj.m_WarCommon.getSchemeData(defines.battleWorldIdx, schemeIdx);
    const dAttackerData = mbgGame.Arena.getAttackerData(nPlayer, null, dScheme);
    if (_.isEmpty(dAttackerData.team)) {
      return mbgGame.config.ErrCode.Battle_NoAttackTeamData;
    }
    dPVPData.attacker = dAttackerData;
    dPVPData.defender = dTargetData;
    dPVPData.targetIdx = targetIdx;
    if (mbgGame.debuglog) {
      nPlayer.logInfo("[battle] dPVPData", dPVPData);
    }
    // 因为异步，还要再检查一次
    err = this.validBeginWar(pobj, targetIdx, schemeIdx);
    if (err) {
      return err;
    }
    pobj.m_BattleCtrl.createWar(dPVPData);
    return mbgGame.config.ErrCode.OK;
  }
  // 打包对手信息，出错返回空
  // nPlayer 可选
  * packTargetData(uuid, nPlayer) {
    const dResult = yield mbgGame.Arena.packTargetDataCommon(uuid, nPlayer && nPlayer.logDebugS && nPlayer.logDebugS.bind(nPlayer));
    if (_.isEmpty(dResult)) {
      return null;
    }
    const dTargetData = dResult.targetData;
    return dTargetData;
  }
  onRefresh() {
    const self = this;
    co(function* () {
      yield self.onRefreshGenerator();
    }).catch((err, result) => {
      mbgGame.logError(`[battle] onRefresh occur error`, err);
    });
  }
  * onRefreshGenerator() {
    const nTier = new NBattleTier(0);
    nTier.multi();
    for (let i = 1; i <= tierTotal; i++) {
      const iTier = i * tierLv;
      nTier.setName(iTier);
      nTier.count();
    }
    // 每个tier有多少人的统计，定时刷新即可
    this.m_TierCount = {};
    const lstCount = yield nTier.exec();
    for (let i = 0; i <= tierTotal; i++) {
      const iTier = i * tierLv;
      this.m_TierCount[iTier] = lstCount[i];
    }
    if (mbgGame.debuglog) {
      mbgGame.logger.info("[battle] onRefreshGenerator m_TierCount:", JSON.stringify(this.m_TierCount));
    }
  }
  onWarResult(nPlayer, result, dPVPData) {
    const self = this;
    co(function* () {
      if (result === defines.WarWin) {
        const rewardID = dPVPData.defender.rID;
        yield self.removeTargetInfo(nPlayer, dPVPData.targetIdx);
        nPlayer.logInfo("[battle] win rewardID", rewardID, "targetIdx", dPVPData.targetIdx);
        nPlayer.sendCmd('battleevt', {
          type: 1,
          idx: dPVPData.targetIdx,
        });
      }
      const iNowTime = moment().valueOf();
      yield self.addRecord(nPlayer.getUUID(), {
        type: 1, // 1:进攻 2:防守
        result,
        time: iNowTime,
        charaIDs: dPVPData.attacker.charaIDs,
        lv: defines.getAttackerLvList(dPVPData),
        target: {
          charaIDs: dPVPData.defender.charaIDs,
          lv: defines.getDefenderLvList(dPVPData),
          name: dPVPData.defender.name,
          totem: dPVPData.defender.totem,
        },
      });
    }).catch((err, r) => {
      nPlayer.logError(`[battle] onSaveWarResult occur error`, err);
    });
  }
  * addRecord(uuid, dInfo) {
    const nBattleRecords = new NBattleRecords(uuid);
    yield nBattleRecords.lpush(JSON.stringify(dInfo));
    yield nBattleRecords.ltrim(0, 20); // 只保存20条记录
    yield nBattleRecords.setExpireBySeconds(5 * 24 * 60 * 60);
  }
  * getAllRecords(uuid) {
    const nBattleRecords = new NBattleRecords(uuid);
    return yield nBattleRecords.lrange(0, -1);
  }
}


module.exports = TCBattleMgr;