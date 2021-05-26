cc.Class({
  extends: cc.Component,

  properties: {},

  onLoad() {
    this.progressBar = this.node.getComponent(cc.ProgressBar);
  },

  setProgressAnim(startPercent, loopCount, endPercent, time) {
    this.unscheduleAllCallbacks();
    if (time <= 0) {
      this.progressBar.progress = endPercent;
    } else {
      this.progressLong = (endPercent - startPercent + loopCount) || 0.1;
      // mbgGame.log("setProgressAnim progressLong", this.progressLong);
      this.progressAdd = (this.progressLong / time) / 60.0;
      this.longCount = 0;
      this.cur = startPercent;
      this.schedule(() => {
        this.longCount += this.progressAdd;
        if (this.longCount >= this.progressLong) {
          this.cur += this.progressAdd - (this.longCount - this.progressLong);
          this.updataProgress();
          this.progressAnimEnd();
        } else {
          this.cur += this.progressAdd;
          this.updataProgress();
        }
      }, 0);
    }
  },

  updataProgress() {
    if (this.cur > 1) {
      this.cur -= 1;
      this.progressFull();
    }
    this.progressBar.progress = this.cur;
  },

  progressAnimEnd() {
    this.unscheduleAllCallbacks();
    if (this.endCallback) {
      this.endCallback();
    }
  },

  progressFull() {
    if (this.fullCallback) {
      this.fullCallback();
    }
  },
});