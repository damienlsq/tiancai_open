cc.Class({
  extends: cc.Component,

  properties: {
    seatMaskTemplate: cc.Node,
    itemMaskTemplate: cc.Node,
    itemPosList: {
      default: [],
      type: cc.Node,
    },
    charaPosList: {
      default: [],
      type: cc.Node,
    },
    btnSeatList: {
      default: [],
      type: cc.Node,
    },
    btnSeatLight: {
      default: [],
      type: cc.Node,
    },
    btnItemLight: {
      default: [],
      type: cc.Node,
    },
  },
  onLoad() {
    this._maxZindex = 99;
    for (let i = 0; i < this.itemPosList.length; i++) {
      // this.setDragNode(this.itemPosList[i], this.itemPosList[i].getPosition(), i, false);
      this.setItemLight(i, false);
      const dragCom = this.itemPosList[i].addComponent('drag');
      dragCom.initMe({
        fn_getTargetPos: () => {
          return this.getDragItemPos();
        },
        fn_createDragNode: () => {
          const sid = this.itemPosList[i]._sid;
          const node = mbgGame.managerUi.getIconItem();
          mbgGame.schemeTeamEditor.node.addChild(node);
          node.getComponent("itemPanel").initMe({
            sid,
            style: 'iconMe',
          });
          // sv就不能滚动了
          const com = mbgGame.schemeTeamEditor.itemPanel.getComponent('mbgView');
          if (com) com.enabled = false;
          this.itemLight();
          return node;
        },
        fn_matchRange: (targetIdx) => {
          mbgGame.schemeTeamEditor.switchItem(i, targetIdx);
          this.itemLightOff();
        },
        fn_onClick: () => {
          const sid = this.itemPosList[i]._sid;
          if (!sid) return;
          if (this._isItemLightMode) {
            mbgGame.schemeTeamEditor.dragClickPanelScheme(i, false);
            this.itemLightOff();
            return;
          }
          mbgGame.managerUi.openItemInfo({
            sid,
            style: 'wield',
          });
        },
        fn_checkCanTouch: () => {
          if (this.itemPosList[i]._sid) {
            return true;
          }
          return false;
        },
        fn_onSpecialClick: () => {
          mbgGame.schemeTeamEditor.dragClickPanelScheme(i, false);
          this.itemLightOff();
        },
      });
    }
    for (let i = 0; i < this.btnSeatList.length; i++) {
      // this.setDragNode(this.btnSeatList[i], this.btnSeatList[i].getPosition(), i, true);
      this.setSeatLight(i, false);
      const dragCom = this.btnSeatList[i].addComponent('drag');
      dragCom.initMe({
        fn_getTargetPos: () => {
          return this.getDragTargetPos();
        },
        fn_createDragNode: () => {
          const charaID = this.btnSeatList[i]._charaID;
          const node = cc.instantiate(mbgGame.preloadRes.fighter);
          mbgGame.schemeTeamEditor.node.addChild(node);
          const fCom = node.getComponent('fighter');
          const cCom = node.getComponent('fighterctrl');
          cCom.showShadow(false);
          fCom.setCharaID(charaID);
          fCom.spineCtrl().loadSpine(`chara${charaID}`);
          fCom.spineCtrl().setSkin('default');
          fCom.spineCtrl().turnRight();
          this.seatLight();
          return node;
        },
        fn_matchRange: (targetIdx) => {
          mbgGame.schemeTeamEditor.switchChara(i, targetIdx);
          this.seatLightOff();
        },
        fn_dragEnd: () => {
          this.seatLightOff();
        },
        fn_onClick: () => {
          const charaID = this.btnSeatList[i]._charaID;
          if (!charaID) return;
          if (this._isLightMode) {
            mbgGame.schemeTeamEditor.dragClickPanelScheme(i, true);
            this.seatLightOff();
            return;
          }
          mbgGame.schemeTeamEditor.openCharaInfo(charaID);
        },
        fn_checkCanTouch: () => {
          if (this._cantDrag) return false;
          if (this.btnSeatList[i]._charaID) {
            return true;
          }
          return false;
        },
        fn_onSpecialClick: () => {
          if (this._cantDrag) {
            const charaID = this.btnSeatList[i]._charaID;
            if (charaID) {
              mbgGame.schemeTeamEditor.openCharaInfo(charaID);
            }
            return;
          }
          mbgGame.schemeTeamEditor.dragClickPanelScheme(i, true);
          this.seatLightOff();
        },
      });
    }
  },
  getData() {
    return this.m_schemeData;
  },
  onOpened(dScheme, cantDrag) {
    this.m_schemeData = dScheme;
    if (cantDrag) {
      this._cantDrag = true;
    } else {
      delete this._cantDrag;
    }
    this.refreshInfo();
  },
  refreshInfo() {
    // mbgGame.log("panelScheme refreshInfo", this.m_schemeData);
    this.refreshCharas();
    this.refreshItems();
  },
  setCharaIDs(charaIDs) {
    this.m_CharaIDs = charaIDs;
  },
  getCharaIDs() {
    if (this.m_CharaIDs) {
      return this.m_CharaIDs;
    }
    const dData = this.getData();
    return dData.charaIDs || [];
  },
  setCharaHpDict(hpDict) {
    this.m_CharaHpDict = hpDict;
  },
  getCharaHpPercent(charaID) {
    if (!this.m_CharaHpDict) {
      return null;
    }
    let hpPercent = this.m_CharaHpDict[charaID];
    if (hpPercent == null) {
      hpPercent = 100;
    }
    return hpPercent;
  },
  getOrCreateChara(idx) {
    if (!this.m_Idx2Fighter) {
      this.m_Idx2Fighter = {};
    }
    if (!this.m_Idx2Fighter[idx]) {
      const fighterNode = cc.instantiate(mbgGame.preloadRes.fighter);
      const charaPos = this.charaPosList[idx];
      charaPos.addChild(fighterNode);
      fighterNode.removeComponent(cc.Button);
      this.m_Idx2Fighter[idx] = fighterNode;
    }
    this.m_Idx2Fighter[idx].zIndex = idx;
    return this.m_Idx2Fighter[idx];
  },
  setSeatLight(posID, flag) {
    const lightNode = this.btnSeatLight[posID];
    lightNode.active = flag;
  },
  seatLight() {
    this._isLightMode = true;
    for (let posIdx = 0; posIdx < 5; posIdx++) {
      this.setSeatLight(posIdx, true);
    }
  },
  seatLightOff() {
    delete this._isLightMode;
    for (let posIdx = 0; posIdx < 5; posIdx++) {
      this.setSeatLight(posIdx, false);
    }
  },
  setItemLight(posID, flag) {
    const lightNode = this.btnItemLight[posID];
    lightNode.active = flag;
  },
  itemLight() {
    this._isItemLightMode = true;
    for (let posIdx = 0; posIdx < 5; posIdx++) {
      // this.setItemLight(posIdx, !this.itemPosList[posIdx]._sid);
      this.setItemLight(posIdx, true);
    }
  },
  itemLightOff() {
    delete this._isItemLightMode;
    for (let posIdx = 0; posIdx < 5; posIdx++) {
      this.setItemLight(posIdx, false);
    }
  },
  refreshCharas() {
    const charaIDs = this.getCharaIDs();
    this._last_charaIDs = this._last_charaIDs || [];
    // mbgGame.log("refreshCharas", charaIDs);
    // 只保留物品
    for (let posIdx = 0; posIdx < 5; posIdx++) {
      const charaPos = this.charaPosList[posIdx]; // 4 3 2 1 0
      const charaID = charaIDs[posIdx];
      if (!charaID) {
        charaPos.active = false;
        delete this.btnSeatList[posIdx]._charaID;
        continue;
      }
      if (this._last_charaIDs[posIdx] === charaID) {
        if (this.m_Idx2Fighter && this.m_Idx2Fighter[posIdx]) {
          const ctrlCom = this.m_Idx2Fighter[posIdx].getComponent('fighterctrl');
          ctrlCom.showLv(mbgGame.player.getCharaLv(charaID));
        }
        // 没有变化
        continue;
      }
      this.btnSeatList[posIdx]._charaID = charaID;

      const hpPercent = this.getCharaHpPercent(charaID);
      const fighterNode = this.getOrCreateChara(posIdx);
      const fighterCom = fighterNode.getComponent('fighter');
      const ctrlCom = fighterNode.getComponent('fighterctrl');

      if (!charaPos.active) {
        charaPos.active = true;
      }
      fighterNode.setPosition(0, 0);
      ctrlCom.showShadow(false);
      fighterCom.setCharaID(charaID);
      ctrlCom.showLv(mbgGame.player.getCharaLv(charaID));
      fighterCom.spineCtrl().loadSpine(`chara${charaID}`);
      fighterCom.spineCtrl().turnRight();
      fighterCom.spineCtrl().doIdle();

      // mbgGame.log("hpPercent", data.hpPercent);
      if (hpPercent != null) {
        fighterCom.barCtrl().setShow(true);
        fighterCom.barCtrl().setHpPercent(hpPercent * 0.01);
      } else {
        fighterCom.barCtrl().setShow(false);
      }
      // mbgGame.log('refreshCharas', charaID, charaPos.active);
    }
    this._last_charaIDs = charaIDs;
    // mbgGame.log('refreshCharas', worldIdx, charaIDs);
  },
  refreshItems() {
    // 只保留人物
    this.renderList = _.filter(this.renderList, (x) => { return x.isChara; });
    const dData = this.getData();
    const bag = dData.bag || {};
    let sidList = dData.sidList;
    if (!sidList) {
      sidList = [0, 0, 0, 0, 0];
      for (let posIdx = 0; posIdx < 5; posIdx++) {
        const _sidList = bag[posIdx];
        const sid = _sidList && _sidList[0];
        sidList[posIdx] = sid || 0;
      }
    }
    // mbgGame.log("sidList", sidList);
    for (let posIdx = 0; posIdx < 5; posIdx++) {
      const sid = sidList[posIdx];
      const posNode = this.itemPosList[posIdx];
      let itemNode = posNode._itemNode;
      if (itemNode && !itemNode.isValid) {
        delete posNode._itemNode;
        itemNode = null;
      }
      if (!itemNode) {
        itemNode = mbgGame.managerUi.getIconItem();
        posNode.addChild(itemNode);
        posNode._itemNode = itemNode;
      }
      if (sid) {
        const itemPanelCom = itemNode.getComponent('itemPanel');
        itemPanelCom.initMe({
          sid,
          isItem: true,
          style: 'wield',
        });
        posNode._sid = sid;
      } else {
        itemNode.destroy();
        delete posNode._itemNode;
        delete posNode._sid;
      }
      /*
      this.renderList.push({
        sid,
        idx: posIdx,
        isItem: true,
      });
      */
    }
  },

  setSpriteSelect(show) {
    this.spriteSelect.active = show;
    this.spriteSelect.stopAllActions();
    if (show) {
      this.spriteSelect.runAction(cc.sequence(
        cc.fadeOut(0.4),
        cc.fadeIn(0.4)).repeatForever());
    }
  },
  getDragTargetPos() {
    if (!this.targetPos) {
      this.targetPos = [];
      for (let i = 0; i < 5; i++) {
        const node = this.btnSeatList[i];
        const pos = node.parent.convertToWorldSpaceAR({ x: node.x - (node.width / 2), y: node.y - (node.height / 2) });
        this.targetPos.push(new cc.Rect(pos.x, pos.y, node.width, node.height));
        // mbgGame.drawNodeWorldBox(new cc.Rect(pos.x, pos.y, node.width, node.height));
      }
    }
    return this.targetPos;
  },
  getDragItemPos() {
    if (!this.itemPos) {
      this.itemPos = [];
      for (let i = 0; i < 5; i++) {
        const node = this.itemPosList[i];
        const pos = node.parent.convertToWorldSpaceAR({ x: node.x - (node.width / 2), y: node.y - (node.height / 2) });
        this.itemPos.push(new cc.Rect(pos.x, pos.y, node.width, node.height));
        // mbgGame.drawNodeWorldBox(new cc.Rect(pos.x, pos.y, node.width, node.height));
      }
    }
    return this.itemPos;
  },
});
