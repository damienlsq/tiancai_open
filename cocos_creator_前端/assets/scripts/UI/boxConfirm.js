cc.Class({
  extends: cc.Component,

  properties: {
    msgLabel: cc.RichText,
    leftBtn: cc.Node,
    rightBtn: cc.Node,
  },
  onLoad() {
    mbgGame.boxConfirm = this;
  },
  onDestroy() {
    delete mbgGame.boxConfirm;
    delete this.cb_param;
  },
  // 设置窗口文字
  setMsgLabel(text) {
    this.msgLabel.string = text;
    this.msgLabel.node.parent.height = this.msgLabel.node.height;
  },

  onAddBaseWin(data, cb, param) {
    if (!_.isString(data)) {
      if (data.msg) {
        this.setMsgLabel(data.msg);
      }

      if (data.rightBtnLabel) {
        this.rightBtn.getComponent('itemBtn').setBtnLabel(data.rightBtnLabel);
      }

      if (data.leftBtnLabel) {
        this.leftBtn.getComponent('itemBtn').setBtnLabel(data.leftBtnLabel);
      }

      if (data.rightBtnCB) {
        this.confirm_cb = data.rightBtnCB;
      }

      if (data.leftBtnCB) {
        this.setCancelCB(data.leftBtnCB);
      }

      if (data.allowRepeat) {
        delete mbgGame.boxConfirm;
      }
      return;
    }
    // 设置确认回调函数
    this.setMsgLabel(data);
    this.confirm_cb = cb;
    this.cb_param = param;
    // 禁止点背景关闭
    if (this.node && this.node.isValid && this.node._winBase) {
      this.node._winBase.avoidBgClose();
    }
  },

  // 点解确认按钮
  click_confirm() {
    if (this.confirm_cb) {
      this.confirm_cb(this.cb_param);
    }
    if (this.node && this.node.isValid && this.node._winBase) {
      this.node._winBase.closeMe();
    }
  },

  clickCancel() {
    if (this.m_CancelCB) {
      this.m_CancelCB();
    }
    if (this.node && this.node.isValid && this.node._winBase) {
      this.node._winBase.closeMe();
    }
  },

  setCancelCB(cb) {
    this.m_CancelCB = cb;
  },
});