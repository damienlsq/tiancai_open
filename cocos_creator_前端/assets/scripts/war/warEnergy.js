const defines = require('warDefines');

cc.Class({
  extends: cc.Component,

  properties: {
    energyLabel: cc.Label,
    progressBar: cc.ProgressBar,
    worldIdx: 0,
    e: 0,
  },

  // use this for initialization
  onLoad() { },
  update(dt) {
    if (!mbgGame.warMgr) return;
    if (this.e >= 100) {
      return;
    }
    const com = mbgGame.warMgr.getWarCom(this.worldIdx);
    if (!com || !com.isStarted() || com.isPaused()) {
      return;
    }
    let e = this.e;
    e += (mbgGame.replaySpeed || 1) * dt * com.getEnergyAddPerSecond(com.isDefender() ? defines.TEAM_RIGHT : defines.TEAM_LEFT);
    if (e > 100) {
      e = 100;
    }
    this.setEnergy(e);
  },
  getEnergy() {
    return this.e;
  },
  setEnergy(e) {
    this.e = e;
    this.progressBar.progress = this.e / 100;
    e = Math.floor(e);
    this.energyLabel.string = `${e}/${100}`;
  },
  // called every frame, uncomment this function to activate update callback
  // update: function (dt) {

  // },
});