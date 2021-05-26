
const CBase = require('./base');
const labdefines = require('./labdefines');

class CCollectorMgr extends CBase {
  customRelease() {
    this.m_Lab = null;
  }
  setLab(oLab) {
    this.m_Lab = oLab;
  }
  onInit() {
  }
  getCurTasks() {
    const dDBData = this.m_Lab.getDBData();
    if (!dDBData.tasks) {
      dDBData.tasks = {
        // idx: taskData
      };
    }
    return dDBData.tasks;
  }
  getNewTaskIdx() {
    const dTasks = this.getCurTasks();
    for (let i = 0; i < 100; i++) {
      if (!dTasks[i]) {
        return i;
      }
    }
    return null;
  }
  generateTask() {
    if (!mbgGame.config.taskList) {
      const lst = [];
      for (const taskID in mbgGame.config.tasks) {
        lst.push(+taskID);
      }
      mbgGame.config.taskList = lst;
    }
    if (this.getIdleTaskNum() >= this.getTaskTotalNum()) {
      return;
    }
    const dTasks = this.getCurTasks();
    for (let i = this.getIdleTaskNum(); i < this.getTaskTotalNum(); i++) {
      const idx = this.getNewTaskIdx();
      const taskID = mbgGame.config.taskList[_.random(0, mbgGame.config.taskList.length - 1)];
      dTasks[idx] = {
        id: taskID,
        lv: this.m_Lab.getLv(),
      };
    }
    // this.m_Lab.logInfo("generateTask", JSON.stringify(dTasks));
    this.m_Lab.onDataChanged();
  }
  getIdleTaskNum() {
    const dTasks = this.getCurTasks();
    let count = 0;
    for (const idx in dTasks) {
      const dTaskData = dTasks[idx];
      if (!dTaskData) {
        continue;
      }
      if (!dTaskData.f) {
        count += 1;
      }
    }
    return count;
  }
  getTaskTotalNum() {
    return mbgGame.config.constTable.TaskTotalNum;
  }
  getTaskReward(taskID, reward) {
    const dTaskConfig = mbgGame.config.tasks[taskID];
    if (dTaskConfig.type === 'coins') {
      reward.coins = Math.round(this.m_Lab.getConfig().labCoinsK * dTaskConfig.t);
    } else if (dTaskConfig.type === 'mat') {
      reward.mat = Math.round(this.m_Lab.getConfig().labMatK * dTaskConfig.t);
    } else if (dTaskConfig.type === 'diamonds') {
      reward.diamonds = Math.round(this.m_Lab.getConfig().labDiamondsK * dTaskConfig.t);
    } else if (dTaskConfig.type === 'sta') {
      reward.sta = Math.round(this.m_Lab.getConfig().labStaK * dTaskConfig.t);
    }
  }
  validBeginTask(facID, charaID, param) {
    const dFac = this.m_Lab.getFacDataByFacID(facID);
    if (!dFac) {
      this.logError("[validCollect] no such fac, facID", facID);
      return mbgGame.config.ErrCode.Error;
    }
    const dTaskData = this.getCurTasks()[param.idx];
    if (!dTaskData) {
      return mbgGame.config.ErrCode.Lab_NoTask;
    }
    if (dTaskData.f) {
      return mbgGame.config.ErrCode.Lab_TaskDoing;
    }
    return mbgGame.config.ErrCode.OK;
  }
  beginTask(facID, param) {
    /*
      3 每个任务持续6小时，在结束时间前都可以开始任务
      5 任务的奖励目前都为金币（后续拓展其他奖励），每个任务获得的金币为 研究所表的任务金币奖励系数任务时长
     */
    const dFac = this.m_Lab.getFacDataByFacID(facID);
    const dTaskData = this.getCurTasks()[param.idx];
    const taskID = dTaskData.id;
    const dTaskConfig = mbgGame.config.tasks[taskID];
    const nowtime = moment().unix();
    const charaID = dFac.c && dFac.c[0];
    dFac.trT = nowtime;
    dTaskData.f = facID; // 标记是否被执行
    dFac.idx = param.idx;
    // 任务耗时 = 任务时长 * (1-角色加成)
    dFac.d = 60 * dTaskConfig.t * (1 - dTaskConfig[`c${charaID}`]);
    this.m_Lab.onDataChanged();
    return mbgGame.config.ErrCode.OK;
  }
  // seconds，注意，必须先验证再调用此接口
  getLeftTime(facID) {
    const dFac = this.m_Lab.getFacDataByFacID(facID);
    const nowtime = moment().unix();
    const leftTime = Math.max(0, dFac.trT + dFac.d - nowtime);
    return leftTime;
  }
  validFinishTask(facID, fast) {
    const dFac = this.m_Lab.getFacDataByFacID(facID);
    const charaID = dFac.c && dFac.c[0];
    if (!charaID) {
      return mbgGame.config.ErrCode.Lab_NoChara;
    }
    if (!dFac.trT) {
      return mbgGame.config.ErrCode.Lab_NotReading;
    }
    const leftTime = this.getLeftTime(facID);
    if (leftTime > 0) {
      if (!fast) {
        return mbgGame.config.ErrCode.Lab_InReading;
      }
    }
    return mbgGame.config.ErrCode.OK;
  }
  finishTask(facID, dRet) {
    const dFac = this.m_Lab.getFacDataByFacID(facID);
    const idx = dFac.idx;
    const dTaskData = this.getCurTasks()[idx];
    this.removeTask(facID);
    this.afterTask(facID, dTaskData, dRet);
    dRet.remove = true;
  }
  removeTask(facID) {
    const dFac = this.m_Lab.getFacDataByFacID(facID);
    if (!dFac) {
      return;
    }
    const idx = dFac.idx;
    if (dFac.trT) delete dFac.trT;
    if (dFac.d) delete dFac.d;
    if (dFac.idx) delete dFac.idx;
    const charaID = dFac.c && dFac.c[0];
    const dTasks = this.getCurTasks();
    if (dTasks && idx != null && dTasks[idx]) {
      delete dTasks[idx];
    }
    if (charaID) {
      this.m_Lab.removeFacChara(facID, charaID);
    }
  }
  afterTask(facID, dTaskData, dRet) {
    const taskID = dTaskData.id;
    const dTaskConfig = mbgGame.config.tasks[taskID];
    const pobj = this.pobj();
    if (!dTaskConfig) {
      mbgGame.logError(`no dTaskConfig ${facID}`);
    }
    this.getTaskReward(taskID, dRet);
    pobj.giveAward(dRet, `task_${taskID}`);

    pobj.m_Stat.addStatVal("dotask", 1);
  }
  haltTask(facID) {
    const dFac = this.m_Lab.getFacDataByFacID(facID);
    if (!dFac.trT) {
      return;
    }
    this.removeTask(facID);
  }
  tryFinishTask(facID, fast, dRet) {
    const err = this.validFinishTask(facID, fast);
    if (err) {
      return err;
    }
    if (fast) {
      const leftTime = this.getLeftTime(facID);
      const costDiamonds = this.m_Lab.calFastDiamonds(labdefines.FacID2Type[facID], leftTime);
      if (costDiamonds > 0) {
        if (!this.pobj().hasDiamonds(costDiamonds)) {
          return mbgGame.config.ErrCode.LackDiamond;
        }
        this.pobj().addDiamonds(-costDiamonds, null, 'fastRead');
      }
    }
    this.finishTask(facID, dRet);
    return mbgGame.config.ErrCode.OK;
  }
  addCoins(iAdd, tag) {
    this.pobj().addCoins(iAdd, tag);
  }
}

module.exports = CCollectorMgr;