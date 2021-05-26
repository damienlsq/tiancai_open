// 各种渠道接口
const thirdPartyPlatform = require('../gameserver/thirdPartyPlatform');

module.exports = {
  * aligamesLogin(sid) {
    mbgGame.logger.info("[aligamesLogin]:", sid);
    const result = yield thirdPartyPlatform.aligamesRequest({
      appId: +mbgGame.iapConfig.platform_configs.aligames.gameId,
      appKey: mbgGame.iapConfig.platform_configs.aligames.apiKey,
      service: 'account.verifySession',
      // 请求的数据体
      data: {
        sid,
      },
    });
    mbgGame.logger.info("[aligamesLogin]:", result);
    return result;
  },
  aligamesSign(data) {
    return thirdPartyPlatform.aligamesSign(data, mbgGame.iapConfig.platform_configs.aligames.apiKey);
  },

  // 注意，所有第三方的userid都需要加前缀，避免冲突
  * getUserInfo(platformData) {
    if (platformData.platform === 'aligames') {
      const ret = yield this.aligamesLogin(platformData.sid);
      if (!ret) return null;
      return {
        userid: `ali_${ret.accountId}`,
        nickname: ret.nickName,
      };
    }
    return null;
  },
  // 发送玩家统计信息
  * collectUserData(nPlayer) {
    const netCtrl = nPlayer.getNetCtrl();
    let ret;
    if (netCtrl.platformData.platform === 'aligames') {
      const pobj = nPlayer.getPlayerLogic();
      let gameData = {
        category: 'loginGameRole',
        content: {
          zoneId: '1',
          zoneName: 's1',
          roleId: nPlayer.getShortID(), // 角色ID，一个角色同一个服ID保持唯一,长度不超过50
          roleName: pobj.nickName() || '#未设置', // 角色昵称,长度不超过50
          roleCTime: +pobj.m_Stat.getStatVal('totalTime'), // 角色创建时间(单位：秒)，获取服务器存储的角色创建时间，不可用本地手机时间，同一角色创建时间不可变，长度10
          roleLevel: `${pobj.getAvgLv()}`, // 角色等级，如游戏存在转生，转职等，等级需累加，长度不超过10
        },
      };
      gameData = encodeURIComponent(JSON.stringify(gameData));

      ret = yield thirdPartyPlatform.aligamesRequest({
        appId: +mbgGame.iapConfig.platform_configs.aligames.gameId,
        appKey: mbgGame.iapConfig.platform_configs.aligames.apiKey,
        service: 'ucid.game.gameData',
        // 请求的数据体
        data: {
          accountId: netCtrl.platformData.userid.substring(4),
          gameData,
        },
      });
      nPlayer.logInfo('[collectUserData]', ret);
    }
  },

  * mbgMobileVerify(mobile, code) {
    return yield thirdPartyPlatform.mbgMobileVerify(mobile, code);
  },
};