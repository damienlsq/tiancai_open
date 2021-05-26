const co = require('co');
const assert = require('assert');
const defines = require('../logic/w_defines');
const Cache = require('../gameserver/cache');

/*
    1.main正式服定时刷新赌局
    2.刷新流程：
      每种赌局类型保存一个赌局数据List，0号赌局是当前赌局，1到n-1份是候选赌局
      赌局数据实时从机器人表或者争霸里筛选出来，然后保存
      当前赌局结算完成时，0号赌局pop，1号候选赌局变成当前赌局，并补充候选赌局
      不同的赌局类型，刷新间隔不一样
    3.MatchUUID的问题：
      赌局信息要有唯一uuid，另外再做索引

*/

/*
批量删除赌博的redis数据
redis-cli -h "host地址" -a 密码 --raw keys "tc_gamble*" | xargs redis-cli -h "host地址" -a 密码 --raw del

测服：

redis-cli -h "r-m5e0f2cec3e9fc64.redis.rds.aliyuncs.com" -a 8xc2c9qzyJi6 --raw keys "tc_gamble*" | xargs redis-cli -h "r-m5e0f2cec3e9fc64.redis.rds.aliyuncs.com" -a 8xc2c9qzyJi6 --raw del
*/

// 赌局类型
const MatchType = {
  Exchange: 1, // 替换成新的道具，sid、星级、品质、等级不变，itemID，随机属性变
  Refresh: 2, // 和Exchange近似，区别是itemID不变
  AddLv: 3, // 该道具的lv+1
};

const MatchTypes = [MatchType.Exchange, MatchType.Refresh, MatchType.AddLv];

// 赌局信息得自动删除
const expireTimes = {};
expireTimes[MatchType.Exchange] = 7 * 24 * 3600;
expireTimes[MatchType.Refresh] = 7 * 24 * 3600;
expireTimes[MatchType.AddLv] = 30 * 24 * 3600;
const relayExireTime = 7 * 24 * 3600;

/* 赌局简略信息，部分信息可以缓存在gs
{
  可缓存：
  t: type 赌局类型
  b: dBrief 战斗的简略信息
  // 以下两个字段必须在结算后才发给玩家
  u: replayUUID 该场赌局的战斗回放
  r: result 战斗结果
  lc: leftCount 左边下注数，结算时才记录
  rc: rightCount 右边下注数，结算时才记录
  cst: costTime
  不可缓存：
  s: startTime 赌局开始时间 没有s说明还不可以下注
  e: end 是否已结算
}
*/
const NMatchInfo = mbgGame.common.db_mgr.CHash.extend({
  // tc_gamble_h_match:MatchUUID
  FuncType: 'gamble',
  SubType: 'match',
});

// 赌局列表 每种类型的赌局存一系列MatchUUID
const NMatchList = mbgGame.common.db_mgr.CList.extend({
  // tc_gamble_l_matchs:MatchType
  // 永不expire
  FuncType: 'gamble',
  SubType: 'matchs',
});

// 每场赌局每个玩家的下注内容，结算奖励也放在这里面
/*
{
  playerUUID: JSON.stringify({
    下注内容
    in: {
      r: result,
      sid:
    },
    奖励内容
    out:{
    }
  })
}
*/
const NStakeContent = mbgGame.common.db_mgr.CHash.extend({
  // tc_gamble_h_content:MatchUUID
  FuncType: 'gamble',
  SubType: 'content',
});

// 玩家当前已下注的赌局MatchUUID
// 用在已结算的赌局的回顾
/*
  {
    type: MatchUUID
  }
*/
const NStakeRecord = mbgGame.common.db_mgr.CHash.extend({
  // tc_gamble_h_record:playerUUID
  // 永不expire，赌局uuid在确认后删除，不确认就不能下注
  FuncType: 'gamble',
  SubType: 'record',
});

class FakePlayer {
  getBSID() {
    return mbgGame.bsmgr.getIdleBSID(defines.Group_PVP);
  }
  setBSID(BSID) {
    this.m_BSID = BSID;
  }
  setPVPBSID(PVPBSID) {
    this.m_PVPBSID = PVPBSID;
  }
  getPVPBSID() {
    return this.m_PVPBSID;
  }
  updateBSFwdPair() {
    // pass
  }
  setUUID(uuid) {
    this.m_UUID = uuid;
  }
  getUUID() {
    return this.m_UUID;
  }
  getPlayerLogic() {
    return this;
  }
  onWarEvent(worldIdx, sEvent, dData) {
    mbgGame.logger.info('[gamble] onWarEvent', sEvent);
    try {
      if (sEvent === 'WarBegin') {
        mbgGame.Gamble.onWarBegin(this, dData);
      } else if (sEvent === 'WarEnd') {
        mbgGame.Gamble.onWarEnd(this, dData);
      } else {
        mbgGame.logError('[gamble] onWarEvent', sEvent);
      }
    } catch (e) {
      mbgGame.logger.info(e);
      mbgGame.logger.info(e.stack);
    }
  }
}

class FakePlayerAssure extends FakePlayer {
  onWarEvent(worldIdx, sEvent, dData) {
    mbgGame.logger.info('[gamble] onWarEvent', sEvent);
    try {
      if (sEvent === 'WarBegin') {
        mbgGame.logger.info('[gamble] assure, WarBegin', dData.gsvar, dData.result);
      } else if (sEvent === 'WarEnd') {
        mbgGame.Gamble.onAssureWarEnd(this, dData);
      } else {
        mbgGame.logError('[gamble] onWarEvent', sEvent);
      }
    } catch (e) {
      mbgGame.logger.info(e);
      mbgGame.logger.info(e.stack);
    }
  }
}

class GambleCtrl {
  *randomSearch(matchType, loopIdx) {
    let datalist = null;
    let iTier;
    let i = 0;
    do {
      const [minAvgLv, maxAvgLv] = mbgGame.config.constTable.gambleAvgLvRange[matchType];
      const avglv = _.random(minAvgLv, maxAvgLv);
      iTier = mbgGame.TCBattleMgr.getTierByAvgLv(avglv);
      const uuid = `${matchType}-${iTier}`;
      if (Cache.get(`Player:${uuid}`)) {
        continue;
      }
      datalist = yield mbgGame.TCBattleMgr.matchMultiTarget(iTier, 2, 10, null, 'gamble');
      // mbgGame.logger.info("[gamble] randomSearch", i, matchType, iTier, datalist && datalist.length);
      if (Cache.get(`Player:${uuid}`)) {
        datalist = null;
        continue;
      }
      i += 1;
      if (i > 10000) {
        break; // 防止死循环
      }
    } while (_.isEmpty(datalist) || datalist.length !== 2);
    if (_.isEmpty(datalist) || datalist.length !== 2) {
      mbgGame.logError(`[gamble] randomSearch failed: ${matchType}`);
      return;
    }
    mbgGame.logger.info('[gamble] randomSearch success', matchType, iTier, loopIdx);
    // mbgGame.logger.info("[gamble] datalist", JSON.stringify(datalist));
    this.beginSimWar(matchType, iTier, datalist, loopIdx);
  }
  beginSimWar(matchType, iTier, datalist, loopIdx) {
    const fakepobj = new FakePlayer();
    const uuid = `${matchType}-${iTier}`;
    fakepobj.setUUID(uuid);
    if (Cache.get(`Player:${uuid}`)) {
      mbgGame.logError(`beginSimWar has player uuid: ${uuid}`);
    }
    Cache.set(`Player:${uuid}`, fakepobj);
    mbgGame.logger.info('beginWar', matchType, iTier);
    // mbgGame.logger.info("beginWar", matchType, "left", JSON.stringify(datalist[0]));
    // mbgGame.logger.info("beginWar", matchType, "right", JSON.stringify(datalist[1]));
    const dPVPData = {};
    dPVPData.attacker = datalist[0];
    dPVPData.defender = datalist[1];
    // mbgGame.logger.info("createPVPWar", JSON.stringify(dPVPData));
    const dLeftTeamData = mbgGame.WarData.getPVPTeamWarData(dPVPData.attacker.charaIDs, dPVPData.attacker.team);
    const dRightTeamData = mbgGame.WarData.getPVPTeamWarData(dPVPData.defender.charaIDs, dPVPData.defender.team);
    const worldIdx = 99;
    const dItem = {};
    const dAttackerItem = dPVPData.attacker.item;
    const dDefenderItem = dPVPData.defender.item;
    dItem[defines.TEAM_LEFT] = mbgGame.WarData.packWarData_Item(dAttackerItem.bag, dAttackerItem.data, 'atk');
    dItem[defines.TEAM_RIGHT] = mbgGame.WarData.packWarData_Item(dDefenderItem.bag, dDefenderItem.data, 'def');

    const dInfo = defines.getPVPInfoForClient(dPVPData);
    const dBotting = {};
    dBotting[defines.TEAM_LEFT] = dPVPData.attacker.botting;
    dBotting[defines.TEAM_RIGHT] = dPVPData.defender.botting;
    let matchUUID = '';
    let _uuid = dPVPData.attacker.uuid;
    matchUUID += _uuid.substring(0, 4) + _uuid.substring(_uuid.length - 4);
    _uuid = dPVPData.defender.uuid;
    matchUUID += _uuid.substring(0, 4) + _uuid.substring(_uuid.length - 4);
    const dData = {
      worldIdx,
      bg: mbgGame.config.constTable.PVPBg,
      ft: defines.getForceEndTime(worldIdx),
      lt: 'Sim',
      fpt: 100,
      gsvar: [matchType, loopIdx, matchUUID],
      record: true,
      shortid: 'gambleRobotSID',
      targetUUID: dPVPData.defender.uuid,
      item: dItem,
      team: {
        left: dLeftTeamData,
        right: dRightTeamData,
      },
      botting: dBotting,
      auto: true,
      cinfo: dInfo,
      sendInit: false,
      send: true,
      frt: 2,
    };
    mbgGame.bsmgr.createPVPWar(fakepobj, dData);
    mbgGame.bsmgr.beginPVPWar(fakepobj, {
      worldIdx,
    });
    mbgGame.logger.info('beginWar success', matchType, iTier);
  }
  *assureWar(matchType, matchUUID, replayUUID) {
    const uuid = `gamble-assure-${matchType}-${matchUUID}`;
    if (Cache.get(`Player:${uuid}`)) {
      return true; // 已经在跑assureWar了
    }
    const dReplayData = yield mbgGame.Replay.getReplayData(replayUUID, true);
    if (Cache.get(`Player:${uuid}`)) {
      // 异步 双重验证
      return true;
    }
    // dReplayData是缓存的，所以下面的修改会持久化的，要注意
    if (!dReplayData) {
      return false;
    }
    const dWarData = dReplayData.warData;
    if (!dWarData) {
      return false;
    }
    dWarData.replay = true;
    delete dWarData.result;
    if (dReplayData.cst) {
      dWarData.cst = dReplayData.cst;
    }
    dWarData.fpt = 5;
    dWarData.sendInit = false;
    dWarData.lt = 'Assure';
    dWarData.gsvar = [matchType, 0, matchUUID];
    dWarData.send = false;
    const fakepobj = new FakePlayerAssure();
    fakepobj.setUUID(uuid);
    Cache.set(`Player:${uuid}`, fakepobj);
    mbgGame.bsmgr.createPVPWar(fakepobj, dWarData);
    mbgGame.bsmgr.beginPVPWar(fakepobj, {
      worldIdx: 99,
    });
    return true;
  }
  onAssureWarEnd(fakepobj, dData) {
    const matchType = dData.gsvar[0];
    const matchUUID = dData.gsvar[2];
    const uuid = `gamble-assure-${matchType}-${matchUUID}`;
    if (!Cache.get(`Player:${uuid}`)) {
      return;
    }
    Cache.del(`Player:${uuid}`);
    mbgGame.bsmgr.playerRealOffline(fakepobj);
    mbgGame.logger.info('[gamble] assure, onAssureWarEnd', matchType, matchUUID, dData.result);
    this.onCloseMatch('assure', matchType, matchUUID, dData.result);
  }
  onWarBegin(fakepobj, dData) {
    mbgGame.logger.info('[gamble] sim, onWarBegin', ...dData.gsvar);
  }
  onWarEnd(fakepobj, dData) {
    // 统计
    const matchType = dData.gsvar[0];
    const loopIdx = dData.gsvar[1];
    const alivesPair = dData.alives;
    mbgGame.logger.info('[gamble] sim, onWarEnd', matchType, loopIdx, dData.result, dData.costTime, alivesPair);
    Cache.del(`Player:${fakepobj.getUUID()}`);
    mbgGame.bsmgr.playerRealOffline(fakepobj);
    //  验证战斗结果是否符合
    const alives = alivesPair[0] || alivesPair[1];
    let alivesMax = defines.chooseOne(mbgGame.config.constTable[`alivesWeight${matchType}`]);
    alivesMax = +alivesMax;
    if (dData.result !== defines.WarDraw && alives <= alivesMax) {
      this.onFoundCandidateMatch(matchType, dData);
    } else {
      const self = this;
      co(function*() {
        // 赌局不合适，判断是否需要继续找
        const nMatchList = new NMatchList(matchType);
        const num = yield nMatchList.llen();
        if (num < 2) {
          if (loopIdx >= 100) {
            mbgGame.logError(`[gamble] loopIdx >= 100 halted. ${matchType}`);
            return;
          }
          // 仍然需要补充
          yield self.randomSearch(matchType, loopIdx + 1);
        }
      }).catch((err) => {
        mbgGame.logError('[randomSearch] ', err);
      });
    }
  }

  /*---------------
   赌局控制 main服务器才会跑下面的代码
  -----------------*/
  startMatchLoop() {
    mbgGame.logger.info('[gamble] check is main', mbgGame.server_config.tags.indexOf('main') !== -1);
    if (mbgGame.server_config.tags.indexOf('main') === -1) {
      return;
    }
    mbgGame.logger.info('[gamble] main sever, init gamble loop');
    const self = this;
    // 延迟一分钟再启动，要等BS连接
    mbgGame.common.timer.setOnceTimer(60 * 1000, () => {
      co(function*() {
        if (mbgGame.bsmgr && mbgGame.bsmgr.hasWorkingBS()) {
          yield self.startMatchLoopReal();
        } else {
          mbgGame.logger.info('[gamble] startMatchLoop wait 1 minute');
          self.startMatchLoop();
        }
      }).catch((err) => {
        mbgGame.logError('[startMatchLoop] err ', err);
      });
    });
  }
  *startMatchLoopReal() {
    mbgGame.logger.info('[gamble] startMatchLoopReal');
    for (let i = 0; i < MatchTypes.length; i++) {
      yield this.refreshMatch(MatchTypes[i]);
    }
  }
  // 此函数可任意重复调用
  *refreshMatch(matchType) {
    // 1. 确保赌局列表要>=2
    const nMatchList = new NMatchList(matchType);
    let num = yield nMatchList.llen();
    // 2. 初始化0号赌局的结算定时器
    if (!this.hasEndTimer(matchType) && num > 0) {
      do {
        const matchUUID = yield nMatchList.lindex(0);
        const nMatchInfo = new NMatchInfo(matchUUID);
        const exist = yield nMatchInfo.selfExists();
        if (!exist) {
          mbgGame.logger.info('refreshMatch first match no exist, pop it', matchType, matchUUID, num);
          yield nMatchList.lpop();
          num -= 1;
          break;
        }
        let startTime = yield nMatchInfo.hget('s');
        startTime = +startTime;
        if (!(startTime > 0)) {
          startTime = moment().unix();
          yield nMatchInfo.hset('s', startTime);
        }
        const leftTime = this.calLeftTime(startTime, matchType);
        mbgGame.logger.info('[gamble] updateEndTimer leftTime', leftTime, startTime, matchType);
        this.updateEndTimer(matchType, leftTime, (...args) => {
          this.onCloseMatch(...args);
        });
      } while (0);
    }
    if (num < 2) {
      // 需要补充
      yield this.randomSearch(matchType, 1);
    }
  }
  calLeftTime(startTime, matchType) {
    const hour = mbgGame.config.constTable.MatchType2Hour[matchType];
    const interval = Math.round(hour * 3600);
    const endTime = +startTime + interval;
    const nowTime = moment().unix();
    const leftTime = Math.max(0, endTime - nowTime);
    return leftTime;
  }
  hasEndTimer(matchType) {
    return this.m_TimerIDDict && this.m_TimerIDDict[matchType];
  }
  updateEndTimer(matchType, leftTime, cb) {
    if (!this.m_TimerIDDict) {
      this.m_TimerIDDict = {};
    }
    if (this.m_TimerIDDict[matchType]) {
      mbgGame.common.timer.removeTimer(this.m_TimerIDDict[matchType]);
    }
    if (leftTime <= 0) {
      cb('leftTime <= 0', matchType);
      return;
    }
    const timerID = mbgGame.common.timer.setOnceTimer(leftTime * 1000, () => {
      cb('endtimeout', matchType);
    });
    this.m_TimerIDDict[matchType] = timerID;
  }
  onFoundCandidateMatch(matchType, dWarEndData) {
    mbgGame.logger.info('[gamble] onFoundCandidateMatch ', matchType);
    if (mbgGame.isServerShutdown) {
      mbgGame.logger.info('[gamble] isServerShutdown ');
      return;
    }
    const self = this;
    co(function*() {
      const nMatchList = new NMatchList(matchType);
      const num = yield nMatchList.llen();
      if (num >= 2) {
        mbgGame.logger.info('[gamble] onFoundCandidateMatch num >= 2');
        return;
      }
      const dWarData = dWarEndData.warData;
      const matchUUID = dWarEndData.gsvar[2];
      if (dWarData.fpt) {
        delete dWarData.fpt;
      }
      if (dWarData.lt === 'Sim') {
        dWarData.lt = 'PVP';
      }
      yield self.addMatchInfo(matchType, matchUUID, dWarEndData);
      yield self.refreshMatch(matchType);
    }).catch((err) => {
      mbgGame.logError('[addMatchInfo] err ', err);
    });
  }
  calBriefData(iTeam, warData) {
    const cinfo = iTeam === defines.TEAM_LEFT ? warData.cinfo.left : warData.cinfo.right;
    const dTeam = iTeam === defines.TEAM_LEFT ? warData.team.left : warData.team.right;
    const dItem = warData.item[iTeam];
    const charaIDs = [];
    const lv = [];
    const item = [];
    const dAllItemData = dItem.data || {};
    for (let posIdx = 0; posIdx < 5; posIdx++) {
      const dChara = dTeam[posIdx];
      if (!dChara) {
        charaIDs.push(0);
        lv.push(0);
        continue;
      }
      const sidList = dItem.bag && dItem.bag[posIdx];
      const sid = sidList && sidList[0];
      charaIDs.push(dChara.ID);
      lv.push(dChara.lv);
      item.push(dAllItemData[sid]);
    }
    const dCharaInfos = mbgGame.WarData.calCharaInfos(dTeam, dItem.bag, dItem.data);
    return {
      charaIDs,
      lv,
      item,
      info: dCharaInfos,
      name: cinfo.name,
      totem: cinfo.totem,
    };
  }
  *addMatchInfo(matchType, matchUUID, dWarEndData) {
    mbgGame.logger.info('[gamble] try addMatchInfo', matchType, matchUUID);
    const result = dWarEndData.result;
    let nMatchInfo = new NMatchInfo(matchUUID);
    let exist = yield nMatchInfo.selfExists();
    if (exist) {
      const e = yield nMatchInfo.hget('e');
      const end = e != null ? +e : 0;
      if (!end) {
        // 还在进行，重新roll
        mbgGame.logger.info('[gamble] addMatchInfo selfExists and not ended', matchType);
        return false;
      }
      // 加后缀id，避免影响旧的赌局信息
      matchUUID += _.random(100000, 900000);
      nMatchInfo = new NMatchInfo(matchUUID);
    }
    mbgGame.logger.info('[gamble] addMatchInfo', matchType, matchUUID);
    const nStakeContent = new NStakeContent(matchUUID);
    // mbgGame.logger.info("[gamble] addMatchInfo", matchType, matchUUID, JSON.stringify(dWarEndData.warData));
    const dBrief = {
      left: this.calBriefData(defines.TEAM_LEFT, dWarEndData.warData),
      right: this.calBriefData(defines.TEAM_RIGHT, dWarEndData.warData),
    };
    const replayUUID = mbgGame.Replay.saveWarReplay(dWarEndData, relayExireTime);
    yield nMatchInfo.hmset({
      t: matchType,
      u: replayUUID,
      r: result,
      b: dBrief,
      lc: 0,
      rc: 0,
      cst: dWarEndData.costTime,
      e: 0,
    });
    yield nStakeContent.hset('0', '0'); // 占位
    yield nMatchInfo.setExpireBySeconds(expireTimes[matchType]);
    yield nStakeContent.setExpireBySeconds(expireTimes[matchType]);
    const nMatchList = new NMatchList(matchType);
    yield nMatchList.rpush(matchUUID);
    const len = yield nMatchList.llen();
    exist = yield nMatchInfo.selfExists();
    assert(exist);
    // mbgGame.logger.info("[gamble] addMatchInfo dBrief", JSON.stringify(dBrief));
    // mbgGame.logger.info("[gamble] addMatchInfo, len", len);
    mbgGame.logger.info('[gamble] addMatchInfo sucess', matchType, matchUUID, len, replayUUID, result);
    return true;
  }
  onCloseMatch(reason, matchType, ...args) {
    mbgGame.logger.info('[gamble] onCloseMatch', reason, matchType, ...args);
    const self = this;
    co(function*() {
      yield self.closeMatch(matchType, ...args);
    }).catch((err) => {
      mbgGame.logError('[onCloseMatch] err ', err);
    });
  }
  // 赌局结算
  // 结算后matchinfo要保留，
  // 不保留下注列表
  *closeMatch(matchType, matchUUIDAssure, warResultAssure) {
    mbgGame.logger.info('[gamble] closeMatch matchType', matchType);
    const nMatchList = new NMatchList(matchType);
    const matchUUID = yield nMatchList.lindex(0);
    const nMatchInfo = new NMatchInfo(matchUUID);
    const nStakeContent = new NStakeContent(matchUUID);
    let exist = yield nMatchInfo.selfExists();
    if (!exist) {
      yield this.refreshMatch(matchType);
      return;
    }
    // 判断是否已结算
    const [e, replayUUID] = yield nMatchInfo.hmget(['e', 'u']);
    const end = e != null ? +e : 0;
    if (end) {
      mbgGame.logger.info('[gamble] closeMatch end', matchType, matchUUID);
      yield nMatchList.lpop();
      yield this.refreshMatch(matchType);
      return;
    }
    if (!this.m_TimerIDDict) {
      this.m_TimerIDDict = {};
    }
    if (this.m_TimerIDDict[matchType]) {
      mbgGame.common.timer.removeTimer(this.m_TimerIDDict[matchType]);
      delete this.m_TimerIDDict[matchType];
    }
    if (!matchUUIDAssure) {
      const ok = yield this.assureWar(matchType, matchUUID, replayUUID);
      if (ok) {
        return;
      }
      mbgGame.logError('[gamble] assureWar failed', matchType, matchUUID);
    } else {
      if (matchUUIDAssure !== matchUUID) {
        mbgGame.logError(`[gamble] matchUUIDAssure != matchUUID, ${matchType}, ${matchUUIDAssure}, ${matchUUID}`);
        return;
      }
    }
    exist = yield nMatchInfo.selfExists();
    if (!exist) {
      yield this.refreshMatch(matchType);
      return;
    }
    yield nMatchList.lpop();
    yield nMatchInfo.hset('e', 1);
    const _MatchInfo = yield nMatchInfo.hgetall();
    if (warResultAssure === 1 || warResultAssure === 2) {
      const oldResult = yield nMatchInfo.hget('r');
      if (+oldResult !== warResultAssure) {
        mbgGame.logger.info('[gamble] assure, update result', matchUUID, oldResult, '->', warResultAssure);
        // 监控运行情况用，确定运行良好后remove
        mbgGame.logError(`[gamble] 赌局结果自动变更： ${matchUUID}, ${oldResult} -> ${warResultAssure}`);
        yield nMatchInfo.hset('r', warResultAssure);
      }
    }
    const stakedNum = yield nStakeContent.hlen();
    if (stakedNum === 1) {
      // 只有占位符，即没有人下注，删掉这个key
      yield nStakeContent.del();
      yield nMatchInfo.setExpireBySeconds(30);
      this.removeCachedMatchInfo(matchUUID);
    }
    const redis = mbgGame.common.db_mgr.getDB('redis-stat');
    yield redis.publish(`${mbgGame.ProjectName}:mbg_stat`, `matchClosed ${matchType} ${matchUUID}`);
    // 奖励计算不在这里做，玩家查询赌局信息做
    mbgGame.logger.info('[gamble] closeMatch done', matchType, matchUUID);
    yield this.refreshMatch(matchType);
  }
  onMatchClosed(matchType, matchUUID) {
    mbgGame.logger.info('[gamble] onMatchClosed', matchType, matchUUID);
    if (matchType >= 1 && matchType <= 3 && matchUUID) {
      this.removeCachedMatchInfo(matchUUID);
    }
  }
  /*---------------
  玩家交互，每个gs都可以调用
  -----------------*/
  // 验证可否下注
  *validMakeStake(nPlayer, matchType, matchUUID, result, sid) {
    if (MatchTypes.indexOf(matchType) === -1) {
      return mbgGame.config.ErrCode.Gamble_WrongType;
    }
    if (result !== defines.WarWin && result !== defines.WarFail) {
      return mbgGame.config.ErrCode.Gamble_WrongResult;
    }
    const nMatchInfo = new NMatchInfo(matchUUID);
    const exist = yield nMatchInfo.selfExists();
    if (!exist) {
      return mbgGame.config.ErrCode.Gamble_MatchNotExist;
    }
    const nStakeRecord = new NStakeRecord(nPlayer.getUUID());
    const stakedMatchUUID = yield nStakeRecord.hget(matchType);
    if (stakedMatchUUID) {
      nPlayer.logInfo('[gamble] already stake this matchType', matchType, stakedMatchUUID, matchUUID);
      const nMatchInfoStaked = new NMatchInfo(stakedMatchUUID);
      const exist_ = yield nMatchInfoStaked.selfExists();
      if (exist_) {
        return mbgGame.config.ErrCode.Gamble_StakedType;
      }
      nPlayer.logInfo('[gamble] match gone', matchType);
      yield nStakeRecord.hdel(matchType);
    }
    const nStakeContent = new NStakeContent(matchUUID);
    const staked = yield nStakeContent.hexists(nPlayer.getUUID());
    if (staked) {
      return mbgGame.config.ErrCode.Gamble_StakedMatch;
    }
    // 最后再同步验证道具，防止异步问题
    const pobj = nPlayer.getPlayerLogic();
    if (!sid) {
      return mbgGame.config.ErrCode.Gamble_NoSid;
    }
    if (!pobj.m_ItemBag.hasItem(sid)) {
      return mbgGame.config.ErrCode.Gamble_NoItem;
    }
    if (pobj.m_ItemBag.isItemLocked(sid)) {
      return mbgGame.config.ErrCode.Gamble_ItemLocked;
    }
    return 0;
  }
  // 下注，需要指定matchType，以及输赢
  *makeStake(nPlayer, matchType, result, sid) {
    const pobj = nPlayer.getPlayerLogic();
    const nMatchList = new NMatchList(matchType);
    const matchUUID = yield nMatchList.lindex(0);
    if (!matchUUID) {
      return mbgGame.config.ErrCode.Gamble_NoMatch;
    }
    if (pobj.hasAsyncLock('makeStake')) {
      return mbgGame.config.ErrCode.AsyncLock;
    }
    pobj.setAsyncLock('makeStake');
    const err = yield this.validMakeStake(nPlayer, matchType, matchUUID, result, sid);
    pobj.delAsyncLock('makeStake');
    if (err) {
      return err;
    }
    const nMatchInfo = new NMatchInfo(matchUUID);
    const nStakeContent = new NStakeContent(matchUUID);
    pobj.logInfo('[gamble] begin makeStake', matchType, result, sid, matchUUID);
    pobj.m_ItemBag.lockGambledItem(sid, matchType === MatchType.AddLv);
    const dStakeData = {
      in: {
        r: result,
        sid,
      },
    };
    nMatchInfo.multi();
    if (result === defines.WarWin) {
      nMatchInfo.hincrby('lc', 1);
    } else if (result === defines.WarFail) {
      nMatchInfo.hincrby('rc', 1);
    }
    const sStakeData = JSON.stringify(dStakeData);
    pobj.logInfo('[gamble] nStakeContent.hset', sStakeData);
    nStakeContent.hset(nPlayer.getUUID(), sStakeData);
    const nStakeRecord = new NStakeRecord(nPlayer.getUUID());
    nStakeRecord.hset(matchType, matchUUID);
    yield nMatchInfo.exec();
    return 0;
  }
  // 验证可否下注
  *validCancelStake(nPlayer, matchType, dInfo) {
    if (MatchTypes.indexOf(matchType) === -1) {
      return mbgGame.config.ErrCode.Gamble_WrongType;
    }
    const nStakeRecord = new NStakeRecord(nPlayer.getUUID());
    const stakedMatchUUID = yield nStakeRecord.hget(matchType);
    if (!stakedMatchUUID) {
      return mbgGame.config.ErrCode.Gamble_NoStake;
    }
    const nStakeContent = new NStakeContent(stakedMatchUUID);
    const staked = yield nStakeContent.hexists(nPlayer.getUUID());
    if (!staked) {
      nPlayer.logInfo('[gamble] validCancelStake error', stakedMatchUUID);
      return mbgGame.config.ErrCode.Gamble_NoStake2;
    }
    // 如果赌局已经结束了，就不能取消
    const nMatchInfo = new NMatchInfo(stakedMatchUUID);
    const [e, startTime] = yield nMatchInfo.hmget(['e', 's']);
    const end = e != null ? +e : 0;
    if (end) {
      return mbgGame.config.ErrCode.Gamble_Ended;
    }
    const leftTime = this.calLeftTime(startTime, matchType);
    nPlayer.logInfo('[gamble] cancel leftTime', leftTime);
    if (leftTime <= 5 * 60) {
      return mbgGame.config.ErrCode.Gamble_Ending;
    }
    dInfo.uuid = stakedMatchUUID;
    return 0;
  }
  *cancelStake(nPlayer, matchType) {
    const pobj = nPlayer.getPlayerLogic();
    if (pobj.hasAsyncLock('cancelStake')) {
      return mbgGame.config.ErrCode.AsyncLock;
    }
    pobj.setAsyncLock('cancelStake');
    const dInfo = {};
    const err = yield this.validCancelStake(nPlayer, matchType, dInfo);
    pobj.delAsyncLock('cancelStake');
    if (err) {
      return err;
    }
    const matchUUID = dInfo.uuid;
    // 因为异步，赌局可能刚好结束了，但还是允许玩家取消
    const nStakeRecord = new NStakeRecord(nPlayer.getUUID());
    const nMatchInfo = new NMatchInfo(matchUUID);
    const nStakeContent = new NStakeContent(matchUUID);
    pobj.logInfo('[gamble] begin cancelStake', matchType, matchUUID);
    let dStakeData = yield nStakeContent.hget(nPlayer.getUUID());
    dStakeData = dStakeData && JSON.parse(dStakeData);
    if (!dStakeData) {
      return mbgGame.config.ErrCode.Gamble_NoStake;
    }
    if (dStakeData.out) {
      return mbgGame.config.ErrCode.Gamble_Ended;
    }
    const ok = yield nStakeContent.hdel(nPlayer.getUUID());
    if (ok) {
      const sid = dStakeData.in.sid;
      const result = dStakeData.in.r;
      if (pobj.m_ItemBag.hasItem(sid)) {
        pobj.m_ItemBag.unlockGambledItem(sid);
      }
      if (result === defines.WarWin) {
        nMatchInfo.hincrby('lc', -1);
      } else if (result === defines.WarFail) {
        nMatchInfo.hincrby('rc', -1);
      }
    }
    yield nStakeRecord.hdel(matchType);
    return null;
  }
  // 获取赌局info，会缓存在gs里
  // 赌局过期时会删除缓存
  // Note：主要是用来获取赌局的静态信息，动态信息需要即时从redis获取
  *getOrCacheMatchInfo(matchUUID) {
    let dMatchInfo = Cache.get(`match:${matchUUID}`);
    if (!dMatchInfo || !dMatchInfo.b) {
      const nMatchInfo = new NMatchInfo(matchUUID);
      dMatchInfo = yield nMatchInfo.loadAsync();
      if (!dMatchInfo) {
        return null;
      }
      if (!dMatchInfo.b) {
        // 连b字段都没有，应该是查询了之前的有异常的赌局
        yield nMatchInfo.del(); // 清除redis异常数据
        return null;
      }
      const matchType = +dMatchInfo.t;
      const startTime = +dMatchInfo.s;
      const leftTime = this.calLeftTime(startTime, matchType);
      // 设了过期时间
      Cache.set(`match:${matchUUID}`, dMatchInfo, moment().valueOf() + leftTime * 1000);
    }
    return dMatchInfo;
  }
  *getStakeCount(matchUUID) {
    const nMatchInfo = new NMatchInfo(matchUUID);
    const [lc, rc] = yield nMatchInfo.hmget(['lc', 'rc']);
    mbgGame.logger.info('share gamble', matchUUID, lc, rc);
    return {
      lc: lc || 0,
      rc: rc || 0,
    };
  }
  removeCachedMatchInfo(matchUUID) {
    Cache.del(`match:${matchUUID}`);
  }
  calRewardInfo(pobj, dMatchInfo, dStakeData) {
    // 生成奖励信息
    if (!dStakeData.out) {
      const dOut = {};
      dStakeData.out = dOut;
      const sid = dStakeData.in.sid;
      const dItemData = pobj.m_ItemBag.getItemData(sid);
      if (!dItemData) {
        pobj.logError('[gamble] calRewardInfo no item', sid);
        return false;
      }
      pobj.logInfo('calRewardInfo origin:', JSON.stringify(dItemData));
      if (dMatchInfo.t === MatchType.Exchange) {
        const dOption = {};
        let itemIDs = pobj.m_ItemBag.getCanDropItemIDs();
        itemIDs = _.filter(itemIDs, (id) => {
          return id !== dItemData.i;
        });
        dOption.itemID = itemIDs[_.random(0, itemIDs.length - 1)];
        dOption.starLv = dItemData.s;
        dOption.quality = dItemData.q;
        dOut.item = pobj.m_ItemBag.generateItem(dOption);
        dOut.item.lv = dItemData.lv;
        pobj.logInfo('calRewardInfo Exchange dOut.item.i', dOut.item.i);
      } else if (dMatchInfo.t === MatchType.Refresh) {
        const dOption = {};
        dOption.itemID = dItemData.i;
        dOption.starLv = dItemData.s;
        dOption.quality = dItemData.q;
        dOut.item = pobj.m_ItemBag.generateItem(dOption);
        dOut.item.lv = dItemData.lv;
        pobj.logInfo('calRewardInfo Refresh dOut.item.i', dOut.item.i);
      } else if (dMatchInfo.t === MatchType.AddLv) {
      }
      return true;
    }
    return false;
  }
  *calRewardInfoWrap(nPlayer, matchUUID, dMatchInfo, dStakeData, end) {
    const pobj = nPlayer.getPlayerLogic();
    if (!end) {
      return true;
    }
    if (!dStakeData || !dStakeData.in) {
      return true;
    }
    if (!dMatchInfo) {
      pobj.logError('[gamble] calRewardInfoWrap no dMatchInfo', matchUUID);
      return false;
    }
    if (+dMatchInfo.r !== +dStakeData.in.r) {
      return true;
    }
    if (!dStakeData.out) {
      // 赌局结束了，且有下注，且赌赢了，且未计算奖励
      const ok = this.calRewardInfo(pobj, dMatchInfo, dStakeData);
      pobj.logInfo('[gamble] calRewardInfo ok', ok, matchUUID);
      if (ok) {
        pobj.logInfo('[gamble] dStakeData', JSON.stringify(dStakeData));
        const nStakeContent = new NStakeContent(matchUUID);
        yield nStakeContent.hset(nPlayer.getUUID(), JSON.stringify(dStakeData));
        return true;
      }
      pobj.logError('[gamble] calRewardInfo failed', matchUUID);
      return false;
    }
    return true;
  }
  // 获取单场赌局信息 dMatchData
  *getRealtimeMatchInfo(nPlayer, matchUUID) {
    const nMatchInfo = new NMatchInfo(matchUUID);
    const nStakeContent = new NStakeContent(matchUUID);
    let dStakeData = yield nStakeContent.hget(nPlayer.getUUID());
    dStakeData = dStakeData && JSON.parse(dStakeData);
    const dMatchInfo = yield this.getOrCacheMatchInfo(matchUUID);
    if (!dMatchInfo) {
      // nPlayer.logError("[gamble] getRealtimeMatchInfo no dMatchInfo", matchUUID);
      return null;
    }
    const [startTime, e, r, lc, rc] = yield nMatchInfo.hmget(['s', 'e', 'r', 'lc', 'rc']);
    const end = e != null ? +e : 0;
    const leftCount = lc || 0;
    const rightCount = rc || 0;
    dMatchInfo.e = end ? 1 : 0;
    dMatchInfo.r = +r;
    yield this.calRewardInfoWrap(nPlayer, matchUUID, dMatchInfo, dStakeData, end);
    // 赌局简略信息
    const dMatchData = {
      // 非即时信息
      t: dMatchInfo.t,
      b: dMatchInfo.b, // 战斗简略信息
      // 即时信息
      s: +startTime,
      e: end ? 1 : 0,
      lc: +leftCount, // 赌赢的人数
      rc: +rightCount, // 赌输的人数
      // 自己的下注信息
      d: dStakeData, // 有d说明已经下注
    };
    if (dMatchData.e) {
      // 结算了才发结果，防止作弊
      // 非即时信息
      dMatchData.u = dMatchInfo.u;
      dMatchData.r = dMatchInfo.r;
    }
    return dMatchData;
  }
  *validConfirm(nPlayer, matchType, matchUUID, ended, result, dStakeData, bRedeem) {
    const pobj = nPlayer.getPlayerLogic();
    const uuid = nPlayer.getUUID();
    if (!dStakeData) {
      // 未下注
      return mbgGame.config.ErrCode.Gamble_NoStake;
    }
    const nStakeRecord = new NStakeRecord(uuid);
    const stakedMatchUUID = yield nStakeRecord.hget(matchType);
    if (!stakedMatchUUID || stakedMatchUUID !== matchUUID) {
      // 未下注
      return mbgGame.config.ErrCode.Gamble_NoStake2;
    }
    // 已结束的才可以confirm
    if (!ended) {
      return mbgGame.config.ErrCode.Gamble_NotEnd;
    }
    // 计算下奖励信息
    const dMatchInfo = yield this.getOrCacheMatchInfo(matchUUID);
    if (!dMatchInfo) {
      return mbgGame.config.ErrCode.Gamble_MatchExpired;
    }
    if (dMatchInfo.t !== matchType) {
      return mbgGame.config.ErrCode.Error;
    }
    yield this.calRewardInfoWrap(nPlayer, matchUUID, dMatchInfo, dStakeData, ended);
    const sid = dStakeData.in.sid;
    if (!sid || !pobj.m_ItemBag.hasItem(sid)) {
      return mbgGame.config.ErrCode.Error;
    }
    if (+result !== dStakeData.in.r) {
      // 赌输了
      if (bRedeem) {
        // 想赎回，验证下是否够钱
        if (pobj.getDiamonds() < pobj.m_ItemBag.getRedeemPrice(matchType, sid)) {
          return mbgGame.config.ErrCode.LackDiamond;
        }
      }
    }
    return null;
  }
  // 已下注的赌局，无论输赢、无论赎回不赎回都需要确认
  // bRedeem:是否赎回
  *confirmMatch(nPlayer, matchType, matchUUID, bRedeem) {
    const pobj = nPlayer.getPlayerLogic();
    pobj.logInfo('[gamble] confirmMatch', matchType, matchUUID, bRedeem);
    const uuid = nPlayer.getUUID();
    if (pobj.hasAsyncLock('confirmMatch')) {
      return mbgGame.config.ErrCode.Error;
    }
    pobj.setAsyncLock('confirmMatch');
    const nStakeContent = new NStakeContent(matchUUID);
    let dStakeData = yield nStakeContent.hget(uuid);
    dStakeData = dStakeData && JSON.parse(dStakeData);
    const nMatchInfo = new NMatchInfo(matchUUID);
    let [e, result] = yield nMatchInfo.hmget(['e', 'r']);
    const end = e != null ? +e : 0;
    result = +result;
    const err = yield this.validConfirm(nPlayer, matchType, matchUUID, end, result, dStakeData, bRedeem);
    pobj.delAsyncLock('confirmMatch');
    if (err) {
      pobj.logInfo('[gamble] confirmMatch err', err);
      return err;
    }
    const bWin = +result === +dStakeData.in.r;
    pobj.logInfo(`[gamble] confirmMatch ${matchType},${matchUUID},${bRedeem},${result}`);
    pobj.logInfo(`[gamble] confirmMatch, bWin:${bWin},dStakeData=${JSON.stringify(dStakeData)}`);
    // validConfirm之后不要调用yield，直到做完结算，否则会有异步漏洞
    const nStakeRecord = new NStakeRecord(uuid);
    const sid = dStakeData.in.sid;
    // 解除道具的锁定
    pobj.m_ItemBag.unlockGambledItem(sid);
    if (!bWin) {
      // 赌输
      if (bRedeem) {
        // 赎回赌注（目前是道具）
        pobj.addDiamonds(-pobj.m_ItemBag.getRedeemPrice(matchType, sid), 'redeem');
        pobj.sendMessage(nPlayer.getString('gamble_result_1'));
      } else {
        // 不赎回，删除道具
        // 返还部分金币
        const coins = pobj.m_ItemBag.getSellPrice(sid, mbgGame.config.constTable.ItemGamblePriceRatio);
        pobj.m_ItemBag.realRemoveItem(sid, 'gamble');
        pobj.m_ItemBag.onItemsDel([sid]);
        const dAward = {};
        dAward.coins = coins;
        pobj.giveAward(dAward, 'gambleitem');
        pobj.sendMessage(nPlayer.getString('gamble_result_2'));
      }
    } else {
      // 赌赢
      pobj.logInfo('[gamble] giveaward, sid:', sid, 'out.item:', dStakeData.out && JSON.stringify(dStakeData.out.item));
      // 给奖励
      // 替换被下注的道具
      // 如果是第三种赌局，没有out.item
      if (dStakeData.out && dStakeData.out.item) {
        pobj.m_ItemBag.setItemData(sid, dStakeData.out.item, 'gamble');
        pobj.m_ItemBag.onSomeItemsChanged([sid]);
      }
      if (matchType === MatchType.AddLv) {
        const dItemData = pobj.m_ItemBag.getItemData(sid);
        const oldLv = dItemData.lv;
        // 直接加等级
        const _err = pobj.m_ItemBag.upgradeItem(sid, true);
        if (!_err) {
          pobj.m_ItemBag.onSomeItemsChanged([sid]);
        }
        pobj.logInfo('calRewardInfo AddLv:', dItemData.i, oldLv, dItemData.lv, _err);
      }
      const dAward = {};
      dAward.gem = mbgGame.config.constTable.GambleGem;
      pobj.giveAward(dAward, 'gamblegem');
      pobj.sendMessage(nPlayer.getString('gamble_result_3'));
    }
    pobj.m_Stat.addStatVal(`gamble${bWin ? 'Win' : 'Lose'}`, 1);
    yield nStakeContent.hdel(uuid);
    yield nStakeRecord.hdel(matchType);
    const stakedNum = yield nStakeContent.hlen();
    if (stakedNum === 1) {
      pobj.logInfo('confirmMatch allconfirmed', matchType, matchUUID);
      // 只有占位符，即没有人下注，删掉这个key
      yield nStakeContent.del();
      yield nMatchInfo.setExpireBySeconds(30);
      this.removeCachedMatchInfo(matchUUID);
    }
    return null;
  }
  // 查询赌场信息，不能频繁调用
  *gambleInfo(nPlayer) {
    const nStakeRecord = new NStakeRecord(nPlayer.getUUID());
    const dInfo = {
      cur: {}, // matchUUIDs 当前正在进行的赌局
      staked: {}, // type: matchUUIDs 已下注的赌局（可能已结束）
      data: null, // matchUUID2info 相关赌局的信息，包括已结束的、正在进行的
    };
    const allMatchUUIDs = [];
    const matchUUID2info = {};
    // 当前已下注的赌局
    const stakedMatchUUIDs = yield nStakeRecord.hmget(MatchTypes);
    for (let i = 0; i < stakedMatchUUIDs.length; i++) {
      const stakedMatchUUID = stakedMatchUUIDs[i];
      if (!stakedMatchUUID) {
        continue;
      }
      const nMatchInfo = new NMatchInfo(stakedMatchUUID);
      const type = yield nMatchInfo.hget('t');
      dInfo.staked[type] = stakedMatchUUID;
      allMatchUUIDs.push(stakedMatchUUID);
    }
    const pobj = nPlayer.getPlayerLogic();
    // 当前正在进行的赌局
    for (let i = 0; i < MatchTypes.length; i++) {
      const matchType = MatchTypes[i];
      const nMatchList = new NMatchList(matchType);
      const matchUUID = yield nMatchList.lindex(0);
      if (!matchUUID) {
        const len = yield nMatchList.llen();
        pobj.logInfo('[gamble] gambleInfo, no cur match', matchType, len);
        continue;
      }
      dInfo.cur[matchType] = matchUUID;
      if (allMatchUUIDs.indexOf(matchUUID) === -1) {
        allMatchUUIDs.push(matchUUID);
      }
    }
    for (let i = 0; i < allMatchUUIDs.length; i++) {
      const matchUUID = allMatchUUIDs[i];
      const dMatch = yield this.getRealtimeMatchInfo(nPlayer, matchUUID);
      if (dMatch) {
        matchUUID2info[matchUUID] = dMatch;
      }
    }
    dInfo.data = matchUUID2info;
    return dInfo;
  }
  // 获取赌局战斗简略数据
  // 观看指定赌局的回放 ，赌局未结束前不能播放回放
  *replay(nPlayer, matchUUID) {
    const pobj = nPlayer.getPlayerLogic();
    const nMatchInfo = new NMatchInfo(matchUUID);
    const [e, replayUUID] = yield nMatchInfo.hmget(['e', 'u']);
    if (e == null && replayUUID == null) {
      return false;
    }
    const ended = e != null ? +e : 0;
    let haltTime = null;
    if (!ended) {
      haltTime = mbgGame.config.WarPreviewTime || [0.5, 10];
    }
    pobj.logInfo('[gamble] replay', matchUUID, e, ended, haltTime);
    const doCache = true;
    const noResult = !ended;
    const ok = yield mbgGame.Replay.replayWar(pobj, replayUUID, doCache, haltTime, noResult);
    return ok;
  }
  *fixGambleItems(nPlayer, sids) {
    const pobj = nPlayer.getPlayerLogic();
    pobj.logInfo('fixGambleItems', JSON.stringify(sids));
    // 检查这些sid是不是被赌博锁了 但是又不在下注清单里
    if (sids && sids.length) {
      // 先找出已下注的
      const stakedSidList = [];
      const nStakeRecord = new NStakeRecord(nPlayer.getUUID());
      const stakedMatchUUIDs = yield nStakeRecord.hmget(MatchTypes);
      for (let i = 0; i < stakedMatchUUIDs.length; i++) {
        const stakedMatchUUID = stakedMatchUUIDs[i];
        if (!stakedMatchUUID) {
          continue;
        }
        const nStakeContent = new NStakeContent(stakedMatchUUID);
        let dStakeData = yield nStakeContent.hget(nPlayer.getUUID());
        dStakeData = dStakeData && JSON.parse(dStakeData);
        if (dStakeData.in && dStakeData.in.sid) {
          stakedSidList.push(dStakeData.in.sid);
        }
      }
      for (let i = 0; i < sids.length; i++) {
        const sid = sids[i];
        const dData = pobj.m_ItemBag.getItemData(sid);
        if (dData && dData.l2) {
          if (stakedSidList.indexOf(sid) === -1) {
            // 解锁
            pobj.m_ItemBag.unlockGambledItem(sid);
          }
        }
      }
    }
  }
}

module.exports = GambleCtrl;
