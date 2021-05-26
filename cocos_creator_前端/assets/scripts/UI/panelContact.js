cc.Class({
  extends: cc.Component,

  properties: {
    editEmail: cc.EditBox,
    editDesc: cc.EditBox,
  },

  // use this for initialization
  onLoad() {
    this.node._winTitle = mbgGame.getString('title_contact');
    this.feedback_email = cc.sys.localStorage.getItem("email") || '';
    this.editEmail.string = this.feedback_email;
    this.editDesc.string = mbgGame.feedback_content || '';
  },
  onDestroy() {
    cc.sys.localStorage.setItem("email", this.feedback_email);
  },
  editChangedEmail(text) {
    this.feedback_email = text;
  },
  editChangedContent(text) {
    mbgGame.feedback_content = text;
  },
  onCommit() {
    const content = mbgGame.feedback_content || '';
    const email = this.feedback_email || '';
    if (this.editBox_lock) return;
    this.editBox_lock = true;
    const self = this;
    mbgGame.netCtrl.sendMsg("player.feedback", {
      content,
      email,
    }, (x) => {
      delete self.editBox_lock;
      if (x.status === 0) {
        //  发送成功了
        emitter.emit('closeMe');
      }
    });
  },
});