const w_defines = require('w_defines');

cc.Class({
  extends: cc.Component,

  properties: {
    waitingBG: cc.Node,
    waitForSth: cc.Node,
    waitStr: cc.Label,
    wifiLogo: cc.Node,
    connectingNode: cc.Node,

    loadingLabel: cc.Node,
    pig: cc.Node,
  },

  // use this for initialization
  onLoad() {
    this.waitingBG.active = true;
    mbgGame.gameScene = this;
    w_defines.initDefaultVal();
    if (!mbgGame.isRemoteRes()) {
      // 非远程模式的，不要显示猪和文字
      this.loadingLabel.active = false;
      this.pig.active = false;
    }
  },

  // 当准备就绪可以玩的时候跳用
  canPlayNow() {
    mbgGame.log('进入游戏');
    this.waitingBG.active = false;
    this.waitForSth.active = false;

    mbgGame.sceneMenu.initMe();
    this._inGame = true;
  },

  resReady() {
    const allReady = mbgGame.loader.chechNeedResOK();

    if (!allReady) {
      // 延时调用
      mbgGame.log('未加载完成');
    }
    mbgGame._resReady = allReady;
    if (mbgGame._resReady && mbgGame._dataReady) {
      if (mbgGame.warMgr) {
        mbgGame.warMgr.warEvt().handleCachedWarEvent();
      }
    }
    return allReady;
  },

  update() {
    if (this.waitingBG.active) {
      if (this.rotateFlag === '-') {
        this.rotateFlag = '\\';
      } else if (this.rotateFlag === '\\') {
        this.rotateFlag = '|';
      } else if (this.rotateFlag === '|') {
        this.rotateFlag = '/';
      } else if (this.rotateFlag === '/') {
        this.rotateFlag = '-';
      } else {
        this.rotateFlag = '-';
      }
      mbgGame.setLabel(this.loadingLabel, `${mbgGame._loadingMsg} ${this.rotateFlag}`);
    }
    if (this._inGame) return;
    if (mbgGame._dataReady && this.resReady()) {
      this.canPlayNow();
    }
  },

  onConnect(isConnected) {
    // mbgGame.log('[onConnect]', isConnected);
    this.connectingNode.active = false;
    if (isConnected) {
      this.setWaitOver();
      this.wifiLogo.active = false;
      const logo = this.wifiLogo.getChildByName('logo');
      logo.stopAllActions();
    } else {
      // 主动自动重连模式，不用提示玩家
      if (mbgGame.seamlessReconnect) return;
      this.setWait(mbgGame.getString('waitStr_reconnect'));
      this.wifiLogo.active = true;
      const logo = this.wifiLogo.getChildByName('logo');
      logo.runAction(cc.sequence(cc.fadeOut(0.5), cc.fadeIn(0.5)).repeatForever());
    }
  },

  enterGame() {
    // mbgGame.log("[enterGame] begin");
    // console.trace();
    mbgGame.enterGameType = mbgGame.enterGameType || 1;
    const enterGameType = mbgGame.enterGameType;
    mbgGame.netCtrl.sendMsg(
      'player.enter',
      {
        type: enterGameType,
      },
      (data) => {
        mbgGame.log('[player.enter]', enterGameType, data);
        // 连接成功后恢复
        emitter.emit('enterGame', data, enterGameType);
      },
    );
    this.unscheduleAllCallbacks();

    this.scheduleOnce(this.initPush, 30);

    mbgGame.lastHeartbeatTime = mbgGame.lastHeartbeatTime || moment().unix();
    this.schedule(this.checkNetwork.bind(this), 10, cc.macro.REPEAT_FOREVER, 10);

    // 处理一些重连时可能丢失的数据包
    if (mbgGame.videoFinishData) {
      mbgGame.advertisement.onMyVideoFinish(mbgGame.videoFinishData);
    }

    // 处理一些充值问题
    mbgGame.IAP.iapReset();

    if (mbgGame.isAndroid()) {
      cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyUp, this);
    }
  },
  onKeyUp(event) {
    const keyCode = event.keyCode;
    if (event.keyCode === cc.macro.KEY.b || event.keyCode === cc.macro.KEY.back) {
      // 出剧情时不能按出来
      if (mbgGame.player && mbgGame.player.isShowingPlot()) {
        return;
      }
      if (mbgGame.managerUi.teach && mbgGame.managerUi.teach.isShowingTeach()) {
        return;
      }
      // 如果有界面出来，就调用关闭
      if (mbgGame.managerUi && mbgGame.managerUi.uiLayerWin && mbgGame.managerUi.uiLayerWin.children.length > 0) {
        emitter.emit('closeMe');
        return;
      }
      // 如果在剧情场景
      if (mbgGame.sceneMenu.curPageIdx() === mbgGame.PageStory) {
        if (!mbgGame.panelStory) return;
        mbgGame.panelStory.onPre();
        return;
      }
      // 如果在战斗中
      if (mbgGame.warMgr.hasAnyWar()) {
        return;
      }

      if (mbgGame.channel_id === 'aligames') {
        // 不弹出确认框
        jsb.reflection.callStaticMethod(mbgGame.packageName, 'exitGame', '()V');
        return;
      }

      mbgGame.managerUi &&
        mbgGame.managerUi.createConfirmDialog(mbgGame.getString('gameExit'), () => {
          jsb.reflection.callStaticMethod(mbgGame.packageName, 'exitGame', '()V');
        });
    }
  },
  heartBeatCheck() {
    const self = this;
    // 发给心跳包检查一下
    this.connectingNode.active = true;
    // mbgGame.log("send heartBeatCheck");
    mbgGame.netCtrl.sendMsg(
      'player.heartbeat',
      {
        feedback: true,
      },
      () => {
        self.onConnect(true);
        self.connectingNode.active = false;
        mbgGame.lastHeartbeatTime = moment().unix();
      },
    );
  },
  checkNetwork() {
    const now = moment().unix();
    if (now - mbgGame.lastHeartbeatTime > 60) {
      // 如果超时没有收到心跳包，那么可能掉线了
      if (!this.firstCheckLost) {
        const self = this;
        this.firstCheckLost = true;
        // 第一次出现就先发一个包激活一下
        mbgGame.netCtrl.sendMsg(
          'player.heartbeat',
          {
            feedback: true,
          },
          () => {
            mbgGame.lastHeartbeatTime = moment().unix();
            delete self.firstCheckLost;
          },
        );
      } else {
        // 第二次检查才出菊花
        this.heartBeatCheck();
      }
    }
    /*
        // 无网络提示
        const netCount = mbgGame.netCtrl.getNetCount();
        // mbgGame.log('checkNetwork', netCount, this.lastNetCount);
        // 10秒内没有收到数据包，就发送心跳检测一下
        if (netCount === this.lastNetCount) {
          //
        }
        this.lastNetCount = netCount;
     */
  },
  // 设置等待
  setWait(str) {
    this.waitForSth.active = true;
    this.waitStr.string = str;
  },
  // 等完了
  setWaitOver() {
    this.waitForSth.active = false;
    this.waitStr.string = '';
  },

  // 30秒后上传玩家APN or device token,用于推送
  initPush() {
    if (!cc.sys.isNative) return;
    const sendData = {};
    // if (mbgGame.APN_token)
    //    sendData.APN_token = mbgGame.APN_token;
    if (mbgGame.isIOS()) {
      const token = jsb.reflection.callStaticMethod('NativeOcClass', 'getPushToken');
      if (token && token.length > 1) {
        sendData.push_token = `apn.${token}`;
      } else {
        return;
      }
    }
    return;
    if (mbgGame.isAndroid()) {
      // 2 onesignal  3 umeng
      sendData.push_token = jsb.reflection.callStaticMethod(
        mbgGame.packageName,
        'getDeviceToken',
        '()Ljava/lang/String;',
      );

      mbgGame.log('device_token:', sendData.push_token);
      if (sendData.push_token === '0' || !sendData.push_token) {
        // 不支持推送
        return;
      }
    }
    // mbgGame.log("initPush:" + JSON.stringify(sendData));
    mbgGame.netCtrl.sendMsg('player.pushToken', sendData);
  },

  // called every frame, uncomment this function to activate update callback
  // update: function (dt) {

  // },
});
