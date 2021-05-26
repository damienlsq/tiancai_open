const Cbase = require('./w_base');
const CUnit = require('./w_unit');
const defines = require('./w_defines');
const CItemBag = require('./itembag');
const CBlackMarket = require('./blackmarket');
const CStat = require('./playerstat');
const CWheelWar = require('./wheelwar');
const CPVECtrl = require('./pve');
const CPVPCtrl = require('./pvp');
const CWarCommon = require('./warcommon');
const CStoryWar = require('./storywar');
const CRaidCtrl = require('./raid');
const CLab = require('./lab');
const doOnceReward = require('./oncereward');
const CBattleCtrl = require('./battle');
const CDayWarCtrl = require('./daywar');
const utils = require("../gameserver/utils");


// 玩家基本属性
const base_attr = {
  coins: 0, // 金币
  mat: 0, // 物资货币 挂机世界掉落，用来升级收集器
  gem: 0, // 黑市货币
  diamonds: 0,
  sch: 0, // 已购买阵型数量
  star: 0, // 成就点
  sta: 0, // stamima 体力
  avglv: 0, // 平均等级 用在很多地方
};

class Player extends Cbase {
  constructor() {
    super();
    this.m_TimerOwnerID = mbgGame.common.timer.timerMgr.newOwnerID();
    this.m_WarState = {};
    this.m_ItemBag = new CItemBag(this);
    this.m_BlackMarket = new CBlackMarket(this);
    this.m_Stat = new CStat(this);
    this.m_WheelWar = new CWheelWar(this);
    this.m_PVECtrl = new CPVECtrl(this);
    this.m_PVPCtrl = new CPVPCtrl(this);
    this.m_WarCommon = new CWarCommon(this);
    this.m_StoryWar = new CStoryWar(this);
    this.m_Lab = new CLab(this);
    this.m_RaidCtrl = new CRaidCtrl(this);
    this.m_BattleCtrl = new CBattleCtrl(this);
    this.m_DayWarCtrl = new CDayWarCtrl(this);
  }
  CType() {
    return "playerLogic"; // 这个只是命名,和redis没有关系
  }
  dataObj() {
    return this.getDataObj("player");
  }
  newPlayer() {
    const dAttr = mbgGame.common.utils.deepClone(base_attr);
    dAttr.sta = this.getStaMax();
    this.setValOnly("attr", dAttr);
  }
  logInfo(...args) {
    const nPlayer = this.dataObj();
    nPlayer.logInfo(...args);
  }
  logError(...args) {
    const nPlayer = this.dataObj();
    nPlayer.logError(...args);
  }
  getVal(...args) {
    const nPlayer = this.dataObj();
    return nPlayer.getVal(...args);
  }
  getInfo(...args) {
    const nPlayer = this.dataObj();
    return nPlayer.getInfo(...args);
  }
  setVal(...args) {
    const nPlayer = this.dataObj();
    return nPlayer.setVal(...args);
  }
  setValOnly(...args) {
    const nPlayer = this.dataObj();
    return nPlayer.setValOnly(...args);
  }
  removeValOnly(...args) {
    const nPlayer = this.dataObj();
    return nPlayer.removeValOnly(...args);
  }
  setAsyncLock(tag) {
    if (!this.m_AsyncLock) {
      this.m_AsyncLock = {};
    }
    this.m_AsyncLock[tag] = 1;
  }
  hasAsyncLock(tag) {
    return this.m_AsyncLock && this.m_AsyncLock[tag] === 1;
  }
  delAsyncLock(tag) {
    if (this.m_AsyncLock) {
      delete this.m_AsyncLock[tag];
    }
  }
  // cmd合并到一起发
  beginBatchSend(jobName) {
    if (!this.m_BatchSendJobs) {
      this.m_BatchSendJobs = {};
    }
    if (this.m_BatchSendJobs[jobName]) {
      this.logError("beginBatchSend already called", jobName);
      return;
    }
    this.m_BatchSendJobs[jobName] = [];
    if (!this.m_jobStack) {
      this.m_jobStack = [];
    }
    this.m_jobStack.push(jobName);
  }
  endBatchSend() {
    if (!this.m_BatchSendJobs || !this.m_jobStack) {
      return;
    }
    const jobName = this.m_jobStack.pop();
    if (this.m_jobStack.length === 0) {
      delete this.m_jobStack;
    }
    if (!this.m_BatchSendJobs[jobName]) {
      return;
    }
    const cmdlst = this.m_BatchSendJobs[jobName];
    delete this.m_BatchSendJobs[jobName];
    if (cmdlst && cmdlst.length > 0) {
      this.sendCmd("batch", {
        cmdlst,
      });
    }
  }
  sendCmd(...args) {
    const nPlayer = this.dataObj();
    if (nPlayer.isReconnecting()) return;
    if (nPlayer.m_Offlined) {
      this.logError("[sendCmd] offlined!", args);
      return;
    }
    const netCtrl = nPlayer.getNetCtrl();
    if (!netCtrl) return;
    if (this.m_jobStack) {
      const jobName = this.m_jobStack[this.m_jobStack.length - 1];
      const cmdlst = this.m_BatchSendJobs[jobName];
      cmdlst.push(args);
      return;
    }
    netCtrl.sendCmd(...args);
  }
  smartNum(n) {
    if (!_.isNumber(n)) return n || 0;
    if (n < 100000) return n;
    if (n < 1000000) {
      let num = (n / 10000).toFixed(1);
      if (num.charAt(num.length - 1) === '0') {
        num = (n / 10000).toFixed(0);
      }
      return num + this.getString('w');
    }
    if (n < 100000000) {
      return (n / 10000).toFixed(0) + this.getString('w');
    }

    let num = (n / 100000000).toFixed(2);
    if (num.charAt(num.length - 1) === '0') {
      if (num.charAt(num.length - 2) === '0') {
        num = (n / 100000000).toFixed(0);
      } else {
        num = (n / 100000000).toFixed(1);
      }
    }
    return num + this.getString('billion');
  }
  getString(key, options, noError) {
    return this.getNetCtrl().getString(key, options, noError);
  }
  setRobot() {
    this.m_Robot = true;
  }
  isRobot() {
    return this.m_Robot;
  }
  getShortID() {
    const nPlayer = this.dataObj();
    return nPlayer.getShortID();
  }
  getUUID() {
    const nPlayer = this.dataObj();
    return nPlayer.getUUID();
  }
  syncAll(type, entertype) {
    const nPlayer = this.dataObj();
    this.logInfo("[syncAll]", type, entertype);
    this.beginBatchSend('sync');
    this.sendCmd("setBSID", {
      BSID: this.getBSID(),
    });
    this.m_StoryWar.onSendStoryData();
    this.sendCmd("flag", this.getFlag());
    this.sendCmd("plot", this.getPlotData());
    this.sendCmd("timeVars", this.getVal("var"));
    this.sendCmd("attr", this.getVal("attr"));
    this.sendCmd('cIDing', this.getVal("cIDing") || {});
    this.sendCmd("labdata", this.m_Lab.getDBData());
    this.sendCmd("worlds", this.getWorldDBData());
    this.m_BattleCtrl.onSendBattleData();
    this.m_RaidCtrl.onSendRaidData();
    this.m_WheelWar.onSendWheelWarData();
    this.m_PVPCtrl.onSendFoughtFlag();
    nPlayer.sendUserInfo();
    if (entertype === 1) {
      // 1: 首次连接成功、首次连接失败后网络重连，客户端才会发完整的数据
      // 2: 客户端已经以状态1登录成功，客户端会切换成2
      this.m_ItemBag.checkAllItemK();
      this.sendCmd("items", this.m_ItemBag.getItemSystemDBData());
      this.sendCmd("charas", this.getCharaDBData());
      this.m_PVPCtrl.onSendPVPDataReal();
    }
    this.sendCmd("syncok", { type: entertype });
    this.endBatchSend();
    if (this.getBSID()) {
      this.updateBSFwdPair(() => {
        this.logInfo("updateBSFwdPair ok, sync");
      });
    }
  }
  // 最近一次real下线的时间
  getLastRealOfflineTime() {
    return this.getVal("realofftime");
  }
  onLeaveGame() {
    this.setValOnly("realofftime", moment().unix());
    if (this.m_ClientOfflineTime) {
      this.cleanClientOfflineTime();
    }
  }
  // 收到客户端的enter后会调用这个函数
  // 因为enter有可能因为各种异常原因没有收到
  // 所以这个函数的逻辑要小心写
  onEnterGame() {
    const nPlayer = this.dataObj();
    this.cleanClientOfflineTime();
    mbgGame.common.timer.timerMgr.removeCallOut(this, `heartbeat`);
    this.setClientOnlineTime();
    this.logInfo("onEnterGame, curBSID:", this.getBSID());
    mbgGame.Arena.checkInvitePVP(nPlayer);
    this.m_PVECtrl.onEnter();
    this.m_Lab.onEnter();
    this.updateBSFwdPair(() => {
      this.logInfo("updateBSFwdPair ok, enter");
    });
  }
  tryResumeOldWar() {
    const nPlayer = this.dataObj();
    let worldIdx = null;
    // 理论上同时只能打一种战斗，但这里按优先级排序
    if (this.m_RaidCtrl.isWarBegan()) {
      worldIdx = defines.raidWorldIdx;
    } else if (this.m_DayWarCtrl.isWarBegan()) {
      worldIdx = defines.dayWorldIdx;
    } else if (this.m_StoryWar.isWarBegan()) {
      worldIdx = this.m_StoryWar.m_WorldIdx;
    } else if (this.m_BattleCtrl.isWarBegan()) {
      worldIdx = defines.battleWorldIdx;
    } else if (mbgGame.Arena.isPVPing(nPlayer)) {
      mbgGame.Arena.resumeJoinedPVP(nPlayer);
      worldIdx = 99;
    }
    return worldIdx;
  }
  transTime(val) {
    if (typeof (val) === "number") {
      const d = Math.floor(Number(val / (60 * 60 * 24)));
      val %= 60 * 60 * 24;
      const h = Math.floor(Number(val / (60 * 60)));
      val %= 60 * 60;
      const m = Math.floor(Number(val / 60));
      val %= 60;
      const s = Math.floor(Number(val));
      let result = "";
      if (d > 0) {
        result += d + this.getString('day');
      }
      if (h > 0) {
        result += h + this.getString('hour');
      }
      if (d < 1) { // 1天内才显示分
        if (m > 0) {
          result += m + this.getString('minute');
        }
      }
      if (h < 1) { // 1小时内才显示秒
        if (s > 0) {
          return result + s + this.getString('second');
        }
      }
      return result;
    }
    const dData = val;
    const seconds = (dData.d * 3600 * 24) + (dData.h * 3600) + (dData.m * 60);
    return seconds;
  }
  // 创建Player实例的时候调用一次
  onFirstInitPlayer(isNewUser) {
    mbgGame.bsmgr.playerOnline(this);
    this.m_PVECtrl.onInit();
    this.m_WheelWar.onInit();
    this.m_Lab.onInit();
    this.m_RaidCtrl.onInit();
    this.m_BattleCtrl.onInit();
    this.m_BlackMarket.onInit();
    this.m_DayWarCtrl.onInit();
    // this.startDayHeartBeat();
    // 离线的时间要折算体力给回玩家
    if (!this.canRecoverSta()) {
      return;
    }
    const staMax = this.getStaMax();
    const t = this.getLastRealOfflineTime();
    if (!t) {
      return;
    }
    const nowtime = moment().unix();
    const mimutes = Math.round((nowtime - t) / 60);
    const StaRecoverT = mbgGame.config.constTable.StaRecoverT;
    const iStaAdd = Math.round(mimutes / StaRecoverT);
    this.addSta(iStaAdd, staMax, 'login');
  }
  // 开机剧情和研究所剧情，都是只播一次，这里做标记
  getPlotData() {
    let dData = this.getVal("plot");
    if (!dData) {
      dData = {
        f: {}, // idx: state 【 0/null: 无；1:已解锁，可播放；2:已播放过一次 】
      };
      this.setValOnly("plot", dData);
    }
    return dData;
  }
  unlockPlot(idx, dontSend) {
    const dData = this.getPlotData();
    const f = dData.f;
    if (!f[idx]) {
      f[idx] = 1;
      if (!dontSend) this.sendCmd("plot", this.getPlotData());
    }
  }
  finishPlot(idx, dontSend) {
    const dData = this.getPlotData();
    const f = dData.f;
    if (f[idx] === 1) {
      f[idx] = 2;
      if (!dontSend) this.sendCmd("plot", this.getPlotData());
    } else {
      this.logError("finishPlot not unlock", idx);
    }
  }
  hasUnlockPlot(idx) {
    const dData = this.getPlotData();
    const f = dData.f;
    return f[idx] === 1;
  }
  hasFinishPlot(idx) {
    // 兼容
    if (idx >= 1 && idx <= 5 && this.isFlagOn(defines.Flag[`NewbiePlot${idx}`])) {
      return true;
    }
    const dData = this.getPlotData();
    const f = dData.f;
    return f[idx] === 2;
  }
  getStaMax() {
    const labLv = this.m_Lab.getLv();
    const dConfig = mbgGame.config[`lab${labLv}`];
    return dConfig.staMax;
  }
  canRecoverSta() {
    const staMax = this.getStaMax();
    if (this.getSta() >= staMax) {
      // 已经满体力了 不可自然恢复体力
      return false;
    }
    return true;
  }
  checkRecoverSta() {
    const nowtime = moment().unix();
    if (!this.canRecoverSta()) {
      this.m_LastStaTime = nowtime;
      return;
    }
    const staMax = this.getStaMax();
    const StaRecoverT = mbgGame.config.constTable.StaRecoverT;
    if (!this.m_LastStaTime) {
      this.m_LastStaTime = nowtime;
      this.addSta(1, staMax, 'recover');
      this.sendCmd("addSta", {
        t: nowtime,
      });
    } else {
      const mimutes = Math.round((nowtime - this.m_LastStaTime) / 60);
      // 判断间隔
      if (mimutes > StaRecoverT) {
        this.m_LastStaTime = nowtime;
        this.addSta(1, staMax, 'recover');
        this.sendCmd("addSta", {
          t: nowtime,
        });
      }
    }
  }
  setBSID(BSID) {
    mbgGame.bsmgr.onPlayerChangeBSID(this, BSID, this.m_BSID);
    this.m_BSID = BSID;
    this.sendCmd("setBSID", {
      BSID,
    });
  }
  getBSID() {
    return this.m_BSID;
  }
  setPVPBSID(PVPBSID) {
    this.m_PVPBSID = PVPBSID;
  }
  getPVPBSID() {
    return this.m_PVPBSID;
  }
  buildAwardString(data) {
    let str = '';
    const comma = this.getString("comma");

    [
      'diamonds',
      'coins',
      'gem',
      'sta',
      'mat',
    ].forEach((x) => {
      if (data[x]) {
        if (str) str += comma;
        str += `<img src="logo_${x}" />${data[x]}`;
      }
    });

    if (data.sidList) {
      // 物品奖励
      for (let i = 0; i < data.sidList.length; i++) {
        const sid = data.sidList[i];
        if (str) str += comma;
        const dItemData = this.m_ItemBag.getItemData(sid);
        if (!dItemData) {
          continue;
        }
        const itemID = this.m_ItemBag.getItemID(sid);
        str += this.getString("awardDesc", {
          name: this.getString(`iname${dItemData.q}`, {
            name: this.getString(`itemname${itemID}`),
          }),
          count: 1,
        });
      }
    }
    return str;
  }
  // 各种一次性奖励，如：解锁XXX
  doOnceReward(rewards) {
    // this.logInfo("doOnceReward", rewards);
    doOnceReward(this, rewards);
  }
  // 把dDrop1合并到dDrop2里
  // Note： 会把特殊的items字符串转成字典格式
  concatAwardData(dDrop1, dDrop2) {
    const numAttrs = ['diamonds', 'mat', 'gem', 'sta', 'coins'];
    for (let i = 0; i < numAttrs.length; i++) {
      const sAttr = numAttrs[i];
      // 外部保证合法性，这里只是为了兼容字符串值
      if (dDrop1[sAttr] != null && !_.isNumber(dDrop1[sAttr])) {
        dDrop1[sAttr] = +dDrop1[sAttr];
      }
      if (dDrop2[sAttr] != null && !_.isNumber(dDrop2[sAttr])) {
        dDrop2[sAttr] = +dDrop2[sAttr];
      }
      if (!dDrop2[sAttr]) {
        continue;
      }
      dDrop1[sAttr] = (dDrop1[sAttr] || 0) + (dDrop2[sAttr] || 0);
    }
    if (dDrop2.charaexp) {
      dDrop1.charaexp = dDrop1.charaexp || {};
      dDrop2.charaexp = dDrop2.charaexp || {};
      for (let charaID = 1; charaID <= 15; charaID += 1) {
        if (!dDrop1.charaexp[charaID] && !dDrop2.charaexp[charaID]) {
          continue;
        }
        dDrop1.charaexp[charaID] = (dDrop1.charaexp[charaID] || 0) + (dDrop2.charaexp[charaID] || 0);
      }
    }
    if (dDrop2.items) {
      const itemList1 = defines.transRewardItems(dDrop1.items) || [];
      const itemList2 = defines.transRewardItems(dDrop2.items) || [];
      dDrop1.items = itemList1.concat(itemList2);
    }
    if (dDrop2.itemdatas) {
      const itemdatas1 = dDrop1.itemdatas || [];
      const itemdatas2 = dDrop2.itemdatas || [];
      dDrop1.itemdatas = itemdatas1.concat(itemdatas2);
    }
    return dDrop1;
  }

  validGiveAward(award) {
    if (award.items || award.itemdatas) {
      let addNum = 0;
      const curNum = this.m_ItemBag.getItemNum();
      if (award.itemdatas) {
        addNum += award.itemdatas.length;
      }
      if (award.items) {
        const itemList = defines.transRewardItems(award.items);
        for (let i = 0; i < itemList.length; i++) {
          const n = itemList[i][1];
          addNum += n;
        }
      }
      return (curNum + addNum) <= mbgGame.config.constTable.ItemListLen;
    }
    return true;
  }

  /*
      奖励设置:
      award = {
          coins: xxx, //金币
          // 角色经验
          charaexp: {
            charaID: exp
          }
          //给予物品,字符串模式
          items: "1001x7,1002x8", //给1001道具7个,1002道具8个
          //给予物品 对象模式
          items: [
              [1001, 7], //给1001道具7个 品质随机
              [1002, 8, 2], //给1002道具8个 品质都为2
          }
          mat: 物资
          gem: xxx, //黑市点券
          diamonds: xxx, //给予钻石

          //以下为扩展信息
          t: uninxtime, // 奖励插入时间
          strKey; xxx, // 奖励信息的i18nkey,
          // 建议使用 getString(xxx, { award: this.buildAwardString(award) })
          // 来组织文字,该文字会发送到战报给玩家看
      }
  */
  giveAward(award, logType, notSend) {
    const self = this;
    let logTypeStr = logType;
    logTypeStr = logTypeStr || award.type;
    logTypeStr = logTypeStr || 'giveAward';
    // 通用的奖励给予函数
    if (+award.diamonds) {
      award.diamonds = Math.ceil(+award.diamonds);
      this.addDiamonds(award.diamonds, null, logTypeStr);
    }
    if (+award.mat) {
      award.mat = Math.ceil(+award.mat);
      this.addMat(award.mat, logTypeStr);
    }
    if (+award.gem) {
      award.gem = Math.ceil(+award.gem);
      this.addGem(award.gem, logType);
    }
    if (+award.sta) {
      award.sta = Math.ceil(+award.sta);
      this.addSta(award.sta, null, 'award');
    }
    if (+award.coins) {
      award.coins = Math.ceil(+award.coins);
      this.addCoins(award.coins, logTypeStr);
    }
    if (award.charaexp) {
      for (let charaID in award.charaexp) {
        charaID = +charaID;
        this.addCharaExp(charaID, award.charaexp[charaID]);
      }
    }
    let itemList;
    // 抽宝箱给道具
    if (award.items) {
      itemList = defines.transRewardItems(award.items);
      delete award.items;
    }
    const chestItemList = this.rewardChest(award);
    if (chestItemList && chestItemList.length > 0) {
      if (!itemList) {
        itemList = chestItemList;
      } else {
        itemList = itemList.concat(chestItemList);
      }
    }
    if (award.base) delete award.base;
    if (award.luck) delete award.luck;
    let sidList = []; // 能放进背包的道具 记它的sid到这个数组
    let dataListMail = []; // 背包满了，发邮件的 是dataList的子集
    let dataList = []; // 发送给客户端的，也是所有奖励道具的数据
    // 注意，dataList里的道具数据是不能修改的，因为没有clone
    if (itemList) {
      if (!_.isEmpty(itemList)) {
        for (let i = 0; i < itemList.length; i++) {
          // [道具类型ID，数量，固定品质，固定星级，]
          const [itemID, n, q, starLv, iType, iStarAdd] = itemList[i];
          const ret = self.m_ItemBag.addItem({
            itemID,
            num: n || 1,
            maxStarLv: award.maxStarLv,
            minStarLv: award.minStarLv,
            starLv,
            type: iType,
            starAdd: iStarAdd,
            quality: q,
          });
          if (ret.sidList && ret.sidList.length > 0) {
            // 放得进背包的
            sidList = sidList.concat(ret.sidList);
          }
          if (ret.dataList && ret.dataList.length > 0) {
            // 放不进背包的
            dataList = dataList.concat(ret.dataList);
            dataListMail = dataListMail.concat(ret.dataList);
          }
        }
      }
    }
    if (award.itemdatas) {
      const _sidList = this.m_ItemBag.saveItemDatas(award.itemdatas);
      if (_sidList && _sidList.length > 0) {
        sidList = sidList.concat(_sidList);
      }
      delete award.itemdatas;
    }
    if (sidList) {
      for (let i = 0; i < sidList.length; i++) {
        dataList.push(this.m_ItemBag.getItemData(sidList[i]));
      }
    }
    if (award.bl > 0) {
      award.bonusIdxes = [];
      dataList = _.shuffle(dataList);
      for (let i = 0; i < dataList.length && award.bl > 0; i++) {
        const dData = dataList[i];
        if (dData.q >= 4) {
          continue;
        }
        this.m_ItemBag.refreshItemQuality(dData, dData.q + 1);
        award.bl -= 1;
        award.bonusIdxes.push(i);
      }
    }

    award.dataList = dataList;
    this.logInfo("[giveAward]", logType, JSON.stringify(award));
    if (dataListMail.length > 0) {
      // 发邮件
      const nPlayer = this.dataObj();
      nPlayer.addItemAwardMail(dataListMail);
    }
    this.m_ItemBag.onSomeItemsChanged(sidList);
    if (notSend) return;
    // 发送已经放进背包的道具给客户端
    this.sendCmd("award", award);
  }
  // 客户端上线时间戳
  setClientOnlineTime() {
    if (this.m_ClientOnlineTime) {
      return;
    }
    this.m_ClientOnlineTime = defines.getNowTime();
  }
  getClientOnlineTime() {
    return this.m_ClientOnlineTime;
  }
  cleanClientOnlineTime() {
    this.m_ClientOnlineTime = null;
  }
  isClientOffline() {
    const nPlayer = this.dataObj();
    return nPlayer.isClientOffline();
  }
  onClientOffline(force) {
    mbgGame.bsmgr.playerOffline(this);
    mbgGame.FrdWarCtrl.playerOffline(this);
    const now = defines.getNowTime();
    const clientOnlineTime = this.getClientOnlineTime();
    if (clientOnlineTime > 0) {
      const duration = now - clientOnlineTime;
      // this.logInfo("[addStatVal] totalOnlineTime,duration", duration, clientOnlineTime, now);
      this.m_Stat.addStatVal("totalOnlineTime", duration);
    }
    this.cleanClientOnlineTime();
    this.m_ClientOfflineTime = moment().unix();
  }
  onServerOffline() {
    const nPlayer = this.dataObj();
    this.logInfo("[logic.player.onServerOffline]");
    this.m_ServerOfflined = true;
    // this.cleanDayHeartBeat();
    mbgGame.bsmgr.playerRealOffline(this);
    mbgGame.common.timer.timerMgr.removeAllCallOutByOwner(this);
    const memberList = [
      'm_BlackMarket',
      'm_Stat',
      'm_ItemBag',
      'm_WheelWar',
      'm_PVECtrl',
      'm_PVPCtrl',
      'm_WarCommon',
      'm_StoryWar',
      'm_Lab',
      'm_DayWarCtrl',
      'm_WarResultCached',
      'm_WarState',
    ];
    for (let i = 0; i < memberList.length; i++) {
      const memberName = memberList[i];
      const member = this[memberName];
      if (!member) {
        continue;
      }
      if (member.release) {
        try {
          member.release();
        } catch (e) {
          this.logError("[onServerOffline] release ctrl", memberName, e.stack);
        }
      }
      delete this[memberName];
    }
    if (this.m_TimerOwnerID) {
      delete this.m_TimerOwnerID;
    }
    if (this.m_LastStaTime) {
      delete this.m_LastStaTime;
    }
    this.logInfo("[logic.player.onServerOffline]", nPlayer.getUUID());
  }
  cleanClientOfflineTime() {
    if (this.m_ClientOfflineTime) {
      delete this.m_ClientOfflineTime;
    }
  }
  getCoins() {
    const attr = this.getVal("attr");
    if (!_.isNumber(attr.coins)) {
      attr.coins = 0;
    }
    return attr.coins || 0;
  }
  hasCoins(num) {
    const coins = this.getCoins();
    if (num > coins) return false;
    return true;
  }
  addCoins(num, sTag) {
    this.logInfo("[addCoins]", num, sTag);
    if (!_.isNumber(num)) return;
    this.addAttrInt('coins', num);
    if (num < 0) {
      this.m_Stat.addStatVal("spendCoins", -num);
    } else {
      this.m_Stat.addStatVal("coins", num);
    }
  }
  addMat(num, sTag) {
    this.logInfo("[addMat]", num, sTag);
    if (!_.isNumber(num)) return;
    this.addAttrInt("mat", num);
    if (num < 0) {
      this.m_Stat.addStatVal("spendMat", -num);
    } else {
      this.m_Stat.addStatVal("mat", num);
    }
  }
  getMat() {
    const attr = this.getVal("attr");
    if (!_.isNumber(attr.mat)) {
      attr.mat = 0;
    }
    return attr.mat;
  }
  hasMat(num) {
    const mat = this.getMat();
    if (num > mat) return false;
    return true;
  }
  addGem(num, sTag) {
    this.logInfo("[addGem]", num, sTag);
    if (!_.isNumber(num)) return;
    this.addAttrInt("gem", parseInt(num));
    if (num < 0) {
      this.m_Stat.addStatVal("spendGem", -num);
    } else {
      this.m_Stat.addStatVal("gem", num);
    }
  }

  getSta() {
    const attr = this.getVal("attr");
    if (!_.isNumber(attr.sta)) {
      attr.sta = 0;
    }
    return attr.sta;
  }
  addSta(num, max, sTag) {
    this.logInfo("[addSta]", num, sTag);
    if (!_.isNumber(num)) {
      this.logError("[addSta] num", num);
      return;
    }
    const value = this.addAttrInt("sta", parseInt(num), max);

    if (value < 0) {
      this.m_Stat.addStatVal("spendSta", -value);
    } else {
      this.m_Stat.addStatVal("sta", value);
    }
  }

  getDiamonds() {
    const attr = this.getVal("attr");
    if (!_.isNumber(attr.diamonds)) {
      attr.diamonds = 0;
    }
    return attr.diamonds;
  }
  hasDiamonds(num) {
    return num <= this.getDiamonds();
  }
  addDiamonds(num, worldIdx, sTag) {
    this.logInfo("[addDiamonds]", num, worldIdx, sTag);
    if (!_.isNumber(num)) return;
    this.addAttrInt("diamonds", parseInt(num));
    if (num < 0) {
      this.m_Stat.addStatVal("spendDiamonds", -num);
    } else {
      this.m_Stat.addStatVal("diamonds", num);
    }
  }
  setup() {
    return this.getVal("setup");
  }
  setSetup(data) {
    if (!data) return;
    // 需要严格判断data合法性
    let setup = this.getVal("setup");
    if (!setup) {
      setup = {};
    }
    if (data.lang) {
      // 检查目前开放了的语言
      // this.logInfo("avoid_lang", mbgGame.avoid_lang);
      setup.lang = data.lang;
      if (mbgGame.avoid_lang.indexOf(data.lang) === -1) {
        setup.lang = 'zh';
      }
    }

    this.setValOnly("setup", setup);
  }
  getFlag() {
    return this.getVal("flag") || 0;
  }
  setFlag(flag) {
    this.setValOnly("flag", flag);
  }
  setFlagOn(offset, enabled) {
    // this.logInfo("setFlagOn", offset, enabled, this.getFlag());
    if (enabled == null) {
      enabled = true;
    }
    let flag = this.getFlag();
    if (enabled) {
      if (flag & (1 << offset)) {
        return false;
      }
      flag |= (1 << offset);
    } else {
      if (!(flag & (1 << offset))) {
        return false;
      }
      flag &= ~(1 << offset);
    }
    this.setFlag(flag);
    this.sendCmd("flag", flag);
    return true;
  }
  isFlagOn(offset) {
    const flag = this.getFlag();
    return (flag & (1 << offset)) > 0;
  }
  nickName() {
    return this.dataObj().getInfo("nickname");
  }
  describe() {
    return this.dataObj().getInfo("describe");
  }
  getSchemeNum() {
    return mbgGame.config.constTable.SchemeNum[0] + this.getAttr("sch");
  }
  getAttr(key) {
    const attr = this.getVal("attr");
    return attr[key] || 0;
  }
  getLimitMaxByAttr(key) {
    return null;
  }
  addAttrInt(key, value, limitMax) {
    if (!value) {
      return 0;
    }
    let v = this.getAttr(key);
    v += value;
    return this.setAttrInt(key, v, limitMax);
  }
  setAttrInt(key, value, limitMax) {
    // 防止写错增加未定义字段
    if (base_attr[key] == null) {
      return 0;
    }
    if (!_.isNumber(value) || _.isNaN(value)) {
      return 0;
    }
    value = Math.round(value);
    const attr = this.getVal("attr");
    if (!attr[key]) {
      // 默认为0
      attr[key] = 0;
    }
    const oriValue = attr[key];
    attr[key] = value;
    if (attr[key] <= 0) {
      attr[key] = 0;
    }
    if (limitMax == null) {
      limitMax = this.getLimitMaxByAttr(key);
    }
    if (limitMax != null) {
      if (attr[key] > limitMax) {
        attr[key] = limitMax;
      }
    }
    this.setValOnly("attr", attr);
    this.m_Listener.on("onAttrUpdated", key, attr[key]);
    return attr[key] - oriValue; // 返回增量
  }
  // 各种 flag
  unlockStoryScheme() {
    if (this.isStorySchemeUnlocked()) {
      return false;
    }
    this.setFlagOn(defines.Flag.StoryScheme);
    // 初始化进攻和防守阵型
    for (let schemeIdx = 0; schemeIdx < 2; schemeIdx++) {
      const dScheme = this.m_WarCommon.getSchemeData(defines.pvpWorldIdx, schemeIdx);
      if (_.isEmpty(dScheme)) {
        // 复制道具设置
        const charaIDs = this.calDefaultDefTeam();
        this.m_WarCommon.setScheme(dScheme, {
          worldIdx: defines.pvpWorldIdx,
          charaIDs,
        });
        const _dScheme = this.m_StoryWar.getSchemeDataDict(defines.mainWorldIdx, schemeIdx);
        if (!_.isEmpty(_dScheme.bag)) {
          dScheme.bag = mbgGame.common.utils.deepClone(_dScheme.bag);
        }
      }
      this.m_WarCommon.sendScheme(defines.pvpWorldIdx, schemeIdx);
    }
    return true;
  }
  isStorySchemeUnlocked() {
    return this.isFlagOn(defines.Flag.StoryScheme);
  }
  unlockClan() {
    if (this.isClanUnlocked()) {
      return false;
    }
    this.setFlagOn(defines.Flag.Clan);
    return true;
  }
  isClanUnlocked() {
    return this.isFlagOn(defines.Flag.Clan);
  }
  unlockBotting() {
    if (this.isBottingUnlocked()) {
      return false;
    }
    this.setFlagOn(defines.Flag.Botting);
    return true;
  }
  isBottingUnlocked() {
    return this.isFlagOn(defines.Flag.Botting);
  }
  unlockSmeltItem() {
    if (this.isSmeltItemUnlocked()) {
      return false;
    }
    this.setFlagOn(defines.Flag.Smelt);
    this.sendCmd('showteach', {
      type: 'smelt',
    });
    return true;
  }
  isSmeltItemUnlocked() {
    return this.isFlagOn(defines.Flag.Smelt);
  }
  unlockTalentSys() {
    if (this.isTalentSysUnlocked()) {
      return false;
    }
    this.setFlagOn(defines.Flag.Talent);
    this.sendCmd('showteach', {
      type: 'talent',
    });
    return true;
  }
  isTalentSysUnlocked() {
    return this.isFlagOn(defines.Flag.Talent);
  }
  unlockGambleSys() {
    if (this.isGambleSysUnlocked()) {
      return false;
    }
    this.setFlagOn(defines.Flag.Gamble);
    return true;
  }
  isGambleSysUnlocked() {
    return this.isFlagOn(defines.Flag.Gamble);
  }
  unlockArena() {
    if (this.isArenaUnlocked()) {
      return false;
    }
    const nPlayer = this.dataObj();
    this.setFlagOn(defines.Flag.Arena);
    if (this.nickName()) {
      nPlayer.onArenaUnlocked();
    }
    return true;
  }
  isArenaUnlocked() {
    return this.isFlagOn(defines.Flag.Arena);
  }
  unlockTCBattle() {
    if (this.isTCBattleUnlocked()) {
      return false;
    }
    const nPlayer = this.dataObj();
    this.setFlagOn(defines.Flag.TCBattle);
    if (this.nickName()) {
      mbgGame.TCBattleMgr.onPlayerTCBattleUnlocked(nPlayer);
    }
    return true;
  }
  isTCBattleUnlocked() {
    return this.isFlagOn(defines.Flag.TCBattle);
  }
  unlockWheelWar() {
    if (this.isWheelWarUnlocked()) {
      return false;
    }
    this.setFlagOn(defines.Flag.WheelWar);
    return true;
  }
  isWheelWarUnlocked() {
    return this.isFlagOn(defines.Flag.WheelWar);
  }
  unlockHeroWar() {
    if (this.isHeroWarUnlocked()) {
      return false;
    }
    this.setFlagOn(defines.Flag.HeroWar);
    return true;
  }
  isHeroWarUnlocked() {
    return this.isFlagOn(defines.Flag.HeroWar);
  }
  unlockCoinWar() {
    this.setFlagOn(defines.Flag.CoinWar);
  }
  isCoinWarUnlocked() {
    return this.isFlagOn(defines.Flag.CoinWar);
  }
  unlockMatWar() {
    this.setFlagOn(defines.Flag.MatWar);
  }
  isMatWarUnlocked() {
    return this.isFlagOn(defines.Flag.MatWar);
  }
  setFirstPayGet() {
    return this.setFlagOn(defines.Flag.firstPay);
  }
  checkFirstPay() {
    return this.isFlagOn(defines.Flag.firstPay);
  }
  /*
      world = {
          worldIdx: {
              maxlv: 已通关关卡序号+1，如总共75关，那么全通的时候是76，一个都没通是1
              lv: 当前在哪一个关卡
              fought: 当前关卡的小怪已经杀了几个
          }
      }
  */
  getWorldDBData() {
    let dWorldData = this.getVal("world");
    if (!dWorldData) {
      dWorldData = {};
      this.setValOnly("world", dWorldData);
    }
    return dWorldData;
  }
  getWorldData(worldIdx) {
    const dWorldData = this.getWorldDBData();
    const dData = dWorldData[worldIdx];
    return dData;
  }
  isStoryWorldUnlocked(worldIdx) {
    const dWorldData = this.getWorldDBData();
    const dData = dWorldData[worldIdx];
    return dData != null;
  }
  // worldIdx = 1/2/3/6
  unlockStoryWorld(worldIdx) {
    if (defines.StoryWorlds.indexOf(worldIdx) !== -1) {
      const dWorldData = this.getWorldDBData();
      let dData = dWorldData[worldIdx];
      if (!dData) {
        dData = {
          maxlv: 1, // 记录已经打通了多少关就OK了
        };
        dWorldData[worldIdx] = dData;
        this.onWorldDataChanged(worldIdx);
        return true;
      }
    }
    return false;
  }

  // 开宝箱得道具
  // 此函数只处理道具列
  rewardChest(award) {
    if (!award) {
      this.logError("[rewardChest] no award");
      return null;
    }
    // this.logInfo("rewardChest base", award.base);
    const baselist = award.base;
    if (!baselist) {
      return null;
    }
    const itemList = [];
    const dWeightForBase = this.m_ItemBag.getRewardItemWeightDict(award.chestType);
    for (let i = 0, len = baselist.length; i < len; i++) {
      const arr = baselist[i];
      const [iQualityMin, iQualityMax, iType, iStarAdd, num_min, num_max] = arr;
      const num = _.random(num_min, num_max);
      for (let k = 0; k < num; k++) {
        const itemID = defines.chooseOne(dWeightForBase);
        if (!itemID) {
          continue;
        }
        const dQualityWeight = _.clone(mbgGame.config.constTable.QualityWeight);
        for (let q = 1; q <= 4; q++) {
          if (q > iQualityMax || q < iQualityMin) {
            delete dQualityWeight[q];
          }
        }
        const iQuality = defines.chooseOne(dQualityWeight);
        // 宝箱开出来的物品没有固定星级
        itemList.push([+itemID, 1, +iQuality, null, iType, iStarAdd]);
      }
    }
    // 幸运奖励
    const dLuckConfig = award.luck;
    if (dLuckConfig) {
      const dWeightForLuck = {};
      let weightCount = 0;
      for (let iQuality in dLuckConfig) {
        iQuality = parseInt(iQuality);
        // 这是概率 x%  0 <= x <= 100
        dWeightForLuck[iQuality] = Math.round(dLuckConfig[iQuality] * 0.01 * 10000);
        weightCount += dWeightForLuck[iQuality];
      }
      dWeightForLuck[0] = 10000 - weightCount;
      // this.logInfo("[chest dWeightForLuck]", dWeightForLuck);
      const iQuality = defines.chooseOne(dWeightForLuck);
      if (iQuality > 0) {
        const _dWeight = this.m_ItemBag.getRewardItemWeightDict(award.chestType, 1);
        const itemID = defines.chooseOne(_dWeight);
        if (!itemID) {
          this.logError("chest luck no itemID", dWeightForLuck, _dWeight);
        } else {
          itemList.push([itemID, 1, iQuality]);
        }
      }
    }
    //  this.logInfo("[chest reward]", itemList);
    return itemList;
  }

  /*
      //已拥有的英雄
      chara = {
          charaID: {
              //Note: 会陆续补充各种需要持久化的数据
              exp: 角色自己的经验
              lv: 该角色的等级
              tlv: { 各项属性的训练等级
                  attrID: lv,
              }
              ta: [ 天赋数据
                105, 10是主线lv，5是当前lv的层数 （第一个是主线）
                2213: 22是主线lv，1是支线id，3是层数(取值01234)（2 -> n 是支线)
                ·
                ·
                ·
              ]
              skill: {
                  拥有的技能编号: {
                      lv:  技能等级,
                      s: 星级, 默认0
                  }
              }
          }
      }
  */
  getCharaDBData() {
    let dDBData = this.getVal("chara");
    if (!dDBData) {
      dDBData = {};
      this.setValOnly("chara", dDBData);
    }
    return dDBData;
  }
  hasChara(charaID) {
    const dDBData = this.getCharaDBData();
    const dCharaData = dDBData[charaID];
    if (dCharaData) {
      return true;
    }
    return false;
  }
  charaCount() {
    const dDBData = this.getCharaDBData();
    let count = 0;
    for (const k in dDBData) {
      count += 1;
    }
    return count;
  }
  getAvgLv() {
    return this.getAttr("avglv") || 1;
  }
  calAvgLv() {
    // 抽取所有角色中，等级最高的5个角色，取平均值
    const dDBData = this.getCharaDBData();
    let charaIDs = [];
    for (const charaID in dDBData) {
      charaIDs.push(+charaID);
    }
    charaIDs = _.sortBy(charaIDs, (charaID) => {
      const dCharaData = dDBData[charaID];
      return dCharaData.lv;
    });
    charaIDs = charaIDs.reverse();
    let totalLv = 0;
    for (let i = 0; i < charaIDs.length && i < 5; i++) {
      const charaID = charaIDs[i];
      const dCharaData = dDBData[charaID];
      totalLv += dCharaData.lv;
    }
    return Math.max(Math.floor(totalLv / 5), 1);
  }
  getCharaDBDataByID(charaID) {
    const dCharaData = this.getCharaDBData();
    return dCharaData[charaID];
  }
  getCharaTalentList(charaID) {
    const dCharaData = this.getCharaDBDataByID(charaID);
    if (!dCharaData) {
      return null;
    }
    if (!dCharaData.ta) {
      dCharaData.ta = [];
    }
    return dCharaData.ta;
  }
  getCharaCurTalent(charaID) {
    const lst = this.getCharaTalentList(charaID);
    const v = lst[0];
    let ttLv = 1;
    let n = -1; // 0-4
    if (v) {
      n = v % 10;
      ttLv = Math.floor(v / 10);
    } else {
      ttLv = 1;
    }
    return [ttLv, n];
  }
  getCharaNextTalent(charaID) {
    const [ttLv, n] = this.getCharaCurTalent(charaID);
    let key = `${charaID}${utils.pad(ttLv, 3)}0`;
    const dCurConfig = mbgGame.config.talent[key];
    let ttLvNext = ttLv;
    let nNext = n + 1;
    if (nNext === dCurConfig.attrAdd.length) {
      nNext = 0;
      ttLvNext += 1;
    }
    key = `${charaID}${utils.pad(ttLvNext, 3)}0`;
    const dNextConfig = mbgGame.config.talent[key];
    if (!dNextConfig) {
      return null;
    }
    return [ttLvNext, nNext, dNextConfig];
  }
  validUpgradeTalent(charaID) {
    if (!this.hasChara(charaID)) {
      return mbgGame.config.ErrCode.NoChara;
    }
    const [ttLv, n] = this.getCharaCurTalent(charaID);
    const dConfig = this.getTalentConfig(charaID, ttLv);
    if (!dConfig) {
      return mbgGame.config.ErrCode.Error;
    }
    const tuple = this.getCharaNextTalent(charaID);
    if (!tuple) {
      return mbgGame.config.ErrCode.Error;
    }
    const dNextConfig = tuple[2];
    if (dNextConfig.clv > this.getCharaLv(charaID)) {
      return mbgGame.config.ErrCode.Talent_UpLv;
    }
    const nNext = tuple[1];
    const costMat = dNextConfig.mat[nNext];
    if (!costMat || !this.hasMat(costMat)) {
      return mbgGame.config.ErrCode.LackMat;
    }
    return null;
  }
  getTalentConfig(charaID, ttLv, sttIdx) {
    const key = `${charaID}${utils.pad(ttLv, 3)}${sttIdx || 0}`;
    const dConfig = mbgGame.config.talent[key];
    return dConfig;
  }
  // 升级天赋主线
  upgradeTalent(charaID) {
    const err = this.validUpgradeTalent(charaID);
    if (err) {
      return err;
    }
    // 从未升级: [1, -1]
    // 升了1次: [1,0]
    // 2次: [1, 1]
    // [1, -1] [1, 0] [1, 1] [1, 2] [1, 3] [1, 4]
    // [2,  0] [2, 1]
    const [ttLvNext, nNext, dNextConfig] = this.getCharaNextTalent(charaID);
    const costMat = dNextConfig.mat[nNext];
    this.addMat(-costMat, "talent");
    const lst = this.getCharaTalentList(charaID);
    lst[0] = (ttLvNext * 10) + nNext;
    this.onUpgradeTalent(charaID, dNextConfig.attr);
    return null;
  }
  validUpgradeSubTalent(charaID, ttLv, sttIdx) {
    if (!this.hasChara(charaID)) {
      return mbgGame.config.ErrCode.NoChara;
    }
    if (Math.floor(ttLv) !== ttLv || Math.floor(sttIdx) !== sttIdx) {
      return mbgGame.config.ErrCode.Error;
    }
    if (!(sttIdx >= 0 && sttIdx <= 9)) {
      return mbgGame.config.ErrCode.Error;
    }
    return null;
  }
  // 升级天赋支线，需要知道是哪个主线的支线，以及支线idx
  upgradeSubTalent(charaID, ttLv, sttIdx) {
    const err = this.validUpgradeSubTalent(charaID, ttLv, sttIdx);
    if (err) {
      return err;
    }
    // this.logInfo("[subtalent] ttLv, sttIdx", ttLv, sttIdx);
    const lst = this.getCharaTalentList(charaID);
    const ttLvCur = lst[0] ? Math.floor(lst[0] / 10) : null;
    if (ttLvCur == null || ttLvCur < ttLv) { // 超过当前主线等级
      return mbgGame.config.ErrCode.Error;
    }
    let arrIdx = -1;
    let v = null;
    // 找到该支线的旧数据 (如果没升过，是不存在的)
    for (let i = 1; i < lst.length; i++) {
      // this.logInfo("[subtalent] lst[i]", lst[i]);
      const _ttLv = Math.floor(lst[i] / 100);
      const _sttIdx = Math.floor((lst[i] % 100) / 10); // 右数第二位
      if (ttLv === _ttLv && _sttIdx === sttIdx) {
        arrIdx = i;
        v = lst[i];
        break;
      }
    }
    const key = `${charaID}${utils.pad(ttLv, 3)}${sttIdx}`;
    const dConfig = mbgGame.config.talent[key];
    // this.logInfo("[subtalent] key", key);
    if (!dConfig) {
      this.logError("[talent] upgradeSubTalent no config", key);
      return mbgGame.config.ErrCode.Error;
    }
    const n = v ? v % 10 : -1;
    const nNext = n + 1;
    const costMat = dConfig.mat[nNext];
    // this.logInfo("[subtalent] costMat", costMat, v, n);
    if (!costMat) { // 满级
      return mbgGame.config.ErrCode.Error;
    }
    if (!this.hasMat(costMat)) {
      return mbgGame.config.ErrCode.LackMat;
    }
    this.addMat(-costMat, "talent");
    // 支线升满就行了，没有什么晋级
    // 算出新的v
    v = +(`${ttLv}${sttIdx}${nNext}`);// 主线lv|支线idx|层数
    if (arrIdx === -1) {
      lst.push(v);
    } else {
      lst[arrIdx] = v;
    }
    return null;
  }
  onUpgradeTalent(charaID, attr) {
    // 给东西
    // 升技能星级
    if (attr === "a") {
      this.upgradeCharaSkillStar(charaID, defines.getCharaActiveSkillID(charaID));
    } else if (attr === "b") {
      this.upgradeCharaSkillStar(charaID, defines.getCharaPassiveSkillID(charaID));
    }
  }
  // 根据已解锁的人物自动生成一个防御阵型,人数尽可能多
  calDefaultDefTeam() {
    const dDBData = this.getCharaDBData();
    const charaIDs = [];
    if (!dDBData) {
      this.logError("[calDefaultDefTeam] no dDBData");
      return charaIDs;
    }
    for (let charaID in dDBData) {
      charaID = parseInt(charaID);
      charaIDs.push(charaID);
      if (charaIDs.length === 5) {
        break;
      }
    }
    return charaIDs;
  }
  getSkillDBData(charaID) {
    const dCharaData = this.getCharaDBDataByID(charaID);
    if (!dCharaData) return null;
    if (!dCharaData.skill) {
      dCharaData.skill = {};
    }
    return dCharaData.skill;
  }
  getSkillData(charaID, iSkillID) {
    const dSkillDBData = this.getSkillDBData(charaID);
    return dSkillDBData && dSkillDBData[iSkillID];
  }
  getCharaLv(charaID) {
    const dCharaData = this.getCharaDBDataByID(charaID);
    if (!dCharaData) {
      return 0;
    }
    return dCharaData.lv;
  }
  getCharaTrainingLvDict(charaID) {
    const dCharaData = this.getCharaDBDataByID(charaID);
    if (!dCharaData) {
      return null;
    }
    if (!dCharaData.tlv) {
      dCharaData.tlv = {};
    }
    return dCharaData.tlv;
  }
  getCharaExp(charaID) {
    const dCharaData = this.getCharaDBDataByID(charaID);
    if (!dCharaData) {
      return 0;
    }
    return dCharaData.exp || 0;
  }
  addCharaExp(charaID, exp) {
    exp = Math.round(exp);
    if (!(exp > 0)) {
      mbgGame.logError(`addCharaExp err, exp=${exp}`);
      return;
    }
    const dCharaData = this.getCharaDBDataByID(charaID);
    const lv = dCharaData.lv;
    if (lv >= mbgGame.config.constTable.MaxCharaLv) {
      dCharaData.exp = 0;
      return;
    }
    const costExp = this.getUpgradeCharaCost(charaID);
    mbgGame.logger.info("addCharaExp", dCharaData.exp, costExp, exp);
    dCharaData.exp = Math.max(0, (dCharaData.exp || 0) + exp);
    this.upgradeChara(charaID);
    this.onCharaDataChanged(charaID, "addExp");
  }
  isCharaSkillLocked(charaID, iSkillID) {
    const dSkillDBData = this.getSkillDBData(charaID);
    if (!dSkillDBData) return true;
    if (!dSkillDBData[iSkillID]) return true;
    return false;
  }
  unlockCharaByID(charaID) {
    const dDBData = this.getCharaDBData();
    const dCharaData = dDBData[charaID];
    if (dCharaData) return false;
    const dTableData = mbgGame.config[`hero${charaID}`];
    if (!dTableData) {
      this.logError("[unlockCharaByID] no hero", charaID);
      return false;
    }
    const count = this.charaCount();
    const oldAvgLv = this.getAvgLv();
    dDBData[charaID] = {
      lv: dTableData.lv, // 初始等级
      exp: 0,
    };
    const dSkillDBData = this.getSkillDBData(charaID);
    dSkillDBData[defines.getCharaActiveSkillID(charaID)] = {
      lv: 1,
      s: 0,
    };
    dSkillDBData[defines.getCharaPassiveSkillID(charaID)] = {
      lv: 1,
      s: 0,
    };
    this.onCharaDataChanged(charaID, "unlock");
    this.onAnyCharaLvChanged(oldAvgLv);
    this.m_StoryWar.onCharaUnlocked(charaID);
    if (count === 4) {
      this.sendCmd('showteach', {
        type: 'wakeup',
      });
    }
    return true;
  }
  // 同时只能解锁一个角色
  startUnlockCharaTimer(charaID) {
    if (this.getVal("cIDing")) {
      return mbgGame.config.ErrCode.CharaUnlocking;
    }
    if (this.hasChara(charaID)) {
      return mbgGame.config.ErrCode.Error;
    }
    charaID = Math.round(charaID);
    if (!(charaID >= 6 && charaID <= 15)) {
      return mbgGame.config.ErrCode.Error;
    }
    this.setValOnly("cIDing", { c: charaID, t: moment().unix() });
    this.sendCmd('cIDing', this.getVal("cIDing"));
    return null;
  }
  // 检查解锁时间到了没
  tryUnlockCharaTimer(fast) {
    const dData = this.getVal("cIDing");
    if (!dData) {
      return mbgGame.config.ErrCode.NoCharaUnlocking;
    }
    const charaID = dData.c;
    const t = dData.t;
    let ownCount = 0;
    for (let c = 6; c <= 15; c++) {
      if (c !== charaID && this.hasChara(c)) ownCount += 1;
    }
    const needhour = mbgGame.config.constTable.UnlockHours[ownCount];
    const lefttime = t + Math.round(needhour * 3600) - moment().unix();
    if (lefttime > 0) {
      if (!fast) {
        return mbgGame.config.ErrCode.LackTime;
      }
      const diamonds = Math.round((lefttime / 3600) * mbgGame.config.constTable.FastUnlockRatio);
      if (!this.hasDiamonds(diamonds)) {
        return mbgGame.config.ErrCode.LackDiamond;
      }
      this.addDiamonds(-diamonds, null, "cIDing");
    }
    this.removeValOnly('cIDing');
    this.sendCmd('cIDing', {});
    this.unlockCharaByID(charaID);
    this.unlockStoryScheme();
    const charaname = this.getString(`charaname${charaID}`);
    this.sendMessage(
      `${charaname}`,
      'unlock',
      {
        t: 1,
        type: 2,
        charaID,
        desci18n: `unlock_chara${charaID}`,
      });
    return null;
  }
  // 升级需要消耗多少经验
  getUpgradeCharaCost(charaID) {
    const lv = this.getCharaLv(charaID);
    const dHeroup = mbgGame.config[`heroup${lv}`];
    if (!dHeroup) {
      this.logError("[getUpgradeCharaCost] no dHeroup, lv:", lv);
      return 0;
    }
    return dHeroup.costExp || 0;
  }
  validUpgradeChara(charaID, dOption) {
    if (!this.hasChara(charaID)) {
      return mbgGame.config.ErrCode.NoChara;
    }
    // 验证升级条件
    const dCharaData = this.getCharaDBDataByID(charaID);
    const lv = dCharaData.lv;
    if (lv >= mbgGame.config.constTable.MaxCharaLv) {
      return mbgGame.config.ErrCode.MaxLv;
    }
    const costExp = this.getUpgradeCharaCost(charaID);
    if (costExp <= 0) {
      return mbgGame.config.ErrCode.Error;
    }
    const exp = this.getCharaExp(charaID);
    if (!dOption.free && exp < costExp) {
      return mbgGame.config.ErrCode.LackExp;
    }
    return null;
  }
  upgradeChara(charaID, dOption) {
    dOption = dOption || {};
    const dCharaData = this.getCharaDBDataByID(charaID);
    let err;
    let upgraded = false;
    const oldAvgLv = this.getAvgLv();
    for (let i = 0; i < (dOption.n || 100); i++) {
      err = this.validUpgradeChara(charaID, dOption);
      if (err) {
        break;
      }
      const lv = dCharaData.lv;
      const iNextLv = lv + 1;
      const costExp = this.getUpgradeCharaCost(charaID);
      mbgGame.logger.info("upgrade chara", dCharaData.exp, costExp);
      if (!dOption.free) {
        dCharaData.exp -= costExp;
      }
      dCharaData.lv = iNextLv;
      this.m_Stat.addStatVal("cUpTimes", 1);
      upgraded = true;
    }
    if (upgraded) {
      this.onAnyCharaLvChanged(oldAvgLv);
    }
    return upgraded;
  }
  onAnyCharaLvChanged(oldAvgLv) {
    this.updateStatTopChara();
    const newAvgLv = this.calAvgLv();
    this.setAttrInt('avglv', newAvgLv);
    if (this.isTCBattleUnlocked()) {
      if (oldAvgLv !== newAvgLv) {
        mbgGame.TCBattleMgr.onAvgLvChanged(this, oldAvgLv, newAvgLv);
      }
    }
  }
  setCharaLv_Debug(charaID, lv) {
    const dCharaData = this.getCharaDBDataByID(charaID);
    dCharaData.lv = lv;
    this.onCharaDataChanged(charaID, "setLvDebug");
  }
  updateStatTopChara() {
    let topCharaID = 0;
    let topCharaLv = 0;
    // 每次升级都要检查一遍谁最高级
    const dCharaDBData = this.getCharaDBData();
    for (let charaID in dCharaDBData) {
      charaID = parseInt(charaID);
      const dCharaData = dCharaDBData[charaID];
      if (dCharaData.lv > topCharaLv) {
        topCharaLv = dCharaData.lv;
        topCharaID = charaID;
      }
    }
    this.m_Stat.setStatVal("topCharaLv", topCharaLv);
    this.m_Stat.setStatVal("topCharaID", topCharaID);
  }
  hasSkill(charaID, iSkillID) {
    const lv = this.getSkillLv(charaID, iSkillID);
    return lv > 0;
  }
  validUpgradeCharaSkillCommon(charaID, iSkillID) {
    if (iSkillID !== defines.getCharaActiveSkillID(charaID) && iSkillID !== defines.getCharaPassiveSkillID(charaID)) {
      return mbgGame.config.ErrCode.WrongParam;
    }
    if (!this.hasChara(charaID)) {
      return mbgGame.config.ErrCode.NoChara;
    }
    const dSkillDBData = this.getSkillDBData(charaID);
    if (!dSkillDBData) {
      return mbgGame.config.ErrCode.NoChara;
    }
    return null;
  }
  validUpgradeCharaSkillStar(charaID, iSkillID) {
    const err = this.validUpgradeCharaSkillCommon(charaID, iSkillID);
    if (err) {
      return err;
    }
    const dSkillDBData = this.getSkillDBData(charaID);
    const dSkillData = dSkillDBData[iSkillID];
    const star = dSkillData.s || 0;
    if (star >= 5) {
      return mbgGame.config.ErrCode.MaxSkillStar;
    }
    return null;
  }
  upgradeCharaSkillStar(charaID, iSkillID) {
    const err = this.validUpgradeCharaSkillStar(charaID, iSkillID);
    if (err) {
      return err;
    }
    const dSkillDBData = this.getSkillDBData(charaID);
    const dSkillData = dSkillDBData[iSkillID];
    let star = dSkillData.s || 0;
    star += 1;
    dSkillData.s = star;
    this.onCharaDataChanged(charaID, "upStar");
    return null;
  }
  validUpgradeCharaSkillLv(charaID, iSkillID, free) {
    const err = this.validUpgradeCharaSkillCommon(charaID, iSkillID, free);
    if (err) {
      return err;
    }
    const dSkillDBData = this.getSkillDBData(charaID);
    const dSkillData = dSkillDBData[iSkillID];
    const lv = dSkillData.lv || 1;
    if (lv >= this.getCharaLv(charaID)) {
      return mbgGame.config.ErrCode.NeedUpChara;
    }
    if (lv === mbgGame.config.constTable.MaxCharaLv) {
      return mbgGame.config.ErrCode.MaxLv;
    }
    const dSkillup = mbgGame.config[`skillup${lv}`];
    if (!dSkillup) {
      this.logError("[no dSkillup] lv =", lv, "skillID =", iSkillID);
      return mbgGame.config.ErrCode.MaxLv;
    }
    if (!free) {
      const costCoins = (dSkillup && dSkillup.costcoins) || 0;
      const worldIdx = defines.getWorldIdxByCharaID(charaID);
      if (!this.hasCoins(costCoins)) {
        return mbgGame.config.ErrCode.LackCoin;
      }
    }
    return null;
  }
  upgradeCharaSkillLv(charaID, iSkillID, free) {
    const err = this.validUpgradeCharaSkillLv(charaID, iSkillID, free);
    if (err) {
      return err;
    }
    const dSkillDBData = this.getSkillDBData(charaID);
    const dSkillData = dSkillDBData[iSkillID];
    const lv = dSkillData.lv || 1;
    const dSkillup = mbgGame.config[`skillup${lv}`];
    if (!free) {
      const costCoins = (dSkillup && dSkillup.costcoins) || 0;
      this.addCoins(-costCoins, "upskill");
    }
    const iNextLv = lv + 1;
    dSkillData.lv = iNextLv;
    this.onCharaDataChanged(charaID, "upSk");
    this.m_Stat.addStatVal("sUpTimes", 1);
    this.updateStatTopCharaSkill();
    return null;
  }
  updateStatTopCharaSkill() {
    let topSkillID = 0;
    let topSkillLv = 0;
    // 每次升级都要检查一遍谁最高级
    const dCharaDBData = this.getCharaDBData();
    for (let charaID in dCharaDBData) {
      charaID = parseInt(charaID);
      const dCharaData = dCharaDBData[charaID];
      const dSkill = dCharaData.skill;
      if (!dSkill) {
        continue;
      }
      for (let skillID in dSkill) {
        skillID = parseInt(skillID);
        const dSkillData = dSkill[skillID];
        if (dSkillData.lv > topSkillLv) {
          topSkillLv = dSkillData.lv;
          topSkillID = skillID;
        }
      }
    }
    this.m_Stat.setStatVal("topSkillID", topSkillID);
    this.m_Stat.setStatVal("topSkillLv", topSkillLv);
  }
  getSkillLv(charaID, iSkillID) {
    const dSkillData = this.getSkillData(charaID, iSkillID);
    if (!dSkillData) {
      return 0;
    }
    return dSkillData.lv || 1;
  }
  getSkillRank(charaID, iSkillID) {
    const dSkillData = this.getSkillData(charaID, iSkillID);
    if (!dSkillData) {
      return 0;
    }
    return Math.floor((dSkillData.lv || 1) / 20);
  }
  getSkillStar(charaID, iSkillID) {
    const dSkillData = this.getSkillData(charaID, iSkillID);
    if (!dSkillData) {
      return 0;
    }
    return dSkillData.s || 0;
  }
  // 如果是参数是数组,就根据技能等级查询数组里的值
  getSkillParam(charaID, iSkillID, sParam) {
    const tmpUnit = this.createTmpChara(charaID);
    const lv = this.getSkillLv(charaID, iSkillID);
    const star = this.getSkillStar(charaID, iSkillID);
    return tmpUnit.getSkillParamByID(sParam, iSkillID, lv, star);
  }
  getSkillParam2(iSkillID, lv, star, sParam, tmpUnit) {
    return tmpUnit.getSkillParamByID(sParam, iSkillID, lv, star);
  }
  getSkillCDTime(charaID, iSkillID) {
    const iCDTime = this.getSkillParam(charaID, iSkillID, "CD");
    return iCDTime;
  }
  getNetCtrl() {
    const nPlayer = this.dataObj();
    const netCtrl = nPlayer.getNetCtrl();
    return netCtrl;
  }
  sendWarningAfterWar(msg) {
    return this.sendWarning(msg, { t: 1 });
  }
  sendWarning(msg, param) {
    const netCtrl = this.getNetCtrl();
    netCtrl.sendWarning(msg, param);
  }
  sendNotify(msg) {
    const netCtrl = this.getNetCtrl();
    netCtrl.sendNotify(msg);
  }
  sendMessage(...args) {
    this.dataObj().getNetCtrl().sendMessage(...args);
  }
  updateBSFwdPair(callback, BSID) {
    if (!BSID) {
      BSID = this.getBSID();
    }
    const [FSId, cid] = this.getNetCtrl().getFwdPair();
    if (FSId || cid) {
      mbgGame.bsmgr._playerUpdateData(BSID, this, "fwd_pair", [
        mbgGame.server_config.HOSTNAME,
        FSId,
        cid,
      ], callback);
    } else {
      this.logError("no fwd pair", FSId, cid);
    }
  }
  // 优化：tmpChara缓存在内存中,数据变化时刷新,获取时不刷新
  createTmpChara(charaID) {
    if (!this.m_TmpUnitDict) {
      this.m_TmpUnitDict = {};
    }
    if (this.m_TmpUnitDict[charaID]) {
      return this.m_TmpUnitDict[charaID];
    }
    const isTmp = true;
    const tmpUnit = new CUnit(isTmp);
    this.m_TmpUnitDict[charaID] = tmpUnit;
    this.updateTmpChara(charaID);
    return tmpUnit;
  }
  updateTmpChara(charaID) {
    const tmpUnit = this.createTmpChara(charaID);
    const dData = this.m_PVECtrl.getCharaWarData(charaID);
    dData.ID = charaID;
    dData.type = 0;
    dData.posIdx = 0;
    tmpUnit.m_Data = dData;
    tmpUnit.initAsTmpUnit(dData);
  }
  getCharaDataForClientByID(charaID) {
    const dCharaData = this.getCharaDBDataByID(charaID);
    if (!dCharaData) {
      return null;
    }
    const tmpUnit = this.createTmpChara(charaID);
    this.updateTmpChara(charaID);
    const dChara = tmpUnit.packInfo('forclient');
    dChara.tlv = dCharaData.tlv;
    dChara.exp = this.getCharaExp(charaID);
    dChara.upCost = this.getUpgradeCharaCost(charaID);
    dChara.ta = dCharaData.ta;
    return dChara;
  }
  // ///////////////////////////////////////////////////////////////////////////
  // 数据更改回调接口
  // ////////////////////////////////////////////////////////////////////////////
  onWorldDataChanged(worldIdx) {
    const dWorld = this.getWorldData(worldIdx);
    this.sendCmd("world", {
      worldIdx,
      data: dWorld,
    });
  }
  onWorldCharaDataChanged() {
    this.sendCmd("charas", this.getCharaDBData());
  }
  onCharaDataChanged(charaID, reason) {
    this.sendCmd("chara", {
      charaID,
      data: this.getCharaDBDataByID(charaID),
    });
  }
  setBottingEnabled(auto) {
    this.setValOnly("auto", auto ? 1 : 0);
  }
  isBottingEnabled() {
    return this.getVal("auto");
  }
  // ///////////////////////////////////////////////////////////////////
  // /BS->GS的战斗相关的回调接口
  // ////////////////////////////////////////////////////////////////////////////
  onWarEvent(worldIdx, sEvent, dData) {
    // MARK 改成宏
    if (sEvent === "WarBegin") {
      this.onWarBegin(worldIdx, dData);
    } else if (sEvent === "WarEnd") {
      try {
        this.onWarEnd(worldIdx, dData);
      } catch (e) {
        this.logError(e.stack);
      }
    } else if (sEvent === "SaveBotting") {
      this.setBottingEnabled(dData.auto);
    } else if (sEvent === "CharaDie") {
      this.onPVECharaDie(dData.ID);
    } else if (sEvent === "MonsterDie") {
      this.m_PVECtrl.onMonsterDie(worldIdx, dData);
    } else if (sEvent === "AfterUseSkill") {
      this.m_Stat.addStatVal(`UseSkill${dData.skillID}`, 1);
    }
  }
  onWarBegin(worldIdx, dData) {
    this.m_WarState[worldIdx] = defines.WarState.Fighting;
  }
  IsInWar() {
    for (const worldIdx in this.m_WarState) {
      if (this.m_WarState[worldIdx] === defines.WarState.Fighting) {
        return true;
      }
    }
    return false;
  }
  onWarEnd(worldIdx, dData) {
    this.logInfo("onWarEnd", worldIdx, dData.replay);
    this.m_WarState[worldIdx] = defines.WarState.Idle;
    // 释放BS战斗，但主要是做GS对这场战斗的后处理，BS自己会确保最终释放战斗
    mbgGame.bsmgr.releaseWar(this, worldIdx);
    if (dData.replay) {
      // replay模式，不需要执行各个onWarEnd，直接发warresult
      this.sendCmd("warresult", {
        worldIdx,
        result: dData.result,
        replay: 1,
      });
      return;
    }
    if (dData.recorded) {
      delete dData.recorded;
      // 争霸、友谊赛：玩家分享与否都立即保存
      // 其他战斗：先缓存在m_WarResultCached[worldIdx], 玩家点了分享再保存，5分钟超时或关闭结算界面就释放
      // mbgGame.logger.info("recorded worldIdx", worldIdx, 'result', dData.result, 'opList', dData.opList);
      if (worldIdx === defines.pvpWorldIdx) {
        dData.replayUUID = mbgGame.Replay.saveWarReplay(dData);
      } else {
        if (!this.m_WarResultCached) {
          this.m_WarResultCached = {};
        }
        this.m_WarResultCached[worldIdx] = dData;
        mbgGame.common.timer.timerMgr.removeCallOut(this, `cleanWarResult${worldIdx}`);
        mbgGame.common.timer.timerMgr.callOut(this, this.cleanWarResultCached.bind(this, worldIdx), {
          time: 60 * 5,
          flag: `cleanWarResult${worldIdx}`,
          forever: false,
        });
      }
    }
    if (defines.StoryWorlds.indexOf(worldIdx) !== -1 || worldIdx === 5) {
      this.m_StoryWar.onWarEnd(worldIdx, dData);
    } else if (worldIdx === defines.raidWorldIdx) {
      this.m_RaidCtrl.onWarEnd(dData);
    } else if (worldIdx === defines.battleWorldIdx) {
      this.m_BattleCtrl.onWarEnd(dData);
    } else if (worldIdx === defines.dayWorldIdx) {
      this.m_DayWarCtrl.onWarEnd(dData);
    } else if (worldIdx === defines.pvpWorldIdx) {
      this.m_PVPCtrl.onWarEnd(dData);
    }
  }
  getWarResultCached(worldIdx) {
    return this.m_WarResultCached && this.m_WarResultCached[worldIdx];
  }
  cleanWarResultCached(worldIdx) {
    if (this.m_WarResultCached && this.m_WarResultCached[worldIdx]) {
      delete this.m_WarResultCached[worldIdx];
    }
  }
  // PVE才会进这个函数
  onPVECharaDie(charaID) {
    this.m_Stat.addStatVal("DieTimes", 1);
  }
  getWarState(worldIdx) {
    return this.m_WarState && this.m_WarState[worldIdx];
  }
  openWarDebug(worldIdx) {
    mbgGame.bsmgr.callWarFunc(this, worldIdx, "setWarDebug", true);
  }
  closeWarDebug(worldIdx) {
    mbgGame.bsmgr.callWarFunc(this, worldIdx, "setWarDebug", false);
  }
  getLeftTimes(name) {
    const nPlayer = this.dataObj();
    let times = nPlayer.getTimeVar(name);
    if (times == null) {
      times = mbgGame.config.constTable[`${name}Times`];
      // 在t时刻过期，即当天的凌晨0点
      nPlayer.setTodayVar(name, times);
    }
    return times;
  }
  setLeftTimes(name, times) {
    const nPlayer = this.dataObj();
    nPlayer.setTodayVar(name, times);
  }
  addLeftTimes(name, val) {
    let times = this.getLeftTimes(name);
    times = Math.max(0, times + val);
    this.setLeftTimes(name, times);
  }
  /*
  onWarInfo(worldIdx, lstmsg) {
      const nPlayer = this.dataObj();
      const shortID = nPlayer.getShortID();
      const cb = ShortID2CB[shortID];
      const t = `${moment().hour()}:${moment().minute()}:${moment().second()}:${moment().millisecond()}`;
      if (lstmsg)
          lstmsg.unshift(t);
      if (cb) {
          try {
              cb(worldIdx, lstmsg);
          } catch (e) {

          }
      }
  }*/
}

module.exports = Player;
