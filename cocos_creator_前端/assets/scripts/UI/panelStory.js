const defines = require('warDefines');
const cnnm = require('cn-nm');

/*
  剧情关卡
  试炼关卡
*/

cc.Class({
  extends: cc.Component,

  properties: {
    bg: cc.Sprite,
    worldName0: cc.Label,
    worldName1: cc.Label,
    layoutWorld: cc.Node,
    layoutChapters: cc.Node,
    layoutStages: cc.Node,
    layoutStoryChest: cc.Node,
    btnInfoRaid: cc.Node,
    worldContent: cc.Node,
    stageContent: cc.Node,
    chapterContent: cc.Node,
    heightNodes: {
      type: cc.Node,
      default: [],
    },
    starBar: cc.ProgressBar,
    btnChests: {
      type: cc.Button,
      default: [],
    },
    starNums: {
      type: cc.Label,
      default: [],
    },
    stars: {
      type: cc.Node,
      default: [],
    },
    blackmask: cc.Node,
  },
  onLoad() {
    this.blackmask.opacity = 0;
    emitter.on(this, "worlddata", this.onRefresh);
    emitter.on(this, "timeVarUpdate", (data) => {
      if (!data || data.raidreset == null) {
        return;
      }
      emitter.emit("raiddata");
    });

    // 保存模版
    this.itemWorldTemplate = cc.instantiate(this.worldContent.children[0]);
    this.worldContent.removeAllChildren();

    this.itemChapterTemplate = cc.instantiate(this.chapterContent.children[0]);
    this.chapterContent.removeAllChildren();

    this.itemStageTemplate = cc.instantiate(this.stageContent.children[0]);
    this.stageContent.removeAllChildren();

    this.showLayoutMain();
    this.m_renderTypes = {
      stage: [{}, this.itemStageTemplate, this.stageContent, 'itemStage'],
      chapter: [{}, this.itemChapterTemplate, this.chapterContent, 'itemChapter'],
    };
    const worldIdxes = [4, 9, 1, 2, 3, 6];
    this.m_worldIdx2node = {};
    for (let i = 0; i < 6; i++) {
      const worldIdx = worldIdxes[i];
      let node = this.itemWorldTemplate;
      node = cc.instantiate(this.itemWorldTemplate);
      this.worldContent.addChild(node);
      const com = node.getComponent("itemWorld");
      com.m_worldIdx = worldIdx;
      com.title.string = mbgGame.getString(`title_stage${worldIdx}`);
      mbgGame.resManager.setImageFrame(com.bg, 'images', `storybg${worldIdx}`);
      node.active = false;
      this.m_worldIdx2node[worldIdx] = node;
    }
  },
  onOpened() {
    this.onShowMainPage();
  },
  getItem(renderType, idx) {
    if (!this.m_renderTypes[renderType]) {
      return null;
    }
    const [idx2item, pre, content, comName] = this.m_renderTypes[renderType];
    const node = idx2item[idx];
    if (!node) {
      return null;
    }
    node.active = true;
    return node.getComponent(comName);
  },
  getOrCreateItem(renderType, idx) {
    if (!this.m_renderTypes[renderType]) {
      mbgGame.error("getOrCreateItem renderType, idx", renderType, idx);
      return null;
    }
    const [idx2item, pre, content, comName] = this.m_renderTypes[renderType];
    if (!idx2item[idx]) {
      // idx 为 1的是模版
      const node = cc.instantiate(pre);
      content.addChild(node);
      idx2item[idx] = node;
    }
    const node = idx2item[idx];
    node.active = true;
    return node.getComponent(comName);
  },
  hideAllItems(renderType) {
    const idx2item = this.m_renderTypes[renderType][0];
    for (const idx in idx2item) {
      idx2item[idx].active = false;
    }
  },
  update(dt) {
    if (this.m_worldIdx == null) {
      delete this.renderList;
      delete this.renderIdx;
    }
    if (!this.renderList || !this.renderList.length) return;
    const itemIdx = this.renderList.shift();
    const idx = this.renderIdx;
    this.renderIdx += 1;
    const com = this.getOrCreateItem(this.renderType, idx);
    com.initMe(this.m_worldIdx, itemIdx);
    if (this.m_NewType && this.m_NewType === this.renderType && idx === 0) {
      const msgList = mbgGame.getCache('message') || [];
      delete this.m_NewType;
      if (msgList.length > 0 || mbgGame.winUnlock) {
        emitter.on(this, "nocachedmsg", this.onNoCachedMsg);
      } else {
        com.doNewAni();
      }
    }
  },
  onNoCachedMsg() {
    emitter.off(this, "nocachedmsg");
    if (this.m_NewType) {
      const com = this.getOrCreateItem(this.m_NewType, 0);
      this.stageContent.active = true;
      com.doNewAni();
    }
  },
  getItemChapter(idx) {
    return this.getItem('chapter', idx);
  },
  getItemStage(idx) {
    return this.getItem('stage', idx);
  },
  openWorld(worldIdx) {
    if (worldIdx) {
      this.m_worldIdx = worldIdx;
    }
    if (!this.m_worldIdx) {
      this.onShowMainPage();
      return false;
    }
    let ok = false;
    if (defines.StoryWorlds.indexOf(this.m_worldIdx) !== -1) {
      ok = this.onShowStoryWorld(this.m_worldIdx);
    } else if (this.m_worldIdx === defines.raidWorldIdx) {
      ok = this.onShowRaid();
    } else {
      ok = this.onShowDayWars();
    }
    return ok;
  },
  onRefresh(worldIdx) {
    if (defines.StoryWorlds.indexOf(worldIdx) !== -1) {
      // worlddata不要直接刷剧情关卡，让warMgr刷
      return;
    }
    this.refreshByWorldIdx(worldIdx);
  },
  refreshByWorldIdx(worldIdx) {
    mbgGame.log("refreshByWorldIdx", worldIdx);
    const ok = this.openWorld(worldIdx);
    if (ok) {
      if (defines.StoryWorlds.indexOf(this.m_worldIdx) !== -1) {
        // 记录上次刷新时的maxStageIdx和maxChapterID，方便做动画
        const curMaxChapterID = mbgGame.player.getMaxChapterID(this.m_worldIdx);
        const curMaxStageIdx = mbgGame.player.getCurWorldMaxLv(this.m_worldIdx);
        mbgGame.log("chapter", this.m_oldMaxChapterID, curMaxChapterID);
        mbgGame.log("stage", this.m_oldMaxStageIdx, curMaxStageIdx);
        this.m_NewType = null;
        if (this.m_oldMaxChapterID && this.m_oldMaxChapterID !== curMaxChapterID) {
          this.m_chapterID = null;
          this.onShowStoryWorldByWorldIdx(this.m_worldIdx);
          this.m_NewType = 'chapter';
        } else if (this.m_chapterID && this.m_oldMaxStageIdx && this.m_oldMaxStageIdx !== curMaxStageIdx) {
          this.showLayoutStages();
          this.onRefreshStoryStages(this.m_chapterID);
          this.m_NewType = 'stage';
        } else {
          if (this.m_chapterID) {
            this.showLayoutStages();
            this.onRefreshStoryStages(this.m_chapterID);
          } else {
            this.onShowStoryWorldByWorldIdx(this.m_worldIdx);
          }
        }
      } else if (this.m_worldIdx === defines.raidWorldIdx) {
        this.onRefreshRaidStages();
      } else {
        this.onRefreshDayWarStages();
      }
    }
  },
  onEnterChapter(worldIdx, chapterIdx) {
    this.doFade(() => {
      this.showLayoutStages();
      const chapterID = (worldIdx * 1000) + chapterIdx;
      if (!(chapterID > 0)) {
        mbgGame.error("onEnterChapter error", chapterID, worldIdx, chapterIdx);
      }
      this.onRefreshStoryStages(chapterID);
    });
  },
  doFade(cb) {
    this.blackmask.runAction(cc.sequence(
      cc.fadeIn(0.2),
      cc.callFunc(cb, this),
      cc.fadeOut(0.4)));
  },
  onPre() {
    this.doFade(() => {
      if (this.m_chapterID && defines.StoryWorlds.indexOf(this.m_worldIdx) !== -1) {
        this.onShowStoryWorld(this.m_worldIdx);
        this.onRefreshStoryChapters(true);
      } else {
        this.onShowMainPage();
      }
    });
  },
  onShowWorld(worldIdx) {
    this.doFade(() => {
      if (defines.StoryWorlds.indexOf(worldIdx) !== -1) {
        this.onShowStoryWorldByWorldIdx(worldIdx);
      } else if (worldIdx === defines.dayWorldIdx) {
        this.onDayWars();
      } else if (worldIdx === defines.raidWorldIdx) {
        this.onRaid();
      }
    });
  },
  onShowStoryWorldByWorldIdx(worldIdx) {
    this.onShowStoryWorld(worldIdx);
    this.onRefreshStoryChapters();
  },
  onRaid() {
    this.showBg(`20002_1`);
    this.onShowRaid();
    this.onRefreshRaidStages();
  },
  onDayWars() {
    this.showBg(`20004_0`);
    this.onShowDayWars();
    this.onRefreshDayWarStages();
  },
  onShowDayWars() {
    this.m_worldIdx = defines.dayWorldIdx;
    this.btnInfoRaid.active = false;
    this.showLayoutStages();
    this.m_worldIdx2node[this.m_worldIdx].string = mbgGame.getString('title_stage4');
    return true;
  },
  onRefreshDayWarStages() {
    this.setLayoutStagesHeight(850);
    const renderList = [];
    const dayWarTypes = [
      "wheelwar", "coinwar", "matwar", "herowar2",
      "herowar3", "herowar4", "herowar5",
      "herowar6",
    ];
    this.worldName1.string = mbgGame.getString('title_stage4');
    for (let i = 0; i < dayWarTypes.length; i++) {
      const type = dayWarTypes[i];
      // 验证开放时间
      const days = mbgGame.config.constTable.OpenDay[type];
      const curDay = moment().day();
      if (days.indexOf(curDay) === -1) {
        continue;
      }
      // 验证解锁
      if (type === "coinwar" && !mbgGame.player.isCoinWarUnlocked()) {
        continue;
      }
      if (type === "matwar" && !mbgGame.player.isMatWarUnlocked()) {
        continue;
      }
      if (type === "wheelwar" && !mbgGame.player.isWheelWarUnlocked()) {
        continue;
      }
      if (type.startsWith('herowar') && !mbgGame.player.isHeroWarUnlocked()) {
        continue;
      }
      renderList.push(mbgGame.player.getCurDayWarStageIdx(type));
    }
    this.setRenderList("stage", renderList);
  },
  onEnterDayWar(worldIdx, stageIdx) {
    const dayWarType = mbgGame.player.getDayWarTypeByStageIdx(stageIdx);
    mbgGame.log("onEnterDayWar", worldIdx, stageIdx, dayWarType);
    const schemeIdx = mbgGame.player.getSavedSchemeIdx(dayWarType);
    const cb = this.onBeginWarCB.bind(this);
    mbgGame.warMgr.tryBeginWar(() => {
      mbgGame.netCtrl.sendMsg('daywar.beginWar', {
        param: {
          schemeIdx,
          w: worldIdx,
          type: dayWarType,
        },
      }, cb);
    });
  },
  hildeAllLayout() {
    this.layoutWorld.x = 100000;
    this.layoutChapters.x = 100000;
    this.layoutStages.x = 100000;
  },
  showLayoutMain() {
    this.bg.node.parent.active = false;
    this.hildeAllLayout();
    this.layoutWorld.x = 0;
  },
  showLayoutStages() {
    this.hildeAllLayout();
    this.layoutStages.x = 0;
    this.layoutStoryChest.active = false;
  },
  showLayoutChapters() {
    this.hildeAllLayout();
    this.layoutChapters.x = 0;
  },
  setLayoutStagesHeight(h) {
    _.each(this.heightNodes, (node) => {
      node.height = h;
      if (node.getComponent(cc.ScrollView)) {
        node.height += 10;
      }
    });
  },
  onShowMainPage() {
    this.showLayoutMain();
    this.m_worldIdx = null;
    this.m_worldIdx2node[6].active = true;
    for (let worldIdx = 1; worldIdx <= 3; worldIdx++) {
      const unlocked = mbgGame.player.isWorldUnlocked(worldIdx);
      this.m_worldIdx2node[worldIdx].active = !!unlocked;
    }
    this.m_worldIdx2node[defines.raidWorldIdx].active = mbgGame.player.isRaidUnlocked();
    this.m_worldIdx2node[defines.dayWorldIdx].active = mbgGame.player.isCoinWarUnlocked() || mbgGame.player.isMatWarUnlocked();
  },
  onShowRaid() {
    this.setLayoutStagesHeight(850);
    if (!mbgGame.player.isRaidUnlocked()) {
      mbgGame.managerUi.floatMessage(mbgGame.getString(
        `errcode${mbgGame.config.ErrCode.Raid_StageLocked}`));
      return false;
    }
    this.m_worldIdx = defines.raidWorldIdx;
    this.btnInfoRaid.active = true;
    this.showLayoutStages();
    return true;
  },
  onShowStoryWorld(worldIdx) {
    if (!worldIdx) {
      return false;
    }
    if (!mbgGame.player.isWorldUnlocked(worldIdx)) {
      mbgGame.log("worldIdx", worldIdx);
      mbgGame.managerUi.floatMessage(mbgGame.getString(
        `errcode${mbgGame.config.ErrCode.Story_StageLocked}`));
      return false;
    }
    let img;
    switch (worldIdx) {
      case 1:
        img = '10010_1';
        break;
      case 2:
        img = '20001_0';
        break;
      case 3:
        img = '30008_1';
        break;
      case 6:
        img = '10008_0';
        break;
      default:
        break;
    }
    this.showBg(img);
    this.m_worldIdx2node[worldIdx].string = mbgGame.getString(`title_stage${worldIdx}`);
    this.btnInfoRaid.active = false;
    this.showLayoutChapters();
    this.m_worldIdx = worldIdx;
    return true;
  },
  getWarType(worldIdx, stageIdx) {
    if (worldIdx === defines.dayWorldIdx) {
      return mbgGame.player.getDayWarTypeByStageIdx(stageIdx);
    }
    if (defines.StoryWorlds.indexOf(worldIdx) !== -1) {
      return `storywar${worldIdx}`;
    }
    if (worldIdx === defines.raidWorldIdx) {
      return `raidwar${stageIdx}`;
    }
    if (worldIdx === defines.battleWorldIdx) {
      return 'battlewar';
    }
    if (worldIdx === defines.pvpWorldIdx) {
      return 'pvpwar';
    }
    return '';
  },
  onEnterStage(worldIdx, stageIdx) {
    if (worldIdx >= 1 && worldIdx <= 3) {
      const requiredCharaIDs = _.filter(defines.CharaIDsByStoryWorld[worldIdx], (_charaID) => {
        return mbgGame.player.hasChara(_charaID);
      });
      if (_.isEmpty(requiredCharaIDs)) {
        mbgGame.managerUi.floatMessage(`缺少可以进入该平行世界的角色`);
        return;
      }
    }
    mbgGame.managerUi.openSchemeTeamEditor({
      wartype: this.getWarType(worldIdx, stageIdx),
      worldIdx,
      stageIdx,
      finishCB: (_stageIdx, tag) => {
        this.onBeginWar(worldIdx, _stageIdx, tag);
      },
    });
  },
  onBeginWar(worldIdx, stageIdx, tag) {
    mbgGame.log("onBeginWar", worldIdx, stageIdx, tag);
    if (defines.StoryWorlds.indexOf(worldIdx) !== -1) {
      const cb = this.onBeginWarCB.bind(this);
      mbgGame.warMgr.tryBeginWar(() => {
        const idx = mbgGame.player.getSavedSchemeIdx(`storywar${worldIdx}`);
        mbgGame.log("story.beginWar", worldIdx, stageIdx, idx);
        mbgGame.netCtrl.sendMsg('story.beginWar', {
          param: {
            worldIdx, // 哪个世界
            stageIdx, // 哪一关
            schemeIdx: idx,
          },
        }, cb);
      });
    } else if (worldIdx === 4) {
      this.onEnterDayWar(worldIdx, stageIdx);
    } else if (worldIdx === 9) {
      const idx = mbgGame.player.getSavedSchemeIdx(`raidwar${stageIdx}`);
      mbgGame.log('raid begin', worldIdx, stageIdx, idx);
      const cb = this.onBeginWarCB.bind(this);
      mbgGame.warMgr.tryBeginWar(() => {
        mbgGame.netCtrl.sendMsg('raid.beginWar', {
          param: {
            raidIdx: stageIdx, // 哪一关
            next: tag === "next",
            schemeIdx: idx,
          },
        }, cb);
      });
    }
  },
  onBeginWarCB(data) {
    mbgGame.log('[panelStory.beginWar]', data);
    if (data.code === 'ok') {
    } else {
      mbgGame.managerUi.floatMessage(data.err);
    }
  },
  // 剧情章节
  onRefreshStoryChapters(dontHideAll) {
    this.m_chapterID = null;
    this.worldName0.string = mbgGame.getString(`title_stage${this.m_worldIdx}`);
    const maxChapterID = mbgGame.player.getMaxChapterID(this.m_worldIdx);
    const renderList = [];
    const minChapterID = (this.m_worldIdx * 1000) + 1;
    for (let chapterID = minChapterID; chapterID <= maxChapterID; chapterID++) {
      renderList.push(chapterID % 1000);
    }
    this.setRenderList("chapter", renderList.reverse(), dontHideAll);
    const curMaxChapterID = mbgGame.player.getMaxChapterID(this.m_worldIdx);
    this.m_oldMaxChapterID = curMaxChapterID;
  },
  // 剧情关卡
  onRefreshStoryStages(chapterID) {
    this.m_chapterID = chapterID;
    this.setLayoutStagesHeight(766);
    this.layoutStoryChest.active = true;
    const worldIdx = this.m_worldIdx;
    const chapterIdx = chapterID % 1000;
    const dChapterData = mbgGame.config.chapter[chapterID];
    if (!dChapterData) {
      mbgGame.error("no dChapterData", chapterID);
    }
    const chapterNum = mbgGame.getString("chapter", {
      c: cnnm.toCn(chapterIdx),
    });
    const chaptername = mbgGame.getString(`chapter${chapterID}`);
    // 统计章节已获得星星数，和理论总数
    const starCount = mbgGame.player.getStoryStageStarCount(chapterID, worldIdx);
    const dWorld = mbgGame.player.getWorldDataByIdx(worldIdx);
    // 计算总星数够不够领取该奖励
    const totalStar = dChapterData.stageID.length * 3;
    this.starBar.progress = starCount / totalStar;
    for (let i = 0; i < 3; i++) {
      const btnChest = this.btnChests[i];
      btnChest.interactable = true;
      const numLabel = this.starNums[i];
      const starNode = this.stars[i];
      const s = dChapterData.stars[i];
      btnChest.canOpen = starCount > 0 && starCount >= s;
      numLabel.string = `x ${s}`;
      const p = s / totalStar;
      btnChest.node.x = ((p - 0.5) * 541) - 20;
      numLabel.node.x = btnChest.node.x;
      starNode.x = btnChest.node.x - 20;
      // todo 已经领取的箱，换一个打开箱子的图
      if (dWorld.c && dWorld.c[chapterIdx] && dWorld.c[chapterIdx][i]) {
        btnChest.interactable = false;
        numLabel.string = '已领';
        numLabel.node.x = btnChest.node.x - 20;
        starNode.active = false;
      } else {
        starNode.active = true;
      }
    }
    this.showBg(`${dChapterData.bg}`);
    this.worldName1.string = `${chapterNum}: ${chaptername}`;
    const maxLv = mbgGame.player.getCurWorldMaxLv(worldIdx);
    let renderList = [];
    for (let i = 0; i < dChapterData.stageID.length; i++) {
      const stageID = dChapterData.stageID[i];
      const lv = stageID % 1000;
      if (lv > maxLv) {
        break;
      }
      renderList.push(lv);
    }
    renderList = renderList.reverse();
    this.setRenderList("stage", renderList);
    const curMaxStageIdx = mbgGame.player.getCurWorldMaxLv(this.m_worldIdx);
    this.m_oldMaxStageIdx = curMaxStageIdx;
  },
  showBg(img) {
    this.bg.node.parent.active = true;
    mbgGame.resManager.setImageFrame(this.bg, 'images', img);
  },
  defalutBg() {

  },
  // 试炼关卡
  onRefreshRaidStages() {
    this.setLayoutStagesHeight(850);
    this.worldName1.string = mbgGame.getString('title_stage9');
    const dData = mbgGame.player.getRaidData();
    const dLv = dData.d;
    let renderList = [];
    for (let raidIdx = 1; raidIdx <= mbgGame.config.constTable.MaxRaidStageIdx; raidIdx++) {
      if (!dLv[raidIdx]) {
        continue;
      }
      renderList.push(raidIdx);
    }
    renderList = renderList.reverse();
    this.setRenderList("stage", renderList);
  },
  setRenderList(renderType, renderList, dontHideAll) {
    this.renderType = renderType;
    this.renderList = renderList;
    this.renderIdx = 0;
    if (!dontHideAll) this.hideAllItems(renderType);
  },
  onClickChest(idx) {
    const btnChest = this.btnChests[idx];
    if (!btnChest.canOpen) {
      // 内容简介窗
      mbgGame.resManager.loadPrefab('rewardView', (prefab) => {
        const node = cc.instantiate(prefab);
        const dChapter = mbgGame.config.chapter[this.m_chapterID];
        const dReward = dChapter[`reward${idx + 1}`];
        mbgGame.managerUi.addTinyWin(node, 'rewardView', dReward);
      });
      return;
    }
    mbgGame.netCtrl.sendMsg("story.recvRward", {
      chapterID: this.m_chapterID,
      idx,
    }, (data) => {
      if (data.code === "err") {
        mbgGame.errMsg(data.err);
      } else {
        this.refreshByWorldIdx();
      }
    });
  },
  onClickChest0() {
    this.onClickChest(0);
  },
  onClickChest1() {
    this.onClickChest(1);
  },
  onClickChest2() {
    this.onClickChest(2);
  },
});