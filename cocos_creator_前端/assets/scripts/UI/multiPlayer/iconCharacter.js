const labdefines = require('labdefines');

cc.Class({
  extends: cc.Component,

  addSprite(name, png, atlas, parent) {
    if (!this[`_node_${name}`]) {
      const node = new cc.Node();
      this[`_node_${name}`] = node;
      const sprite = node.addComponent(cc.Sprite);
      sprite.type = cc.Sprite.Type.SIMPLE;
      sprite.sizeMode = cc.Sprite.SizeMode.RAW;
      parent = parent || this.node;
      parent.addChild(node);
    }
    const sprite = this[`_node_${name}`].getComponent(cc.Sprite);
    if (atlas) {
      if (atlas === 'images') {
        mbgGame.resManager.setImageFrame(sprite, atlas, png);
      } else {
        mbgGame.resManager.setAutoAtlasFrame(sprite, atlas, png);
      }
    } else {
      mbgGame.resManager.setAutoAtlasFrame(sprite, 'labIcon', png);
    }
    return this[`_node_${name}`];
  },

  getSprite(name) {
    return this[`_node_${name}`];
  },

  initMe({
    charaID = 0,
    lv = 0,
  }) {
    this.m_CharaID = charaID;
    if (this.m_CharaID > 0 && this.m_CharaID <= 5) {
      this.addSprite('bg', 'frameCharaBg1');
    } else if (this.m_CharaID > 5 && this.m_CharaID <= 10) {
      this.addSprite('bg', 'frameCharaBg2');
    } else if (this.m_CharaID > 10 && this.m_CharaID <= 15) {
      this.addSprite('bg', 'frameCharaBg3');
    }
    if (this.m_CharaID) {
      if (this.m_CharaID <= 15) {
        // mask 挡白边
        const node = new cc.Node();
        node.addComponent(cc.Mask);
        node.setContentSize(106, 90);
        this.node.addChild(node);
        const headNode = this.addSprite('headIcon', `head_${this.m_CharaID}`, null, node);
        headNode.y = -1;
      } else {
        this.addSprite('headIcon', `head_${this.m_CharaID}`, 'images');
      }
    } else {
      this.addSprite('headIcon', 'frameCharaBg');
    }

    if (lv) {
      if (!this.labelLv) {
        const bgNode = new cc.Node();
        const sprite = bgNode.addComponent(cc.Sprite);
        sprite.type = cc.Sprite.Type.SIMPLE;
        sprite.sizeMode = cc.Sprite.SizeMode.RAW;
        mbgGame.resManager.setAutoAtlasFrame(sprite, 'uiBase', 'lvBg');
        this.node.addChild(bgNode, 99);
        bgNode.setPosition(-36, 44);
        bgNode.name = 'lvBg';

        const node = new cc.Node();
        this.labelLv = node.addComponent(cc.Label);
        this.labelLv.fontSize = 18;
        node.y = -9;
        this.labelLv.HorizontalAlign = cc.Label.HorizontalAlign.CENTER;
        bgNode.addChild(node);
      }
      const lvBg = this.node.getChildByName('lvBg');
      lvBg.active = true;
      this.lv = lv;
      this.labelLv.string = `${lv}`;
    } else {
      const lvBg = this.node.getChildByName('lvBg');
      if (lvBg) lvBg.active = false;
    }
  },
  getId() {
    return this.m_CharaID;
  },
  getLv() {
    return this.lv;
  },
  setLv(lv, str) {
    this.lv = lv;
    if (!this.labelLv) return;
    this.labelLv.string = `${lv}${str || ''}`;
  },
  hideLvBg() {
    const obj = this.node.getChildByName('lvBg');
    if (obj) {
      obj.active = false;
    }
  },
  setSelected(b) {
    let node = this.getSprite('select');
    if (!node) {
      node = this.addSprite('select', 'frameCharaBgSelect1');
    }
    node.active = b;
  },

  addCornorMark(img) {
    const node = this.addSprite('img', img);
    node.x = 42;
    node.y = 39;
    node.zIndex = 99;
    node.setScale(0.7);

    /*
    const w = node.addComponent(cc.Widget);
    w.right = 0;
    w.isAlignRight = true;
    w.bottom = 0;
    w.isAlignBottom = true;
    w.updateAlignment();
    */
  },

  setStatus(status) {
    const head = this.getSprite('headIcon');
    if (!head) return;
    if (status === 'unLock') {
      head.color = cc.Color.BLACK;
    } else if (status === 'inUse') {
      head.color = new cc.Color(100, 100, 100);
    } else {
      head.color = new cc.Color(255, 255, 255);
    }
  },
  // 用于结算界面的等级label
  showBottomLvLevel(lv) {
    this.lv = lv;
    const node = new cc.Node();
    this.labelLv = node.addComponent(cc.Label);
    this.labelLv.fontSize = 20;
    this.labelLv.HorizontalAlign = cc.Label.HorizontalAlign.CENTER;
    node.x = 0;
    node.y = -73;
    this.node.addChild(node);
    this.labelLv.string = `${lv}${mbgGame.getString('lv')}`;
  },
  showLevelUp() {
    const node = this.addSprite('itemWield', 'itemWield', 'itemsIcon');
    node.x = 38;
    node.y = -63;
  },
  showFacState() {
    const curFacID = mbgGame.player.getLabFacIDByChara(this.getId());
    let workNode = this.getSprite('labWork');
    if (!curFacID) {
      if (workNode) {
        workNode.active = false;
      }
      return;
    }
    if (!workNode) {
      workNode = this.addSprite('labWork', 'frameCharaWorkingBg');
      const node = new cc.Node();
      workNode.labelWorking = node.addComponent(cc.Label);
      workNode.labelWorking.fontSize = 18;
      workNode.labelWorking.HorizontalAlign = cc.Label.HorizontalAlign.CENTER;
      workNode.addChild(node);
      node.y = -38;
    }
    const curFacType = labdefines.FacID2Type[curFacID];
    // mbgGame.log('curFacType', labdefines.getImageByFacType(curFacType));
    workNode.active = true;
    workNode.labelWorking.string = mbgGame.getString(labdefines.getImageByFacType(curFacType));
  },

  addButton(node, com, fn, sData) {
    let btnCom = this.node.getComponent(cc.Button);
    if (!btnCom) {
      btnCom = this.node.addComponent(cc.Button);
      const clickEventHandler = new cc.Component.EventHandler();
      btnCom.clickEvents.push(clickEventHandler);
      btnCom.transition = cc.Button.Transition.SCALE;
      btnCom.zoomScale = 0.95;
    }
    const handler = btnCom.clickEvents[0];
    handler.target = node; // 这个 node 节点是你的事件处理代码组件所属的节点
    handler.component = com; // 这个是代码文件名
    handler.handler = fn;
    handler.customEventData = sData;
  },
  addInfoButton() {
    this.addButton(this, 'iconCharacter', 'showInfo');
  },
  showInfo() {
    mbgGame.managerUi.openWinCharaInfo(this.getId());
  },
  getOrCreateExpAniNode() {
    let node = this.node.getChildByName('expani');
    if (node) {
      return node;
    }
    node = new cc.Node();
    const label = node.addComponent(cc.Label);
    label.fontSize = 18;
    node.color = mbgGame.hex2color('21ff29');
    node.x = 25;
    node.y = -122;
    node.name = 'expani';
    this.node.addChild(node);
    return node;
  },
  addExpAni(exp) {
    const node = this.getOrCreateExpAniNode();
    const label = node.getComponent(cc.Label);
    label.string = `+0`;
    let iter = 0;
    const iterNum = 100;
    node.runAction(cc.repeat(cc.sequence(cc.delayTime(0.02), cc.callFunc(() => {
      iter += 1;
      const _exp = Math.round(iter * exp / iterNum);
      label.string = `+${_exp}`;
    }, this)), iterNum + 1));
  },
  stopExpAni(exp) {
    const node = this.getOrCreateExpAniNode();
    node.stopAllActions();
    const label = node.getComponent(cc.Label);
    label.string = `+${exp}`;
  },
  setExperience(percent) {
    const logoExpNode = this.addSprite('logo_exp', 'logo_exp', 'uiBase');
    logoExpNode.y = -112;
    logoExpNode.x = -23;
    let barNode = this.getSprite('expBar');
    if (!barNode) {
      barNode = this.addSprite('expBar', 'progressExperienceBg', 'uiIcon');
      const com = barNode.addComponent(cc.ProgressBar);
      com.mode = cc.ProgressBar.Mode.FILLED;
      barNode.y = -87;
      barNode.addComponent('effectProgressBar');
      const node = new cc.Node();
      const sprite = node.addComponent(cc.Sprite);
      mbgGame.resManager.setAutoAtlasFrame(sprite, 'uiIcon', 'progressExperienceBar');
      sprite.fillStart = 0;
      sprite.fillRange = 1;
      sprite.fillType = 0; // 用cc.Sprite.FillType.HORIZONTAL在native会报错，不知为啥
      sprite.type = cc.Sprite.Type.FILLED;
      sprite.sizeMode = cc.Sprite.SizeMode.RAW;
      com.barSprite = sprite;
      barNode.addChild(node);
    }
    barNode.getComponent(cc.ProgressBar).progress = percent;
    return barNode.getComponent('effectProgressBar');
  },
  setHpPercent(hpPercent) {
    let barNode = this.getSprite('hpBar');
    if (!barNode) {
      barNode = this.addSprite('hpBar', 'progressHeadHpBg', 'uiIcon');
      const com = barNode.addComponent(cc.ProgressBar);
      com.mode = cc.ProgressBar.Mode.FILLED;
      barNode.y = -48;
      const node = new cc.Node();
      const sprite = node.addComponent(cc.Sprite);
      mbgGame.resManager.setAutoAtlasFrame(sprite, 'uiIcon', 'progressHeadHp');
      sprite.fillStart = 0;
      sprite.fillRange = 1;
      sprite.fillType = 0; // 用cc.Sprite.FillType.HORIZONTAL在native会报错，不知为啥
      sprite.type = cc.Sprite.Type.FILLED;
      sprite.sizeMode = cc.Sprite.SizeMode.RAW;
      com.barSprite = sprite;
      barNode.addChild(node);
    }
    barNode.getComponent(cc.ProgressBar).progress = hpPercent * 0.01;
  },
  addBonusLabel() {
    const bonusLabelNode = new cc.Node();
    const bonusLabel = bonusLabelNode.addComponent(cc.Label);
    const outline = bonusLabelNode.addComponent(cc.LabelOutline);
    outline.color = new cc.Color(0.0, 0.0, 0.0, 1.0);
    outline.width = 2;
    this.node.addChild(bonusLabelNode);
    bonusLabelNode.y = -86;
    bonusLabelNode.x = 34;
    const ratio = mbgGame.config.constTable.ExpBonusRatio;
    bonusLabel.string = `x${ratio}`;
    bonusLabel.fontSize = 18;
    bonusLabelNode.color = new cc.Color(210, 210, 210);
  },
});