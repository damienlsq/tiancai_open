cc.Class({
  extends: cc.Component,

  properties: {
  },

  // use this for initialization
  onLoad() {

  },
  setDialogBubble(dialogBubble) {
    this.dialogBubble = dialogBubble;
  },
  say(text, pos, arrowType, aboutHide, hideDelay, checkOutWin) {
    if (!text || typeof (text) !== "string") {
      mbgGame.error("say invalid text", text);
      return;
    }
    if (!this.dialogBubble) {
      this.dialogBubble = cc.instantiate(mbgGame.managerUi.dialogBubblePre);
      this.node.addChild(this.dialogBubble);
    }
    if (aboutHide) {
      if (!hideDelay) {
        hideDelay = text.length * 0.25;
      }
    }
    this.dialogBubble.active = true;
    this.dialogBubble.getComponent('dialogBubble').say(text, pos, arrowType, hideDelay, checkOutWin);
  },
  dialogBubbleCom() {
    return this.dialogBubble.getComponent('dialogBubble');
  },
  hideDialogBubble() {
    if (this.dialogBubble) this.dialogBubble.active = false;
  },
});
