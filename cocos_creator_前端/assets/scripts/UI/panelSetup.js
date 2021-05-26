cc.Class({
  extends: cc.Component,

  properties: {
    sid: cc.Node,
    version: cc.Node,

    spriteSound: cc.Sprite,
    spriteMusic: cc.Sprite,

    wechatNode: cc.Node,
    wechat: cc.Node,
    lang: cc.Node,

    totemNode: cc.Node,
    nickname: cc.Node,
    describe: cc.Node,
    btnFix: cc.Node,

    btnMobile: cc.Node,
  },

  // use this for initialization
  onLoad() {
    this.node._winTitle = mbgGame.getString('title_setup');
    emitter.on(this, 'updateUserInfo', this.refreshPannel);

    if (cc.sys.isNative && mbgGame.isIOS()) {
      this.wechatNode.active = mbgGame.wechat.isWXAppInstalled();
    } else if (mbgGame.channel_id === 'aligames') {
      this.wechatNode.active = false;
      this.btnMobile.active = false;
    } else {
      this.wechatNode.active = true;
    }
    if (cc.sys.localStorage.getItem("mobile")) {
      this.btnMobile.getComponent('itemBtn').setBtnLabel('手机解绑');
    } else {
      this.btnMobile.getComponent('itemBtn').setBtnLabel('手机绑定');
    }
    if (mbgGame.isH5()) {
      // native的webview有问题
      this.wechatNode.active = false;
      if (mbgGame.isWechatH5()) {
        this.btnMobile.active = false;
      } else {
        this.btnMobile.active = true;
      }
    } else {
      this.btnMobile.active = false;
    }
  },

  onDestroy() {
    emitter.off(this, 'updateUserInfo');
  },

  onClose() {
    emitter.emit('closeMe');
  },

  onAddBaseWin() {
    mbgGame.setLabel(this.sid, mbgGame.getString('idInfo', {
      ID: mbgGame.getShortID(),
    }));
    mbgGame.setLabel(this.version, mbgGame.getVersion());

    this.setSpriteSound(mbgGame.setup.sound);
    this.setSpriteMusic(mbgGame.setup.music);

    mbgGame.setLabel(this.wechat, mbgGame.getString('bindWechat'));
    if (mbgGame.config.openCode) {
      mbgGame.setLabel(this.lang, mbgGame.getString('redeemCode'));
    } else {
      mbgGame.setLabel(this.lang, mbgGame.getString(`lang_${mbgGame.setup.lang}`));
    }


    this.refreshPannel();
  },

  onSound() {
    switch (mbgGame.setup.sound) {
      case 0:
        mbgGame.setup.sound = 1;
        break;
      case 1:
        mbgGame.setup.sound = 2;
        break;
      case 2:
        mbgGame.setup.sound = 3;
        break;
      case 3:
        mbgGame.setup.sound = 0;
        break;
      default:
        mbgGame.setup.sound = 1;
        break;
    }
    this.setSpriteSound(mbgGame.setup.sound);
    mbgGame.netCtrl.sendMsg("player.setup", mbgGame.setup);
    cc.sys.localStorage.setItem("setup", mbgGame.base64Encode(JSON.stringify(mbgGame.setup)));
  },
  onMusic() {
    switch (mbgGame.setup.music) {
      case 0:
        mbgGame.setup.music = 1;
        break;
      case 1:
        mbgGame.setup.music = 2;
        break;
      case 2:
        mbgGame.setup.music = 3;
        break;
      case 3:
        mbgGame.setup.music = 0;
        break;
      default:
        mbgGame.setup.music = 1;
        break;
    }
    this.setSpriteMusic(mbgGame.setup.music);
    mbgGame.resManager.updateVolume();
    /*
    用这个按HOME键恢复游戏时会有bug,总是有声
    if (mbgGame.setup.music == 0)
        cc.audioEngine.pauseMusic();
    else
        cc.audioEngine.resumeMusic();
    */

    mbgGame.netCtrl.sendMsg("player.setup", mbgGame.setup);
    cc.sys.localStorage.setItem("setup", mbgGame.base64Encode(JSON.stringify(mbgGame.setup)));
  },
  onLang() {
    if (mbgGame.config.openCode) {
      this.onCode();
      return;
    }
    // 语言设置
    const lang = 'zh';
    mbgGame.setLang(lang);
    mbgGame.netCtrl.sendMsg("player.setup", mbgGame.setup);
  },
  onAccount() {
    if (mbgGame.userInfo.bindWechat) {
      // 退出登录就是清空本地数据而已
      mbgGame.removeLocalData();
      mbgGame.restart();
    } else {
      mbgGame.wechat.authWeChat('bind');
    }
  },
  onDebug() {
    if (mbgGame.channel_id !== 'test') {
      return;
    }
    mbgGame.resManager.loadPrefab('panelDebug', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addFullWin(node, 'panelDebug');
    });
  },
  onAnnouncement() {
    mbgGame.resManager.loadPrefab('panelAnnouncement', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addNormalWin(node, 'panelAnnouncement');
    });
  },
  onAbout() {
    if (mbgGame.channel_id === 'test') {
      this.onDebug();
      return;
    }
    mbgGame.resManager.loadPrefab('panelAbout', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addFullWin(node, 'panelAbout');
    });
  },
  onFeedback() {
    // 先刷一下充值，万一是充值问题呢
    mbgGame.IAP.payCheck();
    mbgGame.resManager.loadPrefab('panelContact', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addNormalWin(node, 'panelContact');
    });
  },
  // 音量图标为   0:无声  1,2,3为量度
  setSpriteSound(val) {
    switch (val) {
      case 0:
        mbgGame.resManager.setImageFrame(this.spriteSound, 'images', "setupSound_mute");
        break;
      case 1:
        mbgGame.resManager.setImageFrame(this.spriteSound, 'images', "setupSound_l");
        break;
      case 2:
        mbgGame.resManager.setImageFrame(this.spriteSound, 'images', "setupSound_m");
        break;
      case 3:
        mbgGame.resManager.setImageFrame(this.spriteSound, 'images', "setupSound_h");
        break;
      default:
        break;
    }
  },

  // 音量图标为   0:无声  1,2,3为量度
  setSpriteMusic(val) {
    switch (val) {
      case 0:
        mbgGame.resManager.setImageFrame(this.spriteMusic, 'images', "setupMusic_mute");
        break;
      case 1:
        mbgGame.resManager.setImageFrame(this.spriteMusic, 'images', "setupMusic_l");
        break;
      case 2:
        mbgGame.resManager.setImageFrame(this.spriteMusic, 'images', "setupMusic_m");
        break;
      case 3:
        mbgGame.resManager.setImageFrame(this.spriteMusic, 'images', "setupMusic_h");
        break;
      default:
        break;
    }
  },

  changeTotem() {
    mbgGame.resManager.loadPrefab('panelSelectFlag', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addNormalWin(node, 'panelSelectFlag', mbgGame.userInfo.totem);
      node.getComponent('panelSelectFlag').onChoose = this.onChooseTotem.bind(this);
    });
  },

  onChooseTotem(totem) {
    // mbgGame.log('[onChooseFlag]', id);
    mbgGame.netCtrl.sendMsg("player.setTotem", {
      totem,
    });
  },

  changeNickName() {
    // 刷新一下统计数据，看是否需要钻石改名
    const data = mbgGame.getCache('player.achieveinfo');
    if (!data) {
      mbgGame.checkNetCache('player.achieveinfo', this.changeNickName.bind(this));
      return;
    }
    mbgGame.managerUi.changeNickName(this.refreshPannel.bind(this));
  },
  changeDescribe() {
    const self = this;
    mbgGame.managerUi.createMultiLineEditor({
      title: mbgGame.getString("chgDescTitle"),
      info: mbgGame.getString("chgDescInfo"),
      hint: mbgGame.getString("editHint"),
      limit: 36,
    }, (str) => {
      if (self.editBox_lock) return;
      self.editBox_lock = true;

      mbgGame.netCtrl.sendMsg("player.setDescribe", {
        describe: str,
      }, () => {
        delete self.editBox_lock;
      });
    });
  },

  onCode() {
    mbgGame.managerUi.createLineEditor({
      title: mbgGame.getString('redeemCode'),
      info: mbgGame.getString("redeemCodeHint"),
      defaultStr: '',
      limit: 10,
    }, (code) => {
      code = code.toUpperCase();
      const sendData = {
        code,
      };
      mbgGame.setLock('net', 'onCode');
      mbgGame.netCtrl.sendMsg("shop.awardCode", sendData, () => {
        mbgGame.clearLock('net', 'onCode');
      });
    });
  },

  refreshPannel() {
    mbgGame.setLabel(this.nickname, mbgGame.userInfo.nickname || mbgGame.getString('nickNameEmpty'));
    mbgGame.setLabel(this.describe, mbgGame.userInfo.describe || mbgGame.getString('descEmpty'));

    if (mbgGame.userInfo.bindWechat) {
      mbgGame.setLabel(this.wechat, mbgGame.getString('logout'));
    }

    mbgGame.managerUi.addIconFlag(this.totemNode, mbgGame.userInfo.totem, this.changeTotem.bind(this));
  },

  onFix() {
    mbgGame.managerUi.createConfirmDialog(mbgGame.getString('clientFix'), () => {
      mbgGame.clientFix();
    });
  },

  onMobile() {
    if (cc.sys.localStorage.getItem("mobile")) {
      // 解邦
      mbgGame.netCtrl.sendMsg('player.accountInfo', {
        operate: "bindMobile",
      }, (data) => {
        mbgGame.log('bindMobile', data);
        if (data.status === 0) {
          // 绑定成功
          cc.sys.localStorage.removeItem("mobile");
          this.onClose();
        }
      });
      return;
    }
    mbgGame.mobileVerify(this.node);
  },
});