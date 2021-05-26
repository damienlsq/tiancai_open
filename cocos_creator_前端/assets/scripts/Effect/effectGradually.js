cc.Class({
  extends: cc.Component,

  properties: {},

  // use this for initialization
  onLoad() {
    this.reset();
  },
  reset() {
    this.actionFinish = false;
    this.actionCount = 0;
    this.actionItem = [];
    this.defaultDelay = 0.3;
  },

  // 添加动画
  pushAction(funcBefore, funcAfter, funcEnd, duration) {
    this.actionItem[this.actionCount] = [];
    if (funcBefore) this.actionItem[this.actionCount].funcBefore = funcBefore;
    if (funcAfter) this.actionItem[this.actionCount].funcAfter = funcAfter;
    if (funcEnd) {
      if (funcEnd === "same") {
        funcEnd = funcAfter;
      }
      this.actionItem[this.actionCount].funcEnd = funcEnd;
    }
    if (duration) this.actionItem[this.actionCount].duration = duration;
    this.actionCount += 1;
  },

  // 跳过动画
  passAction() {
    if (this.actionFinish) {
      return;
    }
    this.unscheduleAllCallbacks();
    for (let i = 0; i < this.actionItem.length; i++) {
      if (this.actionItem[i].funcEnd) this.actionItem[i].funcEnd();
    }
    this.actionFinish = true;
    if (this.m_PassActionCB) {
      this.m_PassActionCB();
      delete this.m_PassActionCB;
    }
  },

  setPassActionCB(cb) {
    this.m_PassActionCB = cb;
  },

  // 准备动画
  readyAction() {
    for (let i = 0; i < this.actionItem.length; i++) {
      if (this.actionItem[i]) {
        if (this.actionItem[i].funcBefore) this.actionItem[i].funcBefore();
      }
    }
  },

  // 打印动画
  startAction() {
    let duration = 0;
    for (let i = 0; i < this.actionItem.length; i++) {
      if (this.actionItem[i]) {
        if (this.actionItem[i].funcAfter) {
          this.scheduleOnce(() => {
            this.actionItem[i].funcAfter();
          }, duration);
        }
        duration += this.actionItem[i].duration ? this.actionItem[i].duration : this.defaultDelay;
      }
    }
    this.scheduleOnce(function () {
      this.actionFinish = true;
      if (this.m_PassActionCB) {
        this.m_PassActionCB();
        delete this.m_PassActionCB;
      }
    }, duration);
  },
});