
const defines = require('./w_defines');
const CBase = require('./base');
const CCollectorMgr = require('./collector');
const CGym = require('./gym');
const CRead = require('./read');
const labdefines = require('./labdefines');

const FacType = labdefines.FacType;
const FacIDList = labdefines.FacIDList;
const FacID2Type = labdefines.FacID2Type;

/*
  2017-4-20改：
    服务端没有楼层的概念了
    研究所是一个包含各种设施的集合，这些设施的位置和服务端无关（客户端的事情）
    服务端只需要控制设施的开关
    每个设施有唯一的ID
*/

// Facility = 设施
// FacID = 设施ID


// ///////////////////////////////////////////////////////////////////////////
//  研究所
//
// ////////////////////////////////////////////////////////////////////////////
class CLab extends CBase {
  getDBData() {
    let dDBData = this.pobj().getVal("lab");
    if (!dDBData) {
      dDBData = {
        lv: 0, // 研究所等级
        ids: [], // 可建造facID列表 （建造表第一列的id）
        f: { // 设施数据
          /*
           facID: {
              id: 楼层类型编号
              c:[]  安排的角色ID列表
              lv: 建筑等级
              upT: 开始升级的时间 moment().unix()
           }*/
        },
        b1: [], // 已解锁书籍列表（解锁后还需要买）
        b2: [], // 已购得书籍列表（购买后就是永久存在了）
      };
      this.pobj().setValOnly("lab", dDBData);
      this.addLv(true);
    }
    return dDBData;
  }
  onInit() {
    this.m_ColMgr = new CCollectorMgr(this.pobj());
    this.m_GymMgr = new CGym(this.pobj());
    this.m_ReadMgr = new CRead(this.pobj());
    this.m_ColMgr.setLab(this);
    this.m_GymMgr.setLab(this);
    this.m_ReadMgr.setLab(this);
    this.m_ColMgr.onInit();
    this.m_GymMgr.onInit();
    this.m_ReadMgr.onInit();
    /*
     for (const k in FacID) {
       const facID = FacID[k];
       this.resetUpgradeTimer(facID);
     }*/
    this.startHeartbeat();
  }
  customRelease() {
    this.m_ColMgr.release();
    this.m_ColMgr = null;
    this.m_ReadMgr.release();
    this.m_ReadMgr = null;
    this.m_GymMgr.release();
    this.m_GymMgr = null;
  }
  // 研究所等级
  getLv() {
    return this.getDBData().lv;
  }
  getConfig(labLv) {
    return mbgGame.config[`lab${labLv || this.getLv()}`];
  }
  getNextConfig() {
    return mbgGame.config[`lab${this.getLv() + 1}`];
  }
  addLv(dontNotify) {
    const pobj = this.pobj();
    const dDBData = pobj.getVal("lab");
    if (!mbgGame.config[`lab${dDBData.lv + 1}`]) {
      return;
    }
    dDBData.lv += 1;
    const curLv = dDBData.lv;
    const dConfig = mbgGame.config[`lab${curLv}`];
    pobj.doOnceReward(dConfig.rewards, dontNotify);
    pobj.m_Stat.setStatVal("lablv", curLv);
    this.tryUnlockBook(curLv);
    this.tryUnlockTask(curLv);
    pobj.addSta(dConfig.addSta, null, 'labAddLv');
    this.onDataChanged();
    if (!dontNotify) {
      pobj.sendMessage(
        `${pobj.getString('lab')}    ${curLv}${pobj.getString('lv')}`,
        'unlock',
        {
          t: 1,
          type: 1, // 1: 升级 2: 解锁
          desc: pobj.getString(`labdesc${curLv}`, {
            lv: `<color=#00FF00>${this.getBonuslv()}级</color>`,
          }),
        });
    }
  }
  getBonuslv() {
    return Math.min(this.getLv() * 5, this.pobj().getAvgLv());
  }
  checkUpgrade() {
    const pobj = this.pobj();
    const dConfig = this.getNextConfig();
    let ok = true;
    if (!dConfig || !dConfig.stageIDs) {
      ok = false;
    } else {
      for (let i = 0; i < dConfig.stageIDs.length; i++) {
        const stageID = dConfig.stageIDs[i];
        const str = stageID.toString();
        const worldIdx = +str[2];
        const stageIdx = stageID % 100;
        // this.logInfo("[lab] checkUpgrade", this.getLv() + 1, worldIdx, pobj.m_PVECtrl.getCurMaxStageIdx(worldIdx), stageIdx);
        if (pobj.m_PVECtrl.getCurMaxStageIdx(worldIdx) <= stageIdx) {
          ok = false;
          break;
        }
      }
    }
    //  this.logInfo("[lab] checkUpgrade is ok", ok);
    if (ok) {
      this.addLv();
    }
  }
  getUnlockedAttrList() {
    const dDBData = this.getDBData();
    if (!dDBData.al) {
      dDBData.al = [];
    }
    return dDBData.al;
  }
  unlockAttr(sAttr) {
    const lst = this.getUnlockedAttrList();
    const attrID = defines.Attr2ID[sAttr];
    if (lst.indexOf(attrID) === -1) {
      lst.push(attrID);
      return true;
    }
    return false;
  }
  getUnlockedBookList() {
    const dDBData = this.getDBData();
    if (!dDBData.b1) {
      dDBData.b1 = [];
    }
    return dDBData.b1;
  }
  getOwnedBookList() {
    /*
    const dDBData = this.getDBData();
    if (!dDBData.b2) {
      dDBData.b2 = [];
    }
    return dDBData.b2;
    */
    return this.getUnlockedBookList();
  }
  hasBook(bookID) {
    return this.getOwnedBookList().indexOf(bookID) !== -1;
  }
  getBookConfig(bookID) {
    return mbgGame.config.books[bookID];
  }
  tryUnlockBook(curLv) {
    const lst = this.getUnlockedBookList();
    for (let bookID in mbgGame.config.books) {
      bookID = +bookID;
      const dBookConfig = this.getBookConfig(bookID);
      if (dBookConfig.lv === curLv) {
        if (lst.indexOf(bookID) === -1) {
          lst.push(bookID);
        }
      }
    }
  }
  getUnlockedTaskList() {
    const dDBData = this.getDBData();
    if (!dDBData.ts) {
      dDBData.ts = [];
    }
    return dDBData.ts;
  }
  tryUnlockTask(curLv) {
    const lst = this.getUnlockedTaskList();
    for (let taskID in mbgGame.config.tasks) {
      taskID = +taskID;
      const dTaskConfig = mbgGame.config.tasks[taskID];
      if (dTaskConfig.lv === curLv) {
        if (lst.indexOf(taskID) === -1) {
          lst.push(taskID);
        }
      }
    }
  }
  // for debug
  unlockAllBook() {
    const lst = this.getUnlockedBookList();
    for (let bookID in mbgGame.config.books) {
      bookID = +bookID;
      if (lst.indexOf(bookID) === -1) {
        lst.push(bookID);
      }
    }
    this.onDataChanged();
  }
  addReadPages(charaID, bookID, p) {
    const dDBData = this.getDBData();
    if (!dDBData.bp) {
      dDBData.bp = {};
    }
    if (!dDBData.bp[charaID]) {
      dDBData.bp[charaID] = {};
    }
    const dData = dDBData.bp[charaID];
    // 减少厌倦度
    for (const id in dData) {
      const _p = dData[id];
      if (_p > 0 && (+id) !== bookID) {
        dData[id] = Math.max(0, _p - Math.floor(p * mbgGame.config.constTable.readReduceRatio));
      }
    }
    dData[bookID] = (dData[bookID] || 0) + p;
  }
  getReadPages(charaID, bookID) {
    const dDBData = this.getDBData();
    if (!dDBData.bp) {
      return 0;
    }
    if (!dDBData.bp[charaID]) {
      return 0;
    }
    return dDBData.bp[charaID][bookID] || 0;
  }
  getUnlockedFacIDs() {
    return this.getDBData().ids || [];
  }
  unlockFac(facID, dontSend) {
    const dConfig = mbgGame.config[`facinfo${facID}`];
    if (!dConfig) {
      return false;
    }
    if (this.hasFac(facID)) {
      return false;
    }
    let ids = this.getDBData().ids;
    if (!ids) {
      ids = [];
    }
    if (ids.indexOf(facID) === -1) {
      ids.push(facID);
      this.getDBData().ids = ids;
      if (!dontSend) {
        this.onDataChanged();
      }
      return true;
    }
    return false;
  }
  getAllFacData() {
    return this.getDBData().f;
  }
  getFacDataByFacID(facID) {
    return this.getDBData().f[facID];
  }
  validBuildFac(facID) {
    const dData = this.getAllFacData();
    if (FacIDList.indexOf(facID) === -1) {
      return mbgGame.config.ErrCode.Lab_WrongFacID;
    }
    const ids = this.getUnlockedFacIDs();
    if (ids.indexOf(facID) === -1) {
      return mbgGame.config.ErrCode.Lab_FacLocked;
    }
    if (dData[facID]) {
      return mbgGame.config.ErrCode.Lab_FacBuilt;
    }
    return mbgGame.config.ErrCode.OK;
  }
  getFacCount() {
    const dAllFac = this.getAllFacData();
    let count = 0;
    for (const idx in dAllFac) {
      count += 1;
    }
    return count;
  }
  hasFloor(floorType) {
    const dDBData = this.getDBData();
    if (dDBData.fl == null) {
      return false;
    }
    return dDBData.fl & (1 << (floorType - 1));
  }
  validBuildFloor(floorType) {
    const dConfig = mbgGame.config[`floortype${floorType}`];
    if (!dConfig) {
      return mbgGame.config.ErrCode.Lab_FloorLocked;
    }
    if (!this.isUnlockedFloor(floorType)) {
      return mbgGame.config.ErrCode.Lab_FloorLocked;
    }
    if (this.hasFloor(floorType)) {
      // 已经建过了
      return mbgGame.config.ErrCode.Lab_FloorBuilt;
    }
    return mbgGame.config.ErrCode.OK;
  }
  // 楼层是否已解锁
  isUnlockedFloor(floorType) {
    const dDBData = this.getDBData();
    if (dDBData.ufl == null) {
      return false;
    }
    return dDBData.ufl & (1 << (floorType - 1));
  }
  // 解锁楼层：楼层是否可建造
  unlockFloor(floorType) {
    if (this.isUnlockedFloor(floorType)) {
      return false;
    }
    const dDBData = this.getDBData();
    if (dDBData.ufl == null) {
      dDBData.ufl = 0;
    }
    dDBData.ufl |= (1 << (floorType - 1));
    this.onDataChanged();
    return true;
  }
  buildFloor(floorType) {
    const errCode = this.validBuildFloor(floorType);
    if (errCode) {
      return errCode;
    }
    const dDBData = this.getDBData();
    if (dDBData.fl == null) {
      dDBData.fl = 0;
    }
    dDBData.fl |= (1 << (floorType - 1));
    if (floorType === labdefines.FloorType.Chest) {
      this.pobj().unlockSmeltItem();
    }
    this.onDataChanged();
    return mbgGame.config.ErrCode.OK;
  }
  buildFac(facID) {
    facID = +facID;
    // this.logInfo("buildFac", facID);
    const errCode = this.validBuildFac(facID);
    if (errCode) {
      return errCode;
    }
    const dData = this.getAllFacData();
    dData[facID] = {
      lv: 1,
    };
    const ids = this.getDBData().ids;
    const idx = ids.indexOf(facID);
    ids.splice(idx, 1);
    this.getDBData().ids = ids;
    this.onFacBuilt(facID);
    this.onDataChanged();
    return mbgGame.config.ErrCode.OK;
  }
  onFacBuilt(facID) {
  }
  hasFac(facID) {
    return this.getFacDataByFacID(facID) != null;
  }
  getLabFacIDByChara(charaID) {
    const dData = this.getAllFacData();
    for (const facID in dData) {
      const dFac = dData[facID];
      if (dFac.c && dFac.c.indexOf(charaID) !== -1) {
        return +facID;
      }
    }
    return null;
  }
  // 角色是否在工作中，在工作中的角色不能换岗（需要先点击下岗）
  isCharaWorking(charaID) {
    const facID = this.getLabFacIDByChara(charaID);
    if (facID > 0) {
      const dFac = this.getFacDataByFacID(facID);
      const c = dFac.c;
      if (c && c[0] === charaID) {
        return true;
      }
    }
    return false;
  }
  validAddFacChara(facID, charaID, param) {
    const pobj = this.pobj();

    // 健身设备允许npc参与
    if (FacID2Type[facID] === FacType.Gym) {
      if (charaID <= 15 && !pobj.hasChara(charaID)) {
        return mbgGame.config.ErrCode.Lab_NoChara;
      }
      // 健身设备允许重复npc
    } else {
      if (!pobj.hasChara(charaID)) {
        return mbgGame.config.ErrCode.Lab_NoChara;
      }
      if (this.isCharaWorking(charaID)) {
        return mbgGame.config.ErrCode.Lab_CharaUsed;
      }
    }
    if (!this.hasFac(facID)) {
      return mbgGame.config.ErrCode.Lab_NoFloor;
    }

    const dFac = this.getFacDataByFacID(facID);
    if (!dFac) {
      return mbgGame.config.ErrCode.Lab_NoFloor;
    }
    const maxLen = labdefines.FacID2CharaMaxLen[facID];
    if (maxLen == null) {
      return mbgGame.config.ErrCode.Lab_CannotPlaceChara;
    }
    if (dFac.c) {
      if (dFac.c.length >= maxLen) {
        return mbgGame.config.ErrCode.Lab_FullChara;
      }
      const _charaID = dFac.c[0];
      if (_charaID) {
        return mbgGame.config.ErrCode.Lab_HasChara;
      }
    }
    // 设施相关的验证
    // 先集中在这里
    // 收集器
    // 阅读室
    // 健身房
    if (FacID2Type[facID] === FacType.Gym) {
      const errCode = this.m_GymMgr.validTraining(facID, charaID);
      if (errCode) {
        return errCode;
      }
    } else if (FacID2Type[facID] === FacType.Read) {
      const errCode = this.m_ReadMgr.validReading(facID, charaID, param);
      // this.logInfo('err', errCode, param);
      if (errCode) {
        return errCode;
      }
    } else if (FacID2Type[facID] === FacType.Collector) {
      const errCode = this.m_ColMgr.validBeginTask(facID, charaID, param);
      if (errCode) {
        return errCode;
      }
    }
    return null;
  }
  addFacChara(facID, charaID, param) {
    const err = this.validAddFacChara(facID, charaID, param);
    if (err) {
      return err;
    }
    const dFac = this.getFacDataByFacID(facID);
    if (!dFac.c) {
      dFac.c = [];
    }
    dFac.c.push(charaID);
    if (FacID2Type[facID] === FacType.Gym) {
      this.m_GymMgr.beginTraining(facID);
    } else if (FacID2Type[facID] === FacType.Read) {
      this.m_ReadMgr.beginReading(facID, charaID, param);
    } else if (FacID2Type[facID] === FacType.Collector) {
      this.m_ColMgr.beginTask(facID, param);
    }
    this.onDataChanged();
    return mbgGame.config.ErrCode.OK;
  }
  removeFacChara(facID, charaID) {
    const pobj = this.pobj();
    if (FacID2Type[facID] !== FacType.Gym) {
      if (!pobj.hasChara(charaID)) {
        return mbgGame.config.ErrCode.Lab_NoChara;
      }
    }
    if (!this.hasFac(facID)) {
      return mbgGame.config.ErrCode.Lab_NoFac;
    }
    const dFac = this.getFacDataByFacID(facID);
    const idx = dFac.c && dFac.c.indexOf(charaID);
    if (idx != null && idx !== -1) {
      dFac.c.splice(idx, 1);
      const facType = FacID2Type[facID];
      if (facType === FacType.Collector) {
        // 终止任务
        this.m_ColMgr.haltTask(facID);
      }
      this.onDataChanged();
    }
    return mbgGame.config.ErrCode.OK;
  }
  onDataChanged() {
    this.pobj().sendCmd("labdata", this.getDBData());
  }
  startHeartbeat() {
    mbgGame.common.timer.timerMgr.removeCallOut(this, `heartbeat`);
    mbgGame.common.timer.timerMgr.callOut(this, this.onHeartbeat.bind(this), {
      time: 60,
      flag: `heartbeat`,
      forever: true,
    });
  }
  onEnter() {
    this.triggerEvt();
  }
  // 每分钟检测器
  onHeartbeat() {
    const pobj = this.pobj();
    // TODO 体力恢复暂时放在这里
    pobj.checkRecoverSta();
    // 检查事件
    this.triggerEvt();
  }
  triggerEvt() {
    const pobj = this.pobj();
    const nPlayer = pobj.dataObj();
    const curHour = moment().hours();
    // pobj.logInfo("triggerEvt curHour", curHour);
    let evtmark = nPlayer.getTimeVar("evt");
    if (!evtmark) {
      evtmark = {};
      nPlayer.setTodayVar("evt", evtmark);
    }
    for (let id in mbgGame.config.events) {
      id = +id;
      if (evtmark[id]) {
        continue;
      }
      const dConfig = mbgGame.config.events[id];
      const [tStart, tEnd] = dConfig.tPair;
      // pobj.logInfo("triggerEvt", id, tStart, tEnd);
      if (tStart <= curHour && curHour < tEnd) {
        evtmark[id] = 1;
        // pobj.logInfo("triggerEvt ok", id);
        if (dConfig.param === "task") {
          // 任务刷新
          pobj.m_Lab.m_ColMgr.generateTask();
          //  const idleTaskNum = pobj.m_Lab.m_ColMgr.getIdleTaskNum();
          //   pobj.logInfo("idleTaskNum", idleTaskNum);
        }
      }
    }
  }
  tryFinish(facID, fast, dRet, forceRemove) {
    const pobj = this.pobj();
    if (FacID2Type[facID] === FacType.Gym) {
      return pobj.m_Lab.m_GymMgr.tryGetReward(facID, dRet, forceRemove);
    } else if (FacID2Type[facID] === FacType.Read) {
      return pobj.m_Lab.m_ReadMgr.tryGetReadingExp(facID, dRet, forceRemove);
    } else if (FacID2Type[facID] === FacType.Collector) {
      return pobj.m_Lab.m_ColMgr.tryFinishTask(facID, fast, dRet);
    }
    return null;
  }
  calFastDiamonds(facType, seconds) {
    const hours = seconds / 3600;
    let costDiamonds = Math.ceil(mbgGame.config.constTable.FastRatio[facType] * hours);
    costDiamonds = Math.min(costDiamonds, mbgGame.config.constTable.FastMaxDiamonds);
    return costDiamonds;
  }
}
module.exports = CLab;