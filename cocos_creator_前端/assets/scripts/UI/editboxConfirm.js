cc.Class({
  extends: cc.Component,

  properties: {
    editBox: cc.EditBox,
    infoLabel: cc.RichText,
  },

  // use this for initialization
  onLoad() {
    this.editText = '';
    // 禁止点背景关闭
    this.node._winBase.avoidBgClose();
  },

  init(option, cb) {
    // mbgGame.log("this.init option:", option);

    if (option.info) {
      this.infoLabel.string = option.info;
    }

    if (option.hint) {
      this.editBox.placeholder = option.hint;
    }

    if (option.defaultStr) {
      this.editBox.string = option.defaultStr;
      this.editText = option.defaultStr;
    }

    if (option.limit) {
      this.editBox.maxLength = option.limit;
    }

    this.minLimit = 0;
    if (option.min) {
      this.minLimit = option.min;
    }

    this.confirm_cb = cb;
  },

  editChanged(text) {
    this.editText = text;
  },

  // 点解确认按钮
  click_confirm() {
    let limitMax = 8096;
    if (this.editBox.maxLength > 0) {
      limitMax = this.editBox.maxLength;
    }

    if (this.editText.length > limitMax || (this.minLimit && this.editText.length < this.minLimit)) {
      mbgGame.managerUi.floatMessage(mbgGame.getString("textLimit", {
        min: this.minLimit,
        max: limitMax,
        count: this.editText.length,
      }));
      return;
    }

    if (this.confirm_cb) {
      this.confirm_cb(this.editText);
    }
    this.node._winBase.closeMe();
  },

  clickCancel() {
    this.node._winBase.closeMe();
  },
});