const md5 = require('md5');
const sha1 = require('sha1');
const request = require('request');
const xml2js = require('xml2js');
const https = require('https');
const url_mod = require('url');
const requestco = require('co-request');
const crypto = require('crypto');

// 米大师
const org_locs = {
  // sandbox
  1: {
    midasCancelPay: '/cgi-bin/midas/sandbox/cancelpay',
    midasGetBalance: '/cgi-bin/midas/sandbox/getbalance',
    midasPay: '/cgi-bin/midas/sandbox/pay',
    midasPresent: '/cgi-bin/midas/sandbox/present',
  },
  // 正式环境
  0: {
    midasCancelPay: '/cgi-bin/midas/cancelpay',
    midasGetBalance: '/cgi-bin/midas/getbalance',
    midasPay: '/cgi-bin/midas/pay',
    midasPresent: '/cgi-bin/midas/present',
  },
};

const sigExcluded = {
  api: 1, // 跟wx文档一致
  env: 1, // sandbox, 0 - 正式环境，可以省略 0，注意是整数，不是字符串
  midasSecret: 1,
  session_key: 1,
};

function hash(key, text) {
  return crypto.createHmac('sha256', key).update(text).digest('hex');
}
function makeMidasSig(opts) {
  const params = [];
  const optKeys = Object.keys(opts);
  for (let i = 0; i < optKeys.length; i += 1) {
    const key = optKeys[i];
    if (key !== 'access_token' && !sigExcluded[key]) {
      params.push(`${key}=${opts[key]}`);
    }
  }
  const stringA = params.sort().join('&');
  const org_loc = org_locs[opts.env || 0][opts.api];
  const midasTemp = `${stringA}&org_loc=${org_loc}&method=POST&secret=${opts.midasSecret}`;
  const sig = hash(opts.midasSecret, midasTemp);

  params.push(`access_token=${opts.access_token}`);
  params.push(`sig=${sig}`);

  const stringB = params.sort().join('&');
  const mpTemp = `${stringB}&org_loc=${org_loc}&method=POST&session_key=${opts.session_key}`;
  const mp_sig = hash(opts.session_key, mpTemp);
  return {
    sig,
    mp_sig,
  };
}
// 米大师

const signTypes = {
  MD5: md5,
  SHA1: sha1,
};

const RETURN_CODES = {
  SUCCESS: 'SUCCESS',
  FAIL: 'FAIL',
};

const URLS = {
  UNIFIED_ORDER: 'https://api.mch.weixin.qq.com/pay/unifiedorder',
  ORDER_QUERY: 'https://api.mch.weixin.qq.com/pay/orderquery',
  REFUND: 'https://api.mch.weixin.qq.com/secapi/pay/refund',
  REFUND_QUERY: 'https://api.mch.weixin.qq.com/pay/refundquery',
  DOWNLOAD_BILL: 'https://api.mch.weixin.qq.com/pay/downloadbill',
  SHORT_URL: 'https://api.mch.weixin.qq.com/tools/shorturl',
  CLOSE_ORDER: 'https://api.mch.weixin.qq.com/pay/closeorder',
};

const Payment = function (config) {
  this.appId = config.appId;
  this.partnerKey = config.partnerKey;
  this.mchId = config.mchId;
  this.subMchId = config.subMchId;
  this.notifyUrl = config.notifyUrl;
  this.passphrase = config.passphrase || config.mchId;
  this.pfx = config.pfx;
  return this;
};

Payment.prototype.getBrandWCPayRequestParams = function (order, callback) {
  const self = this;

  order = this._extendWithDefault(order, [
    'notify_url',
  ]);

  order.mch_id = this.mchId;

  this.unifiedOrder(order, (err, data) => {
    if (err) {
      return callback(err);
    }

    const params = {
      appid: self.appId,
      partnerid: self.mchId,
      prepayid: data.prepay_id,
      noncestr: self._generateNonceStr(),
      package: "Sign=WXPay",
      timestamp: self._generateTimeStamp(),
    };
    params.sign = self._getSign(params);

    callback(null, params);
  });
};

Payment.prototype._httpRequest = function (url, data, callback) {
  request({
    url,
    method: 'POST',
    body: data,
  }, (err, response, body) => {
    if (err) {
      return callback(err);
    }

    callback(null, body);
  });
};

Payment.prototype._httpsRequest = function (url, data, callback) {
  const parsed_url = url_mod.parse(url);
  const req = https.request({
    host: parsed_url.host,
    port: 443,
    path: parsed_url.path,
    pfx: this.pfx,
    passphrase: this.passphrase,
    method: 'POST',
  }, (res) => {
    let content = '';
    res.on('data', (chunk) => {
      content += chunk;
    });
    res.on('end', () => {
      callback(null, content);
    });
  });

  req.on('error', (e) => {
    callback(e);
  });
  req.write(data);
  req.end();
};

Payment.prototype._signedQuery = function (url, params, options, callback) {
  const self = this;
  const required = options.required || [];
  params = this._extendWithDefault(params, [
    'appid',
    'mch_id',
    'sub_mch_id',
    'nonce_str',
  ]);

  params = _.extend({
    sign: this._getSign(params),
  }, params);

  if (params.long_url) {
    params.long_url = encodeURIComponent(params.long_url);
  }

  for (const key in params) {
    if (params[key] !== undefined && params[key] !== null) {
      params[key] = params[key].toString();
    }
  }

  const missing = [];
  required.forEach((key) => {
    const alters = key.split('|');
    for (let i = alters.length - 1; i >= 0; i--) {
      if (params[alters[i]]) {
        return;
      }
    }
    missing.push(key);
  });

  if (missing.length) {
    return callback(`missing params ${missing.join(',')}`);
  }

  const request = (options.https ? this._httpsRequest : this._httpRequest).bind(this);
  request(url, this.buildXml(params), (err, body) => {
    if (err) {
      return callback(err);
    }
    self.validate(body, callback);
  });
};

Payment.prototype.unifiedOrder = function (params, callback) {
  const requiredData = [
    'body',
    'out_trade_no',
    'total_fee',
    'spbill_create_ip',
    'trade_type',
  ];
  if (params.trade_type == 'JSAPI') {
    requiredData.push('openid');
  } else if (params.trade_type == 'NATIVE') {
    requiredData.push('product_id');
  }
  params.notify_url = params.notify_url || this.notifyUrl;
  this._signedQuery(URLS.UNIFIED_ORDER, params, {
    required: requiredData,
  }, callback);
};

Payment.prototype.buildXml = function (obj) {
  const builder = new xml2js.Builder();
  const xml = builder.buildObject({ xml: obj });
  return xml;
};

Payment.prototype.validate = function (xml, callback) {
  const self = this;
  xml2js.parseString(xml, {
    trim: true,
    explicitArray: false,
  }, (err, json) => {
    let error = null,
      data;
    if (err) {
      error = new Error();
      err.name = 'XMLParseError';
      return callback(err, xml);
    }

    data = json ? json.xml : {};

    if (data.return_code == RETURN_CODES.FAIL) {
      error = new Error(data.return_msg);
      error.name = 'ProtocolError';
    } else if (data.result_code == RETURN_CODES.FAIL) {
      error = new Error(data.err_code);
      error.name = 'BusinessError';
    } else if (self.appId !== data.appid) {
      error = new Error();
      error.name = 'InvalidAppId';
    } else if (self.mchId !== data.mch_id) {
      error = new Error();
      error.name = 'InvalidMchId';
    } else if (self.subMchId && self.subMchId !== data.sub_mch_id) {
      error = new Error();
      error.name = 'InvalidSubMchId';
    } else if (self._getSign(data) !== data.sign) {
      error = new Error();
      error.name = 'InvalidSignature';
    }

    callback(error, data);
  });
};

/**
 * 使用默认值扩展对象
 * @param  {Object} obj
 * @param  {Array} keysNeedExtend
 * @return {Object} extendedObject
 */
Payment.prototype._extendWithDefault = function (obj, keysNeedExtend) {
  const defaults = {
    appid: this.appId,
    mch_id: this.mchId,
    sub_mch_id: this.subMchId,
    nonce_str: this._generateNonceStr(),
    notify_url: this.notifyUrl,
    op_user_id: this.mchId,
  };
  const extendObject = {};
  keysNeedExtend.forEach((k) => {
    if (defaults[k]) {
      extendObject[k] = defaults[k];
    }
  });
  return _.extend(extendObject, obj);
};

Payment.prototype._getSign = function (pkg, signType) {
  pkg = _.clone(pkg);
  delete pkg.sign;
  signType = signType || 'MD5';
  const string1 = this._toQueryString(pkg);
  const stringSignTemp = `${string1}&key=${this.partnerKey}`;
  const signValue = signTypes[signType](stringSignTemp).toUpperCase();
  return signValue;
};

Payment.prototype._toQueryString = function (object) {
  return Object.keys(object).filter((key) => {
    return object[key] !== undefined && object[key] !== '';
  }).sort().map((key) => {
    return `${key}=${object[key]}`;
  }).join('&');
};

Payment.prototype._generateTimeStamp = function () {
  return `${+(new Date() / 1000)}`;
};

/**
 * [_generateNonceStr description]
 * @param  {[type]} length [description]
 * @return {[type]}        [description]
 */
Payment.prototype._generateNonceStr = function (length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const maxPos = chars.length;
  let noceStr = '';
  let i;
  for (i = 0; i < (length || 32); i++) {
    noceStr += chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return noceStr;
};


/**
 * 根据授权获取到的code，换取access token和openid
 * 获取openid之后，可以调用`wechat.API`来获取更多信息
 * Examples:
 * ```
 * api.getAccessToken(code, callback);
 * ```
 * Callback:
 *
 * - `err`, 获取access token出现异常时的异常对象
 * - `result`, 成功时得到的响应结果
 *
 * Result:
 * ```
 * {
 *  data: {
 *    "access_token": "ACCESS_TOKEN",
 *    "expires_in": 7200,
 *    "refresh_token": "REFRESH_TOKEN",
 *    "openid": "OPENID",
 *    "scope": "SCOPE"
 *  }
 * }
 * ```
 * @param {String} code 授权获取到的code
 * @param {Function} callback 回调函数
 */

module.exports = {
  Payment,
  * midasGetBalance(appId, secret, code) {
    let url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}`;
    url += `&secret=${secret}`;
    url += `&js_code=${code}`;
    url += "&grant_type=authorization_code";

    let res = yield requestco(url);
    if (res.statusCode !== 200) {
      return 0;
    }
    const dResponse = JSON.parse(res.body);
    // console.log('makeMidResponsedasSig', dResponse);
    let session_key;
    if (dResponse && dResponse.session_key) {
      session_key = dResponse.session_key;
    } else {
      return 0;
    }

    const accessToken_url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${secret}`;
    res = yield requestco(accessToken_url);
    if (res.statusCode !== 200) {
      return 0;
    }
    const dAccessData = JSON.parse(res.body);
    // console.log('makeMidResponsedasSig access_token', dAccessData);
    let access_token;
    if (dAccessData && dAccessData.access_token) {
      access_token = dAccessData.access_token;
    } else {
      return 0;
    }

    const content = {
      api: 'midasGetBalance', // 跟wx文档一致
      openid: dResponse.openid,
      env: 0, // sandbox, 0 - 正式环境，可以省略 0，注意是整数，不是字符串
      appid: appId,
      midasSecret: '',
      // mode: 'game',
      ts: moment().unix(),
      zone_id: '1',
      offer_id: '',
      pf: 'android',
      access_token,
      session_key,
    };
    res = makeMidasSig(content);
    // console.log('makeMidasSig', content, res);
    content.sig = res.sig;
    content.mp_sig = res.mp_sig;

    const queryRes = yield requestco.post({
      url: `https://api.weixin.qq.com/cgi-bin/midas/getbalance?access_token=${access_token}`,
      method: "POST",
      json: true,
      headers: {
        "content-type": "application/json",
      },
      body: content,
    });

    mbgGame.logger.info("[midasGetBalance]", queryRes.body);
    return queryRes.body.balance || 0;
  },
  * midasPay(appId, secret, code, itemId, price, app_remark, order_id) {
    let url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}`;
    url += `&secret=${secret}`;
    url += `&js_code=${code}`;
    url += "&grant_type=authorization_code";

    let res = yield requestco(url);
    if (res.statusCode !== 200) {
      return null;
    }
    const dResponse = JSON.parse(res.body);
    // console.log('makeMidResponsedasSig', dResponse);
    let session_key;
    if (dResponse && dResponse.session_key) {
      session_key = dResponse.session_key;
    } else {
      return null;
    }
    // todo accessToken在有效期内不需要重复获取
    const accessToken_url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${secret}`;
    res = yield requestco(accessToken_url);
    if (res.statusCode !== 200) {
      return null;
    }
    const dAccessData = JSON.parse(res.body);
    // console.log('makeMidResponsedasSig access_token', dAccessData);
    let access_token;
    if (dAccessData && dAccessData.access_token) {
      access_token = dAccessData.access_token;
    } else {
      return null;
    }


    const content = {
      api: 'midasPay', // 跟wx文档一致
      openid: dResponse.openid,
      env: 0, // sandbox, 0 - 正式环境，可以省略 0，注意是整数，不是字符串
      appid: appId,
      midasSecret: '',
      // mode: 'game',
      ts: moment().unix(),
      zone_id: '1',
      offer_id: '',
      pf: 'android',
      access_token,
      session_key,

      bill_no: order_id,
      pay_item: itemId,
      app_remark,
      amt: price * 10,
    };
    res = makeMidasSig(content);
    //  console.log('makeMidasSig', content, res);
    content.sig = res.sig;
    content.mp_sig = res.mp_sig;

    // https://api.weixin.qq.com/cgi-bin/midas/pay?access_token=ACCESS_TOKEN
    const queryRes = yield requestco.post({
      url: `https://api.weixin.qq.com/cgi-bin/midas/pay?access_token=${access_token}`,
      method: "POST",
      json: true,
      headers: {
        "content-type": "application/json",
      },
      body: content,
    });

    // mbgGame.logger.info("[midasPay]", queryRes.body);
    return queryRes.body;
  },
  * getWechatAccessToken(appId, secret, code) {
    let url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}`;
    url += `&secret=${secret}`;
    url += `&js_code=${code}`;
    url += "&grant_type=authorization_code";

    const res = yield requestco(url);

    if (res.statusCode !== 200) {
      return {
        errcode: "200",
        errmsg: "statusCode 200",
      };
    }

    const dResponse = JSON.parse(res.body);
    return dResponse;
  },

  * getAccessToken(appId, secret, code) {
    let url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}`;
    url += `&secret=${secret}`;
    url += `&code=${code}`;
    url += "&grant_type=authorization_code";

    const res = yield requestco(url);

    if (res.statusCode !== 200) {
      return {
        errcode: "200",
        errmsg: "statusCode 200",
      };
    }

    const dResponse = JSON.parse(res.body);

    if (dResponse.openid) {
      // 调用后就提取玩家个人信息
      const dUserData = yield this.getUserInfo(dResponse.access_token, dResponse.openid);
      if (dUserData.openid) {
        dUserData.access_token = dResponse.access_token;
      }
      return dUserData;
    }
    return {
      errcode: dResponse.errcode,
      errmsg: dResponse.errmsg,
    };
  },

  /*
openid	普通用户的标识，对当前开发者帐号唯一
nickname	普通用户昵称
sex	普通用户性别，1为男性，2为女性
province	普通用户个人资料填写的省份
city	普通用户个人资料填写的城市
country	国家，如中国为CN
headimgurl	用户头像，最后一个数值代表正方形头像大小（有0、46、64、96、132数值可选，0代表640*640正方形头像），用户没有头像时该项为空
privilege	用户特权信息，json数组，如微信沃卡用户为（chinaunicom）
unionid	用户统一标识。针对一个微信开放平台帐号下的应用，同一用户的unionid是唯一的。
  */

  * getUserInfo(access_token, openid) {
    const url = `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}`;

    const res = yield requestco(url);

    if (!res || res.statusCode !== 200) {
      return {
        errcode: "200",
        errmsg: "statusCode 200",
      };
    }

    const dResponse = JSON.parse(res.body);
    if (dResponse && dResponse.openid) {
      return dResponse;
    }
    return {
      errcode: dResponse.errcode,
      errmsg: dResponse.errmsg,
    };
  },
};