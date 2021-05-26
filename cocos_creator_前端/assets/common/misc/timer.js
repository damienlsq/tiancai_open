/*
 *  定时器
 */
const timer = {
  // ---------- internal, don't access -------------------------------
  timerObjs: {},
  timerOwnerCount: 0,
  // ---------- API --------------------------------------------------
  newOwnerID() {
    this.timerOwnerCount += 1;
    return this.timerOwnerCount;
  },
  getOwnerID(iOwnerID) {
    if (typeof (iOwnerID) === "number") {
      if (iOwnerID > this.timerOwnerCount) {
        return null;
      }
      return iOwnerID;
    }
    return iOwnerID.m_TimerOwnerID;
  },
  hasCallOut(iOwnerID, flag) {
    iOwnerID = this.getOwnerID(iOwnerID);
    if (this.timerObjs[iOwnerID] === undefined) {
      return false;
    }
    const timerObj = this.timerObjs[iOwnerID][flag];
    if (!timerObj) {
      return false;
    }
    return true;
  },
  removeCallOut(iOwnerID, flag) {
    iOwnerID = this.getOwnerID(iOwnerID);
    if (this.timerObjs[iOwnerID] === undefined) {
      return;
    }
    const timerObj = this.timerObjs[iOwnerID][flag];
    if (!timerObj) {
      return;
    }
    timerObj.pause();
    this.timerObjs[iOwnerID][flag] = null;
  },
  pauseCallOut(iOwnerID, flag) {
    iOwnerID = this.getOwnerID(iOwnerID);
    if (this.timerObjs[iOwnerID] === undefined) {
      return;
    }
    const timerObj = this.timerObjs[iOwnerID][flag];
    timerObj.pause();
  },
  resumeCallOut(iOwnerID, flag) {
    iOwnerID = this.getOwnerID(iOwnerID);
    if (this.timerObjs[iOwnerID] === undefined) {
      return;
    }
    const timerObj = this.timerObjs[iOwnerID][flag];
    if (!timerObj) {
      return;
    }
    timerObj.resume();
  },
  // 快速接口，可省略iOwnerID和flag
  repeat(func, option) {
    const iOwnerID = option.ownerID || this.newOwnerID();
    const sFlag = option.flag || `anonymous_${iOwnerID}_${Math.round(Math.random() * 100000)}`;
    option.flag = sFlag;
    this.callOut(iOwnerID, func, option);
    return iOwnerID;
  },
  /*
      option = {
      time: 时间(s)
      flag: 这个回调的名字
      forever: 是否循环,
      count: 重复执行次数 (forever为true时忽略此参数)
      }
      */
  callOut(iOwnerID, func, option) {
    const iTime = option.time;
    const sFlag = option.flag;
    iOwnerID = this.getOwnerID(iOwnerID);
    this.removeCallOut(iOwnerID, sFlag);
    if (this.timerObjs[iOwnerID] === undefined) {
      this.timerObjs[iOwnerID] = {};
    }
    const timerObj = new this.Timer(func, iTime, option.forever, option.count);
    this.timerObjs[iOwnerID][sFlag] = timerObj;
  },
  pauseAllCallOutByOwner(iOwnerID) {
    iOwnerID = this.getOwnerID(iOwnerID);
    const dTimer = this.timerObjs[iOwnerID];
    for (const sFlag in dTimer) {
      const timerObj = dTimer[sFlag];
      if (timerObj) {
        timerObj.pause();
      } else {
        cc.warn("[pauseAllCallOut] timerObj is null, sFlag=", sFlag);
      }
    }
  },
  pauseAllCallOut() {
    // mbgGame.log("[pauseAllCallOut]", this.timerObjs);
    for (let iOwnerID in this.timerObjs) {
      iOwnerID = parseInt(iOwnerID);
      this.pauseAllCallOutByOwner(iOwnerID);
    }
  },
  resumeAllCallOut() {
    for (const iOwnerID in this.timerObjs) {
      const dTimer = this.timerObjs[iOwnerID];
      for (const sFlag in dTimer) {
        const timerObj = this.timerObjs[iOwnerID][sFlag];
        timerObj.resume();
      }
    }
  },
  removeAllCallout() {
    this.pauseAllCallOut();
    this.timerObjs = {};
    this.timerOwnerCount = 0;
  },
  // --- Don't use it, still testing -----------------------------------------
  /*
      timerActions: {},
      timerSpCount: 0,
      ccRemoveCallOut: function(timerSp, flag) {
      if (timerActions[timerSp] === undefined)
      return;
      if (!timerActions[timerSp][flag])
      return;
      var ac = timerActions[timerSp][flag];
      timerSp.stopAction(ac);
      //timerSp.stopAllActions();
      delete timerActions[timerSp][flag];
      },
      ccCallOut: function(timerSp, func, iTime, flag, forever) {
      Remove_Call_Out(timerSp, flag);
      var acdelay = new cc.DelayTime(iTime);
      var callback = new cc.CallFunc(func, timerSp);
      var sequence = new cc.Sequence(acdelay, callback);
      if (forever)
      sequence = new cc.RepeatForever(sequence);
      timerSp.runAction(sequence);
      sequence.retain();
      if (timerActions[timerSp] === undefined)
      timerActions[timerSp] = {};
      timerActions[timerSp][flag] = sequence;
      },
      //创建辅助TimerSprite-------
      CreateTimerSp: function(root) {
      var timerSp = new cc.Node();
      root.addChild(timerSp);
      this.timerSpCount += 1;
      iOwnerID = this.timerSpCount;
      return timerSp;
      },
      RemoveTimerSp: function(timerSp) {
      root.removeChild(timerSp);
      },
      */
  //--------------------------------------------------------------------------
  Functor(timerSp, func) {
    return function () {
      func.apply(timerSp);
    };
  },
};


class Timer {
  constructor(callback, delay, forever, times) {
    this.callback = callback;
    this.remaining = delay;
    this.isforever = forever;
    this.times = times;
    this.resume();
  }
  init(callback, delay, forever, times) {
    this.callback = callback;
    this.remaining = delay;
    this.isforever = forever;
    this.times = times;
    this.resume();
  }
  pause() {
    clearTimeout(this.timerId);
    if (!this.isforever) {
      this.remaining -= new Date() - this.start;
    }
  }
  resume() {
    this.start = new Date();
    clearTimeout(this.timerId);
    if (this.isforever) {
      this.timerId = setInterval(this.callback, this.remaining * 1000);
    } else if (this.times > 0) {
      this.timerId = setInterval(this.onTimeOut.bind(this), this.remaining * 1000);
    } else {
      this.timerId = setTimeout(this.callback, this.remaining * 1000);
    }
  }
  onTimeOut() {
    this.times -= 1;
    if (this.times === 0) {
      clearTimeout(this.timerId);
    }
    this.callback();
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
  setLogicTimer(oLogicTimer) {
    this.m_LogicTimer = oLogicTimer;
  }
  getLogicTimer() {
    return this.m_LogicTimer;
  }
  hasCallOut(sFlag) {
    if (this.m_Flag2SchCount[sFlag]) {
      return true;
    }
    return false;
  }
  callOut(iDelay, sFlag, func) {
    if (this.m_Flag2SchCount[sFlag]) {
      // 严重问题
      throw `重复的Schedule sFlag=${sFlag}`;
    }
    if (iDelay < 1) {
      iDelay = 1;
    }
    this.m_SchCount += 1;
    const args = [];
    if (arguments.length > 3) {
      for (let i = 3; i < arguments.length; ++i) {
        args.push(arguments[i]);
      }
    }
    this.m_Schedule[this.m_SchCount] = [func, args];
    this.m_Flag2SchCount[sFlag] = this.m_SchCount;
    if (!this.m_LogicTimer) {
      cc.warn("[callOut] this.m_LogicTimer undefined");
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
    delete this.m_Schedule[iSchCount];
    if (!this.m_LogicTimer) {
      cc.warn("[removeCallOut] this.m_LogicTimer undefined");
      return;
    }
    this.m_LogicTimer.popSchedule(sFlag, iSchCount);
  }
  removeAllCallout() {
    for (const sFlag in this.m_Flag2SchCount) {
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
    // mbgGame.log('this.m_Schedule',this.m_Schedule)
    try {
      func.apply(this, args);
    } catch (e) {
      mbgGame.error(`[timer onCallout ${sFlag}]`, e.stack);
    }
  }
}

/*
* 逻辑计时器，用G.timer.callOut来调用addFrame，即可实现逻辑时间和现实时间的同步更新
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
    this.m_Data = {};
    this.m_OnAddFrameFunc = null;
  }
  getCurFrame() {
    return this.m_Frame;
  }
  addFrame(iFrame) {
    this.m_Frame += iFrame;
    // mbgGame.log('addFrame',this.m_Frame,this.m_Slot.length);
    const func = this.m_OnAddFrameFunc;
    if (!func) {
      return;
    }
    try {
      func.apply(this.m_Owner);
    } catch (e) {
      mbgGame.error(`[timer addFrame ${iFrame}]`, e.stack);
    }
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
      const info = schList.shift();
      const iSchCount = info[0];
      const sFlag = info[1];
      this.m_Owner.onCallout(sFlag, iSchCount);
    }
  }
  getKey(sFlag, iSchCount) {
    return `${sFlag}_${iSchCount}`;
  }
  pushSchedule(iDelay, sFlag, iSchCount) {
    const iEndFrame = this.m_Frame + iDelay;
    const key = this.getKey(sFlag, iSchCount);
    this.m_Data[key] = iEndFrame;
    if (!this.m_Slot[iEndFrame]) {
      this.m_Slot[iEndFrame] = [];
    }
    this.m_Slot[iEndFrame].push([iSchCount, sFlag]);
  }
  popSchedule(sFlag, iSchCount) {
    const key = this.getKey(sFlag, iSchCount);
    const iEndFrame = this.m_Data[key];
    let lst = this.m_Slot[iEndFrame];
    if (!lst) {
      return;
    }
    for (let i = 0, len = lst.length; i < len; ++i) {
      const tItem = lst[i];
      if (tItem[0] === iSchCount && tItem[1] === sFlag) {
        const idx = lst.indexOf(i);
        if (idx !== -1) {
          lst.splice(idx, 1);
        }
        break;
      }
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

timer.Timer = Timer;
timer.CSchedule = CSchedule;
timer.CLogicTimer = CLogicTimer;

module.exports = timer;
