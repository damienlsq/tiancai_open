cc.Class({
  extends: cc.Component,

  properties: {
    schemesContent: cc.Node,

    btnCopyAndPaste: cc.Node,
    btnUse: cc.Node,
  },
  onLoad() {
    emitter.on(this, "onChangeScheme", this.refreshSchemes);
    emitter.on(this, "setPVPData", this.refreshSchemes);
    this.copyStr = mbgGame.getString('copy');
    this.pasteStr = mbgGame.getString('paste');

    this.schemeTemplate = cc.instantiate(this.schemesContent.children[0]);
    this.schemesContent.removeAllChildren();
  },
  onDestroy() {
    emitter.off(this, "onChangeScheme");
    emitter.off(this, "setPVPData");
  },

  initUI() {
    const maxCount = mbgGame.player.getSchemeMax();
    // mbgGame.log('maxCount', maxCount);
    if (this._maxSchemeCount && this._maxSchemeCount !== maxCount) {
      // 最大数量不一样了，就重新搞一下这个界面
      // 加一个
      const schemeNode = cc.instantiate(this.schemeTemplate);
      this.schemesContent.addChild(schemeNode);
      this.initSchemeData(schemeNode, maxCount - 1);
      cc.find('selected', schemeNode).active = false;
      if (maxCount === mbgGame.config.constTable.SchemeNum[1]) {
        // 删除unlock
        const node = _.find(this.schemesContent.children, { m_idx: -1 });
        if (node) {
          node.destroy();
        }
      }
    }
    this._maxSchemeCount = maxCount;

    if (this._isInited) return;
    for (let i = 0; i < this._maxSchemeCount; i++) {
      const schemeNode = cc.instantiate(this.schemeTemplate);
      this.schemesContent.addChild(schemeNode);
      this.initSchemeData(schemeNode, i);
      cc.find('selected', schemeNode).active = false;
    }

    const com = this.getEditorCom();
    if (com.m_isDefense) {
      this.btnUse.getComponent('itemBtn').setBtnLabel(mbgGame.getString('schemeDef'));
    } else {
      this.btnUse.getComponent('itemBtn').setBtnLabel(mbgGame.getString('schemeUse'));
    }
    this.btnCopyAndPaste.getComponent('itemBtn').setBtnLabel(this.copyStr);

    this.addSchemeUnlock();
    this._isInited = true;
  },

  initSchemeData(schemeNode, idx) {
    schemeNode.m_idx = idx;
    cc.find('frame/title', schemeNode).getComponent(cc.RichText).string
      = `${mbgGame.player.getSchemeName(0)} <img src="schemeNameEdit" />`;
    const node = cc.find('frame/title', schemeNode);
    node.m_idx = idx;
  },

  addSchemeUnlock() {
    if (mbgGame.player.getSchemeMax() >= mbgGame.config.constTable.SchemeNum[1]) {
      return;
    }
    const schemeNode = cc.instantiate(this.schemeTemplate);
    this.schemesContent.addChild(schemeNode);
    cc.find('frame/title', schemeNode).getComponent(cc.RichText).string
      = mbgGame.getString('schemeUnlock');
    const content = cc.find('frame/content', schemeNode);
    content.removeAllChildren();
    content.removeComponent(cc.Layout);
    schemeNode.m_idx = -1;
    schemeNode.zIndex = 99;

    const node = new cc.Node();
    const sprite = node.addComponent(cc.Sprite);
    sprite.type = cc.Sprite.Type.SIMPLE;
    sprite.sizeMode = cc.Sprite.SizeMode.RAW;
    sprite.trim = false;
    mbgGame.resManager.setAutoAtlasFrame(sprite, 'uiBase', 'schemeLock');
    cc.find('selected', schemeNode).active = false;
    content.addChild(node);
    node.y = 20;
  },

  addTag(name, tagsContent) {
    const node = new cc.Node();
    const sprite = node.addComponent(cc.Sprite);
    sprite.type = cc.Sprite.Type.SIMPLE;
    sprite.sizeMode = cc.Sprite.SizeMode.RAW;
    sprite.trim = false;
    mbgGame.resManager.setAutoAtlasFrame(sprite, 'uiBase', name);
    tagsContent.addChild(node);
    return node;
  },

  refreshScheme(schemeNode, worldIdx, schemeIdx) {
    if (schemeNode.m_idx === -1) return;
    cc.find('frame/title', schemeNode).getComponent(cc.RichText).string
      = `${mbgGame.player.getSchemeName(schemeIdx)} <img src="schemeNameEdit" />`;

    if (!this.m_selectNode) {
      if (this.m_nowSchemeIdx === schemeIdx) {
        this.m_selectNode = schemeNode;
        cc.find('selected', schemeNode).active = true;
      }
    }

    const content = cc.find('frame/content', schemeNode);

    const schemeData = mbgGame.player.getSchemeData(worldIdx, schemeIdx);
    const charaIDs = (schemeData && schemeData.charaIDs) || [];
    // mbgGame.log('refreshScheme schemeData:', schemeData, charaIDs, worldIdx, schemeIdx);
    content.removeAllChildren();
    for (let i = 0; i < 5; i++) {
      const icon = mbgGame.managerUi.getIconCharacter();
      content.addChild(icon);
      const charaID = charaIDs[charaIDs.length - 1 - i];
      const iconCom = icon.getComponent("iconCharacter");
      iconCom.initMe({
        charaID,
        lv: mbgGame.player.getCharaLv(charaID),
      });
    }
    // 处理tags
    const tags = cc.find('frame/bar/tags', schemeNode);
    tags.removeAllChildren();
    if (mbgGame.player.getPVPDefSchemeIdx() === schemeIdx) {
      this.addTag('schemeDef', tags);
    }
  },
  refreshSchemes(worldIdx, nowSchemeIdx) {
    this.initUI();
    if (worldIdx != null) {
      this.m_worldIdx = worldIdx;
    }
    if (nowSchemeIdx != null) {
      this.m_nowSchemeIdx = nowSchemeIdx;
    }
    for (let i = 0; i < this.schemesContent.children.length; i++) {
      const schemeNode = this.schemesContent.children[i];
      this.refreshScheme(schemeNode, this.m_worldIdx, i);
    }
  },

  // 解锁提示
  onUnlock() {
    mbgGame.managerUi.createConfirmDialog(
      mbgGame.getString('schemeUnlockAsk', {
        price: mbgGame.config.constTable.SchemeNum[2],
      }),
      () => {
        mbgGame.player.addSchemeMax();
      });
  },

  onChangeScheme(event) {
    if (event.target.m_idx === -1) {
      this.onUnlock();
      return;
    }
    if (this.m_selectNode) {
      cc.find('selected', this.m_selectNode).active = false;
    }
    this.m_selectNode = event.target;
    cc.find('selected', this.m_selectNode).active = true;
    if (this._copyIdx != null && this._copyIdx === this.m_selectNode.m_idx) {
      delete this._copyIdx;
      this.btnCopyAndPaste.getComponent('itemBtn').setBtnLabel(this.copyStr);
    }
  },
  // 修改方案名字, 方案0为防御方案，不能修改
  changeSchemeName(event) {
    // mbgGame.log('changeSchemeName', event.target.m_idx);
    const schemeIdx = event.target.m_idx;
    const self = this;
    mbgGame.managerUi.createLineEditor({
      info: mbgGame.getString('schemeNameHint'),
      hint: mbgGame.getString("editHint"),
      limit: 8,
    }, (str) => {
      if (self.editBox_lock) return;
      self.editBox_lock = true;

      mbgGame.netCtrl.sendMsg("war.setSchemeName", {
        name: str,
        schemeIdx,
      }, (data) => {
        // mbgGame.log('[changeSchemeName]', data);
        if (data.code === 'ok') {
          delete self.editBox_lock;
        } else {
          mbgGame.managerUi.floatMessage(data.err);
        }
      });
    });
  },

  getEditorCom() {
    return this.node.getComponent('schemeTeamEditor');
  },

  onUse() {
    const com = this.getEditorCom();
    if (com.m_isDefense) {
      this.onDef();
      return;
    }
    if (!this.m_selectNode) {
      com.closeManagerUI();
      return;
    }
    emitter.emit('onChangeScheme', this.m_selectNode.m_idx);
    com.closeManagerUI();
    mbgGame.nowSchemeIdx = this.m_selectNode.m_idx;
  },
  /*
    onDefault() {
      const com = this.getEditorCom();
      if (!this.m_selectNode) {
        com.closeManagerUI();
        return;
      }
      mbgGame.player.setDefaultSchemeIdx(this.m_worldIdx, '', this.m_selectNode.m_idx);
      this.refreshSchemes();
    },
  */
  onDef() {
    const com = this.getEditorCom();
    if (!this.m_selectNode) {
      com.closeManagerUI();
      return;
    }
    mbgGame.netCtrl.sendMsg("arena.setDefScheme", {
      s: this.m_selectNode.m_idx,
    }, (data) => {
      mbgGame.log("arena.setDefScheme", data);
      if (data.code === 'err') {
        mbgGame.errMsg(data.err);
      } else {
        mbgGame.player.setPVPDefSchemeIdx(this.m_selectNode.m_idx);
        emitter.emit('onChangeScheme', this.m_selectNode.m_idx);
        com.closeManagerUI();
      }
    });
  },

  onCopyAndPaste() {
    if (!this.m_selectNode) {
      return;
    }
    if (this._copyIdx != null && this._copyIdx === this.m_selectNode.m_idx) {
      delete this._copyIdx;
      this.btnCopyAndPaste.getComponent('itemBtn').setBtnLabel(this.copyStr);
      return;
    }
    if (this._copyIdx != null) {
      // 粘贴模式
      mbgGame.managerUi.createConfirmDialog(
        mbgGame.getString('copySchemeAsk', {
          name: mbgGame.player.getSchemeName(this._copyIdx),
          target: mbgGame.player.getSchemeName(this.m_selectNode.m_idx),
        }),
        () => {
          const dScheme = mbgGame.player.getPVPSchemeData(this._copyIdx);
          if (dScheme) {
            mbgGame.player.copyScheme(this.m_worldIdx, this._copyIdx, this.m_selectNode.m_idx);
          }
          delete this._copyIdx;
        });
    } else {
      this._copyIdx = this.m_selectNode.m_idx;
      this.btnCopyAndPaste.getComponent('itemBtn').setBtnLabel(this.pasteStr);
      mbgGame.managerUi.floatMessage(mbgGame.getString('copyScheme', { name: mbgGame.player.getSchemeName(this._copyIdx) }));
    }
  },

  doHideManager() {
    const com = this.getEditorCom();
    com.closeManagerUI();
    delete this._copyIdx;
    this.btnCopyAndPaste.getComponent('itemBtn').setBtnLabel(this.copyStr);
  },
});
