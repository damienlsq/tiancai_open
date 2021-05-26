cc.Class({
  extends: cc.Component,

  properties: {
    frames: cc.Node,
    flags: cc.Node,
    flag: cc.Node,
  },

  onAddBaseWin(id, isClan) {
    this.node._winBase.setTitle(mbgGame.getString('title_flag'));

    const minFrames = parseInt(mbgGame.config.constTable.flagMax[isClan ? 2 : 0] / 1000);
    const minFlags = parseInt(mbgGame.config.constTable.flagMax[isClan ? 2 : 0] % 1000);
    const maxFlags = parseInt(mbgGame.config.constTable.flagMax[isClan ? 3 : 1] % 1000);
    const maxFrames = parseInt(mbgGame.config.constTable.flagMax[isClan ? 3 : 1] / 1000);

    for (let i = minFlags; i <= maxFlags; i++) {
      const flagCom = mbgGame.managerUi.addIconFlag(null, i, this.onChooseFlag.bind(this));
      this.flags.addChild(flagCom.node);
    }
    for (let i = minFrames; i <= maxFrames; i++) {
      const flagCom = mbgGame.managerUi.addIconFlag(null, i * 1000, this.onChooseFrame.bind(this));
      this.frames.addChild(flagCom.node);
    }

    this.chooseFlag = +id;
    mbgGame.managerUi.addIconFlag(this.flag, this.chooseFlag);
  },

  onChooseFlag(id) {
    this.chooseFlag = (Math.floor(this.chooseFlag / 1000) * 1000) + id;
    mbgGame.managerUi.addIconFlag(this.flag, this.chooseFlag);
  },

  onChooseFrame(id) {
    this.chooseFlag = id + Math.floor(this.chooseFlag % 1000);
    mbgGame.managerUi.addIconFlag(this.flag, this.chooseFlag);
  },

  onClickOK() {
    // mbgGame.log('chooseFlag:', this.chooseFrameID * 1000 + this.chooseFlagID);
    if (!this.chooseFlag) return;
    if (this.onChoose) {
      this.onChoose(this.chooseFlag);
    }
    this.node._winBase.closeMe();
  },

  onClickCancel() {
    this.node._winBase.closeMe();
  },
});
