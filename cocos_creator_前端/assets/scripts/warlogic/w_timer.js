
/*
 * 逻辑计时器，用callOut来调用addFrame，即可实现逻辑时间和现实时间的同步更新
 */
class CLogicTimer {
  constructor(owner, func) {
    this.clean();
    this.m_Owner = owner;
    this.m_OnAddFrameFunc = func;
  }
  clean() {
    this.m_Frame = 0;
    this.m_Slot = {};
    this.m_Flag2EndFrame = {};
  }
  releaseLogicTimer() {
    this.m_Frame = 0;
    this.m_Slot = null;
    this.m_Flag2EndFrame = null;
    this.m_OnAddFrameFunc = null;
    this.m_Owner = null;
  }
  getCurFrame() {
    return this.m_Frame;
  }
  addFrame(iFrame) {
    this.m_Frame += iFrame;
    // cc.log('addFrame',this.m_Frame,this.m_Slot.length);
    const func = this.m_OnAddFrameFunc;
    if (!func) {
      return;
    }
    func.apply(this.m_Owner);
  }
  checkSchedule() {
    const iFrame = this.m_Frame;
    if (!this.m_Slot[iFrame]) {
      return false;
    }
    return true;
  }
  processSchedule() {
    if (!this.m_Owner) {
      return;
    }
    if (!this.checkSchedule()) {
      return;
    }
    const schList = this.popScheduleList();
    while (schList.length > 0) {
      if (!this.m_Owner) {
        return;
      }
      const info = schList.shift();
      const iSchCount = info[0];
      const sFlag = info[1];
      this.m_Owner.onCallout(sFlag, iSchCount);
    }
  }
  getInnerFlag(sFlag, iSchCount) {
    return `${sFlag}_${iSchCount}`;
  }
  getLeftFrame(iSchCount, sFlag) {
    for (const iEndFrame in this.m_Slot) {
      const lst = this.m_Slot[iEndFrame];
      for (let i = 0; i < lst.length; i++) {
        const tItem = lst[i];
        if (tItem[0] === iSchCount && tItem[1] === sFlag) {
          return Math.max(0, iEndFrame - this.m_Frame);
        }
      }
    }
    return null;
  }
  pushSchedule(iDelay, sFlag, iSchCount) {
    const iEndFrame = this.m_Frame + iDelay;
    const sInnerFlag = this.getInnerFlag(sFlag, iSchCount);
    this.m_Flag2EndFrame[sInnerFlag] = iEndFrame;
    if (!this.m_Slot[iEndFrame]) {
      this.m_Slot[iEndFrame] = [];
    }
    this.m_Slot[iEndFrame].push([iSchCount, sFlag]);
  }
  popSchedule(sFlag, iSchCount) {
    const sInnerFlag = this.getInnerFlag(sFlag, iSchCount);
    const iEndFrame = this.m_Flag2EndFrame[sInnerFlag];
    if (this.m_Flag2EndFrame[sInnerFlag] != null) {
      delete this.m_Flag2EndFrame[sInnerFlag];
    }
    const lst = this.m_Slot[iEndFrame];
    if (!lst) {
      return;
    }
    for (let i = 0, len = lst.length; i < len; ++i) {
      const tItem = lst[i];
      if (tItem[0] === iSchCount && tItem[1] === sFlag) {
        lst.splice(i, 1);
        break;
      }
    }
    if (lst.length === 0) {
      delete this.m_Slot[iEndFrame];
    }
  }
  popScheduleList() {
    const iFrame = this.m_Frame;
    if (!this.m_Slot[iFrame]) {
      return [];
    }
    const schList = this.m_Slot[iFrame];
    delete this.m_Slot[iFrame];
    return schList;
  }
}

/*
 * 调度类
 * 逻辑定时器的接口类
 * 这个类是用来继承的
 */
class CSchedule {
  constructor() {
    this.m_Schedule = {};
    this.m_Flag2SchCount = {};
    this.m_SchCount = 0;
  }
  releaseSchedules() {
    this.m_Schedule = null;
    this.m_Flag2SchCount = null;
  }
  setLogicTimer(oLogicTimer) {
    this.m_LogicTimer = oLogicTimer;
  }
  getLogicTimer() {
    return this.m_LogicTimer;
  }
  getRemainingTime(sFlag) {
    const iSchCount = this.m_Flag2SchCount[sFlag];
    return this.m_LogicTimer.getLeftFrame(iSchCount, sFlag);
  }
  hasCallOut(sFlag) {
    if (this.m_Flag2SchCount[sFlag]) {
      return true;
    }
    return false;
  }
  callOut(iDelay, sFlag, func, ...args) {
    if (this.m_Flag2SchCount[sFlag]) {
      // 严重问题
      throw new Error(`重复的Schedule sFlag=${sFlag}`);
    }
    if (iDelay < 1) {
      iDelay = 1;
    }
    this.m_SchCount += 1;
    this.m_Schedule[this.m_SchCount] = [func, args];
    this.m_Flag2SchCount[sFlag] = this.m_SchCount;
    if (!this.m_LogicTimer) {
      console.error("[callOut] this.m_LogicTimer undefined");
      return;
    }
    this.m_LogicTimer.pushSchedule(iDelay, sFlag, this.m_SchCount);
  }
  removeCallOut(sFlag) {
    if (!this.m_Flag2SchCount[sFlag]) {
      return;
    }
    const iSchCount = this.m_Flag2SchCount[sFlag];
    delete this.m_Flag2SchCount[sFlag];
    this.m_Schedule[iSchCount].splice(0, this.m_Schedule[iSchCount].length);
    delete this.m_Schedule[iSchCount];
    if (!this.m_LogicTimer) {
      console.error("[removeCallOut] this.m_LogicTimer undefined");
      return;
    }
    this.m_LogicTimer.popSchedule(sFlag, iSchCount);
  }
  removeAllCallout(ignoreFlags) {
    const sFlagList = [];
    for (const sFlag in this.m_Flag2SchCount) {
      sFlagList.push(sFlag);
    }
    for (let i = 0; i < sFlagList.length; i++) {
      const sFlag = sFlagList[i];
      if (ignoreFlags && ignoreFlags.indexOf(sFlag) !== -1) {
        continue;
      }
      this.removeCallOut(sFlag);
    }
  }
  onCallout(sFlag, iSchCount) {
    if (!this.m_Schedule[iSchCount]) {
      return;
    }
    const info = this.m_Schedule[iSchCount];
    const func = info[0];
    const args = info[1];
    this.removeCallOut(sFlag);
    // cc.log('this.m_Schedule',this.m_Schedule)
    func.apply(this, args);
  }
}

module.exports = {
  CLogicTimer,
  CSchedule,
};