const mbgGame = require('mbgGame');

// for IAP
mbgGame.IAP = {
  sendIOSIAPData(sendData) {
    mbgGame.log('Purchase sendData:', JSON.stringify(sendData));
    mbgGame.netCtrl.sendMsg('iosPay', sendData, (data) => {
      // 回调函数
      // mbgGame.log("buyProduct data:", JSON.stringify(data));
      if (data.status === 0) {
        // 充值成功
        // mbgGame.log("buyEnd is_paying" + JSON.stringify(mbgGame.is_paying));
        if (mbgGame.is_paying) {
          // 充值成功才发送统计到友盟
          const logPrice = +mbgGame.is_paying.product.price;
          mbgGame.analytisc.pay(+mbgGame.is_paying.product.value, logPrice * 100);
          delete mbgGame.is_paying;
        }
      }
      cc.sys.localStorage.removeItem('tempshoplog');
      if (mbgGame.isAndroid()) {
        try {
          const { purchaseToken } = JSON.parse(sendData.receiptData);
          jsb.reflection.callStaticMethod(mbgGame.packageName, 'iapConsume', '(Ljava/lang/String;)V', purchaseToken);
        } catch (e) {
          mbgGame.log('error', e);
        }
      }
    });
  },

  iapReset() {
    // 处理缓存数据,如果有的话
    const sendData = cc.sys.localStorage.getItem('tempshoplog');
    if (sendData) {
      // mbgGame.log("iapReset:",sendData);
      mbgGame.IAP.sendIOSIAPData(JSON.parse(sendData));
    }
    mbgGame.IAP.payCheck();
  },

  iapQuery(data) {
    if (mbgGame.IAPProductsConfig) return;
    mbgGame.IAPProductsConfig = {};
    let ids = '';
    _.forEach(data, (v) => {
      if (v.unit === 'rmb') {
        // RMB道具
        if (ids !== '') ids += ',';
        let id = v.id;
        if (mbgGame.config.iosIAPConfig && mbgGame.config.iosIAPConfig[mbgGame.channel_id]) {
          if (mbgGame.config.iosIAPConfig[mbgGame.channel_id][v.id]) {
            // 有新的对应关系
            id = mbgGame.config.iosIAPConfig[mbgGame.channel_id][v.id];
          }
        }
        ids += id;
        mbgGame.IAPProductsConfig[v.id] = v;
      }
    });
    mbgGame.log('iapQuery', ids, mbgGame.IAPProductsConfig);
    if (mbgGame.isIOS()) {
      jsb.reflection.callStaticMethod('NativeOcClass', 'iapQuery:', ids);
    }
    if (mbgGame.isAndroid() && mbgGame.channel_id === 'googleplay') {
      try {
        jsb.reflection.callStaticMethod(mbgGame.packageName, 'IAPRequestProduct', '(Ljava/lang/String;)V', ids);
      } catch (e) {
        mbgGame.log('error', e);
      }
    }
  },
  // 回调函数
  IAPRequestProduct(json) {
    // mbgGame.log('IAPRequestProduct:', json);
    try {
      const products = JSON.parse(json);
      _.map(products, (v, k) => {
        if (mbgGame.IAPProductsConfig[k]) {
          mbgGame.IAPProductsConfig[k].price = v.price;
          mbgGame.IAPProductsConfig[k].modifyPrice = v.price;
          // name不需要改了，只是改price就行
        }
      });
    } catch (e) {
      mbgGame.log(`IAPRequestProduct:${e.message}`);
    }
    mbgGame.log('mbgGame.IAPProducts:', JSON.stringify(mbgGame.IAPProductsConfig));
  },

  IAPOnSuccess(receiptData, signature) {
    // Purchase success
    mbgGame.log('Purchase successful:', receiptData);
    const sendData = {
      uuid: mbgGame.state.uuid,
      channel_id: mbgGame.channel_id,
      receiptData,
      signature,
      type: mbgGame.isIOS() ? 'ios' : 'googleplay',
    };
    // 有可能玩家充值成功后就掉线了,所以需要先保存一下receiptData,收到包后删除,如果下次发现没有没有处理的,就先发送
    if (mbgGame.isIOS()) {
      cc.sys.localStorage.setItem('tempshoplog', JSON.stringify(sendData));
    }

    mbgGame.IAP.sendIOSIAPData(sendData);

    mbgGame.IAP.buyEnd();
  },

  IAPOnFail(flag) {
    mbgGame.log('IAPOnFail:', flag);
    mbgGame.IAP.buyEnd();
  },

  buyBegin(product, payMode) {
    mbgGame.is_paying = {
      payMode,
      product,
    };
    mbgGame.gameScene && mbgGame.gameScene.setWait(mbgGame.getString('waitStr_iap'));
  },

  buyEnd() {
    mbgGame.gameScene && mbgGame.gameScene.setWaitOver();
  },

  buyProduct(product) {
    // mbgGame.log(`buyProduct:${JSON.stringify(product)}`);
    if (cc.sys.localStorage.getItem('tempshoplog')) return; // 有缓存数据时,不允许继续充值

    this.buyBegin(product, '苹果');

    let id = product.id;
    if (mbgGame.config.iosIAPConfig && mbgGame.config.iosIAPConfig[mbgGame.channel_id]) {
      if (mbgGame.config.iosIAPConfig[mbgGame.channel_id][product.id]) {
        // 有新的对应关系
        id = mbgGame.config.iosIAPConfig[mbgGame.channel_id][product.id];
      }
    }

    jsb.reflection.callStaticMethod('NativeOcClass', 'pay:', id);
  },
  // 支付宝
  alipay(product) {
    this.pay('alipay', product);
  },
  // 支付宝返回
  alipay_result() {
    // 0 成功  1 处理中  2 失败
    // mbgGame.log(`alipay_result:${ret}`);
    mbgGame.IAP.buyEnd();
  },
  // 到服务器查询充值是否已经到账
  payCheck() {
    // mbgGame.log("payCheck");
    const sendData = {
      uuid: mbgGame.state.uuid,
      channel_id: mbgGame.channel_id,
    };

    mbgGame.netCtrl.sendMsg('payCheck', sendData, (data) => {
      // 回调函数
      // mbgGame.log("payCheck data:", JSON.stringify(data));
      cc.sys.localStorage.removeItem('tempshop_vip');
      mbgGame.antiAddictionPayLog();
    });
  },

  pay(type, product) {
    this.buyBegin(product, type);

    const sendData = {
      product_id: product.id,
      type,
      uuid: mbgGame.state.uuid,
      channel_id: mbgGame.channel_id,
    };
    if (mbgGame.isRemoteRes()) {
      sendData.h5Mode = true;
    }

    mbgGame.netCtrl.sendMsg('preorder', sendData, (data) => {
      mbgGame.IAP.buyEnd();
      if (sendData.h5Mode) {
        mbgGame.panelShop.goH5Pay(data);
        return;
      }
      if (sendData.wxh5Mode) {
        window.alert(data);
        return;
      }
      if (mbgGame.isAndroid()) {
        jsb.reflection.callStaticMethod(mbgGame.packageName, 'pay', '(Ljava/lang/String;)V', `${type},${data}`);
      }
    });
  },

  // 微信
  weixinpay(product) {
    this.pay('wxpay', product);
  },
  // 微信返回
  weixin_result(ret) {
    // 0 成功  1 处理中  2 失败
    mbgGame.IAP.buyEnd();
  },

  // 米大师支付
  // 米大师支付
  midasPay(product) {
    mbgGame.log('米大师充值', product);
    wx.login({
      success: (data) => {
        mbgGame.log('midasQuery wx.login', data);
        mbgGame.wechatCode = data.code;
        mbgGame.wechatType = 'wechatGame';
        wx.requestMidasPayment({
          mode: 'game',
          env: 0, // 0 正式环境， 1 沙箱
          zoneId: '1',
          offerId: '1450015177',
          currencyType: 'CNY',
          platform: 'android',
          buyQuantity: product.price * 10, // 人民币价格
          success(res) {
            mbgGame.log('requestMidasPayment success', res);
            mbgGame.netCtrl.sendMsg(
              'midasPay',
              {
                code: data.code,
                product_id: product.id,
                uuid: mbgGame.state.uuid,
              },
              (payRes) => {
                mbgGame.log('[midasPay] res', payRes);
                if (payRes.status === 0) {
                  // 购买成功
                } else {
                }
              },
            );
          },
          fail(res) {
            mbgGame.log('requestMidasPayment fail', res);
            if (cc.sys.os === cc.sys.OS_IOS) {
              mbgGame.managerUi.createBoxSure('目前未开放小游戏IOS充值，有需要的可以下载我们的APP');
            }
          },
        });
      },
      fail: (ret) => {
        mbgGame.log('wx.login midasPay', ret);
        wx.authorize({
          scope: 'scope.userInfo',
          success: () => {
            this.midasPay(product);
          },
          fail: () => {
            mbgGame.loading.confirmMsg('需要授权后才能充值呀');
          },
        });
      },
    });
  },

  // 第三方支付，统一由服务器生成订单
  platformPay(product) {
    // mbgGame.log(`buyProduct:${JSON.stringify(product)}`);
    this.buyBegin(product, 'platformPay');

    const sendData = {
      product_id: product.id,
    };
    mbgGame.netCtrl.sendMsg('platform.preOrder', sendData, (data) => {
      const s = data.orderStr.split(',');
      const [callbackInfo, amount, notifyUrl, cpOrderId, accountId] = s;
      this.payData = {
        callbackInfo,
        cpOrderId,
        accountId,
      };
      jsb.reflection.callStaticMethod(mbgGame.packageName, 'pay', '(Ljava/lang/String;)V', data.orderStr);
    });
  },

  // 第三方充值回调
  payRet(ret) {
    mbgGame.log('[payRet]', ret);
    mbgGame.IAP.buyEnd();
  },
  payCancel(ret) {
    mbgGame.log('[payCancel]', ret);
    mbgGame.IAP.buyEnd();
  },
  // 第三方接口
  loginRet(msg) {
    mbgGame.log('[loginRet]', msg);
    if (mbgGame.channel_id === 'aligames') {
      // 当登录成功时SDKEventKey.ON_LOGIN_SUCC事件被触发，同时通过带回登录sid给游戏，sid为动态token，每次登录都会改变，需发送给游戏服务器做登录校验获取accountId用户唯一标识，客户端无法获取用户唯一标识
      mbgGame.platformData = {
        platform: 'aligames',
        sid: msg,
      };
      // 切换帐号需要换号，干脆uuid都到服务器查好了，后面再优化
      mbgGame.setSaveUUID('');
      mbgGame.loading && mbgGame.loading.guestLogin();
    }
  },

  // googlePlay
  googlePlayPay(product) {
    // mbgGame.log('[googlePlayPay]', product);
    jsb.reflection.callStaticMethod(mbgGame.packageName, 'pay', '(Ljava/lang/String;)V', `googleplay,${product.id}`);
  },
};

// java层只能读取cc对象,我也不知道为啥
cc.alipay_result = mbgGame.IAP.alipay_result; // cc.alipay_result为底层调用
cc.weixin_result = mbgGame.IAP.weixin_result;
cc.IAPRequestProduct = mbgGame.IAP.IAPRequestProduct;
cc.IAPOnSuccess = mbgGame.IAP.IAPOnSuccess;
cc.IAPOnFail = mbgGame.IAP.IAPOnFail;
// 第三方登录
cc.loginRet = mbgGame.IAP.loginRet;
cc.payRet = mbgGame.IAP.payRet;
cc.payCancel = mbgGame.IAP.payCancel;

cc.antiAddictionResult = mbgGame.antiAddictionResult;

window.h5payclose = function () {
  mbgGame.log('h5payclose');
  mbgGame.panelShop.closeH5Pay();
};
