const facFloorBase = require('facFloorBase');

cc.Class({
  extends: facFloorBase,
  properties: {

  },
  onLoad() {
    this.initCommon();
  },
  getPercent(worldIdx) {
    // 天才 20 外星 20 中古 20 天才 5 外星 5中古 5
    const stagesLv = { 1: 0, 2: 0, 3: 0 };
    const mainStage = mbgGame.player.getCurWorldMaxLv(6);
    if (mainStage <= 1) {
      stagesLv[1] = 0;
    } else if (mainStage <= 21) {
      stagesLv[1] = mainStage;
    } else if (mainStage <= 41) {
      stagesLv[1] = 20;
      stagesLv[2] = mainStage - 20;
    } else if (mainStage <= 61) {
      stagesLv[1] = 20;
      stagesLv[2] = 20;
      stagesLv[3] = mainStage - 40;
    } else if (mainStage <= 66) {
      stagesLv[1] = 20 + mainStage - 61;
      stagesLv[2] = 20;
      stagesLv[3] = 20;
    } else if (mainStage <= 71) {
      stagesLv[1] = 25;
      stagesLv[2] = 20 + mainStage - 66;
      stagesLv[3] = 20;
    } else if (mainStage <= 76) {
      stagesLv[1] = 25;
      stagesLv[2] = 25;
      stagesLv[3] = 20 + mainStage - 71;
    } else {
      stagesLv[1] = 25;
      stagesLv[2] = 25;
      stagesLv[3] = 25;
    }
    const nowStage = mbgGame.player.getCurWorldMaxLv(worldIdx);
    if (nowStage >= 1) {
      stagesLv[worldIdx] += nowStage - 1;
    }
    // mbgGame.log('getPercent:', worldIdx, stagesLv, Math.floor(stagesLv[worldIdx] * 100 / 75));
    return Math.floor(stagesLv[worldIdx] * 100 / 75);
  },
  refreshStory(worldIdx) {
    const node = cc.find(`story${worldIdx}`, this.node);
    const percentNode = cc.find('percent', node);
    const nameNode = cc.find('name', node);
    const percent = this.getPercent(worldIdx);
    if (percent === 0) {
      nameNode.active = false;
      percentNode.active = false;
    } else {
      mbgGame.setLabel(percentNode, `${percent}%`);
      nameNode.active = true;
      percentNode.active = true;
      const bgNode = cc.find('bg', node);
      mbgGame.resManager.setImageFrame(bgNode, 'images', `story${worldIdx}`);
    }
  },
  getSceneName() {
    return 'story';
  },
  refreshFloor() {
    this.refreshStory(1);
    this.refreshStory(2);
    this.refreshStory(3);
  },
  openStory() {
    mbgGame.sceneMenu.onClickBtn2();
  },
});

function newFunction() {
  return require('mbgGame');
}
