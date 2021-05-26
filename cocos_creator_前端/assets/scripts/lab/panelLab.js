const labdefines = require('labdefines');
const hallFloorPanel = require('hallFloorPanel');
const talentFloorPanel = require('talentFloorPanel');
const collectorFloorPanel = require('collectorFloorPanel');
const gymFloorPanel = require('gymFloorPanel');
const readFloorPanel = require('readFloorPanel');
const chestFloorPanel = require('chestFloorPanel');

const achieveFloorPanel = require('achieveFloorPanel');
const characterFloorPanel = require('characterFloorPanel');
const clanFloorPanel = require('clanFloorPanel');
const storyFloorPanel = require('storyFloorPanel');
const designFloorPanel = require('designFloorPanel');
const buildFloorPanel = require('buildFloorPanel');

const warDefines = require('warDefines');

const FacType = labdefines.FacType;

const FloorType = labdefines.FloorType;

cc.Class({
  extends: cc.Component,

  properties: {
    labBg: cc.Node,
    labBgSpine: sp.Skeleton,

    // 各种类型的楼层的弹窗的prefab
    constructionTemplate: cc.Node,

    // 各个固定楼层的panelCom
    talentFloorCom: talentFloorPanel,
    hallFloorCom: hallFloorPanel,
    collectorFloorCom: collectorFloorPanel,
    gymFloorCom1: gymFloorPanel,
    gymFloorCom2: gymFloorPanel,
    gymFloorCom3: gymFloorPanel,
    readFloorCom: readFloorPanel,
    chestFloorCom: chestFloorPanel,

    achieveFloorCom: achieveFloorPanel,
    characterFloorCom: characterFloorPanel,
    clanFloorCom: clanFloorPanel,
    storyFloorCom: storyFloorPanel,
    designFloorCom: designFloorPanel,
    buildFloorCom: buildFloorPanel,

    scrollView: cc.ScrollView,
    roofBg: cc.Node,
    roofSpine: sp.Skeleton,
    content: cc.Node,
  },
  onLoad() {
    mbgGame.panelLab = this;
    this.plotCtrl = this.node.getComponent("plotCtrlLab");
    this.m_FloorType2FloorComs = {};

    this.m_FloorType2FloorComs[FloorType.Hall] = this.hallFloorCom;
    this.m_FloorType2FloorComs[FloorType.Chest] = this.chestFloorCom;
    this.m_FloorType2FloorComs[FloorType.Talent] = this.talentFloorCom;
    this.m_FloorType2FloorComs[FloorType.Col] = this.collectorFloorCom;
    this.m_FloorType2FloorComs[FloorType.Read] = this.readFloorCom;
    this.m_FloorType2FloorComs[FloorType.Gym1] = this.gymFloorCom1;
    this.m_FloorType2FloorComs[FloorType.Gym2] = this.gymFloorCom2;
    this.m_FloorType2FloorComs[FloorType.Gym3] = this.gymFloorCom3;

    this.m_FloorType2FloorComs[FloorType.Achieve] = this.achieveFloorCom;
    this.m_FloorType2FloorComs[FloorType.Character] = this.characterFloorCom;
    this.m_FloorType2FloorComs[FloorType.Clan] = this.clanFloorCom;
    this.m_FloorType2FloorComs[FloorType.Story] = this.storyFloorCom;
    this.m_FloorType2FloorComs[FloorType.Design] = this.designFloorCom;
    this.m_FloorType2FloorComs[FloorType.Build] = this.buildFloorCom;

    // 使用事件名来注册
    this.scrollView.content._lastY = this.scrollView.content.y;
    this.scrollView.content.on('position-changed', function () {
      // this.bg.x = this.scrollView.content.x * 0.5;
      const dy = this.scrollView.content.y - this.scrollView.content._lastY;
      // mbgGame.log('scrollView event', dy, this.scrollView.content.y);
      this.scrollView.content._lastY = this.scrollView.content.y;

      // 获取接待室坐标
      const hall = this.getFloorCom(labdefines.FloorType.Hall);
      let worldPos = hall.node.parent.convertToWorldSpaceAR(hall.node.getPosition());
      worldPos = mbgGame.managerUi.node.convertToNodeSpaceAR(worldPos);
      this.scrollLabBg(dy * 0.5, worldPos.y);
      // this.bg.y += dy * 0.5; // (this.scrollView.content.y * 0.5);
    }, this);
    this.visitCharaComs = {};

    cc.loader.loadRes(`spine/bgAni`, sp.SkeletonData, (err, d) => {
      this.labBgSpine.skeletonData = d;
      this.labBgSpine.setAnimation(0, 'day', true);
    });
  },

  setLabBg(bg, spineName) {
    mbgGame.resManager.setImageFrame(this.labBg, 'images', bg);
    if (this.labBgSpine.skeletonData) {
      this.labBgSpine.setAnimation(0, spineName, true);
    }
  },

  scrollLabBg(dy, hallY) {
    this.labBg.y += dy;
    const checkY = hallY;
    // mbgGame.log('scrollLabBg', this.labBg.y, checkY, hallY);
    // 不要高于地下层
    if (this.labBg.y > checkY) {
      return;
    }

    const minY = -468 - (mbgGame.fixed_y / 2);
    if (this.labBg.y < minY) {
      this.labBg.y = minY;
    }
  },
  setLabBgY(y, hallY) {
    this.labBg.y = y;
    const checkY = hallY;
    // 不要高于地下层
    if (this.labBg.y > checkY) {
      return;
    }

    const minY = -468 - (mbgGame.fixed_y / 2);
    if (this.labBg.y < minY) {
      this.labBg.y = minY;
    }
    // mbgGame.log('setLabBgY', this.labBg.y, checkY, hallY);
  },

  // 0, 已经建造了， 1， 可以建造， 2 显示建设中，但不能建设, 3 隐藏
  getFloorStatus(com, floorType) {
    if (floorType === FloorType.Hall) return 0;

    // 地下层按剧情推进
    switch (floorType) {
      // 地下层
      case FloorType.Achieve:
        // 通关剧情解锁
        if (mbgGame.player.hasFinishPlot(4)) {
          if (com) {
            com._isOpenVisit = true;
          }
          return 0;
        }
        return 2;
      case FloorType.Story:
        if (mbgGame.player.hasFinishPlot(4)) {
          if (com) {
            com._isOpenVisit = true;
          }
          return 0;
        }
        return 2;
      case FloorType.Character:
        // 通关剧情解锁
        if (mbgGame.player.hasFinishPlot(4)) {
          if (com) {
            com._isOpenVisit = true;
          }
          return 0;
        }
        return 2;
      case FloorType.Clan:
        // 通关剧情解锁
        if (!mbgGame.player.hasFinishPlot(5)) {
          return 3;
        }
        if (mbgGame.player.isClanUnlocked()) {
          if (com) {
            com._isOpenVisit = true;
          }
          return 0;
        }
        return 2;
      case FloorType.Design:
        if (!mbgGame.player.isClanUnlocked()) {
          return 3;
        }
        return 0;
      case FloorType.Build:
        return 2;
      default:
        break;
    }

    const has = mbgGame.player.hasFloor(floorType);
    if (has) {
      if (floorType === FloorType.Talent) {
        if (com) {
          com._isOpenVisit = true;
        }
      }
      return 0;
    }
    const isUnlocked = mbgGame.player.isUnlockedFloor(floorType);
    switch (floorType) {
      case FloorType.Talent:
        if (isUnlocked) return 1;
        if (mbgGame.player.hasFinishPlot(5)) {
          return 2;
        }
        return 3;
      case FloorType.Chest:
        if (mbgGame.player.hasFloor(FloorType.Talent)) {
          if (isUnlocked) return 1;
        }
        return 3;
      case FloorType.Read:
        if (mbgGame.player.hasFloor(FloorType.Chest)) {
          if (isUnlocked) return 1;
        }
        return 3;
      case FloorType.Col:
        if (mbgGame.player.hasFloor(FloorType.Read)) {
          if (isUnlocked) return 1;
          return 2;
        }
        return 3;
      case FloorType.Gym1:
        if (mbgGame.player.hasFloor(FloorType.Col)) {
          if (isUnlocked) return 1;
          return 2;
        }
        return 3;
      case FloorType.Gym2:
        if (mbgGame.player.hasFloor(FloorType.Gym1)) {
          if (isUnlocked) return 1;
          return 2;
        }
        return 3;
      case FloorType.Gym3:
        if (mbgGame.player.hasFloor(FloorType.Gym2)) {
          if (isUnlocked) return 1;
          return 2;
        }
        return 3;
      default:
        return 3;
    }
  },
  onOpened() {
    const hour = moment().hour();
    if (this.bgType == null) {
      this.bgType = -1;
    }
    cc.log("hour", hour, "bgType", this.bgType);
    // 白天背景，但是时间已经到了晚上
    if ((this.bgType === -1 || this.bgType === 0) && (hour >= 18 || hour < 6)) {
      cc.log("进入晚上 hour", hour);
      this.bgType = 1;
      this.setLabBg('bglab1', 'night');
      mbgGame.resManager.setImageFrame(this.roofBg, 'images', `roof2`);
      this.roofSpine.setAnimation(0, 'night', true);
    }

    // 夜晚背景，但是时间已经到了白天
    if ((this.bgType === -1 || this.bgType === 1) && (hour < 18 && hour >= 6)) {
      cc.log("进入白天 hour", hour);
      this.bgType = 0;
      this.setLabBg('bglab2', 'day');
      mbgGame.resManager.setImageFrame(this.roofBg, 'images', `roof1`);
      this.roofSpine.setAnimation(0, 'day', true);
    }

    if (!mbgGame.player.getLabData()) {
      // 如果还没有刷出研究所数据，延时重新打开
      return;
    }

    // mbgGame.log('hasFinishPlot 5:', mbgGame.player.hasFinishPlot(5));
    for (let idx = 0; idx < labdefines.AllFloorTypes.length; idx++) {
      const floorType = labdefines.AllFloorTypes[idx];
      const com = this.m_FloorType2FloorComs[floorType];
      if (!com) continue;
      if (!com.setFloorType) {
        mbgGame.error("no setFloorType", floorType);
      }
      com.setFloorType(floorType);
      const ret = this.getFloorStatus(com, floorType);
      // mbgGame.log('checkBuilding', floorType, ret);
      const spineNode = cc.find('spine', com.node);
      if (ret === 0) {
        com.node.active = true;
        com.hideFloorBuilding();
        if (spineNode) spineNode.active = true;
      } else if (ret === 1) {
        com.node.active = true;
        com.showFloorBuilding(floorType, true);
        if (spineNode) spineNode.active = false;
      } else if (ret === 2) {
        com.node.active = true;
        com.showFloorBuilding(floorType);
        if (spineNode) spineNode.active = false;
      } else {
        com.node.active = false;
      }
    }
    this.unschedule(this.refreshFloorAll);
    this.scheduleOnce(this.refreshFloorAll, 0.001);
  },
  refreshFloorAll() {
    // mbgGame.log("refreshFloorAll");
    for (const floorType in this.m_FloorType2FloorComs) {
      const com = this.m_FloorType2FloorComs[floorType];
      if (com) {
        if (com.refreshFloor) {
          com.refreshFloor();
        }
        com.characterVisit('refresh');
      }
    }
  },
  getFacFloorCom(facID) {
    const facType = labdefines.FacID2Type[facID];
    if (facType === FacType.Collector) {
      return this.collectorFloorCom;
    } else if (facType === FacType.Read) {
      return this.readFloorCom;
    } else if (facType === FacType.Gym) {
      const floorType = labdefines.FacID2FloorType[facID];
      return this.m_FloorType2FloorComs[floorType];
    }
    return null;
  },
  onBuildFac(facID) {
    mbgGame.uiLayerTop.setPreventNotify(1);
    mbgGame.netCtrl.sendMsg('lab.buildFac', {
      facID,
    }, (data) => {
      mbgGame.log("lab.buildFac", data);
      if (data.code === "err") {
        mbgGame.managerUi.floatMessage(data.err);
      } else {
        emitter.emit('redTips');
        const floorCom = this.getFacFloorCom(facID);
        floorCom.refreshFloor({
          buildFacID: facID,
        });
      }
    });
  },
  openFacWin(facID) {
    if (!mbgGame.player.hasFac(facID) && mbgGame.player.isFacUnlocked(facID)) {
      this.onBuildFac(facID);
      return;
    }
    const facType = labdefines.FacID2Type[facID] || -1;

    this.m_CurOpenedFacID = facID;

    const ret = mbgGame.player.checkCanGetReward(facID);
    const charaID = mbgGame.player.getCharaIDByFacID(facID);

    if (ret) {
      // if (mbgGame.channel_id === 'test') {
      if (facType === labdefines.FacType.Read || facType === labdefines.FacType.Gym) {
        // 弹出结算信息界面
        mbgGame.resManager.loadPrefab('jobInfo', (prefab) => {
          const node = cc.instantiate(prefab);
          const dFac = mbgGame.player.getFacDataByFacID(facID);
          mbgGame.managerUi.addSmallWin(node, 'jobInfo', dFac.b ? dFac.b : dFac.idx, facID);
        });
        return;
      }
      // }
      // mbgGame.log('openFacWin:', facID);
      mbgGame.netCtrl.sendMsg('lab.finish', {
        facID,
        isFinish: false, // 结束与未结束
      }, (data) => {
        if (data.code === "ok") {
          // mbgGame.log('lab.finish', data);
          const floorCom = mbgGame.panelLab.getFacFloorCom(facID);
          if (data.ret && data.ret.remove) {
            floorCom.characterLeft(charaID, facID);
            delete data.remove;
          }
          floorCom.refreshFloor();
          if (data && data.ret && data.ret.result) {
            data.ret.result.isLab = true;
            mbgGame.managerUi.openWinResult(data.ret.result);
          }
        }
      });
      return;
    }

    if (facType === labdefines.FacType.Gym) {
      if (!charaID) {
        mbgGame.resManager.loadPrefab('panelLabJobDetail', (prefab) => {
          const node = cc.instantiate(prefab);
          mbgGame.managerUi.addFullWin(node, 'panelLabJobDetail', 0, facID);
        });
        return;
      }
      mbgGame.resManager.loadPrefab('jobInfo', (prefab) => {
        const node = cc.instantiate(prefab);
        mbgGame.managerUi.addSmallWin(node, 'jobInfo', 0, facID);
      });
      return;
    }
    if (facType === labdefines.FacType.Read || facType === labdefines.FacType.Collector) {
      if (!charaID) {
        mbgGame.resManager.loadPrefab('panelLabJob', (prefab) => {
          const node = cc.instantiate(prefab);
          mbgGame.managerUi.addNormalWin(node, 'panelLabJob', 0, facID);
          const com = node.getComponent('panelLabJob');
          com.m_FacID = facID;
        });
        return;
      }
      mbgGame.resManager.loadPrefab('jobInfo', (prefab) => {
        const node = cc.instantiate(prefab);
        const dFac = mbgGame.player.getFacDataByFacID(facID);
        mbgGame.managerUi.addSmallWin(node, 'jobInfo', dFac.b ? dFac.b : dFac.idx, facID);
      });
    }
  },
  addCharaToFac(facID, charaID, param, cb) {
    // mbgGame.log("addCharaToFac", facID, charaID);
    let oldFacID = 0;
    if (charaID <= 15) {
      oldFacID = mbgGame.player.getLabFacIDByChara(charaID);
    }
    const dData = {
      facID,
      charaID,
    };
    if (param) {
      dData.param = param;
    }
    mbgGame.netCtrl.sendMsg('lab.addChara', dData, (data) => {
      // mbgGame.log("addCharaToFac result", facID, charaID, data, oldFacID);
      if (data.code === 'ok') {
        if (oldFacID) {
          const floorCom = this.getFacFloorCom(oldFacID);
          floorCom.characterLeft(charaID, oldFacID, true);
        }
        const floorCom = this.getFacFloorCom(facID);
        floorCom.characterEnter(charaID, facID);
        floorCom.refreshFloor();
        if (cb) {
          cb();
        }
      }
      if (data.code === "err") {
        mbgGame.managerUi.floatMessage(data.err);
      }
    });
  },
  removeCharaFromFac(facID, charaID, force) {
    mbgGame.netCtrl.sendMsg('lab.remChara', {
      facID,
      charaID,
    }, (data) => {
      // mbgGame.log("removeCharaFromFac", data);
      if (data.code === 'ok') {
        const floorCom = this.getFacFloorCom(facID);
        floorCom.characterLeft(charaID, facID, force);
        floorCom.refreshFloor();
      }
      if (data.code === "err") {
        mbgGame.managerUi.floatMessage(data.err);
      }
    });
  },
  getFloorCom(floorType) {
    return this.m_FloorType2FloorComs[floorType];
  },
  scrollToFloorByFacID(facID) {
    const com = this.getFacFloorCom(facID);
    return this.scrollToFloor(com);
  },
  scrollToFloorByType(floorType, duration, cb) {
    mbgGame.log("scrollToFloorByType", floorType);
    this.node.active = true;
    this.scheduleOnce(() => {
      const com = this.getFloorCom(floorType);
      this.scrollToFloor(com, duration);
      if (cb) cb();
    }, 0.5);
  },
  scrollToFloor(com, duration) {
    if (duration == null) {
      duration = 0.3;
    }
    const labH = this.scrollView.content.getContentSize().height;
    const targetY = com.node.y;
    const targetHeight = com.node.getContentSize().height;
    const bottomY = this.buildFloorCom.node.y;
    //  mbgGame.log("labH", labH);
    //  mbgGame.log("getMaxScrollOffset", this.scrollView.getMaxScrollOffset());
    //  mbgGame.log("targetY", targetY);
    //  mbgGame.log("targetHeight", targetHeight);
    //  mbgGame.log("bottomY", bottomY);
    //  mbgGame.log("targetY - bottomY", targetY - bottomY);

    const offsetViewUp = 750; // 视角往上偏移多少
    const floorY = targetY - bottomY + targetHeight + offsetViewUp;
    // mbgGame.log("floorY", floorY);
    // mbgGame.log("labH - floorY", labH - floorY);
    // floorY = 0 最底
    // floorY = labH 最顶
    this.scrollView.scrollToOffset(cc.v2(0, labH - floorY), duration);
    /*
        // 获取接待室坐标
        const hall = this.getFloorCom(labdefines.FloorType.Hall);
        let worldPos = hall.node.parent.convertToWorldSpaceAR(hall.node.getPosition());
        worldPos = mbgGame.managerUi.node.convertToNodeSpaceAR(worldPos);
        this.setLabBgY(floorY, worldPos.y);
    */
  },

  buildFloor(event, floorType) {
    if (!floorType) {
      floorType = event.target.parent._floorType;
    }
    if (mbgGame.panelLab.getFloorStatus(null, floorType) !== 1) return;
    mbgGame.netCtrl.sendMsg('lab.buildFloor', {
      floorType,
    }, (data) => {
      mbgGame.log("lab.buildFloor", floorType, data);
      if (data.code === "err") {
        mbgGame.managerUi.floatMessage(data.err);
      } else {
        const com = mbgGame.panelLab.getFloorCom(floorType);
        // mbgGame.panelLab.onOpened();
        emitter.emit('redTips');
        if (com) {
          com.hideFloorBuilding();
          com.playBuildFloorAni();
          com.refreshFloor();
        }
      }
    });
  },
});