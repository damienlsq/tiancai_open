// 这是第一个运行的脚本，加载mbgGame后，mbgGame就变全局变量，不用再require了
const mbgGame = require('mbgGame');
const netCtrl = require('netctrl');
const CPlayer = require('player');

cc.Class({
  extends: cc.Component,

  properties: {
    loading: cc.ProgressBar,
    loadingLabel: cc.Node,
    healthInfo: cc.Node,
    tipsInfo: cc.Node,
    sIDLabel: cc.Node,
    manifestUrl: {
      default: null,
      type: cc.Asset,
    },
    loginBtns: cc.Node,
    btnGuest: cc.Node,
    btnWechat: cc.Node,
    btnMobile: cc.Node,
    bottomUI: cc.Node,

    pig: cc.Node,
    bgNode: cc.Sprite,
    btnFix: cc.Node,
  },

  onLoad() {
    mbgGame.loading = this;

    this.setLoadProgress(0);

    this._t = 0;
    // 全局关闭抗锯齿
    // cc.view.enableAntiAlias(false);
    mbgGame.designWidth = 640; // 设计分辨率
    mbgGame.designHeight = 1136; // 设计分辨率
    const frameSize = cc.view.getFrameSize();
    const scaleX = frameSize.width / mbgGame.designWidth;
    const scaleY = frameSize.height / mbgGame.designHeight;
    const frameScale = frameSize.height / frameSize.width;
    mbgGame.sceneName = 'game';
    mbgGame.fixed_y = frameSize.height - (frameSize.width / mbgGame.designWidth) * mbgGame.designHeight;
    // mbgGame.log(`[calc fixed_y] ${mbgGame.fixed_y}`);
    // cc.sys.windowPixelResolution 也是frameSize

    if (Math.abs(frameScale - 2.17) < 0.01 && !mbgGame.isH5()) {
      let safeHeight = 1253;
      if (mbgGame.isIOS()) {
        jsb.reflection.callStaticMethod('NativeOcClass', 'setStatusBar:', 2);
        // const safeRect = cc.view.getSafeAreaRect();
        // safeHeight = Math.round(safeRect.height);
      }

      mbgGame.sceneName = 'iphoneX';
      mbgGame.fixed_y = safeHeight - mbgGame.designHeight;
      this.healthInfo.getComponent(cc.Widget).top += 50;
      this.bottomUI.getComponent(cc.Widget).bottom += 30;

      mbgGame.log(`[safeRect] ${safeHeight}`);
    } else if (frameScale === 2) {
      mbgGame.sceneName = 'game2';
    } else if (scaleX > scaleY) {
      mbgGame.sceneName = 'gameSmall';
      mbgGame.fixed_y = 0;
    }

    mbgGame.log(`[frameSize] ${frameSize.width},${frameSize.height}, ${frameScale}`);
    mbgGame.log(`[gameScene] ${mbgGame.sceneName}`);
    mbgGame.log(`[scale] ${scaleX} / ${scaleY}`);
    mbgGame.log(`[fixed_y] ${mbgGame.fixed_y}`);

    if (cc.sys.language === 'zh') {
      this.healthInfo.active = true;
      this.defaultLoadingStr = '载入中';
    } else {
      this.healthInfo.active = false;
      this.defaultLoadingStr = 'Loading';
    }
    mbgGame._loadingMsg = `${this.defaultLoadingStr} ... 0%`;

    try {
      if (mbgGame.isIOS()) {
        mbgGame.phoneType = jsb.reflection.callStaticMethod('NativeOcClass', 'getPhoneModel');
      }
      if (mbgGame.isAndroid()) {
        mbgGame.phoneType = jsb.reflection.callStaticMethod(mbgGame.packageName, 'phoneType', '()Ljava/lang/String;');
      }

      if (mbgGame.isWechatGame()) {
        const res = wx.getSystemInfoSync();
        mbgGame.log('systemInfo:', res);
        mbgGame.phoneType = `${res.brand} - ${res.model}`;
        mbgGame.log(`[性能] ${res.benchmarkLevel}`);
      }
    } catch (e) {
      mbgGame.phoneType = 'unsupport';
    }
    mbgGame.log(`[phoneType] ${mbgGame.phoneType}`);

    if (mbgGame.isWechatGame()) {
      wx.onHide(() => {
        mbgGame.event_hide();
      });
      wx.onShow(() => {
        mbgGame.wechat.checkUpdate();
        mbgGame.event_show();
      });
    } else {
      // 添加退出游戏事件，ios按退出时会执行
      cc.game.on(cc.game.EVENT_HIDE, () => {
        mbgGame.event_hide();
      });
      // 返回屏幕时间
      cc.game.on(cc.game.EVENT_SHOW, () => {
        mbgGame.event_show();
      });
    }

    this.loading.node.active = false;
    this.loadingLabel.active = false;
    mbgGame.state.uuid = mbgGame.getSaveUUID();
    if (mbgGame.state.uuid) {
      this.refreshShortID();
      if (mbgGame.isRemoteRes()) {
        mbgGame.setLabel(cc.find('btnLabel', this.btnGuest), mbgGame.getString('loginGuest') || '游客登录');
        // 直接显示进入游戏按钮，没有其它登录按钮
        this.loginBtns.children.forEach((x) => {
          if (x.name === 'btnGuest') {
            x.active = true;
            mbgGame.setLabel(cc.find('btnLabel', x), '进入游戏');
          } else {
            x.active = false;
          }
        });
      } else {
        this.loginBtns.active = false;
      }
    } else {
      this.sIDLabel.active = false;
    }

    if (mbgGame.isH5()) {
      if (mbgGame.isWechatH5() && !mbgGame.state.uuid && !cc.sys.localStorage.getItem('wxh5key')) {
        this.loginBtns.active = false;
        mbgGame.wxh5Auth(true);
        return;
      }
      this.loginBtns.active = true;
      // native的webview有问题
      this.btnMobile.active = false;
    } else {
      this.btnMobile.active = false;
    }

    if (mbgGame.isWechatGame()) {
      // 微信都是进入游戏
      mbgGame.setLabel(cc.find('btnLabel', this.btnGuest), '进入游戏');
      this.btnMobile.active = false;
      this.btnWechat.active = false;
      this.btnFix.active = true;
      mbgGame.wechat.wechatGameOnLoad();
    } else {
      this.btnFix.active = false;
      // 因为在慢点native机器上面，读取本地存盘config需要耗时几秒，如果不用延时调用，屏幕会一直黑屏，所以延时一下令玩家能看到载入
      // this.scheduleOnce(this.beginLoad, 0.01);
      // 没必要延时了
      this.beginLoad();
    }
  },
  beginLoad() {
    mbgGame.log('[beginLoad]');
    cc.loader.loadRes(`audio/battleLoop3`, cc.AudioClip, (err, obj) => {
      this.bgAudioID = cc.audioEngine.play(obj, true, 0.3);
    });
    cc.loader.loadRes(`images/loadingbg1Hd`, cc.SpriteFrame, (err, obj) => {
      if (this.bgNode && this.bgNode.isValid) {
        this.bgNode.spriteFrame = obj;
      }
    });

    if (!mbgGame.player) {
      mbgGame.player = new CPlayer();
      mbgGame.player.onInit();
    }

    // 初始化连接
    netCtrl.initCtrl();
    // 因为mbgGame.init的load config需要用到forward的base64接口，所以需要先创建netCtrl
    mbgGame.init();

    if (mbgGame.isRemoteRes()) {
      const wechatUnionid = cc.sys.localStorage.getItem('wechatUnionid');
      const wechatUsername = cc.sys.localStorage.getItem('wechatUsername');
      const wechatAvatar = cc.sys.localStorage.getItem('wechatAvatar');

      mbgGame.log(`[wechatUnionid] ${wechatUnionid}`);
      mbgGame.log(`[wechatUsername] ${wechatUsername}`);
      mbgGame.log(`[wechatAvatar] ${wechatAvatar}`);
      if (wechatUnionid) {
        mbgGame.wechatUnionid = wechatUnionid;
      }
    }

    if (1) {
      //!this.doHotUpdate()) {
      // 不需要热更新
      this.onLogin();
      return;
    }
    this.showTips();
  },

  showTips() {
    // 获取一个tips
    this.tipsInfo.active = true;
    mbgGame.setLabel(this.tipsInfo, mbgGame.getTips() || ' ');
  },

  updateFail() {
    const storagePath = `${jsb.fileUtils ? jsb.fileUtils.getWritablePath() : '/'}remote-assets`;
    jsb.fileUtils.removeDirectory(storagePath);
    // 重新启动，然后再检查热更新
    mbgGame.restart();
  },
  versionCompareHandle(localVersion, remoteVersion) {
    // mbgGame.log('JS Custom Version Compare: localVersion is ' + localVersion + ', remoteVersion is ' + remoteVersion);
    const vA = localVersion.split('.');
    const vB = remoteVersion.split('.');
    for (let i = 0; i < vA.length; ++i) {
      const a = parseInt(vA[i]);
      const b = parseInt(vB[i] || 0);
      if (a === b) {
        continue;
      } else {
        return a - b;
      }
    }
    if (vB.length > vA.length) {
      return -1;
    }
    return 0;
  },

  updateCb(event) {
    let needRestart = false;
    let failed = false;
    let fileErrorFail = false;
    // mbgGame.log('hotupdate EventCode: ' + event.getEventCode());

    switch (event.getEventCode()) {
      case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
        mbgGame.log('No local manifest file found, hot update skipped.');
        failed = true;
        this._needUpdate = false;
        break;
      case jsb.EventAssetsManager.UPDATE_PROGRESSION: {
        // var percent = event.getPercent();
        // event.getTotalBytes()
        // let percentByFile = event.getPercentByFile();
        // event.getDownloadedFiles() + ' / ' + event.getTotalFiles();
        // event.getDownloadedBytes() + ' / ' + event.getTotalBytes();
        /*
          var msg = event.getMessage();
          if (msg) {
              mbgGame.log(msg);
          }
          */
        // mbgGame.log(percent.toFixed(2) + '%' + percentByFile.toFixed(2) + '%');
        const totalBytes = event.getTotalBytes() || 1;
        const downloadedBytes = event.getDownloadedBytes() || 0;
        let percent = downloadedBytes / totalBytes;
        if (percent >= 1) {
          percent = 1;
        }
        this.setLoadProgress(percent);
        let statInfo = `${Math.abs(percent * 100).toFixed(0)}%`;
        if (totalBytes > 1) {
          statInfo += ` (${mbgGame.smartByte(totalBytes)})`;
        }
        // 模拟不停的转
        mbgGame._loadingMsg = `${mbgGame.getString('updating_res') || this.defaultLoadingStr} ... ${statInfo}`;
        break;
      }
      case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
      case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
        mbgGame.log('Fail to download manifest file, hot update skipped.');
        failed = true;
        this._needUpdate = false;
        break;
      case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
        mbgGame.log('Already up to date with the latest remote version.');
        failed = true;
        this._needUpdate = false;
        cc.sys.localStorage.setItem('hotupdate_version', this._am.getLocalManifest().getVersion());
        break;
      case jsb.EventAssetsManager.UPDATE_FINISHED:
        mbgGame.log(`Update finished. ${event.getMessage()}`);
        needRestart = true;
        cc.sys.localStorage.setItem('hotupdate_version', this._am.getLocalManifest().getVersion());
        break;
      case jsb.EventAssetsManager.UPDATE_FAILED:
        mbgGame.log(`Update failed. ${event.getMessage()}`);

        this._failCount += 1;
        if (this._failCount < 5) {
          this._am.downloadFailedAssets();
        } else {
          mbgGame.log('Reach maximum fail count, exit update process');
          this._failCount = 0;
          failed = true;
          this._needUpdate = false;
          // 没有下载完
          fileErrorFail = true;
        }
        break;
      case jsb.EventAssetsManager.ERROR_UPDATING:
        mbgGame.log(`Asset update error: ${event.getAssetId()}, ${event.getMessage()}`);
        this._needUpdate = false;
        break;
      case jsb.EventAssetsManager.ERROR_DECOMPRESS:
        // mbgGame.log(event.getMessage());
        this._needUpdate = false;
        fileErrorFail = true;
        break;
      default:
        break;
    }

    if (failed) {
      this._am.setEventCallback(null);
    }
    if (fileErrorFail) {
      this.updateFail();
      return;
    }

    if (needRestart) {
      this._am.setEventCallback(null);
      // Register the manifest's search path
      const searchPaths = this._am.getLocalManifest().getSearchPaths();
      // This value will be retrieved and appended to
      // the default search path during game startup
      // please refer to samples/js-tests/main.js for detailed usage.
      // !!! Re-add the search paths in main.js is very important
      // otherwise, new scripts won't take effect.
      cc.sys.localStorage.setItem('HotUpdateSearchPaths', JSON.stringify(searchPaths));

      jsb.fileUtils.setSearchPaths(searchPaths);
      cc.audioEngine.stopAll();
      mbgGame.restart();
      return;
    }

    // 没有更新就开始登录
    if (!this._needUpdate) this.onLogin();
  },

  doHotUpdate() {
    // 只有编译debug版，才有这个开关
    if (cc.isDebug) {
      mbgGame.log('game loading ... debug mode');
    }

    // Hot update is only available in Native build
    if (!cc.sys.isNative || cc.isDebug || cc.sys.localStorage.getItem('outdate') === '1') {
      return false;
    }

    this.loading.node.active = true;
    this.loadingLabel.active = true;

    const storagePath = `${jsb.fileUtils ? jsb.fileUtils.getWritablePath() : '/'}remote-assets`;
    mbgGame.log(`Storage path for remote asset : ${storagePath}`);
    mbgGame.log(`Local manifest URL : ${this.manifestUrl.nativeUrl}`);
    this._am = new jsb.AssetsManager(this.manifestUrl.nativeUrl, storagePath, this.versionCompareHandle);

    if (mbgGame.isAndroid()) {
      // Some Android device may slow down the download process when concurrent tasks is too much.
      // The value may not be accurate, please do more test and find what's most suitable for your game.
      this._am.setMaxConcurrentTask(2);
    }

    /*
            // Setup the verification callback, but we don't have md5 check function yet, so only print some message
            // Return true if the verification passed, otherwise return false
            this._am.setVerifyCallback(function (path, asset) {
                // When asset is compressed, we don't need to check its md5, because zip file have been deleted.
                var compressed = asset.compressed;
                // Retrieve the correct md5 value.
                var expectedMD5 = asset.md5;
                // asset.path is relative path and path is absolute.
                var relativePath = asset.path;
                // The size of asset file, but this value could be absent.
                var size = asset.size;
                if (compressed) {
                    panel.info.string = "Verification passed : " + relativePath;
                    return true;
                }
                else {
                    panel.info.string = "Verification passed : " + relativePath + ' (' + expectedMD5 + ')';
                    return true;
                }
            });
    */

    if (this._am.getLocalManifest().isLoaded()) {
      this._am.setEventCallback(this.updateCb.bind(this));
      this._needUpdate = true; // 需要等回调结束
      this.loginBtns.active = false;
      this._am.update();

      return true;
    }
    return false;
  },

  wechatLogin() {
    if (mbgGame.isRemoteRes()) {
      // cc.sys.openURL(mbgGame.h5LoginURL);
      if (mbgGame.wechatUnionid) {
        // 已经登录了
        this.guestLogin();
        return;
      }
      if (cc.sys.isBrowser && !cc.sys.isMobile) {
        mbgGame.goUrl(mbgGame.h5LoginURL, this.node, 500, 400);
        return;
      }
      return;
    }
    // 其实就是一个通过openid获取uuid的登录方式
    mbgGame.wechat.authWeChat('login');
  },

  // guestLogin是最终入口
  guestLogin() {
    this.loginBtns.active = false;

    this.loading.node.active = true;
    this.loadingLabel.active = true;

    this.showTips();

    mbgGame.hotVersion = cc.sys.localStorage.getItem('hotupdate_version');

    this.setLoadProgress(0);
    // 开始连服务器
    netCtrl.setServerConfig({
      host: mbgGame.getServerHost(),
      port_ws: mbgGame.port_ws,
      port_enet: mbgGame.port_enet,
    });
    netCtrl.setupConnect();
    this.setLoadBar(mbgGame.getString('connecting'), 10);
    this._guestLogin = true;
  },

  update(dt) {
    this._t += dt;
    if (this._t < 0.02) {
      return;
    }

    this._t = 0;
    if (!mbgGame._loadingMsg) return;
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

    if (this._inGame) return;
    if (!this._myLoadSuccess) return;
    // 检查必要资源
    if (!mbgGame.loader.chechNeedResOK()) return;
    this.enterGame();
    this._inGame = true;
  },

  refreshShortID() {
    // 更新显示sid
    const shortid = mbgGame.getShortID();
    this.sIDLabel.active = true;
    mbgGame.setLabel(this.sIDLabel, `ID:${shortid}`);
  },

  onLogin() {
    if (!mbgGame.state.uuid) {
      mbgGame.isNewUser = true;
      this.loginBtns.active = true;
    }

    this.refreshShortID();
    mbgGame.loader.preloadRes();

    // native下面的loader都是卡死同步执行的，所以即使设置了进度也是没有用，还不如在load scene的时候卡
    if (mbgGame.isRemoteRes()) {
      const s = mbgGame.getString('loading_res') || '正在下载';
      // native下面的loader都是卡死同步执行的，所以即使设置了进度也是没有用，还不如在load scene的时候卡
      cc.loader.onProgress = function (completedCount, totalCount, item) {
        // console.log('onProgress:',item);
        mbgGame._loadingMsg = `${s} ... (${completedCount} / ${totalCount})`;
        /*
        if (mbgGame.isWechatGame() && item && item.content && item.id) {
          // mbgGame._loadingMsg = `${s} ${item.content._name}.${item.id.substring(item.id.lastIndexOf('.') + 1)} ... (${completedCount} / ${totalCount})`;
        } else {
          mbgGame._loadingMsg = `${s} ... (${completedCount} / ${totalCount})`;
        }
        */
      };
      cc.director.preloadScene('game');
    }

    if (mbgGame.channel_id === 'aligames') {
      this.loginBtns.active = false;
      // 有无uuid都需要登录
      if (mbgGame.isAndroid()) {
        jsb.reflection.callStaticMethod(mbgGame.packageName, 'login', '(Ljava/lang/String;)V', 'login');
      }
      return;
    }

    if (mbgGame.isH5() && cc.sys.isMobile) {
      // 手机的h5版本没有微信登录
      this.btnWechat.active = false;
    }

    if (cc.sys.isNative && mbgGame.isIOS()) {
      if (!mbgGame.wechat.isWXAppInstalled()) {
        // 没有安装微信，不显示微信登录
        this.btnWechat.active = false;
      }
    }

    // 中文才有登录选择
    if (!mbgGame.state.uuid) {
      this.loading.node.active = false;
      this.loadingLabel.active = false;
      return; // 让玩家选择登录方式
    }

    if (cc.sys.isNative) {
      // 有uuid就直接进入游戏
      this.guestLogin();
      return;
    }

    if (mbgGame.isH5() && mbgGame.state.uuid) {
      const params = mbgGame.getUrlParams();
      if (params.type === 'iap') {
        // 充值成功返回，直接进入游戏
        this.guestLogin();
      }
    }
  },
  setLoadProgress(v) {
    this.loading.progress = v;
    this.pig.x = 536 * v;
  },
  setLoadBar(msg, p, isSet) {
    let nowValue = this.loading.progress;
    if (isSet) {
      nowValue = p / 100;
    } else {
      nowValue += p / 100;
    }
    // mbgGame.log("msg:", msg, nowValue, p);
    if (nowValue > 1) {
      nowValue = 1;
    }
    this.setLoadProgress(nowValue);
    if (msg) {
      mbgGame._loadingMsg = `${msg} ... ${parseInt(nowValue * 100)}%`;
    } else {
      mbgGame._loadingMsg = `正在努力加载 ... ${parseInt(nowValue * 100)}%`;
    }
  },

  loadSuccess(msg) {
    // 跳转到Main场景
    // mbgGame.log("game preload");
    this._myLoadSuccess = true;
    this.setLoadBar(msg, 10);
    // mbgGame.log("game preload finish");
  },

  enterGame() {
    mbgGame.performanceCheck('loading', 'gameScene', true);
    cc.director.loadScene(mbgGame.sceneName, () => {
      // console.log("game loaded callback");
      delete mbgGame.loading;
      mbgGame.performanceCheck('loading', 'upload');
      cc.audioEngine.stopAll();
      mbgGame.gameScene.enterGame();
    });
  },

  // 显示确定窗口
  confirmMsg(msg) {
    if (this._boxConfirm) return;
    this._boxConfirm = true;
    cc.loader.loadRes('prefabs/winTiny', cc.Prefab, (err, tinyPrefab) => {
      cc.loader.loadRes('prefabs/winBoxConfirm', cc.Prefab, (err, prefab) => {
        const node = cc.instantiate(prefab);
        mbgGame.addBaseWin(this.node, tinyPrefab, node, 'boxConfirm', msg, () => {
          mbgGame.clientFix();
        });
        delete this._boxConfirm;
      });
    });
  },

  onFix() {
    this.confirmMsg(
      '如果打开游戏出现图片显示异常，或者进入游戏后长时间黑屏等问题，可以尝试点击【确定】进行修复，然后重新启动游戏',
    );
  },

  onWebView(event) {
    mbgGame.log('onWebView', event);
  },

  onMobile() {
    mbgGame.mobileVerify(this.node);
  },

  onGuestLogin() {
    if (mbgGame.isWechatGame()) {
      wx.login({
        success: (data) => {
          mbgGame.log('wx.login', data);
          mbgGame.wechatCode = data.code;
          mbgGame.wechatType = 'wechatGame';
          // 然后就可以进入游客登陆了
          mbgGame.loading.guestLogin();
        },
        fail: (ret) => {
          mbgGame.loading.guestLogin();
        },
      });
    } else {
      this.guestLogin();
    }
  },

  onWetchat() {
    this.wechatLogin();
  },
});
