cc.Class({
  extends: cc.Component,

  properties: {
    mobileSend: cc.Button,
    mobileEdit: cc.EditBox,
  },

  onLoad() {
    const mobile = cc.sys.localStorage.getItem("mobile");
    if (mobile) {
      this.mobileEdit.string = mobile;
    }
  },

  onMobileEdit(text) {
    this.mobileText = text;
    let limit = 11;
    if (mbgGame.mobileNumber) {
      limit = 6;
    }
    if (this.mobileText.length < limit) {
      this.mobileSend.interactable = false;
    } else {
      this.mobileSend.interactable = true;
    }
  },

  onMobileBtn() {
    // console.log('onMobileBtn:', this.mobileText);
    if (mbgGame.mobileNumber) {
      mbgGame.mobileCode = this.mobileText;
      this.onMobileClose();
      if (mbgGame.loading) {
        mbgGame.loading.guestLogin();
      } else {
        mbgGame.netCtrl.sendMsg('player.accountInfo', {
          operate: "bindMobile",
          mobileCode: mbgGame.mobileCode,
          mobileNumber: mbgGame.mobileNumber,
        }, (data) => {
          mbgGame.log('bindMobile', data);
          if (data.status === 0) {
            // 绑定成功
            cc.sys.localStorage.setItem("mobile", mbgGame.mobileNumber);
            mbgGame.managerUi.floatMessage('绑定成功');
            emitter.emit('closeMe');
          } else {
            mbgGame.managerUi.floatMessage(data.err);
          }
        });
      }
      return;
    }
    if (!this.mobileText) {
      return;
    }

    mbgGame.mobileNumber = this.mobileText;
    mbgGame.goUrl(mbgGame.mobildLoginURL + mbgGame.encryptDecrypt(this.mobileText), this.node);
    // console.log('url:', com.url);
    this.mobileSend.interactable = false;

    this.mobileEdit.string = '';

    // 显示倒计时
    let count = 60;
    this.mobileSend.node.getComponent('itemBtn').setBtnLabel('确定');
    this.mobileEdit.placeholder = `输入验证码（${count}）`;
    this.schedule(() => {
      count -= 1;
      if (count <= 0) {
        this.mobileEdit.placeholder = `请输入手机号码`;
        delete mbgGame.mobileNumber;
        delete mbgGame.mobileCode;
        this.mobileSend.node.getComponent('itemBtn').setBtnLabel('发送验证码');
      } else {
        this.mobileEdit.placeholder = `输入验证码（${count}）`;
      }
    }, 1, 70, 1);
  },

  onMobileClose() {
    this.node.destroy();
  },
});