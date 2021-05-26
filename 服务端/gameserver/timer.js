// 简单封装js的定时器接口，方便以后debug

let timerMgr;

// time的单位是毫秒
function _setTimer(time, callback, repeat) {
  let timerID = null;
  if (!repeat) {
    timerID = setTimeout(callback, time);
  } else {
    timerID = setInterval(callback, time);
  }
  return timerID;
}

function setOnceTimer(time, callback) {
  return _setTimer(time, callback, false);
}

function setRepeatTimer(time, callback) {
  return _setTimer(time, callback, true);
}

function removeTimer(timerID) {
  if (!timerID) {
    return;
  }
  try {
    clearTimeout(timerID);
    clearInterval(timerID);
  } catch (e) {
    console.error('removeTImer failed');
  }
}


class CTimer {
  constructor(callback, delay, forever, times) {
    this.callback = callback;
    this.remaining = delay; // 秒
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
    if (this.isforever || this.times != null) {
      clearInterval(this.timerId);
    } else {
      clearTimeout(this.timerId);
    }
    if (!this.isforever) {
      this.remaining -= new Date() - this.start;
    }
  }
  stop() {
    this.pause();
    this.callback = null;
  }
  resume() {
    this.start = new Date();
    if (this.isforever || this.times != null) {
      clearInterval(this.timerId);
    } else {
      clearTimeout(this.timerId);
    }
    if (this.isforever) {
      this.timerId = setInterval(this.callback, this.remaining * 1000);
    } else if (this.times > 0) {
      this.timerId = setInterval(this.onTimeOut.bind(this), this.remaining * 1000);
    } else {
      this.timerId = setTimeout(this.onOnceTimeOut.bind(this), this.remaining * 1000);
    }
  }
  onOnceTimeOut() {
    try {
      this.callback();
    } catch (e) {
      mbgGame.logError('timer', e);
    }
    timerMgr.onOnceTimeOut(this);
  }
  // used by forever timer
  onTimeOut() {
    this.times -= 1;
    if (this.times === 0) {
      clearInterval(this.timerId);
    }
    this.callback();
  }
}


class TimerMgr {
  constructor() {
    this.timerObjs = {};
    this.timerOwnerCount = 0;
  }

  // ---------- API --------------------------------------------------
  newOwnerID() {
    this.timerOwnerCount += 1;
    return this.timerOwnerCount;
  }
  getOwnerID(iOwnerID) {
    if (typeof (iOwnerID) === "number") {
      if (iOwnerID > this.timerOwnerCount) {
        return null;
      }
      return iOwnerID;
    }
    return iOwnerID.m_TimerOwnerID;
  }
  // 单次定时器需要实现自动回收
  onOnceTimeOut(timerObj) {
    const iOwnerID = timerObj.m_OwnerID;
    const _timerObjs = this.timerObjs[iOwnerID];
    let sFlag;
    for (const _sFlag in _timerObjs) {
      if (_timerObjs[_sFlag] === timerObj) {
        sFlag = _sFlag;
        break;
      }
    }
    if (sFlag) {
      this.removeCallOut(iOwnerID, sFlag);
    }
  }
  hasCallOut(iOwnerID, flag) {
    iOwnerID = this.getOwnerID(iOwnerID);
    if (this.timerObjs[iOwnerID] == null) {
      return false;
    }
    const timerObj = this.timerObjs[iOwnerID][flag];
    if (!timerObj) {
      return false;
    }
    return true;
  }
  removeCallOut(iOwnerID, flag) {
    iOwnerID = this.getOwnerID(iOwnerID);
    if (this.timerObjs[iOwnerID] == null) {
      return;
    }
    if (this.timerObjs[iOwnerID][flag] == null) {
      return;
    }
    const timerObj = this.timerObjs[iOwnerID][flag];
    delete this.timerObjs[iOwnerID][flag];
    timerObj.stop();
    if (_.isEmpty(this.timerObjs[iOwnerID])) {
      delete this.timerObjs[iOwnerID];
    }
  }
  pauseCallOut(iOwnerID, flag) {
    iOwnerID = this.getOwnerID(iOwnerID);
    if (this.timerObjs[iOwnerID] == null) {
      return;
    }
    const timerObj = this.timerObjs[iOwnerID][flag];
    timerObj.pause();
  }
  resumeCallOut(iOwnerID, flag) {
    iOwnerID = this.getOwnerID(iOwnerID);
    if (this.timerObjs[iOwnerID] == null) {
      return;
    }
    const timerObj = this.timerObjs[iOwnerID][flag];
    if (!timerObj) {
      return;
    }
    timerObj.resume();
  }
  // 快速接口，可省略iOwnerID和flag
  repeat(func, option) {
    const iOwnerID = option.ownerID || this.newOwnerID();
    const sFlag = option.flag || `anonymous_${iOwnerID}_${_.random(0, 100000)}`;
    option.flag = sFlag;
    this.callOut(iOwnerID, func, option);
    return iOwnerID;
  }

  /*
      option = {
          time: 时间(s)
          flag: 这个回调的名字
          forever: 是否循环,
          count: 重复执行次数 (forever为true时忽略此参数)
      }
   */
  callOut(iOwnerID, func, option) {
    if (!func) {
      console.error("[callOut] no func", option && option.flag);
      return;
    }
    const iTime = option.time;
    const sFlag = option.flag;
    iOwnerID = this.getOwnerID(iOwnerID);
    this.removeCallOut(iOwnerID, sFlag);
    if (this.timerObjs[iOwnerID] == null) {
      this.timerObjs[iOwnerID] = {};
    }
    const timerObj = new CTimer(func, iTime, option.forever, option.count);
    timerObj.m_OwnerID = iOwnerID;
    this.timerObjs[iOwnerID][sFlag] = timerObj;
  }
  getRemainingTime(iOwnerID, sFlag) {
    const timerObj = this.timerObjs[iOwnerID][sFlag];
    return timerObj.remaining;
  }
  pauseAllCallOutByOwner(iOwnerID) {
    iOwnerID = this.getOwnerID(iOwnerID);
    const dTimer = this.timerObjs[iOwnerID];
    if (dTimer) {
      const sFlagList = [];
      for (const sFlag in dTimer) {
        sFlagList.push(sFlag);
      }
      for (let i = 0, len = sFlagList.length; i < len; i++) {
        const sFlag = sFlagList[i];
        const timerObj = dTimer[sFlag];
        if (timerObj) {
          timerObj.pause();
        } else {
          mbgGame.logger.warn("[pauseAllCallOut] timerObj is null, sFlag=", sFlag);
        }
      }
    }
    this.timerObjs[iOwnerID] = {};
  }
  removeAllCallOutByOwner(iOwnerID) {
    iOwnerID = this.getOwnerID(iOwnerID);
    const dTimer = this.timerObjs[iOwnerID];
    if (dTimer) {
      const sFlagList = [];
      for (const sFlag in dTimer) {
        sFlagList.push(sFlag);
      }
      for (let i = 0, len = sFlagList.length; i < len; i++) {
        const sFlag = sFlagList[i];
        this.removeCallOut(iOwnerID, sFlag);
      }
    }
    if (this.timerObjs[iOwnerID] != null) {
      delete this.timerObjs[iOwnerID];
    }
  }
  pauseAllCallOut() {
    // cc.log("[pauseAllCallOut]", this.timerObjs);
    for (let iOwnerID in this.timerObjs) {
      iOwnerID = parseInt(iOwnerID);
      this.pauseAllCallOutByOwner(iOwnerID);
    }
  }
  resumeAllCallOut() {
    for (const iOwnerID in this.timerObjs) {
      const dTimer = this.timerObjs[iOwnerID];
      for (const sFlag in dTimer) {
        const timerObj = this.timerObjs[iOwnerID][sFlag];
        timerObj.resume();
      }
    }
  }
  removeAllCallout() {
    this.pauseAllCallOut();
    this.timerObjs = {};
    this.timerOwnerCount = 0;
  }
  // 当前现在有多少timer
  statistic() {
    let ownerCount = 0; // 定时器拥有者总个数
    let timerCount = 0; // 定时器对象总个数
    let errTimerCount = 0; // 有问题的定时器个数
    let foreverCount = 0; // 无限循环定时器个数
    for (const iOwnerID in this.timerObjs) {
      ownerCount += 1;
      for (const sFlag in this.timerObjs[iOwnerID]) {
        const timerObj = this.timerObjs[iOwnerID][sFlag];
        if (timerObj) {
          timerCount += 1;
          if (timerObj.isforever) {
            foreverCount += 1;
          }
        } else {
          errTimerCount += 1;
        }
      }
    }
    return {
      ownerCount,
      timerCount,
      errTimerCount,
      foreverCount,
    };
  }
}

if (!timerMgr) timerMgr = new TimerMgr();

module.exports = {
  setRepeatTimer,
  removeTimer,
  setOnceTimer,
  timerMgr,
};