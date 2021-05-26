class CBase {
  constructor(pobj) {
    this.m_TimerOwnerID = mbgGame.common.timer.timerMgr.newOwnerID();
    this.m_pobj = pobj;
  }
  release() {
    mbgGame.common.timer.timerMgr.removeAllCallOutByOwner(this);
    this.m_pobj = null;
    this.m_TimerOwnerID = null;
    if (this.customRelease) {
      this.customRelease();
    }
  }
  pobj() {
    return this.m_pobj;
  }
  logInfo(...args) {
    if (!this.pobj()) {
      mbgGame.logError(...args);
      return;
    }
    this.pobj().logInfo(...args);
  }
  logError(...args) {
    if (!this.pobj()) {
      mbgGame.logError(...args);
      return;
    }
    this.pobj().logError(...args);
  }
}


module.exports = CBase;