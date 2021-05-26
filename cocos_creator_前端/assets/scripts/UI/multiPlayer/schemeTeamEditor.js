const defines = require('warDefines');

cc.Class({
  extends: cc.Component,

  properties: {
    m_PanelScheme: cc.Node,
    iconMaxCount: 15,

    charaPanel: cc.Node,
    charaContent: cc.Node,

    itemPanel: cc.Node,
    itemContent: cc.Node,

    btnBotting: cc.Node,
    bottingPanel: cc.Node,
    charaFrame: cc.Node,
    skillFrame: cc.Node,

    // tabs
    tabsNode: cc.Node,

    filterBtnNode: cc.Node,

    // schemeManage
    btnManage: cc.Node,
    schemeName: cc.Label,
    managePanel: cc.Node,

    btnFinish: cc.Node, // 通用的
    raidBtnPanel: cc.Node, // 只用在试炼
    btnRaidCur: cc.Node,
    btnRaidNext: cc.Node,
  },
  // use this for initialization
  onLoad() {
    mbgGame.schemeTeamEditor = this;
    this.node._winTitle = mbgGame.getString('title_editscheme');
    this.node._winTooltips = mbgGame.getString('tooltips_schemeDesc');
    this.tabsCom = this.tabsNode.getComponent('itemTab');

    this.node.on('dragClick', this.dragClickPanelScheme, this);

    emitter.on(this, "delItems", this.filterItemList);
    emitter.on(this, "onChangeScheme", this.onChangeScheme);

    this.managePanel.active = false;
    this.raidBtnPanel.active = false;
  },
  onDestroy() {
    this.checkSetBotting();

    if (this.m_CancelCB) {
      const cb = this.m_CancelCB;
      delete this.m_CancelCB;
      cb();
    }
    delete mbgGame.schemeTeamEditor;
    emitter.off(this, "delItems");
    emitter.off(this, "onChangeScheme");
  },
  onFinish() {
    this.checkSetBotting();

    if (this.m_FinishCB) {
      // 保存为默认阵
      mbgGame.player.setDefaultSchemeIdx(this.m_warType, this.m_schemeIdx);
      this.m_FinishCB(this.m_stageIdx);
    } else {
      this.node._winBase.closeMe();
    }
  },
  onFinish_CurRaid() {
    if (this.m_FinishCB) {
      // 保存为默认阵
      mbgGame.player.setDefaultSchemeIdx(this.m_warType, this.m_schemeIdx);
      this.m_FinishCB(this.m_stageIdx);
    }
  },
  onFinish_NextRaid() {
    if (this.m_FinishCB) {
      this.m_FinishCB(this.m_stageIdx, "next");
      // 下一层不保存默认阵，因为容易输
    }
  },
  getSchemeData() {
    return mbgGame.player.getSchemeData(this.m_worldIdx, this.m_schemeIdx || 0, this.m_stageIdx);
  },
  onChangeScheme(idx) {
    if (idx != null) this.m_schemeIdx = idx;
    const com = this.getPanelSchemeCom();
    com.setCharaHpDict();
    const dScheme = this.getSchemeData();
    if (this.m_worldIdx >= 1 && this.m_worldIdx <= 3) {
      // 检测是否穿了不是该世界的道具
      // 是的话，通知服务端检测并处理
      let invalid = false;
      for (const charaIdx in dScheme.bag) {
        const sidList = dScheme.bag[charaIdx];
        const sid = sidList && sidList[0];
        if (sid) {
          const itemID = mbgGame.player.getItemID(sid);
          const dConfig = mbgGame.config[`item${itemID}`];
          if (dConfig && dConfig.worldIdx && dConfig.worldIdx !== this.m_worldIdx) {
            invalid = true;
            break;
          }
        }
      }
      if (invalid) {
        mbgGame.netCtrl.sendMsg("war.checkScheme", { w: this.m_worldIdx, s: this.m_schemeIdx });
      }
      const requiredCharaIDs = _.filter(defines.CharaIDsByStoryWorld[this.m_worldIdx], (_charaID) => {
        return mbgGame.player.hasChara(_charaID);
      });
      this.m_CharaIDs = requiredCharaIDs;
      this.schemeName.node.parent.active = false;
      com.setCharaIDs(this.m_CharaIDs);
    } else if (this.isWheelWar()) {
      this.m_CharaIDs = _.clone(dScheme.charaIDs || []);
      com.setCharaIDs(null);
      this.schemeName.node.parent.active = false;
      com.setCharaHpDict(mbgGame.player.getWheelWarDayData().myhp);
    } else {
      this.m_CharaIDs = _.clone(dScheme.charaIDs || []);
      com.setCharaIDs(null);
      this.schemeName.node.parent.active = true;
      this.schemeName.string = mbgGame.player.getSchemeName(this.m_schemeIdx);
    }

    mbgGame.log("scheme:", dScheme, this.m_worldIdx, this.m_schemeIdx, this.m_CharaIDs);

    com.onOpened(dScheme, !this.canChangeChara());

    if (this.canChangeChara()) {
      this.refreshCanSelectCharaList();
    }
    this.filterItemList();
  },
  canShowManageBtn() {
    if (this.isWheelWar()) return false;
    return this.canChangeChara();
  },
  canChangeChara() {
    if (this.m_worldIdx === 6) {
      return mbgGame.player.isStorySchemeUnlocked();
    }
    return defines.StoryWorlds.indexOf(this.m_worldIdx) === -1;
  },
  getPanelSchemeCom() {
    return this.m_PanelScheme.getComponent("panelScheme");
  },
  onAddBaseWin(dData) {
    // mbgGame.log('schemeEditor onAddBaseWin', dData);
    this.m_worldIdx = dData.worldIdx;
    this.m_stageIdx = dData.stageIdx;
    this.m_warType = dData.wartype;
    if (dData.isDefense) {
      this.m_isDefense = true;
      this.m_schemeIdx = mbgGame.player.getPVPDefSchemeIdx();
    } else {
      this.m_schemeIdx = dData.schemeIdx != null ? dData.schemeIdx : mbgGame.player.getSavedSchemeIdx(dData.wartype);
    }
    this.m_FinishCB = dData.finishCB;
    this.m_CancelCB = dData.cancelCB;
    const btnCom = this.btnFinish.getComponent('itemBtn');
    if (dData.bottomBtnLabel) {
      btnCom.setBtnLabel(dData.bottomBtnLabel);
      btnCom.setSound('UI_Select');
    } else {
      btnCom.setBtnLabel(mbgGame.getString("beginfight"));
      btnCom.setSound('UI_Fight');
    }
    if (!this.m_FinishCB) {
      this.btnFinish.active = false;
      this.raidBtnPanel.active = false;
    }
    this.m_CurSelectItemSID = null;
    this.m_CurSelectCharaID = null;
    this.btnManage.active = this.canShowManageBtn();
    this.btnBotting.active = mbgGame.player.isBottingUnlocked();
    this.onChangeScheme();
    // 耗水
    // this.labelExpend.string = `${mbgGame.getString('pvp_avgEnergy')}:${mbgGame.player.getPVPScheme_EnergyMeanCost(charaIDs)}`;
    const com = this.getPanelSchemeCom();
    com.m_ControllerCom = this;
    this.tabsCom.setTabEnable(mbgGame.player.isBottingUnlocked());
    // 重新打开的时候，重置一下mask
    this.onCloseSelectMode();
    if (!this.canChangeChara()) {
      this.tabsCom.setTabDisable(0);
      this.onItem();
    } else {
      this.tabsCom.setTabEnable(0);
      this.onChara();
    }

    if (this.m_worldIdx === defines.raidWorldIdx) {
      this.raidBtnPanel.active = true;
      this.btnFinish.active = false;
      const curLv = mbgGame.player.getRaidLv(this.m_stageIdx);
      const nextLv = curLv + 1;
      this.btnRaidCur.getComponent('itemBtn').setBtnLabel(mbgGame.getString('beginRaidFight', {
        n: curLv || 1,
      }));
      if (nextLv > 1 && nextLv <= 45) {
        this.btnRaidNext.active = true;
        this.btnRaidNext.getComponent('itemBtn').setBtnLabel(mbgGame.getString('beginRaidFight', {
          n: nextLv,
        }));
      } else {
        this.btnRaidNext.active = false;
      }
    } else {
      this.raidBtnPanel.active = false;
      this.btnFinish.active = true;
    }
    if (this.isWheelWar()) {
      this.setCmd("wheel.setScheme");
    } else {
      this.setCmd(null);
    }

    mbgGame.player.checkTeach();
    // mbgGame.managerUi.teach.showTeach('equip');
  },
  isWheelWar() {
    return this.m_worldIdx === 4 && mbgGame.player.getDayWarTypeByStageIdx(this.m_stageIdx) === "wheelwar";
  },
  onTab(name) {
    const tabs = {
      chara: {
        node: this.charaPanel,
      },
      item: {
        node: this.itemPanel,
      },
      botting: {
        node: this.bottingPanel,
      },
    };
    _.mapKeys(tabs, (v, k) => {
      if (k === name) {
        v.node.active = true;
      } else {
        v.node.active = false;
      }
    });
    switch (name) {
      case 'chara':
        this.checkSetBotting();
        this.refreshCanSelectCharaList();
        break;
      case 'item':
        this.checkSetBotting();
        this.filterItemList();
        break;
      case 'botting':
        this.refreshBottingPanel();
        break;
      default: break;
    }
    this.onCloseSelectMode();
  },
  onChara() {
    this.filterBtnNode.active = false;
    this.onTab('chara');
  },
  onItem() {
    this.filterBtnNode.active = true;
    if (!this.filterBtnNode.children.length) {
      mbgGame.managerUi.initItemFilter(this.filterBtnNode, this.filterItemList.bind(this));
    }
    mbgGame._itemsSortCondition = 'starLvl';
    this.onTab('item');
  },
  onBotting() {
    this.filterBtnNode.active = false;
    this.onTab('botting');
  },
  onManage() {
    this.filterBtnNode.active = false;
    this.checkSetBotting();
    this.node.getComponent('schemeManage').refreshSchemes(this.m_worldIdx, this.m_schemeIdx);
    this.managePanel.active = true;
    this.btnFinish.active = false;
    this.raidBtnPanel.active = false;
    this.onCloseSelectMode();
  },
  closeManagerUI() {
    this.managePanel.active = false;
    if (this.m_worldIdx === defines.raidWorldIdx) {
      this.raidBtnPanel.active = true;
      this.btnFinish.active = false;
    } else {
      this.raidBtnPanel.active = false;
      this.btnFinish.active = true;
    }
  },
  getOrCreateHead(charaID) {
    if (!this.m_CharaHeads) {
      this.m_CharaHeads = {};
    }
    if (!this.m_CharaHeads[charaID]) {
      const icon = mbgGame.managerUi.getIconCharacter();
      const contentName = `charaContent${Math.ceil(charaID / 5)}`;
      const contentNode = this.charaContent.getChildByName(contentName);
      const content = contentNode.getChildByName('content');
      content.addChild(icon);
      const iconCom = icon.getComponent("iconCharacter");
      this.m_CharaHeads[charaID] = iconCom;
    }
    return this.m_CharaHeads[charaID];
  },
  onClickCharaInfoBtn(iconCom) {
    this.openCharaInfo(iconCom.m_CharaID);
  },
  onClickCharaUseBtn(iconCom) {
    this.onChooseCB(iconCom.m_CharaID);
  },
  // 刷新下面的可以选择的角色列表
  refreshCanSelectCharaList() {
    if (this.managePanel.active) {
      this.node.getComponent('schemeManage').refreshSchemes(this.m_worldIdx, this.m_schemeIdx);
    }
    if (!this.charaPanel.active) {
      return;
    }
    const dScheme = this.getSchemeData();
    let canSelectCharaIDs = mbgGame.player.getCanSelectCharaIDsByWorld(
      this.m_worldIdx, this.m_schemeIdx);
    // 不在scheme里的才显示
    if (dScheme && !_.isEmpty(dScheme.charaIDs)) {
      canSelectCharaIDs = _.filter(canSelectCharaIDs, (charaID) => {
        return dScheme.charaIDs.indexOf(charaID) === -1;
      });
    }
    mbgGame.log("canSelectCharaIDs", canSelectCharaIDs);
    for (let charaID = 1; charaID <= 15; charaID++) {
      const canSelect = canSelectCharaIDs.indexOf(charaID) !== -1;
      const iconCom = this.getOrCreateHead(charaID);
      iconCom.node.active = true;
      let dragCom = iconCom.node.getComponent('drag');
      if (canSelect && !dragCom) {
        dragCom = iconCom.node.addComponent('drag');
        dragCom.initMe({
          fn_getTargetPos: () => {
            return mbgGame.schemeTeamEditor.getPanelSchemeCom().getDragTargetPos();
          },
          fn_createDragNode: () => {
            const node = cc.instantiate(mbgGame.preloadRes.fighter);
            mbgGame.schemeTeamEditor.node.addChild(node);
            const fighterCom = node.getComponent('fighter');
            const ctrlCom = node.getComponent('fighterctrl');
            node.removeComponent(cc.Button);
            ctrlCom.showShadow(false);
            fighterCom.setCharaID(charaID);
            fighterCom.spineCtrl().loadSpine(`chara${charaID}`);
            fighterCom.spineCtrl().setSkin('default');
            fighterCom.spineCtrl().turnRight();
            mbgGame.schemeTeamEditor.getPanelSchemeCom().seatLight();
            return node;
          },
          fn_matchRange: (targetIdx) => {
            mbgGame.schemeTeamEditor.addCharaToTeam(charaID, targetIdx);
          },
          fn_dragEnd: () => {
            mbgGame.schemeTeamEditor.getPanelSchemeCom().seatLightOff();
          },
          fn_onClick: () => {
            if (this.isWheelWar() && this.checkWheelWarRevive(charaID)) {
              return;
            }
            mbgGame.schemeTeamEditor.openCharaInfo(charaID);
          },
        });
      } else if (!canSelect && dragCom) {
        iconCom.node.removeComponent('drag');
      }
      // this.setDragNode(iconCom.node, charaID, canSelect, true);
      iconCom.initMe({
        charaID,
        lv: mbgGame.player.getCharaLv(charaID),
      });
      if (!mbgGame.player.hasChara(charaID)) {
        iconCom.setStatus('unLock');
      } else if (!canSelect) {
        iconCom.setStatus('inUse');
      } else {
        iconCom.setStatus();
      }

      iconCom.node._saveIndex = charaID;
      if (canSelect && this.isWheelWar()) {
        const dData = mbgGame.player.getWheelWarDayData();
        let hpPercent = dData.myhp[charaID];
        if (hpPercent == null) {
          hpPercent = 100;
        }
        iconCom.setHpPercent(hpPercent);
      }
    }
    this.refreshBottingPanel();
  },
  // 该角色是否已在队伍里
  isCharaSelected(charaID) {
    return this.m_CharaIDs.indexOf(charaID) !== -1;
  },
  // 打开角色信息弹窗
  openCharaInfo(charaID) {
    if (!mbgGame.player.hasChara(charaID)) {
      return;
    }
    mbgGame.log("openWinCharaInfo", charaID);
    mbgGame.managerUi.openWinCharaInfo(charaID, {
      teamEditCom: this,
      canChange: this.canChangeChara(),
      isMe: true,
    });
    /*
     const dData = {
      w: this.m_worldIdx,
      s: this.m_schemeIdx,
      type: this.isWheelWar() ? "wheelwar" : null,
      charaID,
    };
    if (this.isWheelWar()) {
      dData.type = "wheelwar";
    }
    mbgGame.netCtrl.sendMsg("war.charainfo", dData, (data) => {
      mbgGame.log("war.charainfo", this.m_worldIdx, charaID, data);
      if (data.code === "err") {
        mbgGame.managerUi.floatMessage(data.err);
        return;
      }
      mbgGame.managerUi.openWinCharaInfo(charaID, {
        charaData: data.data,
        teamEditCom: this,
        canChange: this.canChangeChara(),
        isMe: true,
      });
    });
    */
  },
  // 在角色信息弹窗点击了 上场 ／ 下场 按钮
  onChooseCB(charaID) {
    if (this.isCharaSelected(charaID)) {
      this.delCharaFromTeam(charaID);
    } else {
      this.setSelectMode("chara");
      this.m_CurSelectCharaID = charaID;
    }
  },
  checkWheelWarRevive(charaID) {
    // 是否可以选
    if (this.isWheelWar()) {
      const dData = mbgGame.player.getWheelWarDayData();
      if (dData.myhp[charaID] <= 0) {
        const n = (dData.rt && dData.rt[charaID]) || 0;
        const price = 10 + (n * 20);
        // 没血
        mbgGame.managerUi.createConfirmDialog(mbgGame.getString('schemeRevive', {
          price,
        }),
          () => {
            mbgGame.netCtrl.sendMsg("wheel.reviveChara", {
              charaID,
            }, (data) => {
              mbgGame.log("wheel.reviveChara", data);
              if (data.code === "ok") {
                const name = mbgGame.player.getCharaName(charaID);
                mbgGame.managerUi.floatMessage(`${name}神奇地复活了`);
                emitter.emit('onChangeScheme');
              } else {
                mbgGame.errMsg(data.err);
              }
            });
          });
        return true;
      }
    }
    return false;
  },
  // 设置选择模式
  // null : 取消选择模式
  // "chara": 选择角色模式
  // "item": 选择道具模式
  setSelectMode(mode) {
    const com = this.getPanelSchemeCom();
    if (mode === "chara") {
      com.seatLight();
    } else if (mode === "item") {
      com.itemLight();
    } else {
      com.seatLightOff();
      com.itemLightOff();
    }
  },
  // 尝试用新的队伍列表替换当前的
  tryChangeCharaIDs(newCharaIDs) {
    for (let i = 0; i < 5; i++) {
      newCharaIDs[i] = newCharaIDs[i] || 0;
    }
    mbgGame.player.setScheme_Team(this.m_worldIdx, this.m_schemeIdx,
      newCharaIDs, this.getCmd(),
      (ok) => {
        if (ok) {
          this.m_CharaIDs = newCharaIDs;
        }
      });
    return true;
  },
  switchItem(myIdx, targetIdx) {
    mbgGame.player.setScheme_Switch(this.m_worldIdx, this.m_schemeIdx, myIdx, targetIdx, this.getCmd());
    return true;
  },
  switchChara(myIdx, targetIdx) {
    const tmpCharaIDs = _.clone(this.m_CharaIDs);
    const tmpCharaID = tmpCharaIDs[myIdx];
    tmpCharaIDs[myIdx] = tmpCharaIDs[targetIdx];
    tmpCharaIDs[targetIdx] = tmpCharaID;
    mbgGame.log("switchChara", this.m_CharaIDs, tmpCharaIDs);
    this.tryChangeCharaIDs(tmpCharaIDs);
  },
  // 把该名角色加到idx的位置
  addCharaToTeam(charaID, idx) {
    const tmpCharaIDs = _.clone(this.m_CharaIDs);
    if (tmpCharaIDs.indexOf(charaID) === -1) {
      tmpCharaIDs[idx] = charaID;
      return this.tryChangeCharaIDs(tmpCharaIDs);
    }
    return false;
  },
  // 把该名角色移出队伍
  delCharaFromTeam(charaID) {
    const tmpCharaIDs = _.clone(this.m_CharaIDs);
    const idx = tmpCharaIDs.indexOf(charaID);
    if (idx !== -1) {
      tmpCharaIDs[idx] = 0;
      return this.tryChangeCharaIDs(tmpCharaIDs);
    }
    return false;
  },
  // 指定特殊的布阵协议
  setCmd(cmd) {
    this.m_cmd = cmd;
  },
  getCmd() {
    return this.m_cmd;
  },
  /* ----------------------------------
    道具编辑相关
    ---------------------------------- */
  filterItemList() {
    if (!this.itemPanel.active) return;

    const sidList = mbgGame.player.getOwnedItemList_CanUse(this.m_worldIdx, this.m_schemeIdx, this.m_stageIdx);
    if (sidList.length > 0) {
      this.setShowNoItemsTips(false);
    }
    this.refreshBag(sidList);
    if (sidList.length === 0) {
      this.setShowNoItemsTips(true);
    }
  },
  getSidList() {
    return this.m_sidList;
  },
  refreshBag(sidList) {
    this.m_sidList = sidList;
    // mbgGame.log("refreshBag", sidList);
    // 一页显示20个
    mbgGame.performanceCheck("schemeEditorBag", 'refreshBag', true);
    const idList = _.chunk(sidList, 5);
    const mbgViewCom = this.itemPanel.getComponent('mbgView');

    if (!mbgViewCom._addDrag) {
      mbgViewCom._addDrag = function (item, sid) {
        const dragCom = item.addComponent('drag');
        dragCom.initMe({
          fn_getTargetPos: () => {
            return mbgGame.schemeTeamEditor.getPanelSchemeCom().getDragItemPos();
          },
          fn_createDragNode: () => {
            const node = mbgGame.managerUi.getIconItem();
            mbgGame.schemeTeamEditor.node.addChild(node);
            node.getComponent("itemPanel").initMe({
              sid,
              style: 'iconMe',
            });
            // sv就不能滚动了
            const com = mbgGame.schemeTeamEditor.itemPanel.getComponent('mbgView');
            if (com) com.enabled = false;
            mbgGame.schemeTeamEditor.getPanelSchemeCom().itemLight();
            return node;
          },
          fn_matchRange: (targetIdx) => {
            mbgGame.schemeTeamEditor.useItem(targetIdx, sid);
          },
          fn_dragEnd: () => {
            const com = mbgGame.schemeTeamEditor.itemPanel.getComponent('mbgView');
            if (com) com.enabled = true;
            mbgGame.schemeTeamEditor.getPanelSchemeCom().itemLightOff();
          },
          fn_onClick: () => {
            mbgGame.managerUi.openItemInfo({
              sid,
              style: 'wieldBag',
            });
          },
        });
      };
    }

    mbgGame.managerUi.initItemBagTableView(mbgViewCom, idList, {
      style: 'wieldBag',
    });
    // this.setDragNode(item, sid, true, false);
    mbgGame.performanceCheck("schemeEditorBag", 'upload');
  },
  openItemInfo(sid) {
    mbgGame.managerUi.openItemInfo({
      sid,
      style: 'wieldBag',
    });
  },
  refreshAllItemInfo() {
    this.onChangeScheme();
    this.filterItemList();
  },

  // 穿装备
  // pos 格子的编号  0 <= pos <= 4
  useItem(pos, sid) {
    sid = sid || this.m_CurSelectItemSID;
    this.onCloseSelectMode();
    mbgGame.log("useItem pos", pos, 'sid', sid);
    mbgGame.player.setScheme_Item(this.m_worldIdx, this.m_schemeIdx, sid, pos, 1, this.getCmd());
  },
  // 卸下装备
  unuseItem(sid) {
    this.onCloseSelectMode();
    const dScheme = this.getSchemeData();
    let pos = -1;
    _.mapKeys(dScheme.bag, (items, idx) => {
      if (items && items[0] === sid) {
        pos = idx;
      }
    });
    if (pos === -1) return;
    mbgGame.log("unuseItem", pos, sid);
    mbgGame.player.setScheme_Item(this.m_worldIdx, this.m_schemeIdx, sid, pos, 2, this.getCmd());
  },
  onUseItemBegin(sid) {
    // 进入选择模式，准备穿上道具
    this.setSelectMode("item");
    this.m_CurSelectItemSID = sid;
  },
  onCloseSelectMode() {
    this.setSelectMode(null);
    this.m_CurSelectItemSID = null;
    this.m_CurSelectCharaID = null;
  },
  // 点击位置
  dragClickPanelScheme(idx, isChara) {
    // mbgGame.log('dragClickPanelScheme:', event.getUserData());
    if (isChara) {
      // 角色
      if (!this.m_CurSelectCharaID) return;
      this.addCharaToTeam(this.m_CurSelectCharaID, idx);
      this.onCloseSelectMode();
    } else {
      // 道具
      if (!this.m_CurSelectItemSID) return;
      this.useItem(idx, this.m_CurSelectItemSID);
      mbgGame.playSound('UI_Equip');
    }
  },

  setShowNoItemsTips(b) {
    if (b) {
      if (!this.m_NoItemsTips) {
        const node = new cc.Node();
        const com = node.addComponent(cc.RichText);
        com.handleTouchEvent = false;
        this.itemPanel.addChild(node);
        com.fontSize = 24;
        com.string = mbgGame.getString('noitems');
        const w = node.addComponent(cc.Widget);
        w.top = 16;
        w.isAlignTop = true;
        this.m_NoItemsTips = node;
      }
    } else if (this.m_NoItemsTips) {
      this.m_NoItemsTips.destroy();
      delete this.m_NoItemsTips;
    }
  },

  // 增加技能
  clickBottingUp(event) {
    if (mbgGame.schemeTeamEditor.m_bottingCharaIDs.length <= 9) {
      mbgGame.schemeTeamEditor.m_Modified = true;
      mbgGame.schemeTeamEditor.m_bottingCharaIDs.push(event.target._charaID);
      mbgGame.schemeTeamEditor.refreshBottingSkill();
    }
  },
  // 取消技能
  clickBottingDown(event) {
    mbgGame.schemeTeamEditor.m_Modified = true;
    mbgGame.schemeTeamEditor.m_bottingCharaIDs.splice(event.target._idx, 1);
    mbgGame.schemeTeamEditor.refreshBottingSkill();
  },
  // bottingPanel
  refreshBottingPanel() {
    if (!this.bottingPanel.active) return;

    // mbgGame.log('schemeEditor onAddBaseWin', dData);
    this.m_Modified = false;
    const dScheme = this.getSchemeData();

    // mbgGame.log('charaIDs', charaIDs);
    this.charaFrame.removeAllChildren();
    for (let i = 0; i < this.m_CharaIDs.length; i++) {
      const charaID = this.m_CharaIDs[i];
      const node = mbgGame.managerUi.getIconCharacter();
      const com = node.getComponent('iconCharacter');
      com.initMe({
        charaID,
        lv: mbgGame.player.getCharaLv(charaID),
      });
      com.addButton(this, 'schemeTeamEditor', 'clickBottingUp');
      this.charaFrame.addChild(node);
      node._charaID = charaID;
    }
    this.m_bottingCharaIDs = _.clone(dScheme.botting || []);
    this.refreshBottingSkill();
  },

  refreshBottingSkill() {
    if (!this.bottingPanel.active) return;

    for (let i = 0; i < this.skillFrame.children.length; i++) {
      const charaID = this.m_bottingCharaIDs[i] || 0;
      const node = this.skillFrame.children[i];
      node.removeAllChildren();
      const iconNode = mbgGame.managerUi.getIconCharacter();
      iconNode.y = 10;
      node.addChild(iconNode);
      const nameNode = new cc.Node();
      const nameCom = nameNode.addComponent(cc.Label);
      nameCom.fontSize = 14;
      nameCom.HorizontalAlign = cc.Label.HorizontalAlign.CENTER;
      nameNode.y = -50;
      node.addChild(nameNode);

      const iconCom = iconNode.getComponent('iconCharacter');
      iconCom.initMe({
        charaID,
        lv: charaID ? mbgGame.player.getCharaLv(charaID) : 0,
      });
      iconNode._idx = i;
      iconCom.addButton(this, 'schemeTeamEditor', 'clickBottingDown');
      if (charaID) {
        const skillID = mbgGame.player.getActiveSkillID(charaID);
        // const skillName = mbgGame.getString(`skillname${skillID}`);
        const skillData = mbgGame.player.getSkillDataByID(charaID, skillID);
        mbgGame.player.getCharaDataByID(charaID);
        const CostEnergy = mbgGame.player.getSkillCostEnergy(charaID);
        nameCom.string = `等级 ${skillData.lv} (${CostEnergy})`;
      } else {
        nameCom.string = '';
      }
    }
  },

  checkSetBotting() {
    if (this.m_Modified) {
      mbgGame.player.setScheme_Skill(this.m_worldIdx, this.m_schemeIdx,
        this.m_bottingCharaIDs, this.getCmd());
    }
    delete this.m_Modified;
  },

});