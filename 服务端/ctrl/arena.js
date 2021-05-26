const co = require('co');
const uuid_module = require('uuid');
const crontab = require('node-schedule');
const playerCtrl = require('./player');
const defines = require('../logic/w_defines');
const CItemBag = require('../logic/itembag');
const utils = require("../gameserver/utils");
const assert = require('assert');

const Cache = mbgGame.common.cache;

// ///////////////////////////////////////////////////////////////////////////////////////
//      天才争霸 （天梯积分模式的异步PVP）
//
// 2017-8-14 改：
// 竞技场对手数据只需要缓存在GS内存即可（以前是放redis），玩家下线时清除
// 玩家对象在GS驻留时间至少要15分钟，和对手刷新时间匹配，不然就可以通过下线再上线刷新对手
// ///////////////////////////////////////////////////////////////////////////////////////

const robotUUIDsRedis = 'tc_arena_s_robotuuids';

const NArenaTier = mbgGame.common.db_mgr.CSet.extend({
  // tc_arena_s_tier:tierScore 各个分段的玩家的uuid的集合，用来做匹配
  // key: tierScore
  FuncType: "arena",
  SubType: "tier",
});

const NArenaFixbug = mbgGame.common.db_mgr.CExpireNormal.extend({
  FuncType: "arena",
  SubType: "fixbug",
});

// 竞技场动态，每次战斗结算，双方各追加一个
// 动态要设过期时间
const NArenaNews = mbgGame.common.db_mgr.CList.extend({
  // tc_arena_l_news:uuid
  // key: uuid
  FuncType: "arena",
  SubType: "news",
});

// 赛季编号，第一赛季是1
// 每次seasonend自动加1
const NArenaSeasonIdx = mbgGame.common.db_mgr.CNormal.extend({
  // tc_arena_k_seasonidx
  FuncType: "arena",
  SubType: "seasonIdx",
});

const NArenaSeasonStartTime = mbgGame.common.db_mgr.CNormal.extend({
  // tc_arena_k_seasonstart
  FuncType: "arena",
  SubType: "seasonStart",
});

// 备份整个排行榜，用于做每日奖励
// expire： 七天后过期
const NArenaDayRankingBackup = mbgGame.common.db_mgr.CSortedSet.extend({
  // tc_arena_z_rankbackup: Math.floor(moment().unix() / (3600 * 24));
  // key: uuid
  FuncType: "arena",
  SubType: "daybackup",
});

// 备份整个排行榜，用于做赛季奖励
// expire： 3个月后过期
const NArenaSeasonRankingBackup = mbgGame.common.db_mgr.CSortedSet.extend({
  // tc_arena_z_rankbackup: seasonIdx
  // key: uuid
  FuncType: "arena",
  SubType: "seasonbackup",
});

// 标记已做每日结算的day，递增，永不过期
const NArenaClosedDay = mbgGame.common.db_mgr.CNormal.extend({
  // tc_arena_k_closedday
  FuncType: "arena",
  SubType: "closedday",
});


// 标记已做每日结算的day，递增，永不过期
const NArenaClosedSeason = mbgGame.common.db_mgr.CNormal.extend({
  // tc_arena_k_closedseason
  FuncType: "arena",
  SubType: "closedseason",
});

//  mbgGame.config.PVPData
/*
{
    "expire":15,  // 对手信息过期时间，单位分钟
    "targets": 3, //  每次刷新要匹配的对手数量
    "manualPerDay":3,
    "tierScore":40,
    "baseScore": 1500,
   ]
}
*/

// 竞技场管理器&排行榜
// 所有玩家的pvp积分以这个zset为准
const NArena = mbgGame.common.db_mgr.CSortedSet.extend({
  // tc_arena_z_rank   全部玩家zset，用来做排行榜
  // member uuid
  // score 积分
  FuncType: "arena",
  SubType: "rank",
  onInit() {
    this.m_AreaTier = {};
    this.m_UUID2PVPData = {}; // PlayerUUID到这个player的PVP数据的哈希表
    this.m_WarUUID2PlayerUUID = {}; // Player当前正在发起的战斗（同时只有一场）的UUID到Player的UUID的哈希表，用来唯一标记战斗
    this.m_PlayerUUID2warUUIDs = {}; // 保存来自其他人的进攻的warUUID（可以有多个，用列表存）
    this.m_IsRefreshing = {}; // uuid:bool，标志，防止同时进行多个刷新操作
    this.m_refreshTimer = mbgGame.common.timer.setRepeatTimer(10 * 60 * 1000, this.onRefresh.bind(this));
  },
  * startMain() {
    if (mbgGame.server_config.tags.indexOf("main") === -1) {
      return;
    }
    mbgGame.logger.info("[arena] main ArenaServer");
    // main服务器开机就检查机器人是否存在
    // 防止删档的时候把机器人删了
    yield this.initRobot();
    const self = this;
    const cron_everyday = '0 0 0 * * *';
    this.crontabJob = crontab.scheduleJob(cron_everyday, () => {
      mbgGame.logger.info("[arena] onNewDay:", moment().format("YYYY/M/D"));
      co(function*() {
        yield self.onDayEnd();
      }).catch((err, result) => {
        mbgGame.logError(`[ctrl.arena.onNewDay] occur error`, err);
      });
    });
    mbgGame.Arena.checkSeason();
  },
  // season自动调度
  checkSeason() {
    mbgGame.logger.info('[ctrl.arena.checkSeason]');
    const self = this;
    co(function*() {
      const starttime = yield self.yieldSeasonStartTime();
      if (!starttime) {
        yield self.onSeasonStart();
        self.checkSeason();
        return;
      }
      if (this.crontabJobSeasonEnd) {
        this.crontabJobSeasonEnd.cancel();
        delete this.crontabJobSeasonEnd;
      }
      const endTime = self.getSeasonEndTime();
      const seasonIdx = yield self.yieldSeasonIdx();
      const nowtime = moment().valueOf();
      if (seasonIdx != null && endTime > 0) {
        if (endTime > nowtime) {
          const enddate = new Date(endTime);
          mbgGame.logger.info('[ctrl.arena.checkSeason] crontab.scheduleJob enddate:', enddate, "endTime", endTime);
          this.crontabJobSeasonEnd = crontab.scheduleJob(enddate, () => {
            self.onSeasonEndCB(seasonIdx, 'checkSeason1');
          });
        } else {
          mbgGame.logger.info('[ctrl.arena.checkSeason] endTime < nowtime:', endTime, nowtime);
          yield self.onSeasonEnd(seasonIdx, 'checkSeason2');
        }
      } else {
        mbgGame.logError(`[ctrl.arena.checkSeason] err, endTime: ${endTime} seasonIdx: ${seasonIdx}`);
      }
    }).catch((err) => {
      mbgGame.logError('[ctrl.arena.checkSeason] occur error:', err);
    });
  },
  onSeasonEndCB(...args) {
    const self = this;
    co(function*() {
      yield self.onSeasonEnd(...args);
    }).catch((err) => {
      mbgGame.logError('[ctrl.arena.onSeasonEndCB] occur error:', err);
    });
  },
  // remove
  * fixbug() {

    /*
   const nArenaFixbug = new NArenaFixbug();
   const result = yield nArenaFixbug.setnx(1);
   if (result === 1) {
     mbgGame.logger.info("[arena] fixbug, 1");
   }*/
  },
  * onDayEnd() {
    // 备份整个排行榜，玩家自己主动去查询并计算每日奖励
    mbgGame.logger.info("[arena] onDayEnd begin");
    const day = Math.floor(moment().unix() / (3600 * 24));
    const nBackUp = new NArenaDayRankingBackup(day); // 昨天
    const exists = yield nBackUp.selfExists();
    if (!exists) {
      yield this.copyTo(nBackUp.key());
      yield nBackUp.setExpireBySeconds(60 * 60 * 24 * 7); // 7天
      const nArenaClosedDay = new NArenaClosedDay("");
      yield nArenaClosedDay.set(day);
    }
    mbgGame.logger.info("[arena] onDayEnd done");
  },
  * checkReward(nPlayer) {
    const pobj = nPlayer.getPlayerLogic();
    // 还能查询得到排行榜记录，就做奖励
    // 每日奖励
    yield this.checkDayReward(nPlayer);
    // 赛季奖励
    yield this.checkSeasonReward(nPlayer);
    return pobj.m_PVPCtrl.getArenaDiamonds();
  },
  * checkDayReward(nPlayer) {
    const pobj = nPlayer.getPlayerLogic();
    // 根据段位给奖励
    // 当天结算的（如果当前时间已经过了结算时间），以及前面6天的
    let diamonds = 0;
    const nArenaClosedDay = new NArenaClosedDay("");
    const closedDay = yield nArenaClosedDay.get();
    const savedDay = pobj.m_PVPCtrl.getSavedDay();
    if (closedDay == null || +savedDay >= +closedDay) {
      return;
    }
    for (let d = Math.max(savedDay, closedDay - 7); d <= closedDay; d++) {
      const nBackUp = new NArenaDayRankingBackup(d);
      let score = yield nBackUp.zscore(nPlayer.getUUID());
      if (score == null) {
        // 无数据或数据已过期（刚开服的时候或者人为删除旧数据的时候）
        continue;
      }
      score = Number(score);
      const iTier = this.getTierByScore(score);
      let dConfig = mbgGame.config.tier2kConfig[iTier];
      if (!dConfig) {
        // 直接给最高的
        dConfig = mbgGame.config.tier2kConfig['40000'];
      }
      diamonds += dConfig.dayReward;
    }
    pobj.m_PVPCtrl.saveDay(closedDay);
    pobj.m_PVPCtrl.addArenaDiamonds(diamonds);
    pobj.logInfo("checkDayReward done, diamonds", diamonds, "savedDay", savedDay, "closedDay", closedDay);
  },
  * checkSeasonReward(nPlayer) {
    const pobj = nPlayer.getPlayerLogic();
    const nArenaClosedSeason = new NArenaClosedSeason("");
    const closeSeasonIdx = yield nArenaClosedSeason.get();
    const savedSeasonIdx = pobj.m_PVPCtrl.getSavedSeasonIdx();
    if (closeSeasonIdx == null || +savedSeasonIdx >= +closeSeasonIdx) {
      return;
    }
    let diamonds = 0;
    const dRewardConfig = mbgGame.config.arenarewardlist;
    pobj.m_PVPCtrl.saveSeasonIdx(closeSeasonIdx);
    // 根据排名给奖励
    // 只查上个赛季就行了
    const nBackUp = new NArenaSeasonRankingBackup(closeSeasonIdx);
    let rank = yield nBackUp.zrevrank(nPlayer.getUUID());
    if (rank != null) {
      rank += 1;
      for (let rewardIdx = 1; dRewardConfig[rewardIdx]; rewardIdx++) {
        const dReward = dRewardConfig[rewardIdx];
        const rankStart = dReward.range[0];
        const rankEnd = dReward.range[1];
        if (rank >= rankStart &&
          ((rankEnd == null && rank === rankStart) || rank <= rankEnd)) {
          // 在区间里
          diamonds = dReward.seasonReward;
          break;
        }
      }
    }
    pobj.m_PVPCtrl.addArenaDiamonds(diamonds);
    pobj.logInfo("checkSeasonReward done, diamonds", diamonds, "rank", rank,
      "savedSeasonIdx", savedSeasonIdx, "closeSeasonIdx", closeSeasonIdx);
  },
  // 不可随便调用
  * onSeasonStart() {
    // 设置赛季开始时间
    yield this.setSeasonStartTime();
    yield this.addSeasonIdx();
  },
  * setSeasonStartTime() {
    const nArenaSeasonStartTime = new NArenaSeasonStartTime("");
    const nowTime = moment().valueOf();
    // mbgGame.logger.info("[setSeasonStartTime]", nextDayTimeStamp);
    const ret = yield nArenaSeasonStartTime.set(nowTime);
    mbgGame.logger.info("[setSeasonStartTime]", nowTime, 'ret', ret);
  },
  * addSeasonIdx() {
    const nArenaSeasonIdx = new NArenaSeasonIdx("");
    const idx = yield nArenaSeasonIdx.incrby(1);
    mbgGame.logger.info("[addSeasonIdx] ret(idx)", idx);
  },
  // 查询当前是第几赛季
  * yieldSeasonIdx() {
    const nArenaSeasonIdx = new NArenaSeasonIdx("");
    return yield nArenaSeasonIdx.get();
  },
  * yieldSeasonStartTime() {
    const nArenaSeasonStartTime = new NArenaSeasonStartTime("");
    let t = yield nArenaSeasonStartTime.get();
    t = Number(t);
    this.m_SeasonStartTime = t;
    return t;
  },
  getSeasonIdx() {
    return this.m_SeasonIdx;
  },
  getSeasonStartTime() {
    return this.m_SeasonStartTime;
  },
  // ms
  getSeasonConfigDuration() {
    const hours = mbgGame.config.constTable.ArenaSeasonHours;
    return hours * 3600 * 1000;
  },
  getSeasonEndTime() {
    return this.m_SeasonStartTime + this.getSeasonConfigDuration();
  },
  receiveReward(nPlayer) {
    const pobj = nPlayer.getPlayerLogic();
    const diamonds = pobj.m_PVPCtrl.getArenaDiamonds();
    if (diamonds > 0) {
      pobj.m_PVPCtrl.cleanArenaDiamonds();
      pobj.giveAward({
        diamonds,
      }, "arena");
    }
    return 0;
  },
  * onSeasonEnd(seasonIdx, tag) {
    mbgGame.logger.info(`[arena] onSeasonEnd, ${seasonIdx}, ${tag}`);
    // 验证赛季idx
    const curSeasonIdx = yield this.yieldSeasonIdx();
    if (!seasonIdx || curSeasonIdx !== seasonIdx) {
      mbgGame.logError(`[arena] onSeasonEnd, wrong idx, curSeasonIdx ${curSeasonIdx} seasonIdx ${seasonIdx}`);
      return;
    }
    // 0.备份排行榜数据
    const nArenaClosedSeason = new NArenaClosedSeason("");
    yield nArenaClosedSeason.set(seasonIdx);
    const nBackUp = new NArenaSeasonRankingBackup(seasonIdx);
    yield this.copyTo(nBackUp.key());
    yield nBackUp.setExpireBySeconds(60 * 60 * 24 * 30 * 3); // 3个月

    // 1.清除机器人数据
    yield this.cleanRobot();

    // 2.有序取出排行榜所有人的信息，从高分到低分
    const ranklist = yield this.zrevrange(0, -1, {
      withscores: true,
    });
    // 3.调整每个人的积分
    const modifyList = [];
    for (let i = 0, len = ranklist.length; i < len; i += 2) {
      const uuid = ranklist[i];
      const score = ranklist[i + 1];
      modifyList.push([uuid, Math.ceil(score * 0.5)]);
    }
    this.multi();
    for (let i = 0; i < modifyList.length; i++) {
      const [uuid, score] = modifyList[i];
      this.zadd(score, uuid);
    }
    yield this.exec();

    // 4.重置tier
    yield this.resetAllTier();
    // 5. 开始下一赛季
    yield this.onSeasonStart();
    yield this.onRefreshGenerator('season restart');
    this.checkSeason();
    // 6. 重新导入机器人
    yield this.initRobot(true);
  },
  * resetAllTier() {
    mbgGame.logger.info('[ctrl.arena.resetAllTier]');
    // 清空tier信息，并重新计算tier信息，否则下一赛季搜敌会出错
    const nTier = new NArenaTier(0);
    this.multi();
    const tierScore = this.tierScore();
    for (let i = 0; i <= defines.tierTotalPVP; i++) {
      const iTier = i * tierScore;
      // 0、40、80、120、········
      nTier.setName(iTier);
      nTier.del();
    }
    yield this.exec();
    mbgGame.logger.info('[ctrl.arena.resetAllTier] clean tiers ok');
    const ranklist = yield this.zrevrange(0, -1, {
      withscores: true,
    });
    this.multi();
    for (let i = 0, rank = 1, len = ranklist.length; i < len; i += 2, rank += 1) {
      const uuid = ranklist[i];
      const score = ranklist[i + 1];
      yield this.setScore({
        uuid,
        newScore: score,
        hasOldScore: false,
        multi: true,
      }); // 放进tier
    }
    yield this.exec();
    mbgGame.logger.info('[ctrl.arena.resetAllTier] set everyone score ok');
  },
  tierScore() {
    return defines.tierScore;
  },
  onRefresh() {
    const self = this;
    co(function*() {
      yield self.onRefreshGenerator('onRefresh');
    }).catch((err, result) => {
      mbgGame.logError(`[ctrl.arena.onRefresh] occur error`, err);
    });
  },
  * onRefreshGenerator(reason) {
    mbgGame.logger.info("[arena] refresh, reason:", reason);
    const nTier = new NArenaTier(0);
    nTier.multi();
    const tierScore = this.tierScore();
    for (let i = 0; i <= defines.tierTotalPVP; i++) {
      const iTier = i * tierScore;
      // 0、40、80、120、········
      nTier.setName(iTier);
      nTier.count();
    }
    // 每个tier有多少人的统计，定时刷新即可
    this.m_TierCount = {};
    const lstCount = yield nTier.exec();
    for (let i = 0; i <= defines.tierTotalPVP; i++) {
      const iTier = i * tierScore;
      this.m_TierCount[iTier] = lstCount[i];
    }
    if (mbgGame.debuglog) {
      mbgGame.logger.info("[arena] m_TierCount:", JSON.stringify(this.m_TierCount));
    }

    // 缓存排行榜信息，减少redis查询
    const uuids = yield this.zrevrange(0, (mbgGame.config.constTable && mbgGame.config.constTable.ArenaRankCacheNum) || 150);
    const lstData = [];
    for (let i = 0, len = uuids.length; i < len; i++) {
      const uuid = uuids[i];
      // 这里只需要拿info
      const dData = yield this.cacheTargetData(uuid, 'info');
      if (!dData || _.isEmpty(dData)) { // 没有数据？
        // mbgGame.logError(`refresh rank data, no dData, uuid: ${uuid}`);
        continue;
      }
      if (!dData.info) {
        // mbgGame.logError(`refresh rank data, no info, uuid: ${uuid}`);
        continue;
      }
      const dInfo = {
        totem: dData.info.totem,
        name: dData.info.nickname || "",
        describe: dData.info.describe,
      };
      if (!dData.info.robot) {
        dInfo.score = yield this.zscore(uuid);
      } else {
        dData.robot = 1;
        dInfo.score = dData.info.score;
      }
      lstData.push(dInfo);
    }
    this.m_RankData = lstData;
    // mbgGame.logger.info("[arena] refresh, m_RankData:", JSON.stringify(lstData));
    this.m_SeasonIdx = yield this.yieldSeasonIdx();
    this.m_SeasonIdx = +this.m_SeasonIdx;
    mbgGame.logger.info("[arena] refresh, yieldSeasonIdx:", this.m_SeasonIdx);
    this.m_SeasonStartTime = yield this.yieldSeasonStartTime();
    mbgGame.logger.info("[arena] refresh, yieldSeasonStartTime:", this.m_SeasonStartTime);
  },
  * getPlayerRank(nPlayer) {
    const rank = yield this.zrevrank(nPlayer.getUUID());
    if (rank == null) {
      return null;
    }
    return rank + 1;
  },
  * hasPlayer(nPlayer) {
    const rank = yield this.getPlayerRank(nPlayer);
    return rank != null;
  },
  // 解锁竞技场时调用这个
  * addPlayer(nPlayer) {
    const uuid = nPlayer.getUUID();
    const oldScore = yield this.getRealCurScore(uuid);
    if (!oldScore) {
      yield this.setScore({
        uuid,
        newScore: mbgGame.config.PVPData.baseScore,
      });
    }
    const pobj = nPlayer.getPlayerLogic();
    pobj.m_PVPCtrl.setPVPDefSchemeIdx(0);
    pobj.m_PVPCtrl.onSendPVPData();
  },
  * removePlayer(nPlayer) {
    const uuid = nPlayer.getUUID();
    yield this.removePlayerByUUID(uuid);
  },
  * removePlayerByUUID(uuid, score) {
    if (!score) {
      score = yield this.getRealCurScore(uuid);
    }
    const iTier = this.getTierByScore(score);
    const nTier = this.getNArenaTier(iTier);
    const deletedNum = yield nTier.srem(uuid);
    if (deletedNum !== 1) {
      mbgGame.logger.info("arena.removePlayer err:", uuid, score, iTier);
    }
    // const uuids = yield nTier.smembers();
    // mbgGame.logger.info("afterremove:", nTier.key(), uuid, uuids);
    yield this.zrem(uuid);
  },
  // 因为被攻打的人，可能不在线或者不在同一台机或者数据已经转到mysq了，
  // 那么没办法即时地更新目标玩家身上的分数，所以才需要这个函数
  // 调用时机：online时，心跳时
  * syncScoreAndRank(nPlayer, tag, nerror) {
    const pobj = nPlayer.getPlayerLogic();
    const uuid = nPlayer.getUUID();
    let score = yield this.getRealCurScore(uuid);
    score = parseInt(score);
    if (!_.isNumber(score)) {
      if (!nerror) nPlayer.logError(`syncScoreAndRank ${tag}] unvalid score`, score);
      return null;
    }
    const rank = yield this.zrevrank(uuid);
    if (!_.isNumber(rank)) {
      if (!nerror) nPlayer.logError(`[syncScoreAndRank ${tag}] no rank`, rank, uuid);
      return null;
    }
    // nPlayer.logInfo(`syncScoreAndRank ${tag}], rank`, rank, `score`, score);
    pobj.m_PVPCtrl.setPVPCurScore(score, this.getSeasonIdx());
    pobj.m_PVPCtrl.setPVPCurRank(rank + 1);
    return [score, rank];
  },
  * getRealCurScore(uuid) {
    let score = yield this.zscore(uuid);
    if (score != null) {
      score = Number(score);
    }
    return score;
  },
  getTierByScore(score) {
    const tierScore = this.tierScore();
    return Math.floor(score / tierScore) * tierScore;
  },
  getNArenaTier(iTier) {
    assert(iTier >= 0);
    if (!this.m_AreaTier[iTier]) {
      this.m_AreaTier[iTier] = new NArenaTier(iTier);
    }
    return this.m_AreaTier[iTier];
  },
  * setScore(dOption) {
    const uuid = dOption.uuid;
    const newScore = dOption.newScore;
    const hasOldScore = dOption.hasOldScore;
    const oldScore = dOption.oldScore;
    const robot = dOption.robot;
    // mbgGame.logger.info("arena.setScore", dOption);
    const iNewTier = this.getTierByScore(newScore);
    if (!robot) {
      // 更新排行榜中的分数
      if (dOption.multi) {
        this.zadd(newScore, uuid);
      } else {
        const ret = yield this.zadd(newScore, uuid); // 其实zadd是reset操作
        if (mbgGame.debuglog) {
          mbgGame.logger.info("setScore, zadd, ret", ret, uuid, newScore);
        }
      }
    }
    // 更新tier集合
    if (hasOldScore) {
      if (oldScore == null) {
        mbgGame.logError("[arena] no oldScore");
        return;
      }
      const iOldTier = this.getTierByScore(oldScore);
      mbgGame.logger.info(`[arena] smove iOldTier: ${iOldTier}, ${oldScore} iNewTier ${iNewTier}, ${newScore}`);
      if (iOldTier !== iNewTier) {
        const nOldTier = this.getNArenaTier(iOldTier);
        const nNewTier = this.getNArenaTier(iNewTier);
        const ok = yield nOldTier.smove(nNewTier.key(), uuid);
        if (!ok) {
          mbgGame.logError(`[arena] smove failed, uuid: ${uuid} iOldTier: ${iOldTier} iNewTier: ${iNewTier}`);
        }
      }
    } else {
      const nTier = this.getNArenaTier(iNewTier);
      if (dOption.multi) {
        nTier.sadd(uuid);
      } else {
        const addNum = yield nTier.sadd(uuid);
        if (mbgGame.debuglog) {
          mbgGame.logger.info("setScore, nTier.sadd, addNum", addNum, uuid, iNewTier, nTier.key());
        }
        if (addNum !== 1) {
          mbgGame.logError(`[arena] nTier.sadd failed, uuid ${uuid} iNewTier ${iNewTier}`);
        }
      }
    }
  },
  * randTargets(iTier, num) {
    const nTier = this.getNArenaTier(iTier);
    const uuids = yield nTier.srandmember(num);
    return uuids;
  },
  validRefreshTarget(nPlayer) {
    const pobj = nPlayer.getPlayerLogic();
    if (!pobj.nickName()) {
      return mbgGame.config.ErrCode.Arena_NoName;
    }
    if (!pobj.isArenaUnlocked()) {
      return mbgGame.config.ErrCode.Arena_Locked;
    }
    const myuuid = nPlayer.getUUID();
    if (this.m_IsRefreshing[myuuid]) {
      return mbgGame.config.ErrCode.Arena_Refreshing;
    }
    return mbgGame.config.ErrCode.OK;
  },
  // 立即匹配3个对手，匹配到的对手的队伍信息缓存在redis，设一个过期时间
  // 客户端要求开战时，以缓存的信息为准去战斗，结算也是
  * refreshTargets(nPlayer, result, force) {
    const myuuid = nPlayer.getUUID();
    const pobj = nPlayer.getPlayerLogic();
    if (!nPlayer.getInfo("nickname")) {
      return mbgGame.config.ErrCode.Arena_NoName;
    }
    if (this.m_IsRefreshing[myuuid]) {
      return mbgGame.config.ErrCode.Arena_Refreshing;
    }
    if (!force) {
      const iLeftCD = pobj.m_PVPCtrl.getPVPRefreshLeftCD();
      if (iLeftCD > 10) { // 如果还差10秒就刷新，给他刷吧，而如果超过10秒，则不能刷
        return mbgGame.config.ErrCode.Arena_RefreshCDing;
      }
    }
    const tierScore = this.tierScore();
    const targetNum = mbgGame.config.PVPData.targets; // 3
    const curScore = pobj.m_PVPCtrl.getPVPCurScore(); // 注意：不一定和排行榜的分数同步，有延迟
    const iCurTier = this.getTierByScore(curScore);
    if (this.m_IsRefreshing[myuuid]) {
      return mbgGame.config.ErrCode.Arena_Refreshing;
    }
    this.m_IsRefreshing[myuuid] = true;
    pobj.m_PVPCtrl.cleanFoughtFlag();
    // 匹配规则：
    //  | ----- A ----- | - B - | ----- C ----- |
    //  B区间：自己的分数对应的区间（tier）
    //  A区间：比自己的区间低的区间
    //  C区间：比自己的区间高的区间
    let targetUUIDs = []; // 记录3个对手的uuid
    const uuids = yield this.randTargets(iCurTier, 2); // 同tier里随机找2个人，并且要排除掉自己
    nPlayer.logDebugS && nPlayer.logDebugS("[arena] step1, uuids", uuids, "iCurTier", iCurTier);
    if (uuids) {
      targetUUIDs = _.without(uuids, myuuid);
      nPlayer.logDebugS && nPlayer.logDebugS("[arena] step2, uuids", targetUUIDs);
    }
    // C区间找
    for (let iTier = iCurTier + tierScore; iTier < 8000; iTier += tierScore) {
      const c = this.m_TierCount[iTier];
      if (c > 0) {
        let _uuids = yield this.randTargets(iTier, 3 - targetUUIDs.length);
        _uuids = _.without(_uuids, myuuid);
        nPlayer.logDebugS && nPlayer.logDebugS("[arena] step3, uuids", _uuids);
        targetUUIDs = targetUUIDs.concat(_uuids);
        if (targetUUIDs.length >= 3) {
          break;
        }
      }
    }
    // A区间找 （前提是还没找够3个人)
    if (targetUUIDs.length < 3) {
      for (let iTier = iCurTier - tierScore; iTier >= 0; iTier -= tierScore) {
        const c = this.m_TierCount[iTier];
        if (c > 0) {
          let _uuids = yield this.randTargets(iTier, 3 - targetUUIDs.length);
          _uuids = _.without(_uuids, myuuid);
          nPlayer.logDebugS && nPlayer.logDebugS("[arena] step4, uuids", _uuids);
          targetUUIDs = targetUUIDs.concat(_uuids);
          if (targetUUIDs.length >= 3) {
            break;
          }
        }
      }
    }
    nPlayer.logDebugS && nPlayer.logDebugS("[arena] after search, targetUUIDs", targetUUIDs);

    // 根据uuid拿到对手的信息，并缓存
    const dTargetData = {};
    let idx = 0;
    targetUUIDs = _.uniq(targetUUIDs);
    for (let i = 0; i < targetUUIDs.length; i++) {
      const uuid = targetUUIDs[i];
      if (myuuid === uuid) {
        continue;
      }
      const dData = yield this.packTargetData(nPlayer, uuid);
      if (!dData) {
        nPlayer.logDebugS && nPlayer.logDebugS("[arena] packTarget failed", uuid);
        continue;
      }
      dTargetData[idx] = dData;
      idx += 1;
    }
    let errTargetCount = targetNum - idx; // 数据有问题的对手的数量
    nPlayer.logDebugS && nPlayer.logDebugS("[arena] errTargetCount", errTargetCount);
    nPlayer.logDebugS && nPlayer.logDebugS("[arena] targetUUIDs", targetUUIDs);

    let tryTimes = 0; // 防止死循环
    while (errTargetCount > 0) {
      tryTimes += 1;
      if (tryTimes > (mbgGame.config.tryTimes || 100)) {
        nPlayer.logDebugS && nPlayer.logDebugS(`[tryTimes:${tryTimes}]`, errTargetCount);
        break;
      }
      // 随便挑一个uuid，直到补足3个人
      const randIdx = _.random(0, defines.tierTotalPVP);
      const iTier = randIdx * tierScore;
      const c = this.m_TierCount[iTier];
      if (c <= 0) {
        continue;
      }
      nPlayer.logDebugS && nPlayer.logDebugS("[arena] iTier", iTier, "c", c);

      const alluuids = yield this.randTargets(iTier, c);
      for (let k = 0, len = alluuids.length; k < len; k++) {
        const uuid = alluuids[k];
        if (uuid === myuuid) {
          continue;
        }
        if (targetUUIDs.indexOf(uuid) !== -1) {
          continue;
        }
        targetUUIDs.push(uuid); // 防止重复pack
        const dData = yield this.packTargetData(nPlayer, uuid);
        if (!dData) {
          nPlayer.logDebugS && nPlayer.logDebugS("[arena] try pass, no target data", uuid);
          continue;
        }
        dTargetData[idx] = dData;
        idx += 1;
        errTargetCount -= 1;
        if (errTargetCount === 0) {
          break;
        }
      }
    }
    delete this.m_IsRefreshing[myuuid];
    // nPlayer.logInfo("[arena] dTargetData", JSON.stringify(dTargetData));
    pobj.m_PVPCtrl.setTargetsData(null);
    if (!_.isEmpty(dTargetData)) {
      pobj.m_PVPCtrl.setTargetsData(dTargetData, mbgGame.config.PVPData.expire * 60);
    }
    pobj.m_PVPCtrl.setPVPRefreshTargetTime();
    result.TargetData = dTargetData;
    return mbgGame.config.ErrCode.OK;
  },
  // nPlayer 可选
  * packTargetDataCommon(uuid, logDebug) {
    const dData = yield this.cacheTargetData(uuid);
    if (!dData || _.isEmpty(dData)) {
      logDebug && logDebug("[arena] packTargetData, no dData");
      return null;
    }
    const robot = dData.info && dData.info.robot;
    const nickname = dData.info && dData.info.nickname;
    const describe = dData.info && dData.info.describe;
    const totem = dData.info && dData.info.totem;
    if (!nickname) {
      logDebug && logDebug("[arena] packTargetData, no nickname", uuid);
      return null;
    }
    // mbgGame.logger.info("[arena] packTargetData", dData);
    const dPVPDBData = dData.pvp;
    const dAllScheme = dPVPDBData && dPVPDBData.scheme;
    if (_.isEmpty(dAllScheme)) {
      logDebug && logDebug("[arena] packTargetData, no dAllScheme", uuid);
      return null;
    }
    const defSchemeIdx = dPVPDBData.defSch || 0;
    const dScheme = dAllScheme[defSchemeIdx];
    if (_.isEmpty(dScheme)) {
      logDebug && logDebug("[arena] packTargetData, no dScheme", uuid);
      return null;
    }
    const charaIDs = dScheme.charaIDs;
    if (_.isEmpty(charaIDs)) {
      logDebug && logDebug("[arena] packTargetData, no charaIDs", uuid);
      return null;
    }
    const dTeamData = {};
    for (let i = 0; i < charaIDs.length; i++) {
      const charaID = charaIDs[i];
      let dChara = dData.chara[charaID];
      if (!dChara) {
        continue;
      }
      dChara = mbgGame.common.utils.deepClone(dChara);
      if (dChara.hp != null) {
        delete dChara.hp;
      }
      dTeamData[charaID] = dChara;
    }
    if (_.isEmpty(dTeamData)) {
      logDebug && logDebug("[arena] packTargetData, no dTeamData", uuid);
      return null;
    }
    const dItemDBData = dData.item.own;
    const dItem = {};
    if (!_.isEmpty(dScheme.bag)) {
      const dAllItem = mbgGame.WarData.getItemDataDictByBag(dScheme.bag, dItemDBData);
      dItem.data = dAllItem;
      dItem.bag = dScheme.bag;
    }

    const dTargetData = {
      name: nickname,
      desc: describe,
      totem,
      avglv: dData.attr.avglv || 1,
      score: dData.pvp.score,
      rank: dData.pvp.rank,
      item: dItem,
      botting: dScheme.botting,
      team: dTeamData, // {charaID: dChara}
      uuid,
      charaIDs,
    };
    if (robot) {
      dTargetData.robot = 1;
    }
    logDebug && logDebug("[arena] packTargetData, dTargetData", JSON.stringify(dTargetData));
    return {
      targetDBData: dData,
      targetData: dTargetData,
    };
  },
  // 打包对手信息，出错返回空
  * packTargetData(nPlayer, uuid) {
    if (nPlayer.getUUID() === uuid) {
      nPlayer.logDebugS && nPlayer.logDebugS("[arena] packTargetData, same uuid");
      return null;
    }
    const dResult = yield this.packTargetDataCommon(uuid, nPlayer.logDebugS && nPlayer.logDebugS.bind(nPlayer));
    if (_.isEmpty(dResult)) {
      return null;
    }
    if (!dResult.targetData.robot) {
      // 用实时分数？
      const score = yield this.getRealCurScore(uuid);
      if (typeof(score) !== "number") {
        nPlayer.logDebugS && nPlayer.logDebugS("[arena] packTargetData, no score", score);
        return null;
      }
      dResult.targetData.score = score;
    }
    const dTargetData = dResult.targetData;
    return dTargetData;
  },
  // cache成功返回true，否则返回false
  * cacheTargetData(uuid, key) {
    // 如果对方在在线 则直接拿数据
    const nTarget = Cache.get(`Player:${uuid}`);
    if (nTarget) {
      return nTarget.data();
    }
    // 直接从redis获取目标玩家的信息
    const nTmpPlayer = new playerCtrl.player(uuid);
    if (key) {
      const s = yield nTmpPlayer.hget(key);
      const d = s && JSON.parse(s);
      if (d) {
        const dData = {};
        dData[key] = d;
        return dData;
      }
      return null;
    }
    const dData = yield nTmpPlayer.hgetall();
    if (!dData) {
      return null;
    }
    nTmpPlayer.onLoaded(dData);
    return nTmpPlayer.data();
  },
  // Note! 非友谊赛，dFixedLv必须为null
  getAttackerData(nPlayer, schemeIdx, dScheme, dFixedLv) {
    const pobj = nPlayer.getPlayerLogic();
    if (!dScheme) {
      dScheme = pobj.m_WarCommon.getSchemeData(defines.pvpWorldIdx, schemeIdx);
    }
    const bag = dScheme.bag;
    const dAllItem = pobj.m_ItemBag.getItemDataDictByBag(bag, null, dFixedLv);
    const dItem = {
      bag,
      data: dAllItem,
    };
    const dCharaDBData = pobj.getCharaDBData();
    const dAttackTeamData = this.getAttackTeamCharaData(dCharaDBData, dScheme, dFixedLv);
    const dData = {
      uuid: pobj.getUUID(),
      name: nPlayer.getInfo("nickname"),
      score: pobj.m_PVPCtrl.getPVPCurScore(), // 以身上的分数去计算就行了，不需要太精准
      totem: nPlayer.getTotem(),
      charaIDs: dScheme.charaIDs,
      botting: dScheme.botting,
      team: dAttackTeamData,
      item: dItem,
      desc: pobj.describe(),
    };
    return dData;
  },
  // 由这个函数产生的对象都是临时的，和数据库无关
  // 即在PVP结算前如果GS关闭，那么这场战斗完全无效
  beginPVP(nPlayer, schemeIdx, defenderIdx) {
    defenderIdx = +defenderIdx;
    if (mbgGame.FrdWarCtrl.isPVPing(nPlayer)) {
      return mbgGame.config.ErrCode.Arena_PVPing;
    }
    if (this.isPVPing(nPlayer)) {
      return mbgGame.config.ErrCode.Arena_PVPing;
    }
    const pobj = nPlayer.getPlayerLogic();
    if (!pobj.nickName()) {
      return mbgGame.config.ErrCode.Arena_NoName;
    }
    const bHasFoughtFlag = pobj.m_PVPCtrl.hasFoughtFlag(defenderIdx);
    if (bHasFoughtFlag) {
      return mbgGame.config.ErrCode.Arena_HasFought;
    }
    const dTargetData = pobj.m_PVPCtrl.getTargetDataByIdx(defenderIdx);
    if (!dTargetData) {
      return mbgGame.config.ErrCode.Arena_TargetExpired;
    }
    const dPVPData = {};
    const dAttackerData = this.getAttackerData(nPlayer, schemeIdx);
    if (_.isEmpty(dAttackerData.team)) {
      return mbgGame.config.ErrCode.Arena_NoAttackTeamData;
    }
    dPVPData.attacker = dAttackerData;
    dPVPData.defenderIdx = defenderIdx;
    dPVPData.defender = dTargetData;
    const dWinRatio = this.calPVPWinRatio(dPVPData.attacker.score, dPVPData.defender.score);
    dPVPData.Ea = dWinRatio.Ea;
    dPVPData.Eb = dWinRatio.Eb;
    if (mbgGame.debuglog) {
      nPlayer.logInfo("[arena] dPVPData", dPVPData);
    }
    if (this.isPVPing(nPlayer)) { // 因为异步，还要再检查一次
      return mbgGame.config.ErrCode.Arena_PVPing;
    }
    const ok = this.createWar(nPlayer, dPVPData);
    if (!ok) {
      return mbgGame.config.ErrCode.Arena_CreateWarFail;
    }
    const targetUUID = dPVPData.defender.uuid;
    if (!this.m_PlayerUUID2warUUIDs[targetUUID]) {
      this.m_PlayerUUID2warUUIDs[targetUUID] = [];
    }
    this.m_PlayerUUID2warUUIDs[targetUUID].push(dPVPData.warUUID);
    // 对手是否客户端在线且在同一个BSID，是的话发开战邀请
    const nTarget = Cache.get(`Player:${targetUUID}`);
    const tobj = nTarget && nTarget.getPlayerLogic();
    const invitemsg = pobj.getString('push_pvp', {
      target: pobj.nickName(),
    });
    if (tobj && !tobj.IsInWar() && tobj.getBSID() === pobj.getBSID()) {
      if (!tobj.dataObj().needNotification()) {
        this.invitePVP(tobj, dPVPData.warUUID);
      } else {
        nTarget.sendNotification(invitemsg);
      }
    } else {
      // todo这里的i18n需要完善一下,目前用了对手的
      // yield mbgGame.serverCtrl.sendNotification(invitemsg, dPVPData.defender.uuid);
    }
    return mbgGame.config.ErrCode.OK;
  },
  checkInvitePVP(nPlayer, lastCheckWarUUID) {
    const pobj = nPlayer.getPlayerLogic();
    if (this.isPVPing(nPlayer)) {
      return;
    }
    const playerUUID = pobj.getUUID();
    const warUUIDs = this.m_PlayerUUID2warUUIDs[playerUUID];
    if (_.isEmpty(warUUIDs)) {
      return;
    }
    let nextWarUUID;
    if (!lastCheckWarUUID) {
      nextWarUUID = warUUIDs[0];
    } else {
      this.cleanTargetWarUUID(playerUUID, lastCheckWarUUID);
      if (warUUIDs.length > 0) {
        nextWarUUID = warUUIDs[0];
      }
    }
    if (!nextWarUUID) {
      return;
    }
    this.invitePVP(pobj, nextWarUUID);
  },
  // pobj被进攻方tobj邀请参与PVP
  invitePVP(pobj, warUUID) {
    const targetUUID = this.m_WarUUID2PlayerUUID[warUUID];
    const nTarget = Cache.get(`Player:${targetUUID}`);
    if (!nTarget) {
      return;
    }
    const tobj = nTarget.getPlayerLogic();
    if (!tobj) {
      return;
    }
    const dPVPData = this.m_UUID2PVPData[targetUUID];
    if (!dPVPData) {
      return;
    }
    pobj.sendCmd("pvpinvite", {
      warUUID,
      name: tobj.nickName(),
      attacker: dPVPData.attacker,
    });
  },
  calPVPWinRatio(attackerScore, defenderScore) {
    const Ea = 1 / (1 + Math.pow(10, ((defenderScore - attackerScore) / 400)));
    const Eb = 1 / (1 + Math.pow(10, ((attackerScore - defenderScore) / 400)));
    return {
      Ea,
      Eb,
    };
  },
  // 加入进攻方发起的PVP战斗
  joinPVP(nPlayer, warUUID) {
    // 自己已经开始PVP的话，不能加入别人的PVP
    if (this.isPVPing(nPlayer)) {
      return mbgGame.config.ErrCode.JoinPVP_PVPing;
    }
    // 检查这场战斗是否还能进入
    if (!this.m_WarUUID2PlayerUUID[warUUID]) {
      return mbgGame.config.ErrCode.JoinPVP_PVPing;
    }
    const targetUUID = this.m_WarUUID2PlayerUUID[warUUID];
    const nTarget = Cache.get(`Player:${targetUUID}`);
    if (!nTarget) {
      return mbgGame.config.ErrCode.JoinPVP_NoTarget;
    }
    if (!this.isPVPing(nTarget)) {
      return mbgGame.config.ErrCode.JoinPVP_TargetNotPVPing;
    }
    this.cleanTargetWarUUID(nPlayer.getUUID(), warUUID);
    this.m_UUID2PVPData[nPlayer.getUUID()] = {
      targetUUID,
      link: true, // 标志这场战斗是链接到别人的战斗的
    };
    const tobj = nTarget.getPlayerLogic();

    const [FSId, cid] = nPlayer.getNetCtrl().getFwdPair();
    mbgGame.bsmgr.callWarFunc(tobj, 99, "joinPVP", mbgGame.server_config.HOSTNAME, FSId, cid);
    if (mbgGame.debuglog) {
      tobj.logInfo("joinPVP ok", mbgGame.server_config.HOSTNAME, FSId, cid);
    }
    if (mbgGame.i18n.onlinepvpinfo) {
      const netCtrl = nTarget.getNetCtrl();
      netCtrl.sendInfo(netCtrl.getString("onlinepvpinfo"));
    }
    return null;
  },
  resumeJoinedPVP(nPlayer) {
    if (!this.isPVPing(nPlayer)) {
      return false;
    }
    const dPVPData = this.m_UUID2PVPData[nPlayer.getUUID()];
    const targetUUID = dPVPData.targetUUID;
    const nTarget = Cache.get(`Player:${targetUUID}`);
    if (!nTarget) {
      return false;
    }
    const tobj = nTarget.getPlayerLogic();
    const [FSId, cid] = nPlayer.getNetCtrl().getFwdPair();
    mbgGame.bsmgr.callWarFunc(tobj, 99, "joinPVP", mbgGame.server_config.HOSTNAME, FSId, cid);
    return true;
  },
  refusePVP(nPlayer, warUUID) {
    this.cleanTargetWarUUID(nPlayer.getUUID(), warUUID);
    this.checkInvitePVP(nPlayer);
  },
  isPVPing(nPlayer) {
    return this.m_UUID2PVPData[nPlayer.getUUID()] != null;
  },
  onHaltPVP(nPlayer) {
    if (this.m_UUID2PVPData[nPlayer.getUUID()]) {
      delete this.m_UUID2PVPData[nPlayer.getUUID()];
    }
  },
  getPVPData(uuid) {
    return this.m_UUID2PVPData[uuid];
  },
  createWar(nPlayer, dPVPData) {
    if (_.isEmpty(dPVPData)) {
      return false;
    }
    const playerUUID = nPlayer.getUUID();
    this.m_UUID2PVPData[playerUUID] = dPVPData;
    let warUUID = uuid_module.v4();
    warUUID = warUUID.toUpperCase();
    this.m_WarUUID2PlayerUUID[warUUID] = playerUUID;
    dPVPData.warUUID = warUUID;
    const pobj = nPlayer.getPlayerLogic();
    try {
      pobj.m_PVPCtrl.createPVPWar(dPVPData);
      return true;
    } catch (e) {
      mbgGame.logError("[m_PVPCtrl.createPVPWar]", e);
      delete this.m_UUID2PVPData[playerUUID];
    }
    return false;
  },
  cleanTargetWarUUID(playerUUID, warUUID) {
    if (this.m_PlayerUUID2warUUIDs[playerUUID]) {
      const arr = this.m_PlayerUUID2warUUIDs[playerUUID];
      const idx = arr.indexOf(warUUID);
      if (idx !== -1) {
        arr.splice(idx, 1);
      }
    }
  },
  cleanWar(pobj) {
    if (!pobj) {
      return;
    }
    const nPlayer = pobj.dataObj();
    const playerUUID = nPlayer.getUUID();
    const dPVPData = this.m_UUID2PVPData[playerUUID];
    if (!dPVPData) {
      return;
    }
    const warUUID = dPVPData.warUUID;
    delete this.m_UUID2PVPData[playerUUID];
    delete this.m_WarUUID2PlayerUUID[warUUID];
    const targetUUID = dPVPData.defender.uuid;
    this.cleanTargetWarUUID(targetUUID, warUUID);
    const uuid = dPVPData.defender.uuid;
    const data = this.m_UUID2PVPData[uuid];
    if (data && data.link) { // 实时PVP标记
      delete this.m_UUID2PVPData[uuid];
    }
  },
  getK(score, isWinner) {
    const dConfig = defines.getArenaKConfigByScore(score);
    const winK = dConfig.winK;
    const loseK = dConfig.loseK;
    if (isWinner) {
      return winK;
    }
    return loseK;
  },
  transResultForTarget(result) {
    if (result === defines.WarWin) {
      result = defines.WarFail;
    } else if (result === defines.WarFail) {
      result = defines.WarWin;
    } else {
      // 平手
    }
    return result;
  },
  * doTierMove(uuid, oldScore, newScore) {
    if (newScore >= 0 && oldScore >= 0 && newScore !== oldScore) {
      const iOldTier = this.getTierByScore(oldScore);
      const iNewTier = this.getTierByScore(newScore);
      if (iOldTier !== iNewTier) {
        const nOldTier = this.getNArenaTier(iOldTier);
        const nNewTier = this.getNArenaTier(iNewTier);
        // 把玩家从一个tier移动到另一个tier
        // smove的特性是，如果源tier不存在这个uuid，就不发生移动
        yield nOldTier.smove(nNewTier.key(), uuid);
      }
    }
  },
  onWarEnd(pobj, dData) {
    const nPlayer = pobj.dataObj();
    if (!this.isPVPing(nPlayer)) {
      nPlayer.logError("[arena.onWarEnd] not pvping");
      return;
    }
    const myUUID = nPlayer.getUUID();
    const dPVPData = this.getPVPData(myUUID);
    this.cleanWar(pobj);
    const defenderIdx = dPVPData.defenderIdx;
    const result = dData.result;
    const bWin = result === defines.WarWin;
    const bDraw = result === defines.WarDraw;
    const self = this;
    co(function*() {
      let allWin = true;
      let Ra = 0; // addScore for Atttacker
      let Rb = 0; // addScore for Defender
      if (!bDraw) { // 有输／赢，计算加分／扣分
        let Sa = 0;
        let Sb = 0;
        let Ka = 0;
        let Kb = 0;
        const Ea = dPVPData.Ea;
        const Eb = dPVPData.Eb;
        const attackerScore = dPVPData.attacker.score || 0;
        const defenderScore = dPVPData.defender.score || 0;
        if (bWin) {
          Sa = 1;
          Sb = 0;
          Ka = self.getK(attackerScore, true);
          Kb = self.getK(defenderScore, false);
          // 标记该对手已打赢
          pobj.m_PVPCtrl.setFoughtFlag(defenderIdx, 1);
        } else {
          Sa = 0;
          Sb = 1;
          Ka = self.getK(attackerScore, false);
          Kb = self.getK(defenderScore, true);
        }
        if (mbgGame.debuglog) {
          pobj.logInfo("[Ka Kb]", Ka, Kb);
        }
        Ra = Math.round(Math.max(-Ka, Math.min(Ka, Ka * (Sa - Ea))));
        Rb = Math.round(Math.max(-Kb, Math.min(Kb, Kb * (Sb - Eb))));
        if (mbgGame.debuglog) {
          pobj.logInfo("[Ea Eb]", Ea, Eb);
          pobj.logInfo("[Ra Rb]", Ra, Rb);
        }
        // 全胜额外加分
        const idx2flag = pobj.m_PVPCtrl.getFoughtFlagData();
        if (!idx2flag) {
          allWin = false;
        } else {
          for (let idx = 0; idx < 3; idx++) {
            if (idx2flag[idx] !== 1) {
              allWin = false;
              break;
            }
          }
        }
        if (allWin) {
          Ra += mbgGame.config.constTable.PVPBonusScore;
        }
        // 发奖励
        let newScoreAtk = yield self.zincrby(Ra, myUUID);
        newScoreAtk = +newScoreAtk;
        let newScoreDef;
        if (!dPVPData.defender.robot) {
          newScoreDef = yield self.zincrby(Rb, dPVPData.defender.uuid);
        } else {
          // robot
          // 更新到player data
          const tmpPlayer = new playerCtrl.player(dPVPData.defender.uuid);
          let dPVP = yield tmpPlayer.hget("pvp");
          dPVP = JSON.parse(dPVP);
          dPVP.score += Rb;
          newScoreDef = dPVP.score;
          tmpPlayer.hset("pvp", JSON.stringify(dPVP));
        }
        newScoreDef = +newScoreDef;
        const oldScoreAtk = newScoreAtk - Ra;
        const oldScoreDef = newScoreDef - Rb;
        yield self.doTierMove(myUUID, oldScoreAtk, newScoreAtk);
        yield self.doTierMove(dPVPData.defender.uuid, oldScoreDef, newScoreDef);
        const [score, rank] = yield self.syncScoreAndRank(nPlayer, 'pvpend');
        if (rank <= 150) {
          if (self.m_onceUpdateTimer) {
            mbgGame.common.timer.removeTimer(self.m_onceUpdateTimer);
          }
          self.m_onceUpdateTimer = mbgGame.common.timer.setOnceTimer(1 * 1000, self.onRefresh.bind(self));
        }
        // 统计
        let isDefender = false;
        yield self.doStat(myUUID, bWin, isDefender);
        isDefender = true;
        yield self.doStat(dPVPData.defender.uuid, !bWin, true);
      } else {
        allWin = false;
      }
      const iNowTime = moment().valueOf();
      // 增加PVP动态
      yield self.pushNews(myUUID, {
        type: 1, // 1:进攻 2:防守
        result,
        time: iNowTime,
        replayUUID: dData.replayUUID,
        addScore: allWin ? Ra - mbgGame.config.constTable.PVPBonusScore : Ra,
        score: dPVPData.attacker.score,
        charaIDs: dPVPData.attacker.charaIDs,
        lv: defines.getAttackerLvList(dPVPData),
        target: {
          charaIDs: dPVPData.defender.charaIDs,
          lv: defines.getDefenderLvList(dPVPData),
          name: dPVPData.defender.name,
          totem: dPVPData.defender.totem,
          score: dPVPData.defender.score, //战斗前的积分
        },
      });
      yield self.pushNews(dPVPData.defender.uuid, {
        type: 2,
        result: self.transResultForTarget(result),
        time: iNowTime,
        addScore: Rb,
        replayUUID: dData.replayUUID,
        score: dPVPData.defender.score,
        charaIDs: dPVPData.defender.charaIDs,
        lv: defines.getDefenderLvList(dPVPData),
        target: {
          name: nPlayer.getInfo("nickname"),
          charaIDs: dPVPData.attacker.charaIDs,
          lv: defines.getAttackerLvList(dPVPData),
          totem: dPVPData.attacker.totem,
          score: dPVPData.attacker.score, //战斗前的积分
        },
      });

      // 计算除了分数以外的奖励
      const dConfig = defines.getArenaKConfigByScore(dPVPData.attacker.score);
      let dWarResult;
      if (bWin && dConfig) {
        const dReward = {};
        const rewardItemRate = dConfig.rewardItemRate;
        if (pobj.isClanUnlocked()) {
          // 解锁黑市后才有点券奖励
          dReward.gem = dConfig.rewardGem;
        }
        dReward.mat = dConfig.rewardMat;
        dReward.charaexp = {};
        for (let i = 0; i < dPVPData.attacker.charaIDs.length; i++) {
          const charaID = dPVPData.attacker.charaIDs[i];
          if (!charaID) {
            continue;
          }
          dReward.charaexp[charaID] = dConfig.rewardExp;
        }
        if (rewardItemRate > 0) {
          const ran = Math.random() * 100;
          if (ran < rewardItemRate) {
            const dWeightForBase = pobj.m_ItemBag.getRewardItemWeightDict(mbgGame.config.constTable.CWType1);
            const itemID = defines.chooseOne(dWeightForBase);
            dReward.items = [
              [itemID, 1]
            ];
          }
        }
        dWarResult = pobj.m_WarCommon.giveAwardForWar(99, dPVPData.attacker.charaIDs, dReward, "arena");
      } else {
        dWarResult = {
          worldIdx: 99,
        };
      }
      dWarResult.result = result;
      dWarResult.addScore = Ra;
      dWarResult.allWin = allWin;
      pobj.m_PVPCtrl.onSendPVPData();
      // pvp报告窗
      nPlayer.sendCmd("warresult", dWarResult);
      if (dData.realtime) {
        const nTarget = Cache.get(`Player:${dPVPData.defender.uuid}`);
        if (nTarget) {
          nTarget.sendCmd("warresult", {
            worldIdx: 99,
            result: self.transResultForTarget(result),
            addScore: Rb,
          });
        }
      }
    }).catch((err, res) => {
      mbgGame.logError(`[ctrl.arena.onWarEnd] occur error`, err);
    });
  },
  * doStat(uuid, isWinner, isDefender) {
    if (mbgGame.debuglog) mbgGame.logger.info("[arena.doStat]", uuid, isWinner, isDefender);
    // 3连胜统计
    const key = isDefender ? "curAllWinTimesP" : "curAllWinTimesA";
    if (isWinner) {
      const curWinStreak = yield mbgGame.rankList.incrScore("curWinStreak", uuid, 1); // 统计项目：当前连胜值
      const winStreak = yield mbgGame.rankList.getScore("winStreak", uuid) || 0; // 统计项目：历史连胜最大值
      if (mbgGame.debuglog) mbgGame.logger.info("curWinStreak", curWinStreak, "winStreak", winStreak);
      if (!winStreak || curWinStreak > winStreak) {
        yield mbgGame.rankList.setScore("winStreak", uuid, curWinStreak);
      }
      const curAllWinTimes = yield mbgGame.rankList.incrScore(key, uuid, 1);
      if (mbgGame.debuglog) mbgGame.logger.info("curAllWinTimes", curAllWinTimes);
      if (curAllWinTimes >= 3) {
        // 增加3连胜统计
        yield mbgGame.rankList.incrScore(isDefender ? "AllWinTimesP" : "AllWinTimesA", uuid, 1);
        yield mbgGame.rankList.removeScore(key, uuid);
      }
    } else {
      // 只要输了，就清空当前连胜次数
      yield mbgGame.rankList.removeScore("curWinStreak", uuid);
      yield mbgGame.rankList.removeScore(key, uuid);
    }
  },
  doStatOnline(pobj, isWinner) {
    if (isWinner) {
      pobj.m_Stat.addStatVal("curWinStreak", 1); // 增加连胜次数
      if (pobj.m_Stat.getStatVal("curWinStreak") > pobj.m_Stat.getStatVal("winningStreak")) {
        pobj.m_Stat.setStatVal("winningStreak", pobj.m_Stat.getStatVal("curWinStreak"));
      }
    } else {
      pobj.m_Stat.setStatVal("curWinStreak", 0); // 只要输了，就清空连胜次数
    }
  },
  * pushNews(uuid, dInfo) {
    mbgGame.logger.info("pushNews", uuid, JSON.stringify(dInfo));
    const nArenaNews = new NArenaNews(uuid);
    yield nArenaNews.lpush(JSON.stringify(dInfo));
    yield nArenaNews.ltrim(0, 20); // 只保存20条记录
    const ret = yield nArenaNews.setExpireBySeconds(5 * 24 * 60 * 60);
    if (ret !== 1) {
      mbgGame.logError(`arenanews set expire failed, uuid: ${uuid}`);
    }
  },
  * getNews(uuid) {
    const nArenaNews = new NArenaNews(uuid);
    return yield nArenaNews.lrange(0, -1);
  },
  getRankData() {
    return this.m_RankData;
  },
  getAttackTeamCharaData(dCharaDBData, dScheme, dFixedLv) {
    const charaIDs = dScheme.charaIDs;
    if (_.isEmpty(charaIDs)) {
      return null;
    }
    const dTeamData = {};
    for (let i = 0; i < charaIDs.length; i++) {
      const charaID = +charaIDs[i];
      if (dCharaDBData[charaID]) {
        const dChara = mbgGame.common.utils.deepClone(dCharaDBData[charaID]);
        if (dChara.hp != null) {
          delete dChara.hp;
        }
        if (dFixedLv) {
          dChara.lv = dFixedLv.charaLv;
          for (const skillID in dChara.skill) {
            const dSkill = dChara.skill[skillID];
            dSkill.lv = dFixedLv.skillLv;
            dSkill.s = Math.floor(dFixedLv.skillLv / 20);
          }
          dChara.lv = dFixedLv.charaLv;
          dChara.ta = mbgGame.WarData.calRobotTalent(charaID, dChara.lv);
        }
        dTeamData[charaID] = dChara;
      }
    }
    return dTeamData;
  },
  * hasRobot() {
    const redis = mbgGame.common.db_mgr.getDB('redis-users');
    const numOfRobots = yield redis.scard(robotUUIDsRedis);
    return numOfRobots > 0;
  },
  * cleanRobot() {
    const tmpPlayer = new playerCtrl.player('');
    const redis = mbgGame.common.db_mgr.getDB('redis-users');

    const uuids = yield redis.smembers(robotUUIDsRedis);

    // 从机器人表生成player到竞技场
    // 清除旧的机器人
    if (uuids && uuids.length > 0) {
      for (let i = 0; i < uuids.length; i++) {
        const uuid = uuids[i];
        tmpPlayer.setName(uuid);
        const isExists = yield tmpPlayer.selfExists();
        if (!isExists) {
          continue;
        }
        let dPVP = yield tmpPlayer.hget("pvp");
        dPVP = JSON.parse(dPVP);
        let dAttr = yield tmpPlayer.hget("attr");
        dAttr = JSON.parse(dAttr);
        mbgGame.logger.info("[cleanRobot] del:", uuid, dPVP.score, dAttr.avglv);
        yield this.removePlayerByUUID(uuid, dPVP.score);
        yield mbgGame.TCBattleMgr.removePlayerByUUID(uuid, dAttr.avglv);
        yield redis.del(tmpPlayer.key());
      }
    }
    yield redis.del(robotUUIDsRedis);
  },
  calRobotScheme(dConfig, dScheme, dPlayerData) {
    const oItemBag = new CItemBag();
    let lvTotal = 0;
    // 角色
    for (let k = 0; k < dConfig.team.length; k++) {
      const rID = dConfig.team[k];
      const dInfo = mbgGame.config.robotchara[rID];
      if (!dInfo) {
        continue;
      }
      // 角色数据
      const dChara = {
        lv: dConfig.clv + _.random(-1, 1),
        exp: 0,
        skill: {},
      };
      dChara.ta = mbgGame.WarData.calRobotTalent(dInfo.charaID, dChara.lv);
      // mbgGame.logger.info("robot ta", dChara.ta);
      lvTotal += dChara.lv;
      const a = defines.getCharaActiveSkillID(dInfo.charaID);
      const b = defines.getCharaPassiveSkillID(dInfo.charaID);
      dChara.skill[a] = {
        lv: dChara.lv + _.random(-5, 0)
      };
      dChara.skill[b] = {
        lv: dChara.lv + _.random(-5, 0)
      };
      if (dConfig.DA || dConfig.DM) {
        dChara.tlv = {};
        dChara.tlv[defines.Attr2ID.DA] = dConfig.DA;
        dChara.tlv[defines.Attr2ID.DM] = dConfig.DM;
      }
      dPlayerData.chara[dInfo.charaID] = dChara;
      if (dInfo.itemID && mbgGame.config[`item${dInfo.itemID}`]) {
        // 该角色的道具
        const sid = k + 1; // 道具实例id
        const dItemData = oItemBag.generateItem({
          itemID: dInfo.itemID,
          num: 1,
          starLv: _.random(dConfig.itemStarLv[0], dConfig.itemStarLv[1]),
          quality: _.random(dConfig.itemQ[0], dConfig.itemQ[1]),
        });
        dItemData.lv = _.random(dConfig.itemLv[0], dConfig.itemLv[1]);
        dPlayerData.item.own[sid] = dItemData;
        dScheme.bag[k] = [sid];
      } else {
        mbgGame.logError(`arena.initRobot, no item: ${dInfo.itemID}`);
      }
      dScheme.charaIDs.push(dInfo.charaID);
      dScheme.botting.push(dInfo.charaID);
    }
    return lvTotal;
  },
  * initRobot(force) {
    mbgGame.logger.info("arena.initRobot, begin");
    const tmpPlayer = new playerCtrl.player('');
    if (!force) {
      const hasRobot = yield this.hasRobot();
      if (hasRobot) {
        return;
      }
    }
    const redis = mbgGame.common.db_mgr.getDB('redis-users');
    const initRobotingRedis = 'tc_arena_s_initRoboting';
    let result = yield redis.setnx(initRobotingRedis, 1);
    if (result !== 1) {
      // '已有人执行了这个指令'
      mbgGame.logger.info("arena.initRobot, already doing");
      return;
    }
    // 设置过期时间
    result = yield redis.expire(initRobotingRedis, 60);
    if (result !== 1) {
      yield redis.del(initRobotingRedis);
      // '已有人执行了这个指令'
      mbgGame.logger.info("arena.initRobot, already doing");
      return;
    }
    yield this.cleanRobot();
    mbgGame.logger.info("arena.initRobot, cleanRobot ok");
    // 一个player的redis模板
    const redisTpl = {
      info: {
        gm: 0,
        nickname: ''
      },
      attr: {
        avglv: 0
      },
      chara: {

        /* 1: {
            lv: 41,
            exp: 0,
            skill: {
                1011: { lv: 20 },
                1012: { lv: 20 },
            },
        },*/
      },
      pvp: {
        scheme: {
          0: {
            bag: {},
            charaIDs: [],
            botting: [],
          },
        },
        defSch: 0,
        frdSch: 0,
        score: 0,
        rank: 0,
      },
      item: {
        own: {
          // sid: dItemData
        },
      },
      realofftime: 1501043680,
    };
    // 重新导入机器人
    // 1. 生成redis数据
    const robotplayer = mbgGame.config.robotplayer;
    for (let i = 1; i < 10000; i++) {
      const dConfig = robotplayer[i];
      if (!dConfig) {
        break;
      }

      /*
      "score": 24,
      "team": [
          102,
          101,
          103
      ],
      "charaLv": 6,
      "skillLv": 6,
      "itemStarLv": 1,
      "itemLv": 1,
      "itemQ": 2
      */
      const dPlayerData = mbgGame.common.utils.deepClone(redisTpl);
      dPlayerData.pvp.score = dConfig.score;
      dPlayerData.info.robot = 1;
      dPlayerData.info.nickname = mbgGame.serverCtrl.getString('zh', `robotname${i}`);
      dPlayerData.info.describe = mbgGame.serverCtrl.getString('zh', `robotdesc${i}`);
      const uuid = uuid_module.v4().toUpperCase();
      const dScheme = dPlayerData.pvp.scheme[0];
      const lvTotal = this.calRobotScheme(dConfig, dScheme, dPlayerData);
      const avglv = Math.round(lvTotal / 5);
      dPlayerData.attr.avglv = avglv;
      tmpPlayer.setName(uuid);
      tmpPlayer.onLoaded(dPlayerData);
      yield redis.sadd(robotUUIDsRedis, uuid);
      yield mbgGame.TCBattleMgr.updatePlayerAvgLv(uuid, avglv, false);
      yield tmpPlayer.saveAsync();

      yield mbgGame.Arena.setScore({
        uuid,
        newScore: dConfig.score,
        hasOldScore: false,
        robot: 1,
      });
    }
    yield redis.del(initRobotingRedis);
    mbgGame.logger.info("arena.initRobot, ok");
  },
});


module.exports = {
  NArena,
};
