cc.Class({
  extends: cc.Component,
  properties: {
    plotMaskPre: cc.Prefab,
    continueTipsY: -427,
  },
  onLoad() {

  },
  plotData() {
    return this.m_CurPlotData;
  },
  beginPlot(data, plotID) {
    if (this.m_CurPlotData) {
      // 同时只能播放一个剧情
      return;
    }
    if (_.isEmpty(data.dialogConfigs)) {
      // 没有对白
      return;
    }
    emitter.emit("closeMe");
    this.m_CurPlotID = plotID;
    this.m_CurPlotData = data;
    this.m_DialogIdx = 0;
    this.m_Skip = false;
    this.m_Waiting = false;
    mbgGame.managerUi.uiLayerDialog.active = true;
    // 上下黑幕
    this.initPlotMask(data);
    this.showPlotMask();
    this.customInitPlot();
    emitter.emit("beginPlot");
    mbgGame.ploting = true;
  },
  isShowingPlot() {
    return this.m_CurPlotData != null;
  },
  plotMaskCom() {
    const parent = mbgGame.managerUi.uiLayerDialog;
    const plotMask = parent.getChildByName('plotMask');
    if (plotMask) {
      return plotMask.getComponent("plotMask");
    }
    return null;
  },
  getOrCreatePlotMask() {
    const parent = mbgGame.managerUi.uiLayerDialog;
    let plotMask = parent.getChildByName('plotMask');
    if (!plotMask) {
      plotMask = cc.instantiate(this.plotMaskPre);
      parent.addChild(plotMask);
      plotMask.name = 'plotMask';
    }
    const plotMaskCom = plotMask.getComponent("plotMask");
    return plotMaskCom;
  },
  initPlotMask(data) {
    const plotMaskCom = this.getOrCreatePlotMask();
    plotMaskCom.setSkipCB(this.onSkipStory.bind(this));
    plotMaskCom.setTouchCB(this.onFinishDialog.bind(this));
    plotMaskCom.setMaskMode(data.plotMode);
    const watched = mbgGame.player.getLocalItem(`plot${this.m_CurPlotID}`);
    plotMaskCom.skipButton.active = watched && !data.noskip;
  },
  showPlotMask() {
    const plotMaskCom = this.getOrCreatePlotMask();
    plotMaskCom.showMask(this.continueTipsY, this.maskDuration);
  },
  closePlotMask() {
    const plotMaskCom = this.plotMaskCom();
    if (!plotMaskCom) {
      return;
    }
    plotMaskCom.closeMask(this.maskDuration);
  },
  // 跳过剧情
  onSkipStory() {
    if (!this.m_CurPlotData) {
      return;
    }
    if (this.m_CurPlotData.noskip) {
      return;
    }
    if (this.m_Skip) {
      return;
    }
    this.m_Skip = true;
    this.finishPlot();
  },
  onFinishDialog() {
    if (!this.m_CurPlotData) {
      return;
    }
    if (this.m_Waiting) {
      // 正在进场或出场，不处理调用
      return;
    }
    this.m_DialogIdx += 1;
    if (this.m_DialogIdx === this.getDialogs().length) {
      this.finishPlot();
    } else {
      this.showNextDialog();
    }
  },
  getDialogs() {
    return this.m_CurPlotData.dialogConfigs;
  },
  getNextDialogConfig() {
    const dConfig = this.getDialogs()[this.m_DialogIdx + 1];
    return dConfig;
  },
  getSpineName(dDialogConfig) {
    let mTplID = dDialogConfig.mTpl;
    if (mTplID > 0 && mTplID <= 15) mTplID += 4000;
    const dConfig = mbgGame.config[`mtpl${mTplID}`];
    if (!dConfig) {
      mbgGame.error("[story] no dConfig", mTplID);
    }
    return dConfig.spine;
  },
  setWait(waitTime) {
    this.m_Waiting = true;
    this.scheduleOnce(() => {
      this.m_Waiting = false;
    }, waitTime);
  },
  finishPlot() {
    if (!this.m_CurPlotData) {
      return;
    }
    this.closePlotMask();
    this.customFinishPlot();
    this.m_CurPlotData = null;
    mbgGame.ploting = false;
  },
  doEndCB() {
    mbgGame.player.setLocalItem(`plot${this.m_CurPlotID}`, 'ok');
    emitter.emit("endPlot");
    if (this.m_EndCB) {
      const cb = this.m_EndCB;
      delete this.m_EndCB;
      cb();
    }
  },
  setEndCB(endCB) {
    this.m_EndCB = endCB;
  },
  // override 剧情初始化
  customInitPlot() {

  },
  // override 播放下一行对白
  showNextDialog() {
    // const dConfig = this.getDialogs()[this.m_DialogIdx];
  },
  // override 结束剧情
  customFinishPlot() {

  },
});
