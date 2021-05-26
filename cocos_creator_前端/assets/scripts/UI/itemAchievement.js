cc.Class({
  extends: cc.Component,

  properties: {
    nameLabel: cc.Label,
    descLabel: cc.Label,
    numLabel: cc.Label,
    medal: cc.Node,
    progressBar: cc.ProgressBar,
    buttonGet: cc.Node,
    labelGet: cc.Node,
    redTip: cc.Node,
    iconPos: cc.Node,

    starsNode: cc.Node,
  },

  // use this for initialization
  onLoad() {
    emitter.on(this, "refreshAchieve", this.onRefreshAchieve);
  },

  onDestroy() {
    emitter.off(this, "refreshAchieve");
  },

  onPressAchieve() {
    const achieveID = this.m_achieveID;
    mbgGame.log("[onPressAchieve]", achieveID);
    mbgGame.netCtrl.sendMsg("player.upachieve", {
      data: {
        achieveID,
      },
    }, (data) => {
      if (data.code === "ok") {
        mbgGame.setCache('player.achieveinfo', data.data);
        // mbgGame.log("refreshAchieve", achieveID);
        emitter.emit("refreshAchieve", achieveID);
        const logData = {};
        logData[mbgGame.getString(`achvname${achieveID}`)] = data.data.achieve[achieveID].lv;
      }
    });
  },
  onRefreshAchieve(achieveID) {
    if (achieveID !== this.m_achieveID) {
      return;
    }
    this.refreshAchieveInfo(this.m_achieveID);
  },
  refreshAchieveInfo(achieveID) {
    if (achieveID) {
      achieveID = +achieveID;
    }
    const data = mbgGame.getCache('player.achieveinfo');
    // mbgGame.log('refreshAchieveInfo', data, achieveID);
    if (!data) return;
    const dStatData = data.stat;
    const dAchieveData = data.achieve;
    if (!dStatData || !dAchieveData) return;
    const dConfig = mbgGame.config[`achieve${achieveID}`];
    if (!dConfig) return;
    this.m_achieveID = achieveID;
    const maxLv = dConfig.maxLv; // 默认lv = 0 最高lv = maxLv
    const dData = dAchieveData[achieveID] || {};
    const lv = dData.lv || 0;
    let upgrade = false;
    if (this.m_oldLv != null && lv !== this.m_oldLv && lv === maxLv) {
      upgrade = true;
    }
    this.starsNode.getComponent('stars').setStar(lv, maxLv);
    this.m_oldLv = lv;
    this.nameLabel.string = mbgGame.getString(`achvname${achieveID}`);
    const statID = mbgGame.player.getStatID(dConfig.StatName);
    if (lv < maxLv) {
      this.iconPos.removeAllChildren();
      [
        'diamonds',
        'gem',
        'mat',
        'sta',
        'coins',
        'score',
      ].forEach((x) => {
        if (!dData.award || !dData.award[x]) return;
        mbgGame.managerUi.getAwardItem(this.iconPos, { icon: `award_${x}`, count: dData.award[x] });
      });
      if (dData.award.items) {
        const arr = dData.award.items.split("x");
        mbgGame.managerUi.getAwardItem(this.iconPos, {
          style: 'unidentify',
          itemData: {
            i: +arr[0],
            q: +arr[2] || 1,
            s: +arr[3] || 0,
            lv: 1,
          },
        });
      }
      this.iconPos.opacity = 255;
      this.buttonGet.active = true;
      let percent = (dStatData[statID] || 0) / dConfig.values[lv];
      percent = percent > 1 ? 1 : percent;
      this.numLabel.string = `${mbgGame.smartNum(dStatData[statID] || 0)}/${mbgGame.smartNum(dConfig.values[lv])}`;
      this.progressBar.progress = percent;
      this.descLabel.string = mbgGame.getString(`achvdesc${achieveID}`, {
        a: mbgGame.smartNum(dConfig.values[lv]),
      });

      if (percent >= 1) {
        // this.progressBar.node.active = false;
        this.buttonGet.active = true;
      } else {
        // this.progressBar.node.active = true;
        this.buttonGet.active = false;
      }
      this.labelGet.active = false;
      this.medal.active = false;
    } else { // 完成五级成就
      this.numLabel.string = `${mbgGame.smartNum(dStatData[statID] || 0)}/${mbgGame.smartNum(dConfig.values[lv - 1])}`;
      this.progressBar.progress = 0;
      this.descLabel.string = mbgGame.getString(`achvdesc${achieveID}`, {
        a: mbgGame.smartNum((dStatData[statID] || 0)),
      });
      this.progressBar.progress = 1;
      this.progressBar.node.active = true;
      this.labelGet.active = true;
      this.buttonGet.active = false;
      if (upgrade) {
        // 升级到满星，播放动画
        if (!this.m_medalAnimating) {
          this.m_medalAnimating = true;
          this.iconPos.runAction(cc.sequence(
            cc.fadeOut(0.8),
            cc.callFunc(() => {
              this.iconPos.removeAllChildren();
            })));
          this.scheduleOnce(() => {
            this.medal.active = true;
            this.medal.setScale(0.2);
            this.medal.opacity = 0;
            const t = 0.8;
            const ac = cc.scaleTo(t, 1, 1);
            ac.easing(cc.easeBackOut());
            this.medal.runAction(ac);
            this.medal.runAction(cc.fadeIn(t));
          }, 0.8);

          this.scheduleOnce(() => {
            this.medalAniEnd = true;
          }, 1.3);
        }
      } else {
        if (this.m_medalAnimating && !this.medalAniEnd) {
          return;
        }
        this.iconPos.removeAllChildren();
        this.medal.active = true;
      }
    }
  },
});
