cc.Class({
  extends: cc.Component,

  properties: {
    msgLabel: {
      default: null,
      type: cc.RichText,
    },
  },

  initBox(text, action, link) {
    this.msgLabel.string = text;
    if (action) {
      this.action = action;
    }
    if (link) {
      this.link = link;
    }
    // mbgGame.log("text,", text, action, link);
  },

  clickOK() {
    switch (this.action) {
      case 'restart':
        mbgGame.restart();
        break;
      case 'link':
        cc.sys.openURL(this.link);
        break;
      case 'exit':
        if (cc.sys.isNative) {
          if (mbgGame.isIOS()) {
            jsb.reflection.callStaticMethod('NativeOcClass', 'exitGame');
          }
          if (mbgGame.isAndroid()) {
            jsb.reflection.callStaticMethod(mbgGame.packageName, 'exitGame', '()V');
          }
        }
        return;
      case 'fix':
        mbgGame.clientFix();
        return;
      default:
        break;
    }
    if (mbgGame.loading) {
      this.node.active = false;
    } else {
      if (this.node._winBase && this.node._winBase.closeMe) {
        this.node._winBase.closeMe();
      }
      if (mbgGame.managerUi) {
        mbgGame.managerUi.checkCachedMessage();
      }
    }
  },
});
