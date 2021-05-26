// 第三方平台接口
const md5 = require('md5');
const requestco = require('co-request');

module.exports = {
  // 阿里分发平台
  aligamesSign(data, apiKey) {
    const params = [];
    const optKeys = Object.keys(data);
    for (let i = 0; i < optKeys.length; i += 1) {
      const key = optKeys[i];
      params.push(`${key}=${data[key]}`);
    }
    const str = `${params.sort().join('')}${apiKey}`;
    const sig = md5(str);
    // mbgGame.log('aligamesSign', params, str, sig);
    return sig;
  },
  * aligamesRequest(opts) {
    const {
      appId,
      appKey,
      service,
      data
    } = opts;
    const sign = this.aligamesSign(data, appKey);
    const content = {
      id: moment().unix(),
      game: {
        gameId: appId
      },
      service,
      data,
      sign,
    };
    let url = `http://sdk.9game.cn/cp/${service}`;
    if (service === 'ucid.game.gameData') {
      url = `http://collect.sdkyy.9game.cn:8080/ng/cpserver/gamedata/${service}`;
    }

    const ret = yield requestco.post({
      url,
      method: "POST",
      json: true,
      headers: {
        "content-type": "application/json",
      },
      body: content,
    });

    if (ret.body.state && ret.body.state.code === 1) {
      return ret.body.data;
    }
    return null;
  },
};