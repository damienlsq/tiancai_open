const mbgGame = require('mbgGame');
const cnnm = require('cn-nm');

cc.Class({
  extends: cc.Component,

  properties: {
    title: cc.Label,
    bg: cc.Sprite,
    chest: cc.Sprite,
    starsNode: cc.Node,
  },
  onLoad() {
  },
  onDestroy() {
  },
  doNewAni() {
    this.node.stopAllActions();
    this.node.scale = 0.001;
    this.node.runAction(cc.scaleTo(0.6, 1, 1).easing(cc.easeBackOut()));
  },
  initMe(worldIdx, chapterIdx) {
    mbgGame.log("chapter initMe", worldIdx, chapterIdx);
    this.m_worldIdx = +worldIdx || this.m_worldIdx;
    const chapterID = (worldIdx * 1000) + chapterIdx;
    const dChapterData = mbgGame.config.chapter[chapterID];
    this.m_chapterIdx = +chapterIdx || this.m_chapterIdx;
    this.m_chapterID = chapterID;
    const chaptername = mbgGame.getString(`chapter${chapterID}`);
    const chapterNum = mbgGame.getString("chapter", {
      c: cnnm.toCn(chapterIdx),
    });
    this.title.string = `${chapterNum}: ${chaptername} `;
    mbgGame.resManager.setImageFrame(this.bg, 'images', `${dChapterData.bg}is`);
    const starCount = mbgGame.player.getStoryStageStarCount(chapterID, worldIdx);
    let star = 0;
    let hasChest = false;
    this.m_chestIdx = null;
    for (let i = 0; i < 3; i++) {
      const s = dChapterData.stars[i];
      if (starCount > 0 && starCount >= s) {
        star += 1;
        const dWorld = mbgGame.player.getWorldDataByIdx(worldIdx);
        if (!(dWorld.c && dWorld.c[chapterIdx] && dWorld.c[chapterIdx][i])) {
          if (!hasChest) {
            mbgGame.resManager.setImageFrame(this.chest, 'images', `chest${i + 1}`);
            this.m_chestIdx = i;
            hasChest = true;
          }
        }
      }
    }
    mbgGame.log("m_chestIdx", this.m_chestIdx);
    this.chest.node.active = hasChest;
    this.starsNode.getComponent('stars').setStar(star, 3);
  },
  onEnter() {
    mbgGame.panelStory.onEnterChapter(this.m_worldIdx, this.m_chapterIdx);
  },
  onClickChest() {
    mbgGame.log("onClickChest", this.m_chapterID, this.m_chestIdx);
    mbgGame.netCtrl.sendMsg("story.recvRward", {
      chapterID: this.m_chapterID,
      idx: this.m_chestIdx,
    }, (data) => {
      if (data.code === "err") {
        mbgGame.errMsg(data.err);
      } else {
        mbgGame.panelStory.refreshByWorldIdx(this.m_worldIdx);
        mbgGame.sceneMenu.checkStory();
      }
    });
  },
});