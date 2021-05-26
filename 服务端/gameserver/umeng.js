const UMENG_API_URL = 'http://msg.umeng.com/api/send';

const httppost = require('co-request').post;
const crypto = require('crypto');
const commonMD5 = require('md5');

function md5(str) {
  const _md5 = crypto.createHash('md5');
  _md5.update(str, 'utf8');
  return _md5.digest('hex');
}

function* httppost_json(url, body_json_string) {
  const res = yield httppost({
    url,
    method: "POST",
    json: true,
    headers: {
      "content-type": "application/json",
    },
    body: body_json_string,
  });
  return res.body;
}

function* umeng_post(app_master_secret, post_body) {
  const sign_str = [
    'POST',
    UMENG_API_URL,
    JSON.stringify(post_body),
    app_master_secret,
  ].join('');
  const md5_sign = md5(sign_str);
  const res = yield httppost_json(`${UMENG_API_URL}?sign=${md5_sign}`, post_body);
  return res;
}

module.exports = {
  * push_unicast(appkey, app_master_secret, device_token, msg) {
    const params = {
      appkey,
      timestamp: (new Date()).getTime(),
      device_tokens: device_token,
      type: 'unicast',
      payload: {
        body: msg,
        display_type: 'notification',
      },
    };
    const res = yield umeng_post(app_master_secret, params);
    return res;
  },
  * push_unicast_delay(appkey, app_master_secret, device_token, msg, delayTime) {
    const params = {
      appkey,
      timestamp: (new Date()).getTime(),
      device_tokens: device_token,
      type: 'unicast',
      payload: {
        body: msg,
        display_type: 'notification',
      },
      policy: {
        start_time: moment(delayTime).format('YYYY-MM-DD HH:mm:ss'),
        expire_time: moment(delayTime + (60 * 1000)).format('YYYY-MM-DD HH:mm:ss'),
        out_biz_no: commonMD5(msg), // 用来防止重复推送，保证相同的msg，只会有一条推送
      },
    };
    const res = yield umeng_post(app_master_secret, params);
    return res;
  },
};
