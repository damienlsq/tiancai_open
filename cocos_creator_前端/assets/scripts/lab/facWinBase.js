const labdefines = require('labdefines');

const FloorType = labdefines.FloorType;

cc.Class({
  extends: cc.Component,

  listenLabData() {
    emitter.on(this, "labdata", this.onLabDataUpdated);
  },
  onLabDataUpdated() {
    if (!this.node._winBase) {
      return;
    }
    this.onAddBaseWin();
  },
  onDestroy() {
    emitter.off(this, "labdata");
    if (this.onCloseCustom) {
      this.onCloseCustom();
    }
  },
  getData() {
    return mbgGame.player.getFacDataByFacID(this.m_FacID);
  },
  getFacType() {
    return labdefines.FacID2Type[this.m_FacID];
  },
  getFacID(idx) {
    if (this.isCol()) {
      const dTask = mbgGame.player.getCurTasks();
      const task = dTask[idx];
      if (!task || !task.f) return null;
      return task.f;
    } else if (this.isRead()) {
      return mbgGame.player.getFacIDByBookID(idx);
    }
    return null;
  },
  isCol() {
    return labdefines.FloorType2FacIDs[FloorType.Col].indexOf(this.m_FacID) !== -1;
  },
  isRead() {
    return labdefines.FloorType2FacIDs[FloorType.Read].indexOf(this.m_FacID) !== -1;
  },
  isGym() {
    return labdefines.FloorType2FacIDs[FloorType.Gym].indexOf(this.m_FacID) !== -1;
  },
  getFloorType() {
    if (this.isCol()) {
      return FloorType.Col;
    } else if (this.isRead()) {
      return FloorType.Read;
    } else if (this.isGym()) {
      return FloorType.Gym;
    }
    return null;
  },
  getFreeFacID() {
    const type = this.getFloorType();
    for (let i = 0; i < labdefines.FloorType2FacIDs[type].length; i++) {
      const facID = labdefines.FloorType2FacIDs[type][i];
      const hasFac = mbgGame.player.hasFac(facID);
      if (hasFac && !mbgGame.player.getCharaIDByFacID(facID)) {
        return facID;
      }
    }
    return null;
  },
  unselectCurChara() {
    if (this.m_curIconCom) {
      this.m_curIconCom.setSelected(false);
      this.m_curIconCom = null;
    }
  },
  changeChara(com) {
    if (this.m_curIconCom === com) {
      return false;
    }
    if (this.m_curIconCom) {
      this.m_curIconCom.setSelected(false);
    }
    com.setSelected(true);
    this.m_curIconCom = com;
    this.setCharaSpine(com.getId());
    return true;
  },
  getOrCreateIconChara(idx) {
    if (!this.m_Idx2IconChara) {
      this.m_Idx2IconChara = {};
    }
    if (!this.m_Idx2IconChara[idx]) {
      const node = mbgGame.managerUi.getIconCharacter();
      this.headContent.addChild(node);
      this.m_Idx2IconChara[idx] = node;
    }
    return this.m_Idx2IconChara[idx];
  },
  refreshCharaHeads(dontSortByWork) {
    let charaIDs = mbgGame.player.getOwnedCharaIDs();
    charaIDs = _.sortBy(charaIDs, (charaID) => {
      if (dontSortByWork) {
        return charaID;
      }
      let v = mbgGame.player.isCharaWorking(charaID) ? 1000 : 0;
      v += charaID;
      return v;
    });
    for (let i = 0; i < charaIDs.length; i++) {
      const charaID = charaIDs[i];
      const node = this.getOrCreateIconChara(i);
      const com = node.getComponent('iconCharacter');
      com.initMe({
        charaID,
        lv: mbgGame.player.getCharaLv(charaID),
      });
      com.addButton(this, 'facWinBase', 'onSelectChara');

      if (this.m_FacID != null) {
        if (mbgGame.player.isFacHasChara(this.m_FacID)
          || mbgGame.player.isCharaWorking(charaID)) {
          com.setStatus('inUse');
        }
        com.showFacState();
      }
      // 选择框最后，这样就能最顶层
      com.setSelected(this.m_curIconCom && this.m_curIconCom === com);
    }
  },
  showWorkingTips() {
    let i18n;
    if (this.getFacType() === labdefines.FacType.Gym) {
      i18n = 'hardgyming';
    } else if (this.getFacType() === labdefines.FacType.Collector) {
      i18n = 'hardworking';
    } else if (this.getFacType() === labdefines.FacType.Read) {
      i18n = 'hardreading';
    }
    mbgGame.managerUi.floatMessage(mbgGame.getString(i18n));
  },
  setCharaSpine(charaID, actionList = [
    { action: 'idle', weight: 25 },
  ]) {
    if (!mbgGame.preloadRes.floorCharacter || !this.floorCharaPos) {
      return;
    }
    if (!this.m_floorCharacter) {
      this.m_floorCharacter = cc.instantiate(mbgGame.preloadRes.floorCharacter);
      this.floorCharaPos.addChild(this.m_floorCharacter);
    }
    if (charaID > 0) {
      this.m_floorCharacter.active = true;
      const com = this.m_floorCharacter.getComponent("floorCharacter");
      if (charaID <= 15) {
        com.onCreated({
          charaID,
          mode: 'actionList',
          actionList,
        });
      } else {
        com.onCreated({
          mTplID: charaID,
          spineName: mbgGame.config[`mtpl${charaID}`].spine,
          charaID,
          mode: 'stand',
          actionList: [{ action: 'stand', weight: 100 }],
        });
      }
    } else {
      this.m_floorCharacter.active = false;
    }
  },
  onShowFinishWin(curFacType, charaID, dFac, ret) {
    mbgGame.resManager.loadPrefab('facFinishWin', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addUIWin(node, "facFinishWin");
      node.getComponent("facFinishWin").initMe(curFacType, charaID, dFac, ret);
    });
  },

  onFinish(idx, fast) {
    let facID;

    if (this.isGym()) {
      facID = this.m_FacID;
    } else {
      facID = this.getFacID(idx);
    }
    const charaID = mbgGame.player.getCharaIDByFacID(facID);
    // 取消本地推送
    mbgGame.player.removeFacFinishPush(charaID, facID);
    mbgGame.netCtrl.sendMsg('lab.finish', {
      facID,
      fast,
      isFinish: true,
    }, (data) => {
      if (data.code === "err") {
        mbgGame.managerUi.floatMessage(data.err);
      } else {
        // mbgGame.log("lab.finish", data, charaID, facID);
        const floorCom = mbgGame.panelLab.getFacFloorCom(facID);
        if (data.ret.remove) {
          floorCom.characterLeft(charaID, facID);
        }
        floorCom.refreshFloor();
        if (data.ret.result) {
          data.ret.result.isLab = true;
          mbgGame.managerUi.openWinResult(data.ret.result);
        }
      }
    });
  },
});