const defines = require('warDefines');
const warBase = require('warBase');

cc.Class({
  extends: warBase,

  properties: {
  },

  // use this for initialization
  onLoad() {
  },
  getMonsterInfo(mID, lv, tag, cb) {
    if (!this.m_MonsterInfo) {
      this.m_MonsterInfo = {};
    }
    if (!(lv > 0)) {
      mbgGame.player.sendLog(`monsterinfo ${mID} ${lv} ${tag}`);
      lv = 1;
    }
    const key = `${mID}-${lv}`;
    if (this.m_MonsterInfo[key]) {
      cb(this.m_MonsterInfo[key]);
      return this.m_MonsterInfo[key];
    }
    const self = this;
    mbgGame.netCtrl.sendMsg("war.monsterinfo", {
      data: {
        mID,
        lv,
      },
    }, (data) => {
      mbgGame.log("[war.monsterinfo]", JSON.stringify(data));
      if (data.code === "ok") {
        self.m_MonsterInfo[key] = data.data;
        cb(self.m_MonsterInfo[key]);
      }
    });
    return null;
  },
  doStartAnalytisc(warCom) {
    const worldIdx = warCom.worldIdx;
    if (defines.StoryWorlds.indexOf(worldIdx) === -1) {
      return;
    }
    if (!mbgGame.player.canFightStoryStageBoss(worldIdx, warCom.stageIdx())) {
      return;
    }
    const tag = mbgGame.player.getAnalytiscStageTag(worldIdx, warCom.stageIdx());
    mbgGame.analytisc.startLevel(tag);
  },
  doResultAnalytisc(warCom, result) {
    const worldIdx = warCom.worldIdx;
    if (defines.StoryWorlds.indexOf(worldIdx) === -1) {
      return;
    }
    if (!mbgGame.player.canFightStoryStageBoss(worldIdx, warCom.stageIdx())) {
      return;
    }
    const tag = mbgGame.player.getAnalytiscStageTag(worldIdx, warCom.stageIdx());
    if (result === mbgGame.WarWin) {
      mbgGame.analytisc.finishLevel(tag);
    } else {
      mbgGame.analytisc.failLevel(tag);
    }
  },
});