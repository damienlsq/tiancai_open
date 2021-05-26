const mbgGame = require('mbgGame');

// 广告相关
mbgGame.social = {
  /*
      type值
          WXSceneSession  = 0,        < 聊天界面
          WXSceneTimeline = 1,        < 朋友圈
          WXSceneFavorite = 2,        < 收藏
  */
  weChatShareText(data) {
    return;
  },

  weChatShareLink(data) {},

  weChatSharePhoto(data, com) {},

  screenshot(fileName, com) {
    mbgGame.log('screenshot2', fileName);
    return '';
  },
};
