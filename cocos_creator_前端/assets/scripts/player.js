const defines = require('warDefines');
const timer = require('timer');
const labdefines = require('labdefines');
const assert = require('assert');
const CUnit = require('w_unit');
const w_defines = require('w_defines');
const CWarData = require('wardata');

const CPlayer = cc.Class({
  extends: cc.Component,

  properties: {},
  onInit() {
    this.m_TimerOwnerID = timer.newOwnerID();
    this.setItemData();
  },
  getDayLeftTimes(name) {
    let lefttimes = mbgGame.timeVar[name] && mbgGame.timeVar[name].d;
    if (lefttimes == null) {
      lefttimes = mbgGame.config.constTable[`${name}Times`];
    }
    return lefttimes;
  },
  getClosestEvent() {
    const nowtime = moment().unix();
    let minT = 999999999;
    let evtID = null;
    for (const id in mbgGame.config.events) {
      const dConfig = mbgGame.config.events[id];
      const tStart = dConfig.tPair[0];
      const t = moment(tStart, 'hour').unix();
      const diff = t - nowtime;
      if (diff > 0 && diff < minT) {
        minT = diff;
        evtID = +id;
      }
    }
    if (!evtID) {
      // 加24小时再重新找
      for (const id in mbgGame.config.events) {
        const dConfig = mbgGame.config.events[id];
        const tStart = dConfig.tPair[0];
        const t = moment(tStart, 'hour').unix() + 24 * 60 * 60;
        const diff = t - nowtime;
        if (diff > 0 && diff < minT) {
          minT = diff;
          evtID = +id;
        }
      }
    }
    return [evtID, minT];
  },
  getEventMarks() {
    return mbgGame.timeVar.evtmark || {};
  },
  updateAttr(data) {
    data = data || {};
    if (!this.m_Attr) {
      this.m_Attr = {};
    }
    this.m_Attr = _.assignIn(this.m_Attr, data);
    if (data.skillstar) {
      this.onSkillStarsChanged();
    }
    if (mbgGame._dataReady) {
      emitter.emit('updateAttr');
    }
    if (data.mat) {
      emitter.emit('updateMat');
    }
    if (data.avglv) {
      const key = `${mbgGame.getShortID()}_avglv`;
      const oldAvglv = cc.sys.localStorage.getItem(key);
      // mbgGame.log("setLevel", oldAvglv, data.avglv);
      if (!oldAvglv || +oldAvglv !== data.avglv) {
        cc.sys.localStorage.setItem(key, `${data.avglv}`);
        mbgGame.analytisc.setLevel(data.avglv);
        // mbgGame.log("setLevel success");
      }
    }
  },
  removeLocalItem(k) {
    const key = `${mbgGame.getShortID()}_${k}`;
    return cc.sys.localStorage.removeItem(key);
  },
  getLocalItem(k) {
    const key = `${mbgGame.getShortID()}_${k}`;
    return cc.sys.localStorage.getItem(key);
  },
  setLocalItem(k, v) {
    const key = `${mbgGame.getShortID()}_${k}`;
    cc.sys.localStorage.setItem(key, v);
  },
  getAttrData() {
    return this.m_Attr;
  },
  getAttrByName(name) {
    return this.m_Attr[name] || 0;
  },
  getCoins() {
    return this.m_Attr.coins || 0;
  },
  getDiamonds() {
    return this.m_Attr.diamonds;
  },
  // 物资/微波
  getMat() {
    return this.m_Attr.mat;
  },
  // 体力
  getSta() {
    return this.m_Attr.sta;
  },
  getStaMax() {
    const labLv = this.getLabLv();
    const dConfig = mbgGame.config[`lab${labLv}`];
    return (dConfig && dConfig.staMax) || 0;
  },
  getGem() {
    return this.m_Attr.gem || 0;
  },
  // 当前拥有的技能星星数量 (已经获得的 减去 用掉的)
  getSkillStars() {
    return this.m_Attr.skillstar || 0;
  },
  // 成就星星减少或增加了
  onSkillStarsChanged() { },
  // 已获得的星星总数
  getTotalSkillStars() {
    let count = +cc.sys.localStorage.getItem('totalAchieve') || 0;
    const dAchieveData = mbgGame.getCache('player.achieveinfo');
    if (!dAchieveData) return count;
    count = 0;
    for (let achieveID in dAchieveData.achieve) {
      achieveID = parseInt(achieveID);
      const dData = dAchieveData.achieve[achieveID];
      const lv = dData.lv || 0;
      count += lv;
    }
    cc.sys.localStorage.setItem('totalAchieve', `${count}`);
    return count;
  },
  setPlotData(data) {
    this.m_plotData = data;
  },
  getPlotData() {
    return this.m_plotData;
  },
  isShowingPlot() {
    if (mbgGame.plotStory && mbgGame.plotStory.isShowingPlot()) {
      return true;
    }
    if (mbgGame.plotLab && mbgGame.plotLab.isShowingPlot()) {
      return true;
    }
    return false;
  },
  finishPlot(idx) {
    mbgGame.netCtrl.sendMsg('player.finishplot', {
      idx,
    });
  },
  hasUnlockPlot(idx) {
    const dData = this.getPlotData();
    const f = dData.f;
    return f[idx] === 1;
  },
  hasFinishPlot(idx) {
    if (idx >= 1 && idx <= 5 && this.isFlagOn(defines.Flag[`NewbiePlot${idx}`])) {
      return true;
    }
    const dData = this.getPlotData();
    const f = (dData && dData.f) || {};
    return f[idx] === 2;
  },
  setflag(flag) {
    this.flag = flag;
  },
  setFlagOn(offset, enabled) {
    let flag = this.getFlag();
    if (enabled) {
      if (flag & (1 << offset)) {
        return false;
      }
      flag |= 1 << offset;
    } else {
      if (!(flag & (1 << offset))) {
        return false;
      }
      flag &= ~(1 << offset);
    }
    this.setFlag(flag);
    return true;
  },
  isFlagOn(offset) {
    const flag = this.flag || 0;
    return (flag & (1 << offset)) > 0;
  },
  // 判断各个系统是否已解锁
  // 竞技场
  isArenaUnlocked() {
    return this.isFlagOn(defines.Flag.Arena);
  },
  // 道具升级
  isSmeltItemUnlocked() {
    return this.isFlagOn(defines.Flag.Smelt);
  },
  // 联盟
  isClanUnlocked() {
    return this.isFlagOn(defines.Flag.Clan);
  },
  // 自动放技能
  isBottingUnlocked() {
    return this.isFlagOn(defines.Flag.Botting);
  },
  // 主线布阵功能
  isStorySchemeUnlocked() {
    return this.isFlagOn(defines.Flag.StoryScheme);
  },
  // 竞猜
  isGambleUnlocked() {
    return this.isFlagOn(defines.Flag.Gamble);
  },
  // 天赋系统
  isTalentSysUnlocked() {
    return this.isFlagOn(defines.Flag.Talent);
  },
  // 天才电竞
  isTCBattleUnlocked() {
    return this.isFlagOn(defines.Flag.TCBattle);
  },
  // 车轮战
  isWheelWarUnlocked() {
    return this.isFlagOn(defines.Flag.WheelWar);
  },
  isHeroWarUnlocked() {
    return this.isFlagOn(defines.Flag.HeroWar);
  },
  isCoinWarUnlocked() {
    return this.isFlagOn(defines.Flag.CoinWar);
  },
  isMatWarUnlocked() {
    return this.isFlagOn(defines.Flag.MatWar);
  },
  setStatData(dData) {
    this.m_StatData = dData;
  },
  setRaidData(dData) {
    this.m_RaidData = dData;
  },
  setBattleData(dData) {
    if (this.m_BattleData && dData.c) {
      // 标记实验室的箱子是不是新来的，方便做动画
      for (let pos = 0; pos < this.getBattleLabChestLimit(); pos++) {
        const id = dData.c[pos];
        if (!id) {
          continue;
        }
        if (!this.m_BattleData.c || !this.m_BattleData.c[pos]) {
          dData.data[id].new = true;
        }
      }
    }
    this.m_BattleData = dData;
  },
  getBattleData() {
    return this.m_BattleData || {};
  },
  getBattleChestData() {
    return this.getBattleData().data || {};
  },
  hasBattleChest(id) {
    return this.getBattleChestDataByID(id) != null;
  },
  getBattleChestImage(id) {
    const dData = this.getBattleChestDataByID(id);
    // mbgGame.log('getBattleChestImage', id, dData);
    return `chest${dData.idx === 1 ? 1 : 4}`;
  },
  getBattleLabChestLimit() {
    return 4;
  },
  getBattleLabChestDict() {
    const dDBData = this.getBattleData();
    if (!dDBData.c) {
      dDBData.c = {};
    }
    return dDBData.c;
  },
  getBattleLabChestNum() {
    let n = 0;
    const dData = this.getBattleLabChestDict();
    for (const pos in dData) {
      if (dData[pos] > 0) {
        n += 1;
      }
    }
    return n;
  },
  isBattleLabChest(id) {
    const dData = this.getBattleLabChestDict();
    for (const pos in dData) {
      if (dData[pos] === id) {
        return true;
      }
    }
    return false;
  },
  isUnlockingBattleChest() {
    return this.getUnlockingBattleChestID() != null;
  },
  getUnlockingBattleChestID() {
    const dChest = this.getBattleChestData();
    for (const id in dChest) {
      if (dChest[id].t) {
        return +id;
      }
    }
    return null;
  },
  getBattleChestLefttime(id) {
    const dChest = this.getBattleChestData();
    if (!dChest[id]) {
      return -1;
    }
    const dConfig = mbgGame.config.constTable[`clanchest${dChest[id].idx}`];
    if (dChest[id].t) {
      const nowtime = mbgGame.netCtrl.getServerNowTime();
      const lefttime = Math.max(0, dChest[id].t + dConfig[0] - (dChest[id].b || 0) - nowtime);
      return lefttime;
    }
    return dConfig[0];
  },
  getBattleChestDataByID(id) {
    return this.getBattleChestData()[id];
  },
  isRaidUnlocked() {
    const dData = this.getRaidData();
    return dData.ul;
  },
  getRaidLv(raidIdx) {
    const dData = this.getRaidData();
    return (dData.d[raidIdx] && dData.d[raidIdx][0]) || 0;
  },
  getRaidMaxLv(raidIdx) {
    const dData = this.getRaidData();
    return (dData.d[raidIdx] && dData.d[raidIdx][1]) || 0;
  },
  setRaidScheme(schemeIdx, dScheme) {
    const dData = this.getRaidData();
    dData.s[schemeIdx] = dScheme;
  },
  getRaidData() {
    return this.m_RaidData || {};
  },
  // todo 获取玩家可以使用的阵型数量
  getSchemeMax() {
    return this.getAttrByName('sch') + mbgGame.config.constTable.SchemeNum[0];
  },
  // todo 发往服务器请求最大+1
  addSchemeMax() {
    mbgGame.netCtrl.sendMsg('war.buySchemeNum', {}, (data) => {
      mbgGame.log('addSchemeMax', data);
      if (data.code === 'ok') {
        // 成功就emit setPVPData
        emitter.emit('setPVPData');
      } else {
        mbgGame.errMsg(data.err);
      }
    });
  },
  getDefaultSchemeIdx(type) {
    let idx = cc.sys.localStorage.getItem(`schemeIdxDefault_${type}`);
    if (idx) {
      idx = +idx;
    }
    return idx;
  },
  setDefaultSchemeIdx(type, idx) {
    if (!type) return;
    cc.sys.localStorage.setItem(`schemeIdxDefault_${type}`, idx);
    // 设置了默认，就删除了临时选择
    delete mbgGame.nowSchemeIdx;
  },
  getSavedSchemeIdx(wartype) {
    // 剧情使用剧情设置
    if (wartype === 'storywar') {
      return 0;
    }
    let idx = 0;
    // 临时选择的阵，只保留一次，开打就设为默认
    let tempIdx = mbgGame.nowSchemeIdx;
    if (tempIdx == null) {
      // 如果没有临时选择的，就用默认
      tempIdx = this.getDefaultSchemeIdx(wartype);
    }
    if (tempIdx != null) {
      idx = tempIdx;
    }
    return idx;
  },
  isWheelWar(worldIdx, stageIdx) {
    return stageIdx && worldIdx === 4 && this.getDayWarTypeByStageIdx(stageIdx) === 'wheelwar';
  },
  getSchemeData(worldIdx, schemeIdx, stageIdx) {
    if (this.isWheelWar(worldIdx, stageIdx)) {
      const dData = this.getWheelWarData();
      return dData.scheme;
    } else if ([4, 9, 10, 99].indexOf(worldIdx) !== -1 || (worldIdx === 6 && this.isStorySchemeUnlocked())) {
      return this.getPVPSchemeData(schemeIdx);
    } else if (defines.StoryWorlds.indexOf(worldIdx) !== -1) {
      return this.getStorySchemeData(worldIdx);
    }
    return null;
  },
  getSchemeName(idx) {
    const dScheme = mbgGame.player.getPVPSchemeData();
    if (dScheme[idx] && dScheme[idx].name) {
      return dScheme[idx].name;
    }
    return mbgGame.getString('schemeDefaultName', {
      n: idx + 1,
    });
  },
  countCharaIDs(charaIDs) {
    let count = 0;
    if (!charaIDs || charaIDs.length === 0) {
      return count;
    }
    for (let i = 0; i < charaIDs.length; i++) {
      if (charaIDs[i] > 0) {
        count += 1;
      }
    }
    return count;
  },
  updateLabData(dData) {
    this.m_LabData = dData;

    if (mbgGame.sceneMenu) {
      mbgGame.sceneMenu.setRedtips(mbgGame.PageLab, this.checkLabRedTip());
    }
  },
  getLabData() {
    return this.m_LabData;
  },
  // 检查目前是否可以领取奖励
  checkCanGetReward(facID) {
    const dFac = mbgGame.player.getFacDataByFacID(facID);
    if (!dFac) return 0;
    if (!dFac.trT) return 0;
    if (!dFac.c || dFac.c.length < 1) return 0; // 任务都不能提前领奖励
    if (dFac.f) return 0; // 任务都不能提前领奖励
    const nowtime = moment().unix();
    let passTime = nowtime - dFac.trT;
    if (passTime > dFac.d) {
      passTime = dFac.d;
    }
    const leftTime = passTime - dFac.sP;
    let checkTime;
    if (dFac.b) {
      checkTime = mbgGame.config.constTable.ReadTLimit;
    } else {
      checkTime = mbgGame.config.constTable.GymTLimit;
    }
    if (nowtime >= dFac.trT + dFac.d) {
      return 2;
    }
    if (leftTime <= 0) return 0;
    if (leftTime >= checkTime) {
      return 1;
    }
    return 0;
  },
  // 获取最大阅读页数
  getReadPagesLimit(charaID, bookID) {
    const dBookConfig = mbgGame.config.books[bookID];
    if (!dBookConfig) {
      return 0;
    }
    const logPages = this.getReadPages(charaID, bookID);
    let times = Math.floor(logPages / dBookConfig.pages);
    if (times > 3) {
      return dBookConfig.pages;
    }
    times = 4 - times;
    if (times > 4) times = 4;
    return dBookConfig.pages * times;
  },
  calcReadExp(charaID, bookID, pages, labLv) {
    const dBookConfig = mbgGame.config.books[bookID];
    if (!dBookConfig) {
      return 0;
    }
    // 初始档位
    const defaultLvl = 3;
    // 第一个等级多角色修正值
    const dLvl = dBookConfig[`c${charaID}`];
    let lvl = defaultLvl + dLvl;
    if (lvl < 0) lvl = 0;
    if (lvl > 6) lvl = 6;
    // 此时lvl为当前的级别
    const n = Math.floor(pages / dBookConfig.pages);
    const dPages = Math.floor(pages % dBookConfig.pages);
    let firstRatio = 0;
    let lastLvl = lvl - n;
    if (lastLvl < 0) lastLvl = 0;
    if (lastLvl > 6) lastLvl = 6;
    const lastRatio = mbgGame.config.constTable.BookFaces[6 - lastLvl];
    for (let i = lvl; i > lvl - n; i--) {
      if (i >= 0 && i < 7) {
        firstRatio += mbgGame.config.constTable.BookFaces[6 - i];
      } else if (i >= 6) {
        firstRatio += mbgGame.config.constTable.BookFaces[0];
      } else {
        firstRatio += mbgGame.config.constTable.BookFaces[6];
      }
    }
    let readExp = Math.round(
      (this.getLabConfig(labLv).labExpK * (dBookConfig.pages * (n + firstRatio) + dPages * (1 + lastRatio))) / 60,
    );
    readExp = Math.max(0, readExp);
    /*
    mbgGame.log(`
      起始档${lvl} ${n}档 档位修正${firstRatio} 修正等级${dLvl}
      余页${dPages} 修正${lastRatio} 最低档${lastLvl}
      研究所等级 ${labLv} 系数 ${this.getLabConfig(labLv).labExpK}
    `);
    */
    // mbgGame.log("calcReadExp:", charaID, bookID, pages, this.getLabConfig().labExpK, n, dPages, readExp);
    return readExp;
  },
  getNowReadExp(facID, charaID) {
    const dFac = this.getFacDataByFacID(facID);
    const nowtime = moment().unix();

    let readPageFromBegin = nowtime - dFac.trT;
    if (readPageFromBegin > dFac.d) {
      // 不能超过最大可读页数
      readPageFromBegin = dFac.d;
    }
    // 当前结算页数
    const nowReadPages = readPageFromBegin - dFac.sP;
    const bookID = dFac.b;
    const lastPages = this.getReadPages(charaID, bookID);
    const nowTotalPages = lastPages + nowReadPages;
    const lastExp = this.calcReadExp(charaID, bookID, lastPages, dFac.lv);
    const nowExp = this.calcReadExp(charaID, bookID, nowTotalPages, dFac.lv);

    const getExp = Math.max(0, nowExp - lastExp);

    // mbgGame.log('getNowReadExp', lastExp, nowExp, getExp, dFac.sP);
    const dBookConfig = mbgGame.config.books[bookID];
    const times = Math.floor(nowTotalPages / dBookConfig.pages);
    let nowPages = 0;
    if (times < 1) {
      nowPages = nowTotalPages;
    } else if (nowTotalPages >= dBookConfig.pages * times) {
      nowPages = nowTotalPages - dBookConfig.pages * times;
    } else if (nowTotalPages >= dBookConfig.pages * (times - 1)) {
      nowPages = nowTotalPages - dBookConfig.pages * (times - 1);
    }
    return {
      getExp,
      lastExp,
      nowTotalPages: lastPages + nowReadPages,
      times,
      nowPages,
    };
  },
  getReadPages(charaID, bookID) {
    if (!this.m_LabData.bp) {
      return 0;
    }
    if (!this.m_LabData.bp[charaID]) {
      return 0;
    }
    return this.m_LabData.bp[charaID][bookID] || 0;
  },
  getReadTimes(charaID, bookID) {
    const pages = this.getReadPages(charaID, bookID);
    const dBookConfig = mbgGame.config.books[bookID];
    let times = Math.floor(pages / dBookConfig.pages);
    if (times > 3) {
      times = 3;
    }
    return times;
  },
  getFacIDByBookID(bookID) {
    if (!bookID) return null;
    for (let i = 0; i < labdefines.ReadFacIDs.length; i++) {
      const facID = labdefines.ReadFacIDs[i];
      const data = mbgGame.player.getFacDataByFacID(facID);
      if (data && data.c && data.c.length > 0 && data.b === bookID) {
        return facID;
      }
    }
    return null;
  },
  getGymHappyLvl(npcID, facID) {
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
  },
  calcGymReward(charaID, facID) {
    const nowtime = moment().unix();
    const dFac = mbgGame.player.getFacDataByFacID(facID);

    const passTime = nowtime - dFac.trT - dFac.sP;
    const reward = {};
    reward.sP = dFac.sP;

    const happyLvl = this.getGymHappyLvl(charaID, facID);
    const ratio = mbgGame.config.constTable.GymFaces[6 - happyLvl];
    if (charaID <= 15) {
      // 奖励斗币
      let value = Math.floor((this.getLabConfig().labMatK * passTime * (1 + ratio)) / 60);
      if (value < 0) value = 0;
      reward.mat = value;
      let tValue = Math.floor((this.getLabConfig().labMatK * dFac.sP * (1 + ratio)) / 60);
      if (tValue < 0) tValue = 0;
      reward.tValue = tValue;
    } else {
      // 奖励金币
      let value = Math.floor((this.getLabConfig().labCoinsK * passTime * (1 + ratio)) / 60);
      if (value < 0) value = 0;
      reward.coins = value;
      let tValue = Math.floor((this.getLabConfig().labCoinsK * dFac.sP * (1 + ratio)) / 60);
      if (tValue < 0) tValue = 0;
      reward.tValue = tValue;
    }
    dFac.sP += passTime;

    return reward;
  },
  getTaskHappyLvl(charaID, taskID) {
    const dTaskConfig = mbgGame.config.tasks[taskID];
    let lvl = 6 - mbgGame.config.constTable.TaskFaces.indexOf(dTaskConfig[`c${charaID}`]) || 0;
    if (lvl > 6) lvl = 0;
    if (lvl < 0) lvl = 0;
    return lvl;
  },
  /*
   type = 1 只根据读书次数来返回喜好等级
   type = 2 读书超过15分钟后才显示真实等级
   type = 3 显示真实等级
  */
  getBookHappyLvl(charaID, bookID, type) {
    const dBookConfig = mbgGame.config.books[bookID];
    const times = this.getReadTimes(charaID, bookID);
    let timeLvl = 3 - times;
    if (timeLvl < 0) timeLvl = 0;
    if (timeLvl > 3) timeLvl = 3;
    if (type === 1) {
      return 7 - timeLvl;
    }

    const dLvl = dBookConfig[`c${charaID}`];

    // 获取该角色是否在读该书的状态
    const facID = this.getFacIDByBookID(bookID);
    let isReading = false;
    if (facID) {
      // 这本书当前在读，判断是不是该角色在读
      if (this.getCharaIDByFacID(facID) === charaID) {
        isReading = true;
      }
    }
    // 0未最不开心档，6为最开心
    let lvl = 0;
    if (!isReading) {
      // 如果没有在读
      lvl = timeLvl + dLvl;
    } else {
      lvl = timeLvl;
      // todo 这里需要进行次数修正
      // 如果在读
      if (type === 3) {
        lvl = timeLvl + dLvl;
      } else {
        // 读书起码15分钟后，才显示真实
        if (mbgGame.player.getFacPassWorkTime(facID) > 15 * 60) {
          lvl = timeLvl + dLvl;
        }
      }
    }
    if (lvl < 0) lvl = 0;
    if (lvl > 6) lvl = 6;

    // mbgGame.log('getBookHappyLvl', charaID, dBookConfig, mbgGame.config.constTable.BookFaces, i, 'dLvl', dLvl, 'timeLvl', timeLvl, 'lvl', lvl);
    return lvl;
  },
  getCurTasks() {
    return (this.m_LabData && this.m_LabData.tasks) || {};
  },
  getBookExp(bookID) {
    const dBookConfig = mbgGame.config.books[bookID];
    const d = Math.round(60 * (dBookConfig.pages / mbgGame.config.constTable.ReadSpd));
    const bookExp = Math.round((this.getLabConfig().labExpK * d) / 60);
    return bookExp;
  },
  getUnlockedBookList() {
    return (this.m_LabData && this.m_LabData.b1) || [];
  },
  getOwnedBookList() {
    return this.getUnlockedBookList();
  },
  getLabLv() {
    return this.m_LabData && this.m_LabData.lv;
  },
  getBonuslv() {
    return Math.min(this.getLabLv() * 5, this.getAvgLv());
  },
  getLabConfig(labLv) {
    return mbgGame.config[`lab${labLv || this.getLabLv()}`];
  },
  getLabUpNeedExp() {
    const dNextConfig = mbgGame.config[`lab${this.getLabLv() + 1}`];
    if (!dNextConfig) {
      return 99999999;
    }
    const costExp = dNextConfig.costExp;
    return costExp || 1;
  },
  getFacType(facID) {
    return labdefines.FacID2Type[facID];
  },
  getFacParam(facID) {
    return labdefines.FacType2Param[this.getFacType(facID)];
  },
  getFacConfigPrefix(facID) {
    return this.getFacParam(facID).configPrefix;
  },
  isFacHasChara(facID) {
    const dData = this.getFacDataByFacID(facID);
    if (!dData || !dData.trT) {
      return false;
    }
    return true;
  },
  getFacLeftWorkTime(facID) {
    const dData = this.getFacDataByFacID(facID);
    if (!dData || !dData.trT || !dData.d) {
      return 99999999;
    }
    const nowtime = mbgGame.netCtrl.getServerNowTime();
    const lefttime = dData.trT + dData.d - nowtime;
    return Math.max(0, lefttime);
  },
  // 获取工作已经进行了多少时间
  getFacPassWorkTime(facID) {
    const dData = this.getFacDataByFacID(facID);
    if (!dData || !dData.trT) {
      return 0;
    }
    const nowtime = mbgGame.netCtrl.getServerNowTime();
    const passTime = Math.floor(nowtime - dData.trT);
    return Math.max(0, passTime);
  },
  getFacDataByFacID(facID) {
    return this.m_LabData && this.m_LabData.f[facID];
  },
  canFacPutChara(facID) {
    return true;
  },
  isFacUpgrading(facID) {
    const dData = this.getFacDataByFacID(facID);
    return dData && dData.upT;
  },
  isUnlockedFloor(floorType) {
    if (this.m_LabData.ufl == null) {
      return false;
    }
    return (this.m_LabData.ufl & (1 << (floorType - 1))) > 0;
  },
  getFacLv(facID) {
    if (!this.m_LabData.f[facID]) {
      return 0;
    }
    return this.m_LabData.f[facID].lv;
  },
  hasFac(facID) {
    return this.m_LabData.f[facID] != null;
  },
  hasFloor(floorType) {
    if (floorType === 1) {
      return true;
    }
    if (this.m_LabData.fl == null) {
      return false;
    }
    return this.m_LabData.fl & (1 << (floorType - 1));
  },
  getUnlockedFacIDs() {
    return this.m_LabData.ids || [];
  },
  checkLabRedTip() {
    if (!this.getLabData()) {
      return false;
    }
    // 楼层
    for (let floorType = 3; floorType <= 8; floorType++) {
      const hasFloor = mbgGame.player.hasFloor(floorType);
      const isUnlockedFloor = mbgGame.player.isUnlockedFloor(floorType);
      if (!hasFloor && isUnlockedFloor) {
        return true;
      }
    }
    // 设施
    const ids = this.getUnlockedFacIDs();
    if (ids.length > 0) {
      for (let i = 0; i < ids.length; i++) {
        const facID = ids[i];
        if (!this.hasFac(facID)) {
          return true;
        }
      }
    }
    /*
    // 工作完成 或 没人工作
    for (const name in labdefines.FacID) {
      const facID = labdefines.FacID[name];
      const hasChara = mbgGame.player.doesFacHasChara(facID);
      if (hasChara) {
        const lefttime = mbgGame.player.getFacLeftWorkTime(facID);
        if (lefttime <= 0) {
          return true;
        }
      } else if (this.hasFac(facID)) {
        return true;
      }
    }
    */
    return false;
  },
  isFacUnlocked(facID) {
    const floorType = labdefines.FacID2FloorType[facID];
    if (!this.hasFloor(floorType)) {
      return false;
    }
    const ids = this.getUnlockedFacIDs();
    return ids.indexOf(facID) !== -1;
  },
  getAllFacData() {
    return this.m_LabData.f;
  },
  getFacCount() {
    const dAllFloor = this.getAllFacData();
    let count = 0;
    for (let idx in dAllFloor) {
      idx = +idx;
      count += 1;
    }
    return count;
  },
  checkFacDesignAward() {
    let totalLvl = 0;
    for (let charaID = 1; charaID <= 15; charaID++) {
      const hasChara = mbgGame.player.hasChara(charaID);
      if (!hasChara) {
        totalLvl += 0;
        continue;
      }
      totalLvl += mbgGame.player.getCharaLv(charaID) || 0;
    }
    const nowDesignLvl = Math.floor(totalLvl / 50);
    if (mbgGame._lastDesignLvl == null) {
      mbgGame._lastDesignLvl = +cc.sys.localStorage.getItem('designLvl');
      if (!mbgGame._lastDesignLvl) {
        // 玩家一般是第一次登录，或者重装游戏，记下当前等级，返回false
        mbgGame._lastDesignLvl = nowDesignLvl;
        cc.sys.localStorage.setItem('designLvl', mbgGame._lastDesignLvl);
        return false;
      }
    }
    if (nowDesignLvl > mbgGame._lastDesignLvl) {
      mbgGame._lastDesignLvl = nowDesignLvl;
      cc.sys.localStorage.setItem('designLvl', mbgGame._lastDesignLvl);
      return true; // 插入一个设计图奖励
    }
    return false;
  },
  getGambleInterval(matchType) {
    const hour = mbgGame.config.constTable.MatchType2Hour[matchType];
    return Math.round(hour * 3600);
  },
  // 查询该角色是否正在工作
  isCharaWorking(charaID) {
    const facID = this.getLabFacIDByChara(charaID);
    if (facID > 0) {
      return true;
    }
    return false;
  },
  isCharaInLab(charaID) {
    return this.getLabFacIDByChara(charaID) > 0;
  },
  getCharaIDByFacID(facID) {
    const dData = this.getAllFacData();
    if (!dData[facID]) {
      return 0;
    }
    const dFac = dData[facID];
    return dFac.c && dFac.c[0];
  },
  hasAllWorld1Charas() {
    for (let c = 1; c <= 5; c++) {
      if (!mbgGame.player.hasChara(c)) {
        return false;
      }
    }
    return true;
  },
  doesFacHasChara(facID) {
    const dFac = this.getFacDataByFacID(facID);
    return dFac && !_.isEmpty(dFac.c);
  },
  getLabFacIDByChara(charaID) {
    const dData = this.getAllFacData();
    for (let facID in dData) {
      facID = +facID;
      const dFac = dData[facID];
      if (dFac.c && dFac.c.indexOf(charaID) !== -1) {
        return facID;
      }
    }
    return 0;
  },
  // 获取代练工厂下方的角色ID列表
  // PVE的话参数是 0 1 2
  // PVP传 99
  getBottingBottomCharaIDs(worldIdx) {
    if (worldIdx >= 0 && worldIdx <= 2) {
      const charaIDs = [];
      for (let i = 0; i < 5; i++) {
        const charaID = worldIdx * 5 + i + 1;
        if (this.charaData[charaID]) charaIDs.push(charaID);
      }
      return charaIDs;
    }
    return this.getPVPDefCharaIDs();
  },
  getStatID(statName) {
    const statID = mbgGame.config.StatName2StatID[statName];
    if (!statID) {
      mbgGame.error('no statID, statName:', statName);
    }
    return statID;
  },
  // /////////////////////////////////////////////
  // 下面三个接口的统一说明：
  // schemeIdx 范围0-2  表示卡组编号
  // cb  被调用时代表设置成功
  // /////////////////////////////////////////////
  // 设置角色，全部角色编排完之后再调用
  // charaIDs 角色ID列表
  setScheme_Team(worldIdx, schemeIdx, charaIDs, cmd, cb) {
    // mbgGame.log("setScheme_Team", worldIdx, schemeIdx);
    const param = {
      charaIDs,
    };
    mbgGame.netCtrl.sendMsg(
      cmd || 'war.setScheme',
      {
        worldIdx,
        schemeIdx,
        param,
      },
      (data) => {
        const ok = this.onSchemeChanged(data, worldIdx, schemeIdx, data.data);
        if (cb) {
          cb(ok);
        }
      },
    );
  },
  // 交换道具
  // charaIdx 0-4 角色序号
  setScheme_Switch(worldIdx, schemeIdx, charaIdx1, charaIdx2, cmd) {
    const param = {
      switch: 1,
      idx1: charaIdx1,
      idx2: charaIdx2,
    };
    mbgGame.netCtrl.sendMsg(
      cmd || 'war.setScheme',
      {
        worldIdx,
        schemeIdx,
        param,
      },
      (data) => {
        this.onSchemeChanged(data, worldIdx, schemeIdx, data.data);
      },
    );
  },
  // 设置物品，每一次装/卸都要调用
  // charaIdx 0-4 角色序号
  // type 1: 装上 2: 卸下
  setScheme_Item(worldIdx, schemeIdx, sid, charaIdx, type, cmd) {
    // 旧的sid
    const dScheme = this.getSchemeData(worldIdx, schemeIdx);
    let oldSid = null;
    if (dScheme) {
      const posIdx2sidList = dScheme.bag || {};
      const lst = posIdx2sidList[charaIdx] || [];
      oldSid = lst[0];
    }
    const param = {
      sid,
      charaIdx,
      type,
    };
    mbgGame.netCtrl.sendMsg(
      cmd || 'war.setScheme',
      {
        worldIdx,
        schemeIdx,
        param,
      },
      (data) => {
        this.onSchemeChanged(data, worldIdx, schemeIdx, data.data);
        if (oldSid) this.cleanItemInUseFlag(oldSid);
        this.cleanItemInUseFlag(sid);
      },
    );
  },
  // 设置技能，全部技能编排完之后再调用
  // charaIDs 技能顺序（参考PVE）
  setScheme_Skill(worldIdx, schemeIdx, charaIDs, cmd) {
    const botting = charaIDs;
    const param = {
      botting,
    };
    mbgGame.netCtrl.sendMsg(
      cmd || 'war.setScheme',
      {
        worldIdx,
        schemeIdx,
        param,
      },
      (data) => {
        this.onSchemeChanged(data, worldIdx, schemeIdx, data.data);
      },
    );
  },
  copyScheme(worldIdx, srcIdx, dstIdx) {
    mbgGame.netCtrl.sendMsg(
      'war.copyScheme',
      {
        worldIdx,
        srcIdx,
        dstIdx,
      },
      (data) => {
        this.onSchemeChanged(data, worldIdx, dstIdx, data.data);
      },
    );
  },
  onSchemeChanged(data, worldIdx, schemeIdx, dScheme) {
    mbgGame.log('onSchemeChanged', data);
    if (data.code === 'ok') {
      if (
        worldIdx === 4 ||
        worldIdx === 9 ||
        worldIdx === 10 ||
        worldIdx === 99 ||
        (worldIdx === 6 && this.isStorySchemeUnlocked())
      ) {
        this.setPVPSchemeData(schemeIdx, dScheme);
      } else if (defines.StoryWorlds.indexOf(worldIdx) !== -1) {
        this.setStorySchemeData(worldIdx, schemeIdx, dScheme);
      }
      emitter.emit('onChangeScheme');
      return true;
    }
    // error
    mbgGame.managerUi.floatMessage(data.err);
    mbgGame.log('onSchemeChanged, err', data.err, worldIdx, schemeIdx, dScheme);
    return false;
  },
  getCharaWarData(charaID) {
    const dCharaData = this.charaDataRaw[charaID];
    return w_defines.getCharaWarData(charaID, dCharaData);
  },
  // 查看阵型里的某一个角色的信息
  // dScheme 可选
  getCharaInfo(charaID, dScheme) {
    const tmpUnit = this.getOrCreateTmpChara(charaID);
    const dData = this.getCharaWarData(charaID);
    if (!dData) {
      return null;
    }
    dData.ID = charaID;
    dData.type = 0;
    dData.posIdx = 0;
    tmpUnit.m_Data = dData;
    mbgGame.log('getCharaInfo', charaID, dScheme);
    // this.logInfo("getCharaInfo charaID", charaID, "tlv", dData.tlv);
    // this.logInfo("getCharaInfo charaID", charaID, "bag", dScheme.bag);
    tmpUnit.setExtraAttrData(null);
    const warData = new CWarData();
    if (dScheme && dScheme.charaIDs && dScheme.bag) {
      const charaIDs = dScheme.charaIDs;
      const posIdx = charaIDs.indexOf(charaID);
      // mbgGame.log("dScheme", dScheme, posIdx, charaID)
      if (posIdx !== -1) {
        const dExtraAttr = warData.getExtraAttrDataByCharaID(charaID, posIdx, dScheme.bag, this.getOwnedItems());
        tmpUnit.setExtraAttrData(dExtraAttr);
      }
    }
    tmpUnit.initAsTmpUnit(dData);
    return tmpUnit.packInfo('gs');
  },
  getCanSelectCharaIDsByWorld(worldIdx) {
    let charaIDs = [];
    if (worldIdx === 0) {
      // 挂机世界，所有已解锁、并且不在其他工位的人可以选
      charaIDs = this.getMyCharaIDs();
      charaIDs = _.filter(charaIDs, (charaID) => {
        return !this.isCharaWorking(charaID);
      });
    } else if (defines.StoryWorlds.indexOf(worldIdx) !== -1) {
      // 剧情模式，可能限制选人
      if (worldIdx !== 6 || (worldIdx === 6 && !this.isStorySchemeUnlocked())) {
        return charaIDs;
      } else {
        charaIDs = this.getMyCharaIDs();
      }
    } else {
      charaIDs = this.getMyCharaIDs();
    }
    return charaIDs;
  },
  setItemData(dData) {
    dData = dData || {};
    dData.own = dData.own || {};
    this.itemData = dData;
  },
  delItemsData(sidList) {
    if (!this.itemData || !this.itemData.own) return;
    for (let i = 0; i < sidList.length; i++) {
      delete this.itemData.own[sidList[i]];
    }
  },
  setItemDataOne(dData) {
    this.itemData = this.itemData || {};
    this.itemData.own = this.itemData.own || {};
    if (!dData.data) {
      if (this.itemData.own[dData.sid]) {
        delete this.itemData.own[dData.sid];
      }
    } else {
      this.itemData.own[dData.sid] = dData.data;
    }
  },
  getItemRichTextName(itemID, q) {
    const dItemConfig = mbgGame.config[`item${itemID}`];
    const itemname = mbgGame.getString(`iname${q}`, {
      name: mbgGame.getString(`itemname${itemID}`),
    });
    const sAttr = defines.ItemMainType2Attr[dItemConfig.mainType];
    const iconName = defines.iconName[sAttr];
    return `<img src="${iconName}" />${itemname}`;
  },
  getOwnedItems() {
    if (!this.itemData) return null;
    return this.itemData.own;
  },
  // 从该世界诞生的道具列表(已经拥有的)
  // worldIdx = null时，返回所有道具
  getOwnedItemList_Belong(worldIdx) {
    if (!this.itemData) return null;
    const sidList = [];
    const dOwn = this.itemData.own;
    for (let sid in dOwn) {
      sid = +sid;
      const itemID = dOwn[sid].i;
      const dConfig = mbgGame.config[`item${itemID}`];
      if (dConfig) {
        if (worldIdx == null || dConfig.worldIdx === worldIdx) {
          sidList.push(sid);
        }
      } else {
        mbgGame.error('缺少物品配置：', itemID);
      }
    }
    return this.sortSidList(sidList);
  },
  sortSidList(sidList) {
    const condition = mbgGame._itemsSortCondition || 'synthesis';
    if (_.includes(mbgGame._itemsSortCondition, 'starList')) {
      // 只显示该品质道具
      const starLv = +mbgGame._itemsSortCondition.substring('starList'.length);
      sidList = _.filter(sidList, (_sid) => {
        const dData = this.getItemData(_sid);
        if (!dData) {
          return false;
        }
        return dData.s === starLv;
      });
    }
    sidList = _.sortBy(sidList, (_sid) => {
      const dData = this.getItemData(_sid);
      if (!dData) {
        return 0;
      }
      const values = mbgGame.player.getItemAttrList(_sid);
      // 默认方案
      let val = dData.s;
      if (condition === 'synthesis') {
        // 综合排序， 按获取时间
        // val = (dData.q * 10) + (dData.s * 5) + dData.lv;
        val = dData.k || 0;
      } else if (condition === 'quality') {
        // 根据品质来排
        val = dData.q * 10000 + dData.s + dData.lv;
      } else if (condition === 'itemName') {
        // 根据名字来排，其实就是按物品ID来排就好了
        val = dData.i * 10000 + dData.s + dData.q;
      } else if (condition === 'starLvl') {
        // 按星级排
        val = dData.s * 10000 + dData.lv + dData.q;
      } else if (condition === 'attr_level') {
        // 等级
        val = (dData.lv || 1) * 10000 + dData.s + dData.q;
      } else if (condition === 'power') {
        // 战力 星级最重要
        val = dData.s * 10 + dData.q * 5 + dData.lv || 1;
      } else {
        val = values[condition] || 0;
      }
      return -val;
    });
    return sidList;
  },
  cleanItemInUseFlag(sid) {
    const dData = this.getItemData(sid);
    if (dData && dData.inUse != null) {
      delete dData.inUse;
    }
  },
  checkItemInUse(sid) {
    const dData = this.getItemData(sid);
    if (dData.inUse != null) {
      return dData.inUse;
    }
    // 检查道具是否已经装备
    let inUse = false;
    for (let i = 0; i < defines.AllWorlds.length; i++) {
      for (let schemeIdx = 0; schemeIdx < this.getSchemeMax(); schemeIdx++) {
        const dScheme = this.getSchemeData(defines.AllWorlds[i], schemeIdx);
        if (_.isEmpty(dScheme)) {
          continue;
        }
        const sidListInUse = this.getItemsBySchemeData(dScheme);
        if (sidListInUse && sidListInUse.indexOf(sid) !== -1) {
          // mbgGame.log("inuse", sid, dScheme, sidListInUse, defines.AllWorlds[i], schemeIdx);
          inUse = true;
          break;
        }
      }
      if (inUse) break;
    }
    dData.inUse = inUse;
    return inUse;
  },
  getItemsCanGamble(gambleType) {
    let sidList = mbgGame.player.getOwnedItemList_Belong();
    // 绿／蓝的不可赌，锁定的不可赌
    sidList = _.filter(sidList, (sid) => {
      return mbgGame.player.getItemQ(sid) > 2;
    });
    if (gambleType === 3) {
      // 满级的不可赌
      sidList = _.filter(sidList, (sid) => {
        return mbgGame.player.getItemData(sid).lv < mbgGame.player.getItemMaxLv(sid);
      });
    }
    // 已被赌局锁定的不能赌
    sidList = _.filter(sidList, (sid) => {
      return !mbgGame.player.getItemData(sid).l2;
    });
    return sidList;
  },
  getItemsBySchemeData(dScheme) {
    const posIdx2sidList = dScheme && dScheme.bag;
    const sidList = [];
    if (posIdx2sidList) {
      for (let posIdx = 0; posIdx < 5; posIdx++) {
        const lst = posIdx2sidList[posIdx] || [];
        sidList.push(lst[0] || 0);
      }
    }
    return sidList;
  },
  // 该世界能使用的道具列表(已经拥有的)
  getOwnedItemList_CanUse(worldIdx, schemeIdx, stageIdx) {
    const dScheme = this.getSchemeData(worldIdx, schemeIdx, stageIdx);
    mbgGame.log('getOwnedItemList_CanUse', worldIdx, schemeIdx, dScheme);
    const charaIDs = dScheme.charaIDs || [];
    const sidListInUse = this.getItemsBySchemeData(dScheme);
    const sidList = [];
    const dOwn = this.itemData.own;
    for (let sid in dOwn) {
      sid = +sid;
      if (sidListInUse && sidListInUse.indexOf(sid) !== -1) {
        continue;
      }
      const dItemData = dOwn[sid];
      const itemID = dItemData.i;
      const dConfig = mbgGame.config[`item${itemID}`];
      if (!dConfig) {
        mbgGame.error('缺少物品配置：', itemID);
        continue;
      }
      if (worldIdx >= 1 && worldIdx <= 3) {
        if (dConfig.worldIdx > 0 && dConfig.worldIdx !== worldIdx) {
          continue;
        }
      }
      if (dConfig.charaID) {
        const charaID = _.find(charaIDs, (_charaID) => {
          return dConfig.charaID === _charaID;
        });
        if (!charaID) {
          continue;
        }
      }
      sidList.push(sid);
    }
    return this.sortSidList(sidList);
  },
  sellItem(sid) {
    const dData = this.getItemData(sid);
    let needConfirm = false;
    let confirmKey = 'itemSellConfirm';
    if (dData.lv > 1) needConfirm = true;
    if (dData.q >= 4) needConfirm = true;
    if (mbgGame.player.checkItemInUse(sid)) {
      needConfirm = true;
      confirmKey = 'itemSellConfirm2';
    }
    if (needConfirm) {
      mbgGame.managerUi.createConfirmDialog(
        mbgGame.getString(confirmKey, {
          level: dData.lv || 1,
          itemName: mbgGame.getString(`itemname${dData.i}`),
        }),
        this.doSellItem.bind(this, sid),
      );
    } else {
      this.doSellItem(sid);
    }
  },
  doSellItem(sid) {
    mbgGame.netCtrl.sendMsg(
      'bag.sell',
      {
        sid,
      },
      (data) => {
        // mbgGame.log('sellItem', data);
        if (data.code === 'ok') {
          emitter.emit('closeWinItemInfo');
          mbgGame.managerUi.floatUnitMessage('coins', data.price);
        }
      },
    );
  },
  doSellItems(sidList) {
    mbgGame.netCtrl.sendMsg(
      'bag.sell',
      {
        sidList,
      },
      (data) => {
        // mbgGame.log('sellItems', data);
        if (data.code === 'ok') {
          mbgGame.managerUi.floatUnitMessage('coins', data.price);
        }
      },
    );
  },
  updateBagDict(bag) {
    this.itemData.bag = bag;
  },
  updateItemData(sid, dData) {
    this.itemData.own[sid] = dData;
    emitter.emit('itemChange', sid);
  },
  getItemData(sid) {
    return this.itemData.own[sid];
  },
  hasEnchant(sidOrData) {
    const dData = this.getSidOrData(sidOrData);
    return dData && dData.e != null;
  },
  getEnchantID(sidOrData) {
    const dData = this.getSidOrData(sidOrData);
    return dData && dData.e;
  },
  getItemConfig(sidOrData) {
    const dData = this.getSidOrData(sidOrData);
    const dConfig = mbgGame.config[`item${dData.i}`];
    return dConfig;
  },
  getItemAttrConfig(sidOrData) {
    const s = this.getItemStarLv(sidOrData);
    const dStarAttr = mbgGame.config.itemattr[s];
    return dStarAttr;
  },
  isItemLocked(sid) {
    const dData = this.getItemData(sid);
    return dData.l;
  },
  isItemStaked(sid) {
    const dData = this.getItemData(sid);
    return dData.l2;
  },
  getItemLock(sid) {
    const dData = this.getItemData(sid);
    return dData.l;
  },
  isItemCantDestroy(sid) {
    const dData = this.getItemData(sid);
    if (dData.l2) return true;
    if (dData.l) return true;
    return false;
  },
  getItemRichName(itemID, q, s) {
    const itemname = mbgGame.getString(`itemname${itemID}`);
    return mbgGame.getString(`iname${q}`, {
      name: `【<img src="star${s}" />${itemname}】`,
    });
  },
  getItemRichNameBySid(sid) {
    const dData = this.getItemData(sid);
    const itemname = mbgGame.getString(`itemname${dData.i}`);
    return mbgGame.getString(`iname${dData.q}`, {
      name: `【<img src="star${dData.s}" />${itemname}】`,
    });
  },
  getItemUpgradePrice(sid) {
    const dData = this.getItemData(sid);
    const dStarAttr = this.getItemAttrConfig(sid);
    const costcoins = dStarAttr.costcoins;
    return costcoins[dData.lv - 1];
  },
  getItemRedeemPrice(sid) {
    const dStarAttr = mbgGame.player.getItemAttrConfig(sid);
    return dStarAttr.redeemPrice[this.getItemQ(sid) - 1];
  },
  getItemSellPrice(sid, ratio) {
    const dData = this.getItemData(sid);
    const dStarAttr = this.getItemAttrConfig(sid);
    let coins = dStarAttr.sellprice[dData.q - 1];
    coins += this.getItemAccumExp(sid) * (ratio || mbgGame.config.constTable.ItemSellPriceRatio) * 0.01;
    coins = Math.round(coins);
    return coins;
  },
  getItemAttrsArray(sidOrData) {
    if (_.isObject(sidOrData)) {
      return sidOrData.m;
    }
    const dItemData = this.getItemData(sidOrData);
    return dItemData.m || this.getItemConfig(sidOrData).fixedAttrs;
  },
  getItemMainAttrValsBySid(sidOrData) {
    if (_.isObject(sidOrData)) {
      return this.getItemMainAttrVals(sidOrData.i, sidOrData.s, sidOrData.lv);
    }
    const itemID = this.getItemID(sidOrData);
    const lv = this.getItemLv(sidOrData);
    const s = this.getItemStarLv(sidOrData);
    return this.getItemMainAttrVals(itemID, s, lv);
  },
  getItemMainAttrVals(itemID, s, lv) {
    lv = lv || 1;
    s = s || 1;
    const dConfig = mbgGame.config[`item${itemID}`];
    const dStarAttr = mbgGame.config.itemattr[s];
    const ratio = mbgGame.config.constTable.itemLvRatio[lv - 1];
    const arr = _.clone(dStarAttr[`main${dConfig.mainType}`]);
    for (let k = 0; k < 3; k++) {
      let a = arr[k];
      a += Math.ceil(a * ratio) * (lv - 1);
      arr[k] = a;
    }
    return arr;
  },
  getItemMainAttrType(itemID) {
    const dConfig = mbgGame.config[`item${itemID}`];
    if (dConfig.isVIPItem) {
      return 'Mul';
    }
    return 'Add';
  },
  getItemSubAttrByIdx(sidOrData, idx) {
    const m = this.getItemAttrsArray(sidOrData);
    const subAttrID = m[idx + 1] && m[idx + 1][0];
    const subAttr = subAttrID && defines.ID2Attr[subAttrID];
    return subAttr;
  },
  getItemSubAttrValByIdx(sidOrData, idx, lv) {
    const m = this.getItemAttrsArray(sidOrData);
    const sAttr = this.getItemSubAttrByIdx(sidOrData, idx);
    const initVal = m[idx + 1][1];
    const dStarAttr = this.getItemAttrConfig(sidOrData);
    const add = dStarAttr[`${sAttr}`][1];
    return initVal + this.getItemLvRank(sidOrData, lv) * add;
  },
  getItemAttrList(sidOrData) {
    // 获取物品各项属性总值
    const attrList = {};
    let value;
    // maxValue用于可以按最大属性值来排序
    attrList.maxValue = 0;
    for (let i = 0; i < 3; i++) {
      const mainAttrID = defines.MainAttrIDs[i];
      const mainAttr = defines.ID2Attr[mainAttrID];
      const arr = this.getItemMainAttrValsBySid(sidOrData);
      attrList[mainAttr] = (arr && arr[i]) || 0;
      if (attrList[mainAttr] > attrList.maxValue) {
        attrList.maxValue = attrList[mainAttr];
      }
    }
    const m = this.getItemAttrsArray(sidOrData);
    for (let idx = 0; idx < 2; idx++) {
      const subAttrID = m[idx + 1] && m[idx + 1][0];
      const subAttr = subAttrID && defines.ID2Attr[subAttrID];
      if (!subAttr) continue;
      value = this.getItemSubAttrValByIdx(sidOrData, idx);
      if (attrList[subAttr]) {
        attrList[subAttr] += value;
      } else {
        attrList[subAttr] = value;
      }
      if (attrList[subAttr] > attrList.maxValue) {
        attrList.maxValue = attrList[subAttr];
      }
    }
    return attrList;
  },
  getSidOrData(sidOrData) {
    return _.isObject(sidOrData) ? sidOrData : this.getItemData(sidOrData);
  },
  // 道具当前等级
  getItemLv(sidOrData) {
    const dData = this.getSidOrData(sidOrData);
    return (dData && dData.lv) || 1;
  },
  getItemMaxLv(sidOrData) {
    const q = this.getItemQ(sidOrData);
    const maxLv = mbgGame.config.constTable.itemMaxLv[q];
    return maxLv;
  },
  // 道具当前经验
  getItemExp(sidOrData) {
    const dData = this.getSidOrData(sidOrData);
    return (dData && dData.ep) || 0;
  },
  // lv 升到 lv + 1 需要消耗多少经验
  getItemUpgradeCostExp(sidOrData, lv) {
    const dItemAttrConfig = this.getItemAttrConfig(sidOrData);
    lv = lv || this.getItemLv(sidOrData);
    return dItemAttrConfig.costExp[lv - 1];
  },
  getItemSmeltCostCoins(sidOrData) {
    const dItemAttrConfig = this.getItemAttrConfig(sidOrData);
    const q = this.getItemQ(sidOrData);
    return dItemAttrConfig.smeltCost[q - 1];
  },
  getItemEffectVal(sidOrData) {
    const dConfig = this.getItemConfig(sidOrData);
    if (!dConfig) {
      return 0;
    }
    const lv = this.getItemLv(sidOrData);
    const effectparam = dConfig.effectparam;
    if (!effectparam) {
      return null;
    }
    const lvrank = Math.floor(lv / 4);

    /*
    0 1 2 3 4 5 6 7    17 18 19 20
    0 0 0 0 1 1 1 1    4  4  4  5
    */
    const val = effectparam[lvrank];
    return Math.ceil(val);
  },
  getItemSmeltGainExp(sidOrData, upgradingItemID) {
    const dItemAttrConfig = this.getItemAttrConfig(sidOrData);
    const q = this.getItemQ(sidOrData);
    let exp = dItemAttrConfig.smeltExp[q - 1]; // 基本经验
    const dConfig = this.getItemConfig(sidOrData);
    if (dConfig.effect === 'exp') {
      exp = Math.round(exp * this.getItemEffectVal(sidOrData) * 0.01);
    }
    if (this.getItemID(sidOrData) === upgradingItemID) {
      exp = Math.round(exp * 2);
    }
    exp += this.getItemExp(sidOrData); // 当前经验
    exp += this.getItemAccumExp(sidOrData);
    return exp;
  },
  // 道具累计经验
  getItemAccumExp(sidOrData) {
    const dItemAttrConfig = this.getItemAttrConfig(sidOrData);
    let exp = 0;
    const curLv = this.getItemLv(sidOrData);
    for (let lv = 1; lv < curLv; lv++) {
      exp += dItemAttrConfig.costExp[lv - 1];
    }
    return Math.round(exp * mbgGame.config.constTable.ItemSmeltRatio * 0.01);
  },
  // 道具当前星级
  getItemStarLv(sidOrData) {
    const dData = this.getSidOrData(sidOrData);
    return (dData && dData.s) || 1;
  },
  // 当前等级对应的段位 0 - 4
  getItemLvRank(sidOrData, lv) {
    lv = lv || this.getItemLv(sidOrData);
    return Math.floor(lv / 4);
  },
  // 当前星级对应的段位 0 - 4
  getItemStarLvRank(sidOrData) {
    const s = this.getSidOrData(sidOrData);
    return defines.getStarRank(s);
  },
  // 当前星级，显示的星星数量
  getItemStarLvNum(sidOrData) {
    const s = this.getSidOrData(sidOrData);
    return defines.getStarNum(s);
  },
  // 道具品质
  getItemQ(sidOrData) {
    const dData = this.getSidOrData(sidOrData);
    return (dData && dData.q) || 1;
  },
  // 是否拥有道具
  hasItem(sid) {
    return this.itemData && this.itemData.own[sid] != null;
  },
  getItemID(sidOrData) {
    const dData = this.getSidOrData(sidOrData);
    return dData && dData.i;
  },
  getItemWorldFrom(sid, itemID) {
    const dItemConfig = mbgGame.config[`item${itemID || this.getItemID(sid)}`];
    const worldName = mbgGame.getString(`title_world${dItemConfig.worldIdx}`);
    return `产地：${worldName}`;
  },
  setWorldData(dData) {
    this.worldData = dData;
  },
  updateWorldData(worldIdx, dData) {
    if (!this.worldData) {
      this.worldData = {};
    }
    this.worldData[worldIdx] = dData;
  },
  getWorldData() {
    return this.worldData;
  },
  getWorldDataByIdx(worldIdx) {
    if (!this.worldData) return null;
    return this.worldData[worldIdx];
  },
  hasWorldWeakEffect(worldIdx) {
    const dData = this.getWorldDataByIdx(worldIdx);
    if (!dData) return false;
    if (dData.dietime) {
      if (dData.revivetime) return true;
      return false;
    }
    return false;
  },
  // 客户端伪解锁世界
  unlockWorld(worldIdx) {
    if (!this.worldData) {
      this.worldData = {};
    }
    if (!this.worldData[worldIdx]) {
      this.worldData[worldIdx] = {
        maxlv: 1,
        lv: 1,
        fought: 0,
      };
      emitter.emit('worlddata', worldIdx);
    }
  },
  // 世界是否解锁
  isWorldUnlocked(worldIdx) {
    const dData = this.getWorldDataByIdx(worldIdx);
    return dData != null;
  },
  getCurWorldBossSpine(worldIdx) {
    const dData = this.getWorldDataByIdx(worldIdx);
    return dData.bossspine;
  },
  getCharaName(charaID) {
    if (charaID <= 15) {
      return mbgGame.getString(`charaname${charaID}`);
    } else {
      return mbgGame.getString(`mname${charaID}`);
    }
  },
  getAvgLv() {
    return this.m_Attr.avglv || 1;
  },
  getWheelWarDayData() {
    return mbgGame.timeVar.wheel && mbgGame.timeVar.wheel.d;
  },
  getWheelWarCurRound() {
    const dData = this.getWheelWarDayData();
    if (!dData) {
      return 0;
    }
    return Math.min(14, dData.r);
  },
  getWheelWarStageIdx() {
    const dData = this.getWheelWarDayData();
    if (!dData) {
      return 0;
    }
    return dData.stages[dData.r || 0] || dData.stages[dData.r - 1]; // ||后面的是为了兼容最后一关过了后还能看到最后一关的数据
  },
  getDayWarTypeIdx(type) {
    let typeIdx = 0;
    if (type === 'coinwar') {
      typeIdx = 1;
    } else if (type === 'matwar') {
      typeIdx = 7;
    } else if (type === 'wheelwar') {
      typeIdx = 8;
    } else if (type.startsWith('herowar')) {
      typeIdx = +type.substr(-1); // 2 - 6
      assert(typeIdx >= 2 && typeIdx <= 6);
    }
    return typeIdx;
  },
  getCurDayWarStageIdx(type) {
    const typeIdx = this.getDayWarTypeIdx(type);
    let idx;
    if (type === 'wheelwar') {
      idx = this.getWheelWarStageIdx();
    } else {
      idx = this.getAvgLv();
    }
    return +`${typeIdx}${mbgGame.pad2(idx, 3)}`;
  },
  getDayWarTypeByStageIdx(stageIdx) {
    const typeIdx = +`${stageIdx}`[0];
    if (typeIdx === 1) {
      return 'coinwar';
    }
    if (typeIdx === 7) {
      return 'matwar';
    }
    if (typeIdx === 8) {
      return 'wheelwar';
    }
    return `herowar${typeIdx}`;
  },
  getAnalytiscStageTag(worldIdx, stageIdx) {
    const stageTag = `${worldIdx}_${stageIdx || 0}`;
    mbgGame.log('stageTag', stageTag);
    return stageTag;
  },
  getStoryStageData(worldIdx, stageIdx) {
    const dWorld = this.getWorldDataByIdx(worldIdx);
    const dStageData = (dWorld && dWorld.d) || {};
    const lstData = dStageData[stageIdx] || [0, 0];
    return lstData;
  },
  getStoryStageProgress(worldIdx, stageIdx) {
    const lstData = mbgGame.player.getStoryStageData(worldIdx, stageIdx);
    return lstData[0];
  },
  canFightStoryStageBoss(worldIdx, stageIdx) {
    if (defines.StoryWorlds.indexOf(worldIdx) === -1) {
      return false;
    }
    const lstData = mbgGame.player.getStoryStageData(worldIdx, stageIdx);
    const stageID = defines.getStageID(worldIdx, stageIdx);
    const dStageConfig = mbgGame.config.allstageinfo[stageID];
    const w = dStageConfig.w || 2;
    return lstData[0] >= w;
  },
  getMaxChapterID(worldIdx) {
    const maxLv = mbgGame.player.getCurWorldMaxLv(worldIdx);
    const stageID = defines.getStageID(worldIdx, maxLv);
    let chapterID;
    for (let c = 1; c < 10000; c++) {
      const _chapterID = worldIdx * 1000 + c;
      const dChapter = mbgGame.config.chapter[_chapterID];
      if (!dChapter) break;
      chapterID = _chapterID;
      if (dChapter.stageID.indexOf(stageID) !== -1) break;
    }
    return chapterID;
  },
  getStoryStageStarCount(chapterID, worldIdx) {
    const dChapterData = mbgGame.config.chapter[chapterID];
    if (!dChapterData) return 0;
    let starCount = 0;
    // 计算总星数够不够领取该奖励
    for (let i = 0; i < dChapterData.stageID.length; i++) {
      const stageID = dChapterData.stageID[i];
      const stageIdx = stageID % 1000;
      const lstData = this.getStoryStageData(worldIdx, stageIdx);
      const star = lstData[1];
      if (star > 0) {
        starCount += star;
      }
    }
    return starCount;
  },
  checkTeach() {
    if (this.isShowingPlot()) {
      return;
    }
    if (mbgGame.winUnlock) {
      return;
    }
    let dData = mbgGame.player.getLocalItem('showteach');
    if (dData) dData = JSON.parse(dData);
    mbgGame.log('checkTeach', dData);
    if (!dData) return;
    for (const type in dData) {
      if (dData[type] === 1) {
        if (type === 'equip' && !mbgGame.schemeTeamEditor) continue;
        if (type === 'smelt' && !mbgGame.schemeTeamEditor) continue;
        if (type === 'wakeup' && !mbgGame.sceneMenu.curPageIdx() === mbgGame.PageStory) continue;
        if (type === 'talent') continue;
        mbgGame.managerUi.teach.showTeach(type);
        break;
      }
    }
  },
  checkNewbiePlot(cb) {
    if (mbgGame.channel_id === 'test') {
      if (cc.sys.localStorage.getItem('noNewbie')) {
        return null;
      }
    }
    let idx = null;
    for (let i = 1; i <= 7; i++) {
      if (this.hasUnlockPlot(i)) {
        idx = i;
        break;
      }
    }
    if (!idx) {
      return null;
    }
    mbgGame.log('checkNewbiePlot', idx);
    if (idx >= 1 && idx <= 2) {
      mbgGame.warMgr.tryBeginWar(() => {
        mbgGame.netCtrl.sendMsg('story.beginWar', {
          param: {
            worldIdx: 5,
            stageIdx: idx,
          },
        });
      });
      return 'war';
    }
    this.showLabPlot(idx, cb);
    return 'lab';
  },
  showLabPlot(idx, cb) {
    const plotID = idx;
    mbgGame.log('[showLabPlot]', plotID);
    mbgGame.netCtrl.sendMsg(
      'story.getplot',
      {
        plotID,
      },
      (data) => {
        mbgGame.log('[showLabPlot]', data);
        if (data.code === 'ok') {
          data.data.plotMode = 'labHall';
          mbgGame.sceneMenu.showPanel('panelLab');
          mbgGame.panelLab.scrollToFloorByType(labdefines.FloorType.Hall, 0, () => {
            if (cb) cb();
            mbgGame.panelLab.plotCtrl.beginPlot(data.data, plotID);
            mbgGame.panelLab.plotCtrl.setEndCB(this.onLabPlotEnd.bind(this, plotID));
          });
        }
      },
    );
  },
  onLabPlotEnd(plotID) {
    this.finishPlot(plotID);
    if (plotID === 3) {
      mbgGame.managerUi.teach.showTeach('story');
    } else if (plotID === 4) {
      mbgGame.managerUi.teach.showTeach('chara');
    } else if (plotID === 5) {
      mbgGame.managerUi.teach.showTeach('item');
    } else if (plotID === 7) {
      mbgGame.managerUi.teach.showTeach('talent');
    }
  },
  loadCPMData() {
    let dData = cc.sys.localStorage.getItem('cpm');
    if (!dData) {
      dData = {};
    } else {
      dData = JSON.parse(dData);
    }
    this.m_CPMData = dData;
  },
  saveCPMData() {
    if (!this.m_CPMData) {
      return;
    }
    cc.sys.localStorage.setItem('cpm', JSON.stringify(this.m_CPMData));
  },
  setCPM(worldIdx, stageIdx, cpm) {
    if (!this.m_CPMData) {
      this.loadCPMData();
    }
    if (!this.m_CPMData) {
      this.m_CPMData = {};
    }
    if (!this.m_CPMData[worldIdx]) {
      this.m_CPMData[worldIdx] = {};
    }
    this.m_CPMData[worldIdx][stageIdx] = cpm;
  },
  getCPM(worldIdx, stageIdx) {
    if (!this.m_CPMData) {
      this.loadCPMData();
    }
    return (this.m_CPMData[worldIdx] && this.m_CPMData[worldIdx][stageIdx]) || 0;
  },
  getStageName(worldIdx) {
    const stageID = this.getCurStageID(worldIdx);
    return mbgGame.getString(`stagename${stageID}`);
  },
  getCurStageID(worldIdx) {
    const stageIdx = this.getCurWorldLv(worldIdx);
    return defines.getStageID(worldIdx, stageIdx);
  },
  // 当前已经推到哪一关，如主线，初始1，最大值76
  getCurWorldMaxLv(worldIdx) {
    const dData = this.getWorldDataByIdx(worldIdx);
    if (!dData) return 1;
    if (!dData.maxlv) {
      dData.maxlv = dData.lv;
    }
    return dData.maxlv;
  },
  // 当前所在关卡ID，返回：1->999
  getCurWorldLv(worldIdx) {
    const dData = this.getWorldDataByIdx(worldIdx);
    if (!dData) return 1;
    return dData.lv || 1;
  },
  // 当前关卡打到第几轮小怪 返回：0->10
  getCurWorldSubLv(worldIdx) {
    const dStageConfig = mbgGame.config.allstageinfo[this.getCurStageID(worldIdx)];
    const dData = this.getWorldDataByIdx(worldIdx);
    if (!dData) return 0;
    const sublv = Math.min(dStageConfig.KN, dData.fought);
    return sublv;
  },
  setWheelWarData(dData) {
    this.m_WheelWarData = dData;
  },
  getWheelWarData() {
    return this.m_WheelWarData;
  },
  // 暂时没用到
  setStoryData(dData) {
    this.m_StoryData = dData;
  },
  setStorySchemeData(worldIdx, schemeIdx, dScheme) {
    const dWorld = this.getWorldDataByIdx(worldIdx);
    if (!dWorld.scheme) {
      dWorld.scheme = {};
    }
    dWorld.scheme[schemeIdx] = dScheme;
  },
  getStorySchemeData(worldIdx) {
    const dWorld = this.getWorldDataByIdx(worldIdx);
    if (!dWorld || !dWorld.scheme) {
      return {};
    }
    const dScheme = dWorld.scheme[0] || {};
    if (worldIdx >= 1 && worldIdx <= 3) {
      const requiredCharaIDs = _.filter(defines.CharaIDsByStoryWorld[worldIdx], (_charaID) => {
        return this.hasChara(_charaID);
      });
      dScheme.charaIDs = requiredCharaIDs;
    }
    return dScheme;
  },
  setPVPFlag(idx2flag) {
    this.m_Idx2Flag = idx2flag;
  },
  getPVPFlag() {
    return this.m_Idx2Flag;
  },
  setPVPData(dData) {
    this.pvpData = dData;
  },
  // 当前PVP积分
  getPVPScore() {
    return (this.pvpData && this.pvpData.score) || 0;
  },
  // 当前PVP排名
  getPVPRank() {
    return (this.pvpData && this.pvpData.rank) || 0;
  },
  getPVPGradeChangeInfo() {
    return this.pvpData && this.pvpData.ginfo;
  },
  getPVPChestInfo() {
    return (this.pvpData && this.pvpData.chest) || {};
  },
  // 当前PVP段位
  getPVPGrade() {
    return (this.pvpData && this.pvpData.grade) || 1;
  },
  // 历史最高PVP积分
  getPVPMaxScore() {
    return (this.pvpData && this.pvpData.maxscore) || 0;
  },
  // 历史最高PVP排名
  getPVPMaxRank() {
    return (this.pvpData && this.pvpData.maxrank) || 0;
  },

  // 当前进攻阵型
  getPVPAtkCharaIDs() {
    return (this.pvpData && this.pvpData.atkTeam) || [1];
  },
  // 当前防御阵型编号
  getPVPDefSchemeIdx() {
    const idx = (this.pvpData && this.pvpData.defSch) || 0;
    return idx;
  },
  setPVPDefSchemeIdx(idx) {
    this.pvpData.defSch = idx;
  },
  getPVPDefCharaIDs() {
    return this.getPVPScheme_CharaIDs(this.getPVPDefSchemeIdx());
  },
  getFriendWarSchemeIdx() {
    const idx = (this.pvpData && this.pvpData.frdSch) || 0;
    return idx;
  },
  // 阵型的 角色列表
  // idx = 0, 1, 2
  getPVPScheme_CharaIDs(idx) {
    const dData = this.getPVPSchemeData(idx);
    const charaIDs = dData && dData.charaIDs;
    mbgGame.log('getPVPScheme_CharaIDs', idx, charaIDs);
    return charaIDs || [];
  },
  // 阵型的 物品列表
  // idx = 0, 1, 2
  getPVPScheme_ItemIDs(idx) {
    const dData = this.getPVPSchemeData(idx);
    const bag = dData && dData.bag;
    const charaIDs = dData && dData.charaIDs;
    const itemIDs = [];
    if (charaIDs && bag) {
      for (let i = 0; i < charaIDs.length; i++) {
        const _itemIDs = bag[i] || [];
        itemIDs.push(_itemIDs[0] || 0);
      }
    }
    mbgGame.log('getPVPScheme_ItemIDs', idx, itemIDs);
    return itemIDs;
  },
  // 计算平均耗水
  // charaIDs 角色列表
  getPVPScheme_EnergyMeanCost(charaIDs) {
    if (_.isEmpty(charaIDs)) return 0;
    let cost = 0;
    let count = 0;
    for (let i = 0; i < charaIDs.length; i++) {
      const charaID = charaIDs[i];
      if (!charaID) {
        continue;
      }
      count += 1;
      cost += this.getSkillCostEnergy(charaID);
    }
    if (count <= 0) {
      return 0;
    }
    return Math.round(cost / count);
  },
  // 阵型的数据
  getPVPSchemeData(schemeIdx) {
    if (!this.pvpData) return {};
    const dAllScheme = this.pvpData.scheme;
    if (schemeIdx == null) return dAllScheme;
    return (dAllScheme && dAllScheme[schemeIdx]) || {};
  },
  // 更新阵型的数据
  setPVPSchemeData(schemeIdx, dData) {
    const dAllScheme = this.pvpData.scheme;
    dAllScheme[schemeIdx] = dData;
  },
  getcharaData() {
    return this.charaData;
  },
  // 返回该已解锁的角色ID列表，有顺序，未解锁的角色ID为0
  getOwnedCharaIDs() {
    const charaIDs = [];
    for (let charaID = 1; charaID <= 15; charaID++) {
      if (this.hasChara(charaID)) {
        charaIDs.push(charaID);
      }
    }
    return charaIDs;
  },
  updateCharaDatas(dData) {
    this.charaDataRaw = {};
    this.charaData = this.charaData || {};
    for (let charaID = 1; charaID <= 15; charaID += 1) {
      this.updateCharaData(charaID, dData[charaID], true);
    }
  },
  afterUpdateCharaData(charaID) {
    const dChara = this.charaData[charaID];
    if (!dChara) {
      return;
    }

    for (let i = 0; i < defines.FIRST_ATTR.length; i++) {
      const sAttr = defines.FIRST_ATTR[i];
      const attrID = defines.Attr2ID[sAttr];
      dChara[sAttr] = dChara[attrID];
      dChara.base[sAttr] = dChara.base[attrID];
    }
  },
  updateCharaData(charaID, dData, isAll) {
    this.charaDataRaw[charaID] = mbgGame.deepClone(dData);
    this.last_charaData = this.last_charaData || {};
    if (!dData) {
      // 缺省
      dData = {
        lv: 1,
        skill: {},
        locked: true,
      };
      dData.skill[w_defines.getCharaActiveSkillID(charaID)] = {
        lv: 1,
        s: 0,
      };
      dData.skill[w_defines.getCharaPassiveSkillID(charaID)] = {
        lv: 1,
        s: 0,
      };
    }

    dData = this.getCharaDataForClientByID(charaID, dData);
    if (this.last_charaData[charaID]) {
      const logData = {};
      if (this.last_charaData[charaID].lv !== dData.lv) {
        // 登记有改变,应该是升级了
        logData[this.getCharaName(charaID) + charaID] = dData.lv;
      }
      if (dData.skill) {
        _.mapKeys(this.last_charaData[charaID].skill, (v, k) => {
          if (v.lv !== dData.skill[k].lv) {
            // 统计技能登记
            logData[mbgGame.getString(`skillname${k}`)] = dData.skill[k].lv;
          }
        });
      }
    }
    if (!this.last_charaData[charaID] && dData[charaID]) {
      mbgGame.sceneMenu.setRedtips(mbgGame.PageChara, true);
    }
    if (!this.charaData) {
      this.charaData = {};
    }
    // 保留上一次数据,目的在于比较记录有用的数据
    this.last_charaData[charaID] = this.charaData[charaID];
    this.charaData[charaID] = dData;
    this.afterUpdateCharaData(charaID);
    if (!isAll) {
      emitter.emit('updateCharaData', charaID);
    }
  },
  getMaxStarLvByHero() {
    const avglv = this.getAvgLv();
    const dHeroup = mbgGame.config[`heroup${avglv}`];
    return dHeroup.maxStarLv;
  },
  getWorldIdxByCharaID(charaID) {
    return Math.ceil(charaID / 5);
  },
  getCharaDataByID(charaID) {
    return this.charaData && this.charaData[charaID];
  },
  getCharaExp(charaID) {
    return (this.charaData && this.charaData[charaID] && this.charaData[charaID].exp) || 0;
  },
  getUpgradeCharaCost(charaID, lv) {
    lv = lv || this.getCharaLv(charaID) || 1;
    const dHeroup = mbgGame.config[`heroup${lv}`];
    if (!dHeroup) {
      return 0;
    }
    return dHeroup.costExp || 0;
  },
  getAtkTypeByID(charaID) {
    const dData = this.getCharaDataByID(charaID);
    return dData && dData.AtkType;
  },
  getReviveCost(charaID) {
    const dData = this.charaData[charaID];
    if (!dData) return 0;
    return dData.reviveCost;
  },
  getUnlockingCharaID() {
    return mbgGame.player.cIDing && mbgGame.player.cIDing.c;
  },
  getUnlockingCharaStartTime() {
    return mbgGame.player.cIDing && mbgGame.player.cIDing.t;
  },
  getUnlockingCharaDuration() {
    const charaID = this.getUnlockingCharaID();
    let ownCount = 0;
    for (let c = 6; c <= 15; c++) {
      if (c !== charaID && this.hasChara(c)) ownCount += 1;
    }
    const needhour = mbgGame.config.constTable.UnlockHours[ownCount];
    return Math.round(needhour * 3600);
  },
  getUnlockCharaLefttime() {
    const duration = this.getUnlockingCharaDuration();
    const lefttime = this.getUnlockingCharaStartTime() + duration - moment().unix();
    return lefttime;
  },
  getFastUnlockCharaDiamond() {
    const lefttime = this.getUnlockCharaLefttime();
    if (lefttime <= 0) {
      return 0;
    }
    const diamonds = Math.round((lefttime / 3600) * mbgGame.config.constTable.FastUnlockRatio);
    return diamonds;
  },
  hasChara(charaID) {
    if (!this.charaData) return false;
    const dData = this.charaData[charaID];
    return !dData.locked;
  },
  // 自己拥有的所有的英雄的ID列表
  getMyCharaIDs() {
    if (!this.charaData) return [];
    let charaIDs = _.map(_.keys(this.charaData), (charaID) => {
      return parseInt(charaID);
    });
    charaIDs = _.filter(charaIDs, (charaID) => {
      return !this.charaData[charaID].locked;
    });
    return charaIDs;
  },
  getOrCreateTmpChara(charaID) {
    if (!this.m_TmpUnitDict) {
      this.m_TmpUnitDict = {};
    }
    if (this.m_TmpUnitDict[charaID]) {
      return this.m_TmpUnitDict[charaID];
    }
    const isTmp = true;
    const tmpUnit = new CUnit(isTmp);
    this.m_TmpUnitDict[charaID] = tmpUnit;
    return tmpUnit;
  },
  updateTmpChara(charaID, dCharaData) {
    const tmpUnit = this.getOrCreateTmpChara(charaID);
    const dData = dCharaData;
    dData.ID = charaID;
    dData.type = 0;
    dData.posIdx = 0;
    tmpUnit.m_Data = dData;
    tmpUnit.initAsTmpUnit(dData);
  },
  getCharaDataForClientByID(charaID, dCharaData) {
    this.updateTmpChara(charaID, dCharaData);
    const tmpUnit = this.getOrCreateTmpChara(charaID);
    const dChara = tmpUnit.packInfo('forclient');
    dChara.tlv = dCharaData.tlv;
    dChara.exp = dCharaData.exp || this.getCharaExp(charaID);
    dChara.upCost = this.getUpgradeCharaCost(charaID, dCharaData.lv);
    dChara.ta = dCharaData.ta;
    dChara.locked = dCharaData.locked;
    return dChara;
  },
  isCharaDead(charaID) {
    const dData = this.charaData && this.charaData[charaID];
    if (!dData) return false;
    if (dData.dietime) return true;
    return false;
  },
  getCharaLv(charaID) {
    const dData = this.charaData && this.charaData[charaID];
    if (!dData) return 0;
    return dData.lv;
  },
  getCharaTrainingLvDict(charaID) {
    const dCharaData = this.getCharaDataByID(charaID);
    if (!dCharaData) {
      return {};
    }
    if (!dCharaData.tlv) {
      dCharaData.tlv = {};
    }
    return dCharaData.tlv;
  },
  getCharaCurTrainingLv(charaID, attr) {
    if (typeof attr === 'string') {
      attr = defines.Attr2ID[attr];
    }
    const tlv = this.getCharaTrainingLvDict(charaID);
    return tlv[attr] || 0;
  },
  getCharaDieTime(charaID) {
    const dData = this.charaData[charaID];
    if (!dData) return 0;
    return dData.dietime;
  },
  getCharaReviveTime(charaID) {
    const dData = this.charaData[charaID];
    if (!dData) return 0;
    return dData.revivetime;
  },
  getSkillDataByID(charaID, iSkillID) {
    if (!this.charaData) return null;
    const dData = this.charaData[charaID];
    if (!dData) return null;
    const skillData = dData.skill;
    if (!skillData) return null;
    return skillData[iSkillID];
  },
  getActiveSkillID(charaID) {
    const dWarData = mbgGame.config[`hero${charaID}`];
    return dWarData.a_skill;
  },
  getPassiveSkillID(charaID) {
    const dWarData = mbgGame.config[`hero${charaID}`];
    return dWarData.b_skill;
  },
  // CD时间 单位秒
  getSkillCDTime(charaID) {
    const dData = this.getSkillDataByID(charaID, this.getActiveSkillID(charaID));
    if (!dData) return -1;
    return dData.cd;
  },
  getSkillCostEnergy(charaID) {
    const cd = this.getSkillCDTime(charaID);
    return Math.floor(cd);
  },
  getSkillDurationTime(charaID) {
    const dData = this.getSkillDataByID(charaID, this.getActiveSkillID(charaID));
    if (!dData) return 0;
    const iLastUseTime = dData.t;
    if (!iLastUseTime) return 0;
    const iDurationTime = dData.duration;
    return iDurationTime;
  },
  getSkillLeftActivatingTime(charaID) {
    const dData = this.getSkillDataByID(charaID, this.getActiveSkillID(charaID));
    if (!dData) return 0;
    const iLastUseTime = dData.t;
    if (!iLastUseTime) return 0;
    const iDurationTime = dData.duration;
    const now = mbgGame.netCtrl.getServerNowTime();
    const iEndTime = iLastUseTime + iDurationTime;
    if (iEndTime > now) {
      return iEndTime - now;
    }
    return 0;
  },
  getSkillRank(charaID, iSkillID) {
    const dData = this.getSkillDataByID(charaID, iSkillID);
    if (!dData) {
      return 0;
    }
    const rank = Math.floor(dData.lv / 20);
    return rank;
  },
  getSkillLv(charaID, iSkillID) {
    const dData = this.getSkillDataByID(charaID, iSkillID);
    return dData && dData.lv;
  },
  getSkillStar(charaID, iSkillID) {
    const dData = this.getSkillDataByID(charaID, iSkillID);
    return (dData && dData.s) || 0;
  },
  getSkillDesc(charaID, iSkillID, dSkillData) {
    dSkillData = dSkillData || this.getSkillDataByID(charaID, iSkillID);
    if (!dSkillData || !dSkillData.lv) return '';
    // mbgGame.log("getSkillDesc", charaID, "dSkillData", dSkillData.a);
    const desc = mbgGame.getString(`skilldesc${iSkillID}`, dSkillData);
    return desc;
  },
  getSkillDetail(charaID, iSkillID, dSkillData) {
    dSkillData = dSkillData || this.getSkillDataByID(charaID, iSkillID);
    if (!dSkillData || !dSkillData.lv) return '';
    const params = ['a', 'b', 'c', 'd'];
    const dParam = {};
    for (let i = 0; i < params.length; i++) {
      const p = params[i];
      if (dSkillData.base && dSkillData[p] !== dSkillData.base[p]) {
        dParam[p] = `${dSkillData.base[p]}<color=#99ff00>(+${dSkillData[p] - dSkillData.base[p]})</color>`;
      } else {
        dParam[p] = dSkillData[p];
      }
    }
    // mbgGame.log('getSkillDetail', dParam, dSkillData);
    const detail = mbgGame.getString(`skilldetail${iSkillID}`, dParam);
    return detail;
  },
  sendLogin() {
    const sendData = {
      uuid: mbgGame.state.uuid,
      channel_id: mbgGame.channel_id,
      lang: cc.sys.language,
      platform_id: 2, // 网页等版本
      version: mbgGame.version,
      coreVersion: mbgGame.coreVersion,
      phoneType: mbgGame.phoneType,
    };
    if (cc.sys.isNative) {
      if (mbgGame.isIOS()) {
        sendData.platform_id = 0;
        sendData.gc_id = mbgGame.ios.getGCPlayerID() || '';
      }
      if (mbgGame.isAndroid()) {
        sendData.platform_id = 1;
        sendData.device_id = mbgGame.getDeviceUUID();
      }
    }
    if (mbgGame.wechatCode) {
      sendData.wechatCode = mbgGame.wechatCode;
      if (mbgGame.wechatType) {
        sendData.wechatType = mbgGame.wechatType;
      }
      delete mbgGame.wechatCode;
    }
    if (mbgGame.isH5() && mbgGame._wxh5AuthKey) {
      const params = mbgGame.getUrlParams();
      if (params.token) {
        // 解密
        token = mbgGame.encryptDecrypt(mbgGame.base64Decode(params.token), mbgGame._wxh5AuthKey);
        if (token.startsWith('MBG.')) {
          sendData.wx_openid = token.substring('MBG.'.length);
        }
      }
      delete mbgGame._wxh5AuthKey;
    }
    if (mbgGame.loginCode) {
      sendData.loginCode = mbgGame.loginCode;
      delete mbgGame.loginCode;
    }
    if (mbgGame.wechatUnionid) {
      sendData.wechatCode = mbgGame.wechatUnionid;
      sendData.wechatType = 'wechatH5';
    }
    const wx_id = mbgGame.wxh5Id();
    if (wx_id && wx_id.openid) {
      sendData.wx_openid = wx_id.openid;
    }
    if (wx_id && wx_id.unionid) {
      sendData.wx_unionid = wx_id.unionid;
    }
    if (mbgGame.mobileNumber && mbgGame.mobileCode) {
      sendData.mobileNumber = mbgGame.mobileNumber;
      sendData.mobileCode = mbgGame.mobileCode;
    }
    if (mbgGame.platformData) {
      sendData.platformData = mbgGame.platformData;
    }
    if (cc.isDebug) {
      sendData.isDebug = 1;
    }
    // 发送geo信息
    /*
    const geo = mbgGame.getGeo();
    sendData.longitude = geo.longitude;
    sendData.latitude = geo.latitude;
    */

    mbgGame.log(`send player.login:${JSON.stringify(sendData)}`);
    mbgGame.netCtrl.sendMsg(
      'player.login',
      {
        data: sendData,
      },
      mbgGame.player.login.bind(this),
    );
  },
  login(data) {
    // 清除无缝重连标志
    delete mbgGame.seamlessReconnect;
    mbgGame.log(`login data:${JSON.stringify(data)}`);
    mbgGame.gameScene && mbgGame.gameScene.onConnect(true);
    /*
        if (data.code === 'needCode') {
          // 需要输入验证码才能继续游戏
          mbgGame.loading && mbgGame.loading.openEnterCode();
          return;
        }
    */

    // 第三方平台
    if (data.code === 'platformErr') {
      mbgGame.loading.confirmMsg(data.err, 'restart');
      return;
    }

    if (data.code === 'otherserver') {
      // 保存server_ip,下次登陆时连接
      if (data.server_ip) {
        cc.sys.localStorage.setItem('server', data.server_ip);
      }
      if (mbgGame.loading) {
        mbgGame.loading.scheduleOnce(mbgGame.reconnect.bind(mbgGame, 'otherserver_loading'), 5);
        return;
      }
      if (mbgGame.gameScene) {
        // 10秒后重连
        mbgGame.gameScene.scheduleOnce(mbgGame.reconnect.bind(mbgGame, 'otherserver_gameScene'), 5);
        return;
      }
      return;
    }

    if (data.code === 'waitforkick') {
      // 保存server_ip,下次登陆时连接
      // cc.sys.localStorage.setItem("server", data.server_ip);
      // 10秒后,断开当前连接,等待重连,并重启游戏
      // if (mbgGame.loading)
      //    mbgGame.loading.scheduleOnce(mbgGame.netCtrl.disconnect,10);
      // else
      if (mbgGame.loading) {
        mbgGame.loading.scheduleOnce(mbgGame.reconnect.bind(mbgGame, 'waitforkick_loading'), 5);
        return;
      }
      if (mbgGame.gameScene) {
        // 10秒后重连
        mbgGame.gameScene.scheduleOnce(mbgGame.reconnect.bind(mbgGame, 'waitforkick_gameScene'), 5);
        return;
      }
      return;
    }

    if (data.code === 'uuiderror') {
      // 账号已经被删除
      mbgGame.removeLocalData();
      mbgGame.restart();
      return;
    }

    if (data.code === 'block') {
      mbgGame.log('账号被封停');
      if (mbgGame.loading) {
        mbgGame.loading.setLoadBar(data.msg, 0);
        mbgGame.loading.confirmMsg(data.msg, 'exit');
        return;
      }
      mbgGame.managerUi && mbgGame.managerUi.createBoxSure(data.msg, 'exit');
      return;
    }

    if (data.code === 'outdate') {
      cc.sys.localStorage.setItem('outdate', '1');
      if (mbgGame.loading) {
        mbgGame.loading.setLoadBar(data.msg, 0);
        mbgGame.loading.confirmMsg(data.msg, 'exit');
        return;
      }
      mbgGame.managerUi && mbgGame.managerUi.createBoxSure(data.msg, 'exit');
      return;
    }

    if (data.code === 'newVer') {
      if (mbgGame.loading) {
        mbgGame.loading.setLoadBar(data.msg, 0);
        mbgGame.loading.confirmMsg(data.msg, 'link', data.link);
        return;
      }
      mbgGame.managerUi && mbgGame.managerUi.createBoxSure(data.msg, 'link', data.link);
      return;
    }

    if (data.code !== 'ok') {
      mbgGame.log(`login error: ${data}`);
      if (mbgGame.loading) {
        mbgGame.loading.setLoadBar(data.msg, 0);
        mbgGame.loading.confirmMsg(data.msg, 'restart');
        return;
      }
      mbgGame.managerUi && mbgGame.managerUi.createBoxSure(data.msg, 'restart');
      return;
    }

    if (data.hotVersion && mbgGame.hotVersion && +data.hotVersion > +mbgGame.hotVersion) {
      // 有新版本
      mbgGame.managerUi && mbgGame.managerUi.createBoxSure(mbgGame.getString('newVerInfo'), 'restart');
      return;
    }

    if (mbgGame.loading) mbgGame.loading.setLoadBar(data.msg, 50);

    if (data.uuid) {
      // 如果返回有uuid,保存起来
      mbgGame.setSaveUUID(data.uuid);
      mbgGame.state.token = data.token;

      if (mbgGame.loading) mbgGame.loading.refreshShortID();
    }
    mbgGame.netCtrl.autoSyncServerTime();
    if (data.nickName) {
      mbgGame.userInfo.nickname = data.nickName;
    }
    if (data.totem) {
      mbgGame.userInfo.totem = data.totem;
    }
    mbgGame.aat = data.aat || 0;
    emitter.emit('updateUserInfo');

    // 登录时发送设置信息,主要是要设置服务端的本地化
    mbgGame.netCtrl.sendMsg('player.setup', mbgGame.setup);

    mbgGame.serverid = data.serverid;

    const configMD5 = cc.sys.localStorage.getItem('configMD5');
    const i18nMD5 = cc.sys.localStorage.getItem('i18nMD5');
    // mbgGame.log('config md5', configMD5);
    // mbgGame.log('i18n md5', i18nMD5);
    // 先判断总的设置是否一致
    if (!mbgGame.config || !configMD5 || configMD5 !== data.config_md5) {
      mbgGame.waitForConfig = true;
      if (mbgGame.loading) {
        mbgGame.loading.setLoadBar(mbgGame.getString('get_config'), 15);
      }
      const sendData = {};
      try {
        let configMD5s = cc.sys.localStorage.getItem('configMD5s');
        if (configMD5s) {
          configMD5s = JSON.parse(configMD5s);
          sendData.md5s = configMD5s;
        }
      } catch (e) {
        delete sendData.md5s;
      }

      // 获取配置信息
      mbgGame.netCtrl.sendMsg('player.getconfig', sendData, (x) => {
        try {
          if (x.data) {
            mbgGame.config = x.data; // RJSON.unpack(x);
            // mbgGame.log('getconfig:',mbgGame.config);
          } else {
            // 差异化保存
            _.mapValues(x.datas, (dd) => {
              _.mapKeys(dd, (v, k) => {
                mbgGame.config[k] = v;
              });
            });
          }
          mbgGame.checkConfig();

          // mbgGame.performanceCheck("config", 'encryptDecrypt', true);
          // configStr = mbgGame.encryptDecrypt(configStr);
          // mbgGame.performanceCheck("config", 'encryptDecrypt2');
          // configStr = mbgGame.base64Encode(configStr);
          const configStr = JSON.stringify(mbgGame.config);
          cc.sys.localStorage.setItem('config', configStr);
          cc.sys.localStorage.setItem('configMD5', data.config_md5);
          cc.sys.localStorage.setItem('configMD5s', JSON.stringify(x.config_md5s));
        } catch (e) {
          mbgGame.log('getconfig error:', e);
          cc.sys.localStorage.removeItem('config');
          cc.sys.localStorage.removeItem('configMD5');
          cc.sys.localStorage.removeItem('configMD5s');
          mbgGame.restart();
          return;
        }

        delete mbgGame.waitForConfig;
        // mbgGame.log('config load ok');
        if (!mbgGame.waitForI18n) {
          mbgGame.player.enterGame(data.msg);
        }
      });
    }

    if (!mbgGame.polyglot || !i18nMD5 || i18nMD5 !== data.i18n_md5) {
      mbgGame.waitForI18n = true;
      if (mbgGame.loading) {
        mbgGame.loading.setLoadBar(mbgGame.getString('get_i18n'), 15);
      }

      const sendData = {};
      try {
        let i18nMD5s = cc.sys.localStorage.getItem('i18nMD5s');
        if (i18nMD5s) {
          i18nMD5s = JSON.parse(i18nMD5s);
          sendData.md5s = i18nMD5s;
        }
      } catch (e) {
        delete sendData.md5s;
      }

      // 获取文字信息
      mbgGame.netCtrl.sendMsg('player.geti18n', sendData, (x) => {
        // mbgGame.log('geti18n length', JSON.stringify(x).length);
        mbgGame.avoid_lang = x.avoid_lang;
        try {
          if (x.data) {
            mbgGame.i18n = x.data; // RJSON.unpack(x);
            // mbgGame.log('getconfig:',mbgGame.config);
          } else {
            // 差异化保存
            _.mapValues(x.datas, (dd) => {
              _.mapKeys(dd, (v, k) => {
                mbgGame.i18n[k] = v;
              });
            });
          }

          // mbgGame.performanceCheck("config", 'encryptDecrypt', true);
          // configStr = mbgGame.encryptDecrypt(configStr);
          // mbgGame.performanceCheck("config", 'encryptDecrypt2');
          // configStr = mbgGame.base64Encode(configStr);
          const i18nStr = JSON.stringify(mbgGame.i18n);
          cc.sys.localStorage.setItem('i18n', i18nStr);
          cc.sys.localStorage.setItem('i18nMD5', data.i18n_md5);
          cc.sys.localStorage.setItem('i18nMD5s', JSON.stringify(x.i18n_md5s));
        } catch (e) {
          cc.sys.localStorage.removeItem('i18n');
          cc.sys.localStorage.removeItem('i18nMD5');
          cc.sys.localStorage.removeItem('i18nMD5s');
          mbgGame.restart();
          return;
        }

        if (mbgGame.avoid_lang && !mbgGame.avoid_lang[mbgGame.setup.lang]) {
          mbgGame.setup.lang = 'zh';
        } // 如果设置了未开放的语言,默认是中文

        mbgGame.i18n2Polyglot();

        // 第一次条用getString会删除i18n
        delete mbgGame.waitForI18n;

        // mbgGame.log('i18n load ok');
        if (!mbgGame.waitForConfig) {
          mbgGame.player.enterGame(data.msg);
        }
      });
    }

    if (mbgGame.waitForConfig || mbgGame.waitForI18n) {
      return;
    }
    // 配置已经是最新的,不需要获取,可以进入游戏
    mbgGame.player.enterGame(data.msg);
  },
  enterGame(msg) {
    // 防沉迷
    if (cc.sys.isNative) {
      mbgGame.antiAddictionSetup();
      const userid = `tc_${mbgGame.state.uuid}_${mbgGame.channel_id}`
      mbgGame.antiAddictionLogin({ userid, type: mbgGame.aat || 0 });
    }

    if (mbgGame.loading) {
      mbgGame.loading.loadSuccess(msg);
    } else if (mbgGame.gameScene) {
      mbgGame.gameScene.enterGame();
    }

    // 开始初始化内购数据，这里已经保证了有最新的配置文件
    if (cc.sys.isNative) {
      // 广告
      mbgGame.advertisement.init();

      if (mbgGame.isIOS()) {
        // 这里才登录gamecenter，保证登录成功后能往gameserver发gc_id
        mbgGame.ios.GCLogin();
      }
      // mbgGame.analytisc.testMe();
    }
  },
  makeLocalPush() {
    this.makeBattleChestPush();
    this.makeFacPush();
  },
  // 随便打打的宝箱推送
  makeBattleChestPush() {
    if (!this.isUnlockingBattleChest()) {
      mbgGame.localPush(0, mbgGame.getString('push_battlechest'));
      return;
    }
    const lefttime = this.getBattleChestLefttime(this.getUnlockingBattleChestID());
    //  mbgGame.log('makeBattleChestPush', lefttime);
    if (lefttime <= 0) {
      mbgGame.localPush(0, mbgGame.getString('push_battlechest'));
      return;
    }
    mbgGame.localPush(lefttime, mbgGame.getString('push_battlechest'));
  },
  // 研究所设施推送
  makeFacPush() {
    const facIDs = labdefines.GymFacIDs.concat(labdefines.ReadFacIDs).concat(labdefines.CollectorFacIDs);
    for (let i = 0; i < facIDs.length; i++) {
      const facID = facIDs[i];
      if (!this.isFacHasChara(facID)) {
        continue;
      }
      const dData = this.getFacDataByFacID(facID);
      const charaID = dData.c && dData.c[0];
      if (!charaID) {
        continue;
      }
      const lefttime = this.getFacLeftWorkTime(facID);
      if (lefttime <= 0) {
        continue;
      }
      mbgGame.localPush(lefttime, this.getFacFinishPushMsg(charaID, facID));
    }
  },
  getFacFinishPushMsg(charaID, facID) {
    const facType = this.getFacType(facID);
    let pushKey;
    if (facType === labdefines.FacType.Gym) {
      pushKey = 'push_facgymdone';
    } else if (facType === labdefines.FacType.Read) {
      pushKey = 'push_facreaddone';
    } else {
      pushKey = 'push_factaskdone';
    }
    return mbgGame.getString(pushKey, {
      c: this.getCharaName(charaID),
    });
  },
  removeFacFinishPush(charaID, facID) {
    mbgGame.localPush(0, this.getFacFinishPushMsg(charaID, facID));
  },
  cacheMsg(data) {
    // 缓存收到的信息
    const channel = data.c;
    // 没channel的丢弃
    if (!channel || !data.t) return;
    this.loadMsg();

    this.logMsg[channel] = this.logMsg[channel] || {
      list: [],
      lastTime: 0, // 记录收到的最后的信息
    };
    this.logMsg[channel].lastTime = data.t;
    this.logMsg[channel].list.push(data);
    if (this.logMsg[channel].list.length >= 200) {
      // 只保留200条信息
      this.logMsg[channel].list.shift();
    }
    if (!cc.sys.isNative) {
      this.saveMsg();
    }
  },

  loadMsg() {
    if (!this.logMsg) {
      // 先尝试读入本地数据
      const saveMsg = cc.sys.localStorage.getItem('messageLog');
      if (saveMsg) {
        this.logMsg = JSON.parse(saveMsg);
      }
      this.logMsg = this.logMsg || {};
    }
  },
  getMsg(channel) {
    this.loadMsg();
    if (['0', '1', '2', 0, 1, 2].indexOf(channel) !== -1) {
      // 假如是3个世界的信息，就合并default来显示
      let list = [];
      if (this.logMsg.d) {
        list = list.concat(this.logMsg.d.list);
      }
      if (this.logMsg[channel]) {
        list = list.concat(this.logMsg[channel].list);
      }
      list = _.sortBy(list, 't').reverse();
      return {
        list,
        lastTime: 0,
      };
    }

    if (!this.logMsg[channel]) {
      return {
        list: [],
        lastTime: 0,
      };
    }
    return this.logMsg[channel];
  },

  saveMsg() {
    try {
      const saveData = _.pick(this.logMsg, 'd', 0, 1, 2, '0', '1', '2');
      cc.sys.localStorage.setItem('messageLog', JSON.stringify(saveData));
    } catch (e) {
      mbgGame.error('saveMsgToLocal', e.message);
    }
  },
  getFacTalk(charaID, hasCommon) {
    const facID = this.getLabFacIDByChara(charaID);
    if (!facID) {
      return '';
    }

    const msgs = [];
    const dFac = this.getFacDataByFacID(facID);
    const facType = this.getFacType(facID);

    if (facType === labdefines.FacType.Gym) {
      if (charaID <= 15) {
        msgs.push(mbgGame.getString(`talk0_${facID}_${charaID}`));
      }
      if (hasCommon) {
        const commons = mbgGame.getString(`talk0_${facID}_${99}`);
        if (commons) {
          const a = commons.split('\n');
          a.forEach((x) => {
            msgs.push(x.replace('\r', ''));
          });
        }
      }
    } else {
      let prefix;
      if (facType === labdefines.FacType.Read) {
        prefix = 20;
      } else if (facType === labdefines.FacType.Collector) {
        prefix = 10;
      }
      let faceIdx;
      if (facType === labdefines.FacType.Collector) {
        const dTask = mbgGame.player.getCurTasks();
        const taskID = dTask[dFac.idx].id;
        if (!taskID) {
          return '';
        }
        faceIdx = mbgGame.player.getTaskHappyLvl(charaID, taskID);
      }
      if (facType === labdefines.FacType.Read) {
        const bookID = dFac.b;
        if (!bookID) {
          return '';
        }
        faceIdx = mbgGame.player.getBookHappyLvl(charaID, dFac.b, 2);
      }
      // faceIdx = 0 - 6
      // 0 最好
      const faceIdx2type = {
        0: 5,
        1: 5,
        2: 4,
        3: 3,
        4: 2,
        5: 1,
        6: 1,
      };
      msgs.push(mbgGame.getString(`talk${prefix + faceIdx2type[faceIdx]}_${charaID}`));
      if (hasCommon) {
        const commons = mbgGame.getString(`talk${prefix + faceIdx2type[faceIdx]}_${99}`);
        if (commons) {
          const a = commons.split('\n');
          a.forEach((x) => {
            msgs.push(x.replace('\r', ''));
          });
        }
      }
    }
    // mbgGame.log('msgs', msgs);
    return _.sample(msgs) || '';
  },

  sendLog(...args) {
    if (!mbgGame || !mbgGame.netCtrl) return;
    mbgGame.netCtrl.sendMsg('player.clientLog', args);
  },

  checkClanRedTip() {
    // 刷红点
    if (!mbgGame.sceneMenu) return;
    const events = mbgGame.getCache('clan.clanEvents');
    const ids = _.keys(events);
    const lastEventID = _.maxBy(ids, (x) => {
      return +x;
    });
    const logEventLastID = cc.sys.localStorage.getItem('clanEventID');
    if (+lastEventID > +logEventLastID) {
      if (mbgGame.sceneMenu.curPageIdx() !== mbgGame.PageClan) {
        mbgGame.sceneMenu.setRedtips(mbgGame.PageClan, true);
      }
    }
    if (mbgGame.sceneMenu.curPageIdx() === mbgGame.PageClan) {
      emitter.emit('clanEventUpdate');
    }
  },

  doShare(type, id, subtype) {
    if (mbgGame.getLock('net', 'onShare')) {
      return;
    }
    subtype = subtype || type;
    let clanShareInfo = cc.sys.localStorage.getItem(subtype);
    const defaultShareInfo = mbgGame.getString(subtype);
    if (!clanShareInfo) {
      clanShareInfo = defaultShareInfo;
    }

    mbgGame.managerUi.createLineEditor(
      {
        title: mbgGame.getString('sendDialog'),
        info: mbgGame.getString('clanShareAsk'),
        defaultStr: clanShareInfo,
        limit: 30,
      },
      (msg) => {
        const sendData = {
          type,
          shareId: id,
        };
        if (!msg || msg === '' || msg === defaultShareInfo) {
          cc.sys.localStorage.removeItem(subtype);
          sendData.msg = defaultShareInfo;
        } else {
          sendData.msg = msg;
          cc.sys.localStorage.setItem(subtype, msg);
        }
        mbgGame.log('share msg', msg, sendData.msg);
        mbgGame.setLock('net', 'onShare');
        mbgGame.netCtrl.sendMsg('clan.clanShare', sendData, () => {
          mbgGame.clearLock('net', 'onShare');
          mbgGame.managerUi.floatMessage('分享成功');
        });
      },
    );
  },

  doShareItem(sid) {
    this.doShare('clanShareItem', sid);
  },

  doShareWar(wUUID, subtype) {
    this.doShare('clanShareWar', wUUID, subtype);
  },
  getReplayType() {
    return this.m_ReplayType;
  },
  getReplayParam() {
    return this.m_ReplayParam;
  },
  setReplayType(type) {
    this.m_ReplayType = type;
  },
  setReplayParam(param) {
    this.m_ReplayParam = param;
  },
  doReplay(wUUID, type) {
    if (mbgGame.getLock('net', 'onReplay')) {
      return;
    }
    this.setReplayType(type);
    mbgGame.setLock('net', 'onReplay');
    mbgGame.netCtrl.sendMsg(
      'arena.replay',
      {
        uuid: wUUID,
      },
      (data) => {
        mbgGame.clearLock('net', 'onReplay');
        if (data.code === 'err') {
          mbgGame.managerUi.floatMessage('回放已过期');
        }
      },
    );
  },

  // 战斗失败分析
  warLostAnaly(data) {
    let myAvgLvl = 0;
    let myMinLvl = 0;
    let myMaxLvl = 0;
    let hasNaiMa = false;
    let hasT = false;
    let memberCount = 0;
    let itemCount = 0;
    _.mapKeys(data.left, (x) => {
      myAvgLvl += x.lv;
      myMinLvl = Math.min(x.lv, myMinLvl);
      myMaxLvl = Math.max(x.lv, myMaxLvl);
      // 是否有奶妈
      if (_.includes([3, 7, 14], x.ID)) hasNaiMa = true;
      // 是否有T
      if (_.includes([5, 6, 11], x.ID)) hasT = true;
      memberCount += 1;
      if (x.itemData) {
        itemCount += 1;
      }
      // 判断技能等级
      _.mapKeys(x.skill, (skillData) => {
        if (x.lv - skillData.lv >= 5) {
          defines.addTrackTag('技能差');
        }
      });
      /*
      // 判断是否有角色的天赋未升满
      if (1) {
        defines.addTrackTag('需电击');
      }
      */
    });

    let targetAvgLvl = 0;
    let targetMinLvl = 0;
    let targetMaxLvl = 0;
    _.mapKeys(data.right, (x) => {
      targetAvgLvl += x.lv;
      targetMinLvl = Math.min(x.lv, targetMinLvl);
      targetMaxLvl = Math.max(x.lv, targetMaxLvl);
    });
    if (myMaxLvl - myMinLvl > 10) {
      defines.addTrackTag('划水');
    }
    if (targetAvgLvl - myAvgLvl >= 10) {
      defines.addTrackTag('等级均差大');
    }

    // 解锁黎聪聪后，就肯定能凑齐5人
    if (memberCount < 5 && mbgGame.player.hasChara(4)) {
      defines.addTrackTag('缺人');
      if (!hasNaiMa) defines.addTrackTag('无奶');
      if (!hasT) defines.addTrackTag('无T');
    }
    if (itemCount === 0) defines.addTrackTag('无装');
    if (itemCount < memberCount) defines.addTrackTag('缺装');

    mbgGame.log(
      'warLostAnaly1',
      data,
      targetAvgLvl,
      targetMinLvl,
      targetMaxLvl,
      myAvgLvl,
      myMinLvl,
      myMaxLvl,
      defines.getTrackTag(),
    );
  },
});

module.exports = CPlayer;
