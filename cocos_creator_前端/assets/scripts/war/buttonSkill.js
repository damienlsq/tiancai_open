cc.Class({
  extends: cc.Component,

  properties: {
    progressMask: cc.Node,
    iconEnable: cc.Node,
    energyLabel: cc.Label,
    skillBtn: cc.Button,

    pBar: cc.ProgressBar,
    pBarNode: cc.Node,
    glowNode: cc.Node,
  },

  // use this for initialization
  onLoad() {
    this.m_Enabled = true;
    this.pBarNode.color = mbgGame.hex2color("#3A3030");
    emitter.on(this, 'cleanWar', this.onCleanWar);
    this.skillBtn.node.on(cc.Node.EventType.TOUCH_END, this.onClickSkill, this);
  },
  onCleanWar() {
    this.objID = null;
  },
  initMe(charaID, objID) {
    this.objID = objID;
    this.charaID = charaID;
    this.setEnabled(false);
    this.setCdPercent(1);
  },
  setEnergy(iEnergy) {
    this.energyLabel.string = iEnergy;
  },
  setEnabled(enabled) {
    // mbgGame.error("setEnabled", enabled);
    this.m_Enabled = enabled;
    if (!enabled) {
      this.setCdPercent(1);
    }
  },
  onClickSkill() {
    if (!this.m_Enabled) {
      return;
    }
    emitter.emit("onClickBtn", this.objID);
  },
  // 设置cd 百分比
  // 1是全黑 0是不黑
  setCdPercent(percent) {
    this.pBar.progress = percent;
    this.setButtonImg(percent <= 0);
  },
  setButtonImg(b) {
    this.glowNode.active = b;
    if (b && !this.m_glowLoaded) {
      const spineObject = this.glowNode.getComponent("spineObject");
      spineObject.onSpineLoad = function () {
        this.playAnimation('animation');
      };
      spineObject.loadSpine('btnglow');
      this.m_glowLoaded = true;
    }
    if (!b) {
      const img = `head_${this.charaID}_skill`;
      mbgGame.resManager.setImageFrame(this.iconEnable, 'images', img);
    }
  },
});