const mbgGame = require('mbgGame');

mbgGame.ios = {
  // GameCenter
  // 竞技场增加排行榜数据
  addScore(score, rank_id) {
    return;
  },
  // 增加成就
  addArchivement(percent, archivement_id) {
    return;
  },
  getGCPlayerID() {
    return jsb.reflection.callStaticMethod('NativeOcClass', 'getGameCenterPlayerID');
  },
  getGCPlayerDisplayName() {
    return jsb.reflection.callStaticMethod('NativeOcClass', 'getGameCenterPlayerDisplayName');
  },
  GCLogin() {
    jsb.reflection.callStaticMethod('NativeOcClass', 'GameCenterLogin');
  },
  GCLoginOK() {
    // 底层回调,gamecenter登录成功后执行,使用时重载方法
    mbgGame.log('gamecenter login ok');
  },
};
