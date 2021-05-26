
const defines = require('../logic/w_defines');
const uuid_module = require('uuid');
const co = require('co');

/* 战斗回放数据
replayUUID 随机生成即可
{
    warData: 该战斗所有数据，包括对战双方的个人信息
    opList:
}
*/
const NWarReplay = mbgGame.common.db_mgr.CHash.extend({
  // tc_replay_h_data: replayUUID
  FuncType: "replay",
  SubType: "data",
});


class ReplayCtrl {
  // 把回放数据存到redis
  saveWarReplay(dData, duration) {
    let replayUUID = uuid_module.v4();
    replayUUID = replayUUID.toUpperCase();
    const self = this;
    co(function* () {
      yield self.saveWarReplayAsync(dData, replayUUID, duration);
    }).catch((err) => {
      mbgGame.logError(`[saveWarReplay] occur error`, err);
    });
    return replayUUID;
  }
  * saveWarReplayAsync(dData, replayUUID, duration) {
    const dReplayData = {
      warData: dData.warData,
      cst: dData.costTime,
      opList: dData.opList || [],
      result: dData.result,
      ver: mbgGame.config.WarVer,
    };
    // mbgGame.logger.info("saveWarReplay", JSON.stringify(dReplayData));
    if (!replayUUID) {
      replayUUID = uuid_module.v4();
      replayUUID = replayUUID.toUpperCase();
    }
    const nWarReplay = new NWarReplay(replayUUID);
    yield nWarReplay.hmset(dReplayData);
    yield nWarReplay.setExpireBySeconds(duration || 60 * 60 * 24 * 3); // 3天
    return replayUUID;
  }
  startHeartbeat() {
    this.m_heartbeatTimer = mbgGame.common.timer.setRepeatTimer(5 * 60 * 1000,
      this.onHeartbeat.bind(this));
  }
  onHeartbeat() {
    this.checkExpireCachedRelayData();
  }
  // 把回放数据缓存在gs内存
  // dReplayData可选
  cacheReplayData(replayUUID, dReplayData, timeout) {
    if (!this.m_ReplayData) {
      this.m_ReplayData = {};
    }
    if (!dReplayData) {
      return;
    }
    if (this.m_ReplayData[replayUUID]) {
      // 已缓存该回放
      return;
    }
    this.m_ReplayData[replayUUID] = {
      t: moment().unix() + timeout,
      data: dReplayData,
    };
    mbgGame.logger.info("cache replay", replayUUID);
  }
  checkExpireCachedRelayData() {
    const now = moment().unix();
    const lst = [];
    for (const replayUUID in this.m_ReplayData) {
      const dCached = this.m_ReplayData[replayUUID];
      if (now > dCached.t) {
        lst.push(replayUUID);
      }
    }
    for (let i = 0; i < lst.length; i++) {
      this.cleanCachedReplayData(lst[i]);
    }
  }
  getCachedReplayData(replayUUID) {
    const dCached = this.m_ReplayData && this.m_ReplayData[replayUUID];
    return dCached && dCached.data;
  }
  // 删除缓存的回放数据，注意如果缓存后一直没有删除会导致内存泄漏
  cleanCachedReplayData(replayUUID) {
    mbgGame.logger.info("remove cached replay", replayUUID);
    if (this.m_ReplayData && this.m_ReplayData[replayUUID]) {
      delete this.m_ReplayData[replayUUID];
    }
  }
  // 获取回放数据，如果有缓存就读缓存，否则从redis读（从redis读完并不会自动做缓存，缓存要手动做）
  * getReplayData(replayUUID, doCache) {
    let dReplayData = this.getCachedReplayData(replayUUID);
    if (dReplayData) {
      return dReplayData;
    }
    const nWarReplay = new NWarReplay(replayUUID);
    dReplayData = yield nWarReplay.loadAsync();
    if (doCache && !this.getCachedReplayData(replayUUID)) {
      this.cacheReplayData(replayUUID, dReplayData, 2 * 3600);
    }
    return dReplayData;
  }
  // haltTime: [percent, seconds]
  // percent: 如0.5，就是在打到一半时间时停止战斗，如果总时长不存在，则使用seconds参数
  // seconds: 如果无法使用percent参数，则用seconds确定掐断回放的具体时间（秒）
  // haltTime为null表示播放到结束
  * replayWar(pobj, replayUUID, doCache, haltTime, noResult) {
    const dReplayData = yield this.getReplayData(replayUUID, doCache);
    // dReplayData是缓存的，所以下面的修改会持久化的，要注意
    if (!dReplayData) {
      return false;
    }
    const ver = dReplayData.ver || 0;
    if (ver !== mbgGame.config.WarVer) {
      return false;
    }
    const dWarData = dReplayData.warData;
    if (!dWarData) {
      return false;
    }
    dWarData.replay = true;
    if (!noResult) {
      dWarData.result = (dReplayData.result && +dReplayData.result) || defines.WarDraw;
    } else {
      delete dWarData.result;
    }
    dWarData.opList = [];
    if (dReplayData.opList) {
      dWarData.opList = dReplayData.opList;
    }
    if (dReplayData.cst) {
      dWarData.cst = dReplayData.cst;
    }
    if (dWarData.fpt) {
      delete dWarData.fpt;
    }
    dWarData.sendInit = true;
    if (dWarData.lt === "Sim") {
      dWarData.lt = "PVP";
    }
    if (haltTime) {
      dWarData.haltTime = haltTime;
    } else {
      delete dWarData.haltTime;
    }
    delete dWarData.targetUUID;
    // pobj.logInfo("replayWar w", dWarData.worldIdx, "ver", ver);
    if (mbgGame.config.creplay) {
      pobj.sendCmd("creplay", dWarData);
    } else {
      mbgGame.bsmgr.createWar(pobj, dWarData);
      mbgGame.bsmgr.beginWar(pobj, {
        worldIdx: dWarData.worldIdx,
      });
    }
    return true;
  }
  * replayWarInfo(pobj, replayUUID) {
    // 返回一些战斗信息
    const dReplayData = yield this.getReplayData(replayUUID);
    if (!dReplayData) {
      return null;
    }
    const dWarData = dReplayData.warData;
    const result = +dReplayData.result;
    let info = '';
    const worldIdx = dWarData.worldIdx;
    const cinfo = dWarData.cinfo;
    const leftName = cinfo.left.name;
    const rightName = cinfo.right.name;
    if (worldIdx === defines.pvpWorldIdx || worldIdx === defines.battleWorldIdx) {

      if (dWarData.shortid === "gambleRobotSID") {
        const matchType = dWarData.gsvar[0];
        const matchUUID = dWarData.gsvar[2];
        const title = pobj.getString(`title_match${matchType}`);
        info = `${leftName} ${result === defines.WarWin ? pobj.getString('beat') : pobj.getString('lostTo')} ${rightName}`;
        const dCount = yield mbgGame.Gamble.getStakeCount(matchUUID);
        info = `【${title}】 ${info}  ${dCount.lc} : ${dCount.rc}`;
      } else {
        const strKey = result === defines.WarDraw ? 'clanSharePVPDraw' : 'clanSharePVPWin';
        const winnerName = result === defines.WarWin ? leftName : rightName;
        const loserName = result === defines.WarWin ? rightName : leftName;
        info = pobj.getString(strKey, {
          winner: winnerName,
          loser: loserName,
        });
      }
    } else if (defines.realPVEWorlds.indexOf(worldIdx) !== -1) {
      const stagename = pobj.m_PVECtrl.getStageName(worldIdx, dWarData.stageID, dWarData.stageIdx);
      const bossID = dWarData.team.right[0].ID;
      let stageStr = `${dWarData.stageID}`;
      stageStr = +stageStr.substring(stageStr.length - 3, stageStr.length);
      if (worldIdx === defines.dayWorldIdx) {
        stageStr = `${pobj.getString("attr_level")}${stageStr}`;
      } else {
        stageStr = pobj.getString(worldIdx === defines.raidWorldIdx ? 'level' : 'stage', {
          lv: stageStr,
        });
      }
      info = pobj.getString('clanSharePVE', {
        chapter: pobj.getString(`title_stage${worldIdx}`),
        stage: stageStr,
        stageName: stagename,
        boss: pobj.getString(`mname${defines.getMTplID(bossID)}`),
      });
    }
    return {
      info,
      // 待加，阵型信息，观看次数等
    };
  }
}


module.exports = ReplayCtrl;