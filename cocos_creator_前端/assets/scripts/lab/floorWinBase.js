cc.Class({
  extends: cc.Component,

  onOpenedBase() {
    if (this.upBar) {
      this.upBar.node.active = false;
    }
    if (this.upLeftTime) {
      this.upLeftTime.node.active = false;
    }
  },
  onFastUpgrade() {
  },
  onRemove() {
    const charaID = this.m_Data.c && this.m_Data.c[0];
    if (!charaID) {
      return;
    }
    mbgGame.panelLab.removeCharaFromFac(this.m_FacID, charaID, true);
  },
  onDestroy() {
    if (this.onCloseCustom) {
      this.onCloseCustom();
    }
  },
  onUpdateTime() {
    this.btnText.string = '';
    this.upLeftTime.node.active = false;
    this.unschedule(this.onUpdateTime);
  },
});