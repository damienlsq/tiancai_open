const defines = require('warDefines');
const timer = require('timer');
const warBase = require('warBase');
const CWarCtrl = require('warctrl');

cc.Class({
  extends: warBase,

  properties: {
    worldNode: cc.Node,
    gameLayer: cc.Prefab,
    loadingBg: cc.Node,
  },

  // use this for initialization
  onLoad() {
    mbgGame.warMgr = this;
    mbgGame.warCtrl = new CWarCtrl();
    this.m_Worlds = {};
    this.m_TimerOwnerID = timer.newOwnerID();
    emitter.on(this, "waitFriendWar", this.onSetWaitFriendWar);
    emitter.on(this, "enterGame", this.onEnterGameCheck);
  },
  getWarRootNode() {
    return this.worldNode;
  },
  getGameLayeyObj(worldIdx) {
    return this.m_Worlds[worldIdx];
  },
  hasWar(worldIdx) {
    return this.m_Worlds[worldIdx] != null;
  },
  hasAnyWar() {
    for (const worldIdx in this.m_Worlds) {
      if (this.m_Worlds[worldIdx]) {
        return +worldIdx;
      }
    }
    return null;
  },
  getCurWarCom() {
    const worldIdx = this.hasAnyWar();
    return worldIdx != null && this.getWarCom(worldIdx);
  },
  getWarCom(worldIdx) {
    const layer = this.getGameLayeyObj(worldIdx);
    if (!layer || !layer.isValid) {
      return null;
    }
    const com = layer.getComponent("war");
    if (!com || !com.isValid) {
      return null;
    }
    return com;
  },
  getLayerGameCom(worldIdx) {
    return this.getGameLayeyObj(worldIdx) && this.getGameLayeyObj(worldIdx).getChildByName('layerGame');
  },
  onSetWaitFriendWar(b) {
    this.waitFriendWar = b;
  },
  tryBeginWar(callback) {
    if (this.waitFriendWar) {
      mbgGame.managerUi.createConfirmDialog("你正在发起友谊赛，是否取消友谊赛并继续?",
        () => {
          emitter.emit("removeFriendWarMatch", false, () => {
            callback();
          });
        });
      return;
    }
    callback();
  },
  createWar(worldIdx) {
    if (this.m_Worlds[worldIdx] && this.m_Worlds[worldIdx].isValid) {
      return;
    }
    delete this.m_Worlds[worldIdx];
    mbgGame.log("warMgr.createWar", worldIdx);
    const gameLayerObj = cc.instantiate(this.gameLayer);
    const worldNode = this.getWarRootNode(worldIdx);
    worldNode.addChild(gameLayerObj);
    this.m_Worlds[worldIdx] = gameLayerObj;
    gameLayerObj.getComponent("war").initMe(worldIdx);
  },
  releaseWar(worldIdx) {
    mbgGame.log("warMgr.releaseWar", worldIdx);
    const gameLayerObj = this.m_Worlds[worldIdx];
    delete this.m_Worlds[worldIdx];
    if (gameLayerObj) {
      const warCom = gameLayerObj.getComponent("war");
      warCom.cleanWar(null, "vvv");
      gameLayerObj.destroy();
    }
  },
  onEnterGameCheck(data) {
    if (data && data.w != null) { // 战斗还在进行
      const worldIdx = data.w;
      const warCom = this.getWarCom(worldIdx);
      if (warCom && !warCom.isClientWar()) {
        // 战斗场景还在，请求BS恢复战斗现场
        // 不releaseAll
        warCom.callBSWarFunc("resumeWar", {});
      } else {
        this.releaseAllWars();
        mbgGame.netCtrl.sendMsg("war.resumeWar", {
          worldIdx,
        });
      }
    } else {
      this.releaseAllWars();
    }
  },
  releaseAllWars() {
    mbgGame.warCtrl.releaseAllWars();
    for (let i = 0; i < defines.AllWorlds.length; i++) {
      const worldIdx = defines.AllWorlds[i];
      this.releaseWar(worldIdx);
    }
    this.hideWar();
  },
  showWorldNode() {
    this.worldNode.active = true;
  },
  hideWorldNode() {
    this.worldNode.active = false;
  },
  setBlack() {
    this.loadingBg.active = true;
    this.loadingBg.opacity = 255;
  },
  fadeToBlack(cb, selectorTarget) {
    this.loadingBg.stopAllActions();
    if (this.loadingBg.active && this.loadingBg.opacity === 255) {
      cb();
      return;
    }
    this.loadingBg.active = true;
    this.loadingBg.opacity = 0;
    this.loadingBg.runAction(cc.sequence(cc.fadeIn(0.5), cc.callFunc(cb, selectorTarget)));
  },
  fadeToWhite(duration) {
    if (this.loadingBg.active && this.loadingBg.opacity === 0) {
      this.loadingBg.active = false;
      return;
    }
    this.loadingBg.active = true;
    this.loadingBg.opacity = 255;
    this.loadingBg.stopAllActions();
    this.loadingBg.runAction(
      cc.sequence(
        cc.fadeOut(duration || 0.5),
        cc.callFunc(() => {
          this.loadingBg.active = false;
          mbgGame.player.checkTeach();
        })));
  },
  fadeToBlack_WinResult(worldIdx) {
    this.fadeToBlack(() => {
      emitter.emit('closeMe');
      this.hideWorldNode();
      this.onCloseWarResultPanel(worldIdx);
      mbgGame.managerUi.checkCachedMessage();
    }, this);
  },
  addLoadJob(type, data) {
    // mbgGame.log("addLoadJob", type, data[0]);
    const tuple = [type, data];
    if (!this.m_LoadJobs) {
      this.m_LoadJobs = [];
    }
    this.m_LoadJobs.push(tuple);
  },
  beginAllLoadJob() {
    const jobs = _.clone(this.m_LoadJobs);
    for (let i = 0; i < jobs.length; i++) {
      const tuple = jobs[i];
      this.beginOneLoadJob(i, tuple);
    }
  },
  beginOneLoadJob(idx, tuple) {
    const [type, data] = tuple;
    if (type === "spine") {
      const [spineName] = data;
      mbgGame.resManager.getOrLoadSpineData(spineName, () => {
        this.finishJob();
      });
    } else if (type === "img") {
      const [imgName, node] = data;
      mbgGame.resManager.setImageFrame(node.getComponent(cc.Sprite), 'images', imgName, () => {
        this.finishJob();
      });
    } else if (type === "music") {
      const [musicName] = data;
      mbgGame.resManager.loadMusic(musicName, () => {
        this.finishJob();
      });
    }
  },
  finishJob() {
    if (!this.m_LoadJobs) {
      mbgGame.gameScene.setWaitOver();
      return;
    }
    if (this.m_FinishedJobs == null) {
      this.m_FinishedJobs = 0;
    }
    this.m_FinishedJobs += 1;
    // mbgGame.log("finishJob", this.m_FinishedJobs, "/", this.m_LoadJobs.length);
    this.checkLeftLoadJobs();
    mbgGame.gameScene.setWaitOver();
  },
  checkLeftLoadJobs() {
    if (!this.m_LoadJobs || this.m_LoadJobs.length === this.m_FinishedJobs) {
      this.m_LoadJobs = null;
      this.m_FinishedJobs = null;
      this.onLoadJobComplete();
    }
  },
  onLoadJobComplete() {
    mbgGame.log("onLoadJobComplete");
    const warCom = this.getCurWarCom();
    if (!warCom.isValid) {
      return;
    }
    this.fadeToWhite();
    warCom.onLoadJobComplete();
  },
  onShowWorld(worldIdx) {
    this.m_Worlds[worldIdx].parent.active = true;
  },
  onCloseWarResultPanel(worldIdx, replay) {
    let needRelease = true;
    if (replay) {
      const type = mbgGame.player.getReplayType();
      if (type === "gamblepreview") {
        mbgGame.managerUi.openPanelGamble();
      } else if (type === "gamble") {
        const com = this.getWarCom(worldIdx);
        const result = com.getWarResult();
        mbgGame.log("openPanelGamble", mbgGame.player.getReplayType(), mbgGame.player.getReplayParam());
        const lst = mbgGame.player.getReplayParam();
        lst.push(result);
        mbgGame.managerUi.openPanelGamble(lst);
        mbgGame.player.setReplayParam(null);
      } else if (type === "clan") {
        mbgGame.sceneMenu.showPanel('panelClan');
      } else if (type === "pvplog") {
        mbgGame.panelSquare && mbgGame.panelSquare.showPVPPanel();
      }
    } else if ([1, 2, 3, 4, 6, 9].indexOf(worldIdx) !== -1) {
      if (mbgGame.player.checkNewbiePlot()) {
        // 第一次打完该场战斗
        this.releaseWar(worldIdx);
        this.hideWar();
        this.fadeToWhite(2.0);
        needRelease = false;
      } else if (mbgGame.panelStory) {
        mbgGame.panelStory.refreshByWorldIdx(worldIdx);
      }
    } else if (worldIdx === 5) {
      const com = this.getWarCom(worldIdx);
      if (com) {
        if (com.stageIdx() === 1) {
          const dontCleanFighters = true;
          com.cleanWar(dontCleanFighters, "aaaa");
          needRelease = false;
          // 播放剧情战2
          mbgGame.player.checkNewbiePlot();
        } else if (com.stageIdx() === 2) {
          // 剧情战2打完了
          // 播放研究所剧情1
          const ok = mbgGame.player.checkNewbiePlot(() => {
            this.releaseWar(worldIdx);
            this.hideWar();
            this.fadeToWhite(1);
          }) === 'lab';
          needRelease = !ok;
        }
      }
    } else if (worldIdx === 10) {
      mbgGame.sceneMenu.showPanel('panelSquare');
    } else if (worldIdx === 99) {
      mbgGame.managerUi.enterpvp = false;
      const com = this.getWarCom(worldIdx);
      if (com && com.isFriendWar()) {
        mbgGame.sceneMenu.showPanel('panelClan');
      } else {
        mbgGame.panelSquare && mbgGame.panelSquare.showPVPPanel();
      }
    }
    if (needRelease) {
      this.releaseWar(worldIdx);
      this.hideWar();
      this.fadeToWhite();
    }
  },
  onWarResult(data) {
    const worldIdx = this.hasAnyWar();
    let delay = 2;
    if (worldIdx != null) {
      // 正在战场里，判断是不是同个世界的战报
      if (data.worldIdx !== worldIdx) {
        return;
      }
      const warCom = this.getWarCom(worldIdx);
      if (warCom.m_lastPlotIdx === 1) {
        // 战后剧情，马上出结算
        delay = 0;
      }
    }
    if (delay) {
      this.node.runAction(cc.sequence(cc.delayTime(delay), cc.callFunc(this.onWarResultTimeout, this, data)));
    } else {
      this.onWarResultTimeout(data);
    }
  },
  onWarResultTimeout(node, data) {
    mbgGame.log("onWarResultTimeout", data);
    if (data.replay || (data.worldIdx === 5 && data.result === 2)) {
      mbgGame.warMgr && mbgGame.warMgr.onCloseWarResultPanel(data.worldIdx, data.replay);
    } else {
      mbgGame.managerUi.openWinResult(data);
    }
  },
  hideWar() {
    for (let i = 0; i < defines.AllWorlds.length; i++) {
      const worldIdx = defines.AllWorlds[i];
      const obj = this.m_Worlds[worldIdx];
      if (obj) {
        obj.y = 5000;
      }
    }
    mbgGame.topUI.setShow(true);
  },
  showWar() {
    for (let i = 0; i < defines.AllWorlds.length; i++) {
      const worldIdx = defines.AllWorlds[i];
      const obj = this.m_Worlds[worldIdx];
      if (obj) {
        obj.y = 0;
      }
    }
    mbgGame.topUI.setShow(false);
  },
});