const mbgGame = require('mbgGame');

// 处理所有第三方登录认证
mbgGame.wechat = {
  // 微信
  isWXAppInstalled() {
    // 是否安装了微信，如果返回false，则不能显示微信登录按钮，否则苹果审核会不通过
    if (cc.sys.isNative) {
      if (mbgGame.isIOS()) {
        return jsb.reflection.callStaticMethod('NativeOcClass', 'isWXAppInstalled');
      } else if (mbgGame.isAndroid()) {
        return jsb.reflection.callStaticMethod(mbgGame.packageName, 'isWXAppInstalled', '()Z');
      }
    }
    return false;
  },
  authWeChat(state) {
    if (mbgGame.isWechatGame()) {
      if (state === 'login') {
        wx.login({
          success: (data) => {
            mbgGame.log('wx.login', data);
            mbgGame.wechatCode = data.code;
            mbgGame.wechatType = 'wechatGame';
            // 然后就可以进入游客登陆了
            mbgGame.loading.guestLogin();
          },
          fail: (ret) => {
            mbgGame.log('wx.login', ret);
            wx.authorize({
              scope: 'scope.userInfo',
              success: () => {
                mbgGame.loading.wechatLogin();
              },
              fail: () => {
                mbgGame.loading.confirmMsg(
                  '取消授权我们就不能根据你的信息找到相应的游戏进度，但还是可以用游客登陆方式来进行游戏(注意：游客模式在小游戏删除后，角色就找不回来了哦)',
                );
              },
            });
          },
        });
      } else {
        // 绑定
        wx.login({
          success: (data) => {
            mbgGame.log('wx.login bind', data);
            mbgGame.wechatCode = data.code;
            mbgGame.wechatType = 'wechatGame';
            mbgGame.netCtrl.sendMsg(
              'player.accountInfo',
              {
                operate: 'authWeChat',
                code: data.code,
                wechatType: 'wechatGame',
                errCode: 0,
              },
              (d) => {
                mbgGame.log('authWeChat', d);
              },
            );
          },
          fail: (ret) => {
            mbgGame.log('wx.login', ret);
            wx.authorize({
              scope: 'scope.userInfo',
              success: () => {
                this.authWeChat('bind');
              },
              fail: () => {
                mbgGame.loading.confirmMsg('绑定失败');
              },
            });
          },
        });
      }
      return;
    }
    // 微信授权
    if (mbgGame.isIOS()) {
      jsb.reflection.callStaticMethod('NativeOcClass', 'wxAuth:', state);
    } else if (mbgGame.isAndroid()) {
      jsb.reflection.callStaticMethod(mbgGame.packageName, 'sendWeChatAuthRequest', '(Ljava/lang/String;)V', state);
    }
  },
  authWeChatReq(code, state, errCode) {
    // mbgGame.log("authWeChatReq", code, state, errCode);
    // 微信授权返回
    if (state === 'login') {
      if (errCode === '0' || errCode === 0) {
        mbgGame.wechatCode = code;
        // 继续调用登录流程
        mbgGame.loading.guestLogin();
        return;
      }
      return;
    }

    mbgGame.netCtrl.sendMsg(
      'player.accountInfo',
      {
        operate: 'authWeChat',
        code,
        state,
        errCode,
      },
      (data) => {
        mbgGame.log('authWeChat', data);
      },
    );
  },

  // 小游戏相关接口
  wechatGameClean() {
    mbgGame.wechat.deleteFolderRecursive(`${wx.env.USER_DATA_PATH}/res/import`);
    mbgGame.wechat.deleteFolderRecursive(`${wx.env.USER_DATA_PATH}/res/raw-assets/`);
    cc.sys.localStorage.removeItem('downloadImport');
  },
  deleteFolderRecursive(path) {
    const FileSystemManager = wx.getFileSystemManager();
    try {
      FileSystemManager.readdirSync(path).forEach((file) => {
        const curPath = `${path}/${file}`;
        if (FileSystemManager.statSync(curPath).isDirectory()) {
          // recurse
          mbgGame.wechat.deleteFolderRecursive(curPath);
        } else {
          // delete file
          FileSystemManager.unlinkSync(curPath);
        }
      });
      FileSystemManager.rmdirSync(path);
    } catch (e) {
      // mbgGame.log('deleteFolderRecursive err', e);
    }
  },

  wechatGameOnLoad() {
    // 第一次进入游戏，询问网络
    wx.getNetworkType({
      success(res) {
        // console.log('getNetworkType:', res);
        if (res.networkType !== 'wifi' && mbgGame.loading) {
          const a = cc.sys.localStorage.getItem('nowifiask');
          if (!a) {
            mbgGame.loading.confirmMsg('游戏会自动下载大约50M资源，建议第一次打开游戏在wifi状态下。');
            cc.sys.localStorage.setItem('nowifiask', '1');
          }
        }
      },
    });
    mbgGame.loading && mbgGame.loading.beginLoad();
  },
  checkUpdate() {
    const updateManager = wx.getUpdateManager();

    updateManager.onCheckForUpdate((res) => {
      // 请求完新版本信息的回调
      mbgGame.log(`onCheckForUpdate`, JSON.stringify(res));
    });

    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        success(res) {
          if (res.confirm) {
            // 新的版本已经下载好，调用 applyUpdate 应用新版本并重启
            mbgGame.wechat.wechatGameClean();
            updateManager.applyUpdate();
          }
        },
      });
    });

    updateManager.onUpdateFailed(() => {
      // 新的版本下载失败
      mbgGame.log(`onUpdateFailed`);
    });
  },
  getFileList() {
    return;
    // 测试用而已
    wx.getStorageInfo({
      success: (res) => {
        mbgGame.log('getStorageInfo', res.currentSize, res.limitSize);
      },
    });
    mbgGame.log('USER_DATA_PATH:', JSON.stringify(wx.env));
    const FileSystemManager = wx.getFileSystemManager();
    let res = FileSystemManager.readdirSync(wx.env.USER_DATA_PATH);
    mbgGame.log('readdir:', JSON.stringify(res));
    res = FileSystemManager.statSync(wx.env.USER_DATA_PATH);
    mbgGame.log('stat:', JSON.stringify(res));
    res = FileSystemManager.readdirSync(`${wx.env.USER_DATA_PATH}`);
    mbgGame.log('readdirSync1:', JSON.stringify(res));
    res = FileSystemManager.readdirSync(`${wx.env.USER_DATA_PATH}/res`);
    mbgGame.log('readdirSync2:', JSON.stringify(res));
    res = FileSystemManager.readdirSync(`${wx.env.USER_DATA_PATH}/res/import`);
    mbgGame.log('readdirSync3:', JSON.stringify(res));
  },
  midasQuery() {
    wx.login({
      success: (data) => {
        mbgGame.log('midasQuery wx.login', data);
        mbgGame.wechatCode = data.code;
        mbgGame.wechatType = 'wechatGame';

        mbgGame.netCtrl.sendMsg(
          'midasPay',
          {
            code: data.code,
            uuid: mbgGame.state.uuid,
          },
          (payRes) => {
            mbgGame.log('[midasPay] res', payRes);
          },
        );
        /*
      mbgGame.netCtrl.sendMsg(
        'platform.midasQuery', {
          code: data.code,
        }, (res) => {
          mbgGame.log('[midasQuery] res', res);
        });
        */
      },
    });
  },
};

cc.authWeChatReq = mbgGame.wechat.authWeChatReq;
