const labdefines = require('labdefines');

cc.Class({
  extends: cc.Component,

  setFloorType(floorType) {
    this.m_FloorType = floorType;
  },
  // override
  getSceneName() {
    return '';
  },
  initCommon() {
    this.m_facID2Chara = {};
    this.m_facID2CharaID = {}; // 标记设施当前站的人
    this.actionLayer = this.node.getChildByName("actionLayer");
    if (!this.actionLayer) {
      return;
    }
    if (this.m_FacIDs) {
      for (let i = 0; i < this.m_FacIDs.length; i++) {
        const facID = this.m_FacIDs[i];
        const charaID = mbgGame.player.getCharaIDByFacID(facID);
        if (!charaID) {
          continue;
        }
        this.characterEnter(charaID, facID);
      }
    }
    const spineNode = cc.find('tDoor', this.node);
    if (spineNode) {
      const transferSpine = spineNode.getComponent('sp.Skeleton');
      cc.loader.loadRes(`spine/tDoor`, sp.SkeletonData, (err, d) => {
        transferSpine.skeletonData = d;
        transferSpine.setAnimation(0, 'close', true);
      });
    }
  },
  getPosXByPosID(posID) {
    const node = this.actionLayer.getChildByName(`pos${posID}`);
    if (!node) return 0;
    return node.x;
  },
  // 有人员变动
  characterLeft(charaID, facID, immediate) {
    this.m_facID2Chara[facID] = null;
    this.m_facID2CharaID[facID] = null;
    const node = _.find(this.actionLayer.children, { charaID });
    // mbgGame.log('characterLeft', charaID, facID, !node);
    if (!node) return;
    const com = node.getComponent('floorCharacter');
    if (immediate) {
      com.removeMe();
      return;
    }
    const facType = labdefines.FacID2Type[facID];
    if (facType === labdefines.FacType.Gym && charaID > 15) {
      com.holeOut();
      return;
    }
    // 2倍速离开
    com.leftOut(0.5);
  },
  characterEnter(charaID, facID) {
    const oldCharaID = this.m_facID2CharaID[facID];
    if (oldCharaID) {
      if (oldCharaID === charaID) {
        return;
      }
      this.characterLeft(charaID, facID);
    }
    const node = _.find(this.actionLayer.children, { charaID });
    // 很有可能是下岗但还未走完，直接移走
    if (node) {
      node.destroy();
    }
    let actionList = [];

    if (charaID <= 15) {
      actionList = [
        { action: 'normal', weight: 100 },
        { action: 'facidle', weight: 100 },
        { action: 'faccritic', weight: 10 }, // 较低概率
        { action: 'say', weight: 30, type: "lab" },
      ];
    } else {
      actionList = [
        { action: 'stand', weight: 100 },
        { action: 'say', weight: 30, type: "lab" },
      ];
    }
    // 插入表情
    const facData = mbgGame.player.getFacDataByFacID(facID);
    if (facData && facData.trT) {
      actionList.push({ action: 'facHappy', weight: 100 });
    }
    //
    const posID = labdefines.FacID2PosID[facID];
    const posX = this.getPosXByPosID(posID);
    this.m_facID2CharaID[facID] = charaID;
    const options = {
      charaID,
      mode: 'actionList',
      scene: this.getSceneName(),
      facID,
      actionList,
      clickDisable: true,
      posX,
    };
    if (charaID > 15) {
      options.mTplID = charaID;
      // options.mode = 'actionList';
      options.spineName = mbgGame.config[`mtpl${charaID}`].spine;
    }
    // mbgGame.log('characterEnter', charaID, options);
    const com = this.addCharacter(options);

    com.setClickLayerEnabled(false);
    this.m_facID2Chara[facID] = com;
  },
  getFreeCharaID() {
    const charaIDS = [];
    for (let charaID = 1; charaID <= 15; charaID++) {
      if (mbgGame.panelLab.visitCharaComs[charaID] || !mbgGame.player.hasChara(charaID) || mbgGame.player.isCharaWorking(charaID)) {
        continue;
      }
      charaIDS.push(charaID);
    }
    if (charaIDS.length < 1) return 0;
    return _.sample(_.shuffle(charaIDS));
  },
  charaRemove(com) {
    const charaID = com.charaID();
    delete mbgGame.panelLab.visitCharaComs[charaID];
  },
  characterVisit(param) {
    // 未开放的层
    if (!this._isOpenVisit) return;
    if (param === 'refresh') {
      if (!this._schedule_characterVisit_ON) {
        this.schedule(this.characterVisit.bind(this), 15 + _.random(30), cc.macro.REPEAT_FOREVER);
        this._schedule_characterVisit_ON = true;
      }
      return;
    }
    // 20%概率出现
    if (_.random(100) > 20) return;
    const now = moment().unix();
    if (this._lastVisitTime && now - this._lastVisitTime < 15) {
      // 15秒内不会出重复出
      return;
    }
    // 查找闲置角色
    const charaID = this.getFreeCharaID();
    if (!charaID) return;

    this._lastVisitTime = now;
    const actionOnceList = [];
    actionOnceList.push(_.sample([{ action: 'normal' }, { action: 'say', type: "rant" }]));
    actionOnceList.push({ action: 'move' });
    actionOnceList.push(_.sample([{ action: 'normal' }, { action: 'say', type: "rant" }, { action: 'move' }]));
    actionOnceList.push(_.sample([{ action: 'normal' }, { action: 'move' }]));

    actionOnceList.push({ action: 'move' });
    const options = {
      charaID,
      mode: 'actionList',
      firstAction: _.sample(['leftIn', 'rightIn']),
      scene: this.getSceneName(),
      sceneCom: this,
      actionOnceList,
      speed: 2,
      clickDisable: true,
      posX: 'randX',
    };

    if (_.includes([
      labdefines.FloorType.Story,
      labdefines.FloorType.Clan,
      labdefines.FloorType.Character,
      labdefines.FloorType.Design,
    ], this.m_FloorType)) {
      options.posX = this.getPosXByPosID('Visit');
      options.firstAction = 'transferIn';
      actionOnceList.push({ action: 'transferOut' });
    } else {
      actionOnceList.push({ action: 'leftOut' });
    }
    // mbgGame.log('characterVisit', charaID, options);
    const com = this.addCharacter(options);
    mbgGame.panelLab.visitCharaComs[charaID] = com;
    com.setClickLayerEnabled(false);
  },
  // 加角色到房间
  addCharacter(data) {
    if (!this.actionLayer) return null;
    const character = cc.instantiate(mbgGame.preloadRes.floorCharacter);
    // mbgGame.log("instantiate character");
    this.actionLayer.addChild(character);
    // mbgGame.log("actionLayer.addChild");
    const com = character.getComponent('floorCharacter');
    if (data.posID) {
      data.posX = this.getPosXByPosID(data.posID);
    }
    com.onCreated(data);
    if (this.m_turnRight) {
      com.turnRight();
    }
    com.showShadow(false);
    // mbgGame.log("onCreated");
    return com;
  },
  getCharacter(spinename) {
    for (let i = 0; i < this.actionLayer.children.length; i++) {
      const node = this.actionLayer.children[i];
      if (node.name === spinename) {
        return node;
      }
    }
    return null;
  },
  playWhiteAni() {
    const bg = this.node.getChildByName("bg");
    const white = new cc.Node();
    const sp = white.addComponent(cc.Sprite);
    mbgGame.resManager.setAutoAtlasFrame(sp, 'uiIcon', 'frameAngle01');
    this.node.addChild(white);
    if (bg) {
      white.setContentSize(bg.getContentSize());
    } else {
      white.setContentSize(new cc.Size(640, 256));
    }
    white.setAnchorPoint(cc.v2(0.5, 0.0));
    white.runAction(cc.sequence(cc.delayTime(0.1), cc.fadeOut(0.3), cc.callFunc(() => {
      white.destroy();
    })));
    const obj = new cc.Node();
    obj.addComponent("sp.Skeleton");
    const spineObj = obj.addComponent("spineObject");
    this.node.addChild(obj);
    if (bg) {
      obj.setContentSize(bg.getContentSize());
    } else {
      obj.setContentSize(new cc.Size(640, 256));
    }
    obj.y = 150;
    obj.setAnchorPoint(cc.v2(0.5, 0.0));
    spineObj.onSpineLoad = function () {
      this.playAnimationAndDestroy("buildfloor");
    };
    spineObj.loadSpine("buildfloor");
  },
  // 播放建楼动画
  playBuildFloorAni() {
    this.playWhiteAni();
    mbgGame.playSound('UI_LabBuild');
  },
  // 播放建设施动画
  playBuildFacAni(parent) {
    parent.active = true;
    const obj = new cc.Node();
    obj.addComponent("sp.Skeleton");
    const com = obj.addComponent("spineObject");
    parent.addChild(obj);
    com.onSpineLoad = function () {
      com.playAnimationAndDestroy("buildfac");
    };
    com.loadSpine("buildfac");
  },
  getFacSpineName(facID) {
    const facType = labdefines.FacID2Type[facID];
    let name = '';
    if (facType === labdefines.FacType.Collector) {
      name = `device_col5`;
    }
    if (facType === labdefines.FacType.Gym) {
      name = `device_gym${facID}`;
    }
    if (facType === labdefines.FacType.Read) {
      name = `device_read${facID}`;
    }
    return name;
  },
  refreshFacSpine(facID, parent, resetFac) {
    const self = this;
    const n = parent;
    if (!n[`m_spine${facID}`]) {
      const posNode = n.getChildByName("spinePos");
      const spineNode = new cc.Node();
      spineNode.addComponent("sp.Skeleton");
      const com = spineNode.addComponent("spineObject");
      const name = this.getFacSpineName(facID);
      posNode.addChild(spineNode);
      n[`m_spine${facID}`] = spineNode;
      com.onSpineLoad = function () {
        self.refreshFacAni(facID, parent);
      };
      com.loadSpine(name);
    } else {
      const com = n[`m_spine${facID}`].getComponent("spineObject");
      const name = this.getFacSpineName(facID);
      if (resetFac && com.spineName() !== name) {
        this.playBuildFacAni(parent);
        com.onSpineLoad = function () {
          self.refreshFacAni(facID, parent);
        };
        com.loadSpine(name);
      } else {
        this.refreshFacAni(facID, parent);
      }
    }
  },
  refreshFacAni(facID, parent) {
    const n = parent;
    const spineNode = n[`m_spine${facID}`];
    const com = spineNode.getComponent("spineObject");
    if (!com.spine().node.active) {
      return;
    }
    const hasFac = mbgGame.player.hasFac(facID);
    if (!hasFac) {
      return;
    }
    this.hideExclam(parent);
    if (mbgGame.player.getCharaIDByFacID(facID) > 0) {
      com.playAnimation("idle2");
      const lefttime = mbgGame.player.getFacLeftWorkTime(facID);
      if (lefttime <= 0) {
        this.showExclam(parent, 'exclam2');
        const charaCom = this.m_facID2Chara[facID];
        charaCom.resetActionList();
      } else {
        const ret = mbgGame.player.checkCanGetReward(facID);
        if (ret) {
          const curFacType = labdefines.FacID2Type[facID];
          if (curFacType === labdefines.FacType.Read) {
            this.showExclam(parent, 'exclamExp');
          } else if (curFacType === labdefines.FacType.Gym) {
            const charaID = mbgGame.player.getCharaIDByFacID(facID);
            this.showExclam(parent, charaID <= 15 ? 'exclamMat' : 'exclamCoins');
          }
        }
      }
    } else {
      if (mbgGame.player.canFacPutChara(facID)) {
        this.showExclam(parent, 'exclam1');
      }
      com.node.stopAllActions();
      com.playAnimation("idle1");
    }
  },
  // 可建造
  showHammer(node) {
    mbgGame.log("showHammer");
    let subnode = node.getChildByName("capsule");
    if (subnode) {
      const so = subnode.getComponent("spineObject");
      so.doAction('capsule', true);
      return;
    }
    subnode = new cc.Node("capsule");
    subnode.addComponent(sp.Skeleton);
    const so = subnode.addComponent("spineObject");
    node.addChild(subnode);
    so.onSpineLoad = function () {
      this.doAction('capsule', true);
    };
    so.loadSpine('capsule');
    node.width = 150;
    node.height = 150;
  },
  destroyHammer(node) {
    const subnode = node.getChildByName("capsule");
    if (subnode) {
      subnode.destroy();
    }
  },
  // 训练完成提示
  showExclam(node, type) {
    this.showExclamWithSpriteName(node, type, 'labIcon');
  },
  showExclamWithSpriteName(node, name, category) {
    let n = node.getChildByName("exclam");
    if (!n) {
      n = new cc.Node("exclam");
      const sp = n.addComponent(cc.Sprite);
      mbgGame.resManager.setAutoAtlasFrame(sp, category, name);
      node.addChild(n);
      const posNode = node.getChildByName("exclampos");
      if (posNode) {
        n.x = posNode.x;
        n.y = posNode.y;
      }
    } else {
      n.active = true;
      const sp = n.getComponent(cc.Sprite);
      mbgGame.resManager.setAutoAtlasFrame(sp, category, name);
    }
  },
  hideExclam(node) {
    const n = node.getChildByName("exclam");
    if (n) n.active = false;
  },
  // 表示可以建设中
  showFloorBuilding(floorType, isUnlock) {
    if (floorType === labdefines.FloorType.Build) {
      // 最底层不需要做特殊处理
      return;
    }

    let node = this.node.getChildByName('building');

    // 地下层按剧情推进
    let skin = 'skin1';
    const FloorType = labdefines.FloorType;
    switch (floorType) {
      // 地下层
      case FloorType.Achieve:
      case FloorType.Story:
      case FloorType.Character:
      case FloorType.Clan:
      case FloorType.Build:
        skin = 'skin3';
        break;
      case FloorType.Design:
        skin = 'skin2';
        break;
      case FloorType.Talent:
        skin = 'skin1';
        break;
      case FloorType.Chest:
        skin = 'skin2';
        break;
      case FloorType.Read:
        skin = 'skin3';
        break;
      case FloorType.Col:
        skin = 'skin2';
        break;
      case FloorType.Gym1:
      case FloorType.Gym2:
      case FloorType.Gym3:
        skin = 'skin3';
        break;
      default: break;
    }

    if (!node) {
      node = cc.instantiate(mbgGame.panelLab.constructionTemplate);
      node.name = 'building';
      this.node.addChild(node);
      node._floorType = floorType;
      const spine = node.getComponent(sp.Skeleton);
      spine.setSkin(skin);

      // 地下层不要动画
      if (floorType >= 20) return;

      if (isUnlock) {
        spine.setAnimation(0, 'complete', false);
      } else {
        spine.setAnimation(0, 'work', true);
      }
    } else if (isUnlock) {
      // 地下层不要动画
      if (floorType >= 20) return;
      const spine = node.getComponent(sp.Skeleton);
      spine.setAnimation(0, 'complete', true);
    }
  },
  hideFloorBuilding() {
    const node = this.node.getChildByName('building');
    if (node) {
      node.destroy();
    }
  },
});