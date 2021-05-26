cc.Class({
  extends: cc.Component,

  properties: {
    maskUp: cc.Node,
    maskDown: cc.Node,
    continueTips: cc.Node,
    skipButton: cc.Node,
  },
  onLoad() {
    this.m_canTouch = true;
  },
  onSkip() {
    if (this.m_SkipCB) {
      this.m_SkipCB();
    }
  },
  setSkipCB(cb) {
    this.m_SkipCB = cb;
  },
  haltMaskAction() {
    this.maskUp.stopAllActions();
    this.maskDown.stopAllActions();
  },
  setMaskMode(mode) {
    switch (mode) {
      case 'labHall':
        // iphoneX适配，因为上层mask已经修正过，所以不需要修正！可能很费解，不用想了，只要上层，负数坐标不需要修正，正数需要减fixy,下层就相反
        this.m_MaskTopPos = 320;
        this.m_MaskBottomPos = -320 - mbgGame.fixed_y;
        break;
      default:
        this.m_MaskTopPos = 350 + (mbgGame.fixed_y / 2);
        this.m_MaskBottomPos = -350 - (mbgGame.fixed_y / 2);
        break;
    }
  },
  showMask(continueTipsY, duration) {
    this.unscheduleAllCallbacks();
    this.maskUp.stopAllActions();
    this.maskDown.stopAllActions();
    duration = duration == null ? 0.5 : duration;
    if (!this._oriTopY) {
      this._oriTopY = this.maskUp.y;
    }
    if (!this._oriBottomY) {
      this._oriBottomY = this.maskDown.y;
    }
    if (duration <= 0) {
      this.maskUp.setPosition(new cc.Vec2(0, this.m_MaskTopPos));
      this.maskDown.setPosition(new cc.Vec2(0, this.m_MaskBottomPos));
      this.showContinueTips(continueTipsY);
      return;
    }
    this.maskUp.runAction(cc.moveTo(duration, new cc.Vec2(0, this.m_MaskTopPos)));
    this.maskDown.runAction(cc.moveTo(duration, new cc.Vec2(0, this.m_MaskBottomPos)));
    this.scheduleOnce(() => {
      this.showContinueTips(continueTipsY);
    }, duration);
  },
  showContinueTips(continueTipsY) {
    this.continueTips.active = true;
    this.continueTips.y = continueTipsY - mbgGame.fixed_y;
    this.continueTips.stopAllActions();
    this.continueTips.runAction(cc.sequence(cc.fadeTo(1.0, 100), cc.fadeIn(1.0)).repeatForever());
  },
  closeMask(duration) {
    duration = 0.5;
    this.maskUp.runAction(cc.moveTo(duration, new cc.Vec2(0, this._oriTopY)));
    this.maskDown.runAction(cc.moveTo(duration, new cc.Vec2(0, this._oriBottomY)));
    this.scheduleOnce(() => {
      this.continueTips.active = false;
      mbgGame.managerUi.uiLayerDialog.active = false;
      this.node.destroy();
    }, duration);
  },
  onTouch() {
    if (this.m_canTouch) {
      this.m_canTouch = false;
      this.scheduleOnce(() => {
        this.m_canTouch = true;
      }, 0.5);
      if (this.m_TouchCB) {
        this.m_TouchCB();
      }
    }
  },
  setTouchCB(cb) {
    this.m_TouchCB = cb;
  },
});
