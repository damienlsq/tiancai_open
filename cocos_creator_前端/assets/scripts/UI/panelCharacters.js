cc.Class({
  extends: cc.Component,

  properties: {
    characterPre: cc.Prefab,
    detailLayer: cc.Node,
    bagLayer: cc.Node,
    btnBag: cc.Sprite,
    btnChara: cc.Sprite,
    listLayer: cc.Node,
    panelFlyToY: 1500,
  },

  onLoad() {
    if (mbgGame.sceneName === 'iphoneX') {
      this.panelFlyToY = 1700;
    }
    this._lastSayLogTime = {};
    this.bagLayer.active = false;
    this.detailLayer.active = false;
    let widget = this.detailLayer.getComponent(cc.Widget);
    widget.updateAlignment();
    this.detailLayer.removeComponent(cc.Widget);
    widget = this.bagLayer.getComponent(cc.Widget);
    widget.updateAlignment();
    this.bagLayer.removeComponent(cc.Widget);
    this.saveOriY = this.detailLayer.y;

    this.nowMode = 1;
    emitter.on(this, "charaUpdated", () => {
      this.refreshCharaList();
      this.refreshSleepCharaListPos();
    });
    emitter.on(this, "startCharaUnlock", this.refreshSleepCharas);
    emitter.on(this, "endCharaUnlock", this.refreshSleepCharas);
    this.schedule(this.onRefreshTime, 1, cc.macro.REPEAT_FOREVER);
    this.charasCom = {};
    this.sleepCharaCom = {};
    // 处理碎碎念，都插入ID，方便操作
    _.mapKeys(mbgGame.config.rant, (value, id) => {
      value.id = id;
    });
    // mbgGame.log('this.saveOriY', this.saveOriY);
  },
  onOpened() {
    if (this._isInited) {
      if (this.bagLayer.active) {
        this.bagLayer.getComponent('panelBag').refreshItemList();
      }
      return;
    }
    mbgGame.resManager.setImageFrame(this.btnBag, 'images', 'btnItemOff');
    this._isInited = true;
    this.refreshCharaList();
    this.refreshSleepCharas();
  },
  // 飞入
  inPanel(inNode, charaID) {
    inNode.y = this.panelFlyToY;
    inNode.active = true;
    if (inNode === this.detailLayer && charaID) {
      this.detailLayer.getComponent('characterDetail').showCharacter(charaID, true);
    }
    inNode.runAction(cc.sequence(
      cc.moveTo(0.2, 0, this.saveOriY).easing(cc.easeExponentialInOut()),
      cc.moveBy(0.05, cc.v2(0, -5)).easing(cc.easeExponentialInOut()),
      cc.moveBy(0.05, cc.v2(0, 5)).easing(cc.easeExponentialInOut()),
    ));
  },
  // 飞出
  outPanel(outNode) {
    outNode.runAction(cc.sequence(
      cc.moveBy(0.05, cc.v2(0, -5)).easing(cc.easeExponentialInOut()),
      cc.moveTo(0.2, cc.v2(0, this.panelFlyToY)).easing(cc.easeExponentialInOut()),
      cc.callFunc(() => {
        outNode.active = false;
      })));
  },
  // 飞出再飞入
  outInPanel(outNode, inNode, charaID) {
    if (!outNode.active) {
      // 如果飞走的没有显示，就直接飞入就行了
      this.inPanel(inNode, charaID);
      return;
    }
    outNode.runAction(cc.sequence(
      cc.moveBy(0.05, cc.v2(0, -5)).easing(cc.easeExponentialInOut()),
      cc.moveTo(0.2, cc.v2(0, this.panelFlyToY)).easing(cc.easeExponentialInOut()),
      cc.callFunc(() => {
        // outNode.active = false;
        // out完后再in
        this.inPanel(inNode, charaID);
      })));
  },
  changeMode() {
    if (this.nowMode === 1) {
      mbgGame.resManager.setImageFrame(this.btnBag, 'images', 'btnItemOn');
      mbgGame.resManager.setImageFrame(this.btnChara, 'images', 'btnCharaOff');
      this.bagLayer.getComponent('panelBag').refreshItemList();
      this.nowMode = 2;
      this.outInPanel(this.detailLayer, this.bagLayer);
    } else {
      mbgGame.resManager.setImageFrame(this.btnBag, 'images', 'btnItemOff');
      mbgGame.resManager.setImageFrame(this.btnChara, 'images', 'btnCharaOn');
      this.nowMode = 1;
      if (this._lastClickCom) {
        this.outInPanel(this.bagLayer, this.detailLayer);
      } else {
        this.outPanel(this.bagLayer);
      }
    }
  },
  onRefreshTime() {
    const charaID = mbgGame.player.getUnlockingCharaID();
    if (!charaID) {
      return;
    }
    const com = this.sleepCharaCom[charaID];
    if (!com) {
      return;
    }
    const lefttime = mbgGame.player.getUnlockCharaLefttime();
    com.setTime(lefttime);
  },
  showCharacterDetail(charaID) {
    // mbgGame.log("showCharacterDetail", charaID);
    if (!this.detailLayer.active) {
      this.inPanel(this.detailLayer, charaID);
    } else {
      this.outInPanel(this.detailLayer, this.detailLayer, charaID);
    }
  },

  refreshCharaList() {
    for (let charaID = 1; charaID <= 15; charaID++) {
      const lineNode = this.listLayer.getChildByName(`line${mbgGame.player.getWorldIdxByCharaID(charaID)}`);
      const posNode = lineNode.getChildByName(`pos${(charaID - 1) % 5}`);
      const hasChara = mbgGame.player.hasChara(charaID);
      if (!hasChara) {
        continue;
      }
      const com = this.sleepCharaCom[charaID];
      if (com) {
        com.node.destroy();
        delete this.sleepCharaCom[charaID];
      }
      const lv = hasChara ? mbgGame.player.getCharaLv(charaID) : null;

      if (!this.charasCom[charaID]) {
        const node = cc.instantiate(this.characterPre);
        posNode.addChild(node);
        const fCom = node.getComponent('floorCharacter');
        fCom.onCreated({
          charaID,
          mode: 'actionList',
          scene: 'c',
          sceneCom: this,
          lv,
          actionList: [
            { action: 'normal', weight: 80 },
            { action: 'idle', weight: 15 },
            { action: 'say', weight: 3, type: "rant" },
          ],
        });
        node.charaID = charaID;
        fCom.turnRight();
        this.charasCom[charaID] = fCom;
      } else {
        // 刷新动态数据
        const sCom = this.charasCom[charaID];
        if (lv) sCom.setLv(lv);
      }
    }
  },
  refreshSleepCharas() {
    const _charaID = mbgGame.player.getUnlockingCharaID();
    if (!_.isEmpty(this.sleepCharaCom)) {
      for (let charaID = 1; charaID <= 15; charaID++) {
        const hasChara = mbgGame.player.hasChara(charaID);
        const com = this.sleepCharaCom[charaID];
        if (hasChara) {
          if (com) {
            com.node.destroy();
            delete this.sleepCharaCom[charaID];
          }
          continue;
        }
        com.setUnlockState(_charaID && _charaID === charaID);
      }
      this.refreshSleepCharaListPos();
      return;
    }
    mbgGame.resManager.loadPrefab('sleepChara', (prefab) => {
      for (let charaID = 1; charaID <= 15; charaID++) {
        const hasChara = mbgGame.player.hasChara(charaID);
        if (hasChara) {
          continue;
        }
        const worldIdx = mbgGame.player.getWorldIdxByCharaID(charaID);
        const lineNode = this.listLayer.getChildByName(`line${worldIdx}`);
        const posNode = lineNode.getChildByName(`pos${(charaID - 1) % 5}`);
        const node = cc.instantiate(prefab);
        posNode.addChild(node);
        const com = node.getComponent("sleepChara");
        com.charaID = charaID;
        com.setTime('');
        com.setUnlockState(_charaID && _charaID === charaID);
        com.setClickCB(this.onClickSleepChara.bind(this));
        this.sleepCharaCom[charaID] = com;
      }
      this.refreshSleepCharaListPos();
    });
  },
  refreshSleepCharaListPos() {
    for (let charaID = 1; charaID <= 15; charaID++) {
      const hasChara = mbgGame.player.hasChara(charaID);
      if (hasChara) {
        continue;
      }
      const node = this.sleepCharaCom[charaID].node;
      const worldIdx = mbgGame.player.getWorldIdxByCharaID(charaID);
      // 胶囊间距问题
      // 如果世界1的人都解锁了，下面的人往上挪一点，不然没位置放世界3的人的解锁时间
      if (mbgGame.player.hasAllWorld1Charas()) {
        const baseY = 40;
        if (worldIdx === 1) {
          node.y = baseY + 0;
        } else if (worldIdx === 2) {
          node.y = baseY + 0;
        } else if (worldIdx === 3) {
          node.y = baseY - 20;
        }
      } else {
        const baseY = 20;
        if (worldIdx === 1) {
          node.y = baseY + 20;
        } else if (worldIdx === 2) {
          node.y = baseY + 0;
        } else if (worldIdx === 3) {
          node.y = baseY - 20;
        }
      }
    }
  },
  onClickSleepChara(com) {
    if (this._lastClickCom) {
      this._lastClickCom.shadow.active = true;
      this._lastClickCom.selectFrame.active = false;
      delete this._lastClickCom;
    }
    this.showCharacterDetail(com.charaID);
  },
  // 同一排的人，不会连续同时说话
  checkSay(charaID) {
    const now = moment().unix();
    const line = mbgGame.player.getWorldIdxByCharaID(charaID);
    const lastSayTime = this._lastSayLogTime[line];
    if (lastSayTime && now - lastSayTime < 5) {
      return true;
    }
    this._lastSayLogTime[line] = now;
    return false; // 可以说
  },

  getCharacterCom(charaID) {
    return this.charasCom[charaID];
  },
  clickCharaByID(charaID) {
    if (this.getCharacterCom(charaID)) {
      this.clickCharacter(this.getCharacterCom(charaID));
    } else if (this.sleepCharaCom[charaID]) {
      this.onClickSleepChara(this.sleepCharaCom[charaID]);
    }
  },
  clickCharacter(characterCom) {
    if (this._lastClickCom) {
      if (this._lastClickCom === characterCom) {
        return;
      }
      this._lastClickCom.shadow.active = true;
      this._lastClickCom.selectFrame.active = false;
    }
    characterCom.shadow.active = false;
    characterCom.selectFrame.active = true;
    this._lastClickCom = characterCom;
    this.showCharacterDetail(characterCom.node.charaID);
  },
  getSkillInfo(i) {
    const characterDetail = this.detailLayer.getComponent('characterDetail');
    const com = characterDetail[`_skillInfoNode${i}`].getComponent('skillInfo');
    return com;
  },
  getCharacterDetail() {
    return this.detailLayer.getComponent('characterDetail');
  },
});
