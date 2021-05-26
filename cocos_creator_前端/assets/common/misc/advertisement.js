const mbgGame = require('mbgGame');

// 广告相关
mbgGame.advertisement = {
  init() {
    delete this.vungleEnable;
    delete this.fyberEnable;
    const self = this;

    // 根据服务器配置来初始化广告商
    mbgGame.netCtrl.sendMsg('shop.advertiser', {}, (data) => {
      // 刷新购买脑电波道具
      // mbgGame.log("advertiser",JSON.stringify(data));
      if (!data || !data.advertiser || data.advertiser.length < 1) return;
      data.advertiser.forEach((x) => {
        // mbgGame.log('init advertiser ' + x);
        if (x === 'vungle') {
          self.vungleEnable = false;
          if (mbgGame.isIOS()) {
            self.vungleEnable = jsb.reflection.callStaticMethod('NativeOcClass', 'advInit:', x);
          }
        }
      });
    });
  },
  showRewardVideo(data) {
    const mode = data.mode;
    const id = data.id;

    // 先关闭音乐
    mbgGame.resManager.pauseAudio();

    this.nowID = id;
    this.nowMode = mode;

    // 安卓下面，播放广告后的代码都不会执行了，所以把这个播放放到最下面
    if (mode === 'vungle') {
      if (mbgGame.isIOS()) {
        jsb.reflection.callStaticMethod('NativeOcClass', 'advShow:andContent:', 'vungle', '');
      }
      if (mbgGame.isAndroid()) {
        jsb.reflection.callStaticMethod(mbgGame.packageName, 'vunglePlayAd', '()V');
      }
    }

    return true;
  },

  getVideoStatus() {
    const sendData = {};

    if (this.vungleEnable) {
      if (mbgGame.isIOS()) {
        sendData.vungle = jsb.reflection.callStaticMethod('NativeOcClass', 'advReady:andContent:', 'vungle', '');
      }
      if (mbgGame.isAndroid()) {
        sendData.vungle = jsb.reflection.callStaticMethod(mbgGame.packageName, 'isVungleReady', '()Z');
      }
    }
    return sendData;
  },

  isVideoCanPlay() {
    let vungleReady = false;
    let fyberReady = false;

    if (this.vungleEnable) {
      if (mbgGame.isIOS()) {
        vungleReady = jsb.reflection.callStaticMethod('NativeOcClass', 'advReady:andContent:', 'vungle', '');
      }
      if (mbgGame.isAndroid()) {
        vungleReady = jsb.reflection.callStaticMethod(mbgGame.packageName, 'isVungleReady', '()Z');
      }
    }
    return vungleReady || fyberReady;
  },

  onMyVideoFinish(cacheData) {
    let sendData;
    mbgGame.resManager.resumeAudio();

    if (cacheData) {
      sendData = cacheData;
      // mbgGame.log("onMyVideoFinish2 " + JSON.stringify(sendData));
    } else {
      sendData = {
        mode: this.nowMode,
        id: this.nowID,
      };
      delete this.nowID;
      delete this.nowMode;
      mbgGame.videoFinishData = sendData;
      // mbgGame.log("onMyVideoFinish " + JSON.stringify(mbgGame.videoFinishData));

      // 广告后重启音乐
      // mbgGame.resManager.smartMusic();
    }
    // mbgGame.log('onMyVideoFinish', JSON.stringify(cacheData), JSON.stringify(sendData));
    mbgGame.netCtrl.sendMsg('shop.adreward', sendData, (data) => {
      if (data.code !== 'ok') return;
      // mbgGame.log("[mbgGame.adreward]", data);
      delete mbgGame.videoFinishData;
      emitter.emit('shopItemRefresh', data.itemInfo);
      mbgGame.analytisc.event('advfinish');
    });
  },
  advViewSuccess(ret) {
    // mbgGame.log("cocos2dx advViewSuccess", ret, +ret === 1);
    if (+ret === 1) {
      mbgGame.advertisement.onMyVideoFinish();
    }
    // 广告后重启音乐
    mbgGame.resManager.resumeAudio();
  },
};

cc.advViewSuccess = mbgGame.advertisement.advViewSuccess;
