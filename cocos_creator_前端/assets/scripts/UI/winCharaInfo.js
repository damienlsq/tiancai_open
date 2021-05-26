const warDefines = require('warDefines');

const arrList = [
  "MaxHp", "BeAtkW", "Atk", "Def", "Cri",
  "CriDam", "Hit", "Dodge", "Heal", "Sk",
  "DA", "DM",
];

cc.Class({
  extends: cc.Component,

  properties: {
    iconNode: cc.Node,
    labelName: cc.Label,
    labelLv: cc.Label,
    labelDec: cc.RichText,

    frameBase: cc.Node,
    attrTemplate: cc.Node,
    frameExtra: cc.Node,
    tabsNode: cc.Node,

    btnChoose: cc.Node,
    skillInfoTemplate: cc.Node,
    skillContent: cc.Node,
    equipNode: cc.Node,

    btnSkillDetail: cc.Node,
    skillDetail: cc.Node,
  },

  onLoad() {
    mbgGame.winCharaInfo = this;
    emitter.on(this, "updateCharaData", this.refreshData);
    this.skillDetail.active = false;
    const icon = mbgGame.managerUi.getIconCharacter();
    this.iconNode.addChild(icon);
    this.charaIconCom = icon.getComponent('iconCharacter');
  },
  onDestroy() {
    delete mbgGame.winCharaInfo;
    emitter.off(this, "updateCharaData");
  },
  // 查看玩家自己的角色
  // dData可选，如果不提供，则用玩家自己的角色的数据
  onAddBaseWin(charaID, {
    charaData = null,
    teamEditCom = null,
    canChange = false,
    isMe = false,
    goSkill = false,
  } = {}) {
    this.m_TargetID = charaID;
    this.node._winBase.setTitle(mbgGame.getString('title_chara'));

    if (teamEditCom && canChange) {
      this.setChooseBtn(teamEditCom);
    }
    if (charaData) {
      // 怪物，或对方模式
      this.m_Data = charaData;
      this._isMe = isMe;
    } else {
      // 自己模式
      this.m_Data = mbgGame.player.getCharaDataByID(charaID);
      this._isMe = true;
    }
    if (goSkill) {
      // 直接显示skill tab
      this.tabsNode.getComponent('itemTab').setTabOn(1);
    } else {
      this.tabsNode.getComponent('itemTab').setTabOn(0);
    }
  },
  clickBtnBase() {
    this.frameBase.active = true;
    this.frameExtra.active = false;
    this.skillDetail.active = false;
    this.refreshData();
  },
  clickBtnExtra() {
    this.frameBase.active = false;
    this.frameExtra.active = true;
    this.refreshData();
  },
  refreshData(charaID) {
    if (this.m_TargetID && charaID && this.m_TargetID !== charaID) {
      return;
    }
    if (charaID) {
      this.m_TargetID = charaID;
    }
    if (!this.m_TargetID && !this.m_Data) {
      return;
    }
    // mbgGame.log('refreshData', this.m_TargetID, this.m_Data);
    if (this._teamEditCom) {
      this.m_Data = mbgGame.player.getCharaInfo(this.m_TargetID, this._teamEditCom.getSchemeData());
    } else if (this._isMe) {
      this.m_Data = mbgGame.player.getCharaDataByID(this.m_TargetID);
    }
    // mbgGame.log('refreshData', this.m_TargetID, this.m_Data);
    const dData = this.m_Data;
    if (!dData) return;

    if (dData.itemData) {
      this.equipNode.active = true;
      if (!this.m_itemPanelCom) {
        const itemPanel = mbgGame.managerUi.getIconItem();
        this.equipNode.addChild(itemPanel);
        this.m_itemPanelCom = itemPanel.getComponent('itemPanel');
      }
      this.labelDec.maxWidth = 282;
      this.m_itemPanelCom.initMe({
        itemData: dData.itemData,
        style: 'award',
      });
    } else {
      this.equipNode.active = false;
      this.labelDec.maxWidth = 402;
    }

    this.labelDec.string = '';
    if (this.m_TargetID <= 15) {
      const charaname = mbgGame.player.getCharaName(this.m_TargetID);
      this.labelName.string = `${charaname}`;
      this.labelDec.string = mbgGame.getString(`charadesc${this.m_TargetID}`);
      this.charaIconCom.initMe({
        charaID: this.m_TargetID,
      });
    } else {
      this.labelName.string = `${dData.name || ''}`;
      this.charaIconCom.initMe({
        charaID: warDefines.getHeadIconByMID(this.m_TargetID),
      });
      if (dData.desc) {
        this.labelDec.string = dData.desc;
      }
    }
    this.labelLv.string = `${dData.lv}${mbgGame.getString("lv")}`;
    this.refreshBase();
    this.refreshSkill();
  },
  refreshBase() {
    const dData = this.m_Data;

    if (!dData) return;
    if (!this.frameBase.active) return;

    if (!this.frameBase._isInited) {
      for (let i = 0; i < arrList.length; i++) {
        let attrNode = this.attrTemplate;
        if (i > 0) {
          attrNode = cc.instantiate(this.attrTemplate);
          this.frameBase.addChild(attrNode);
        }
        attrNode._attrName = arrList[i];
        attrNode.name = arrList[i];
      }
      this.frameBase._isInited = true;
    }

    for (let i = 0; i < this.frameBase.children.length; i++) {
      const attrNode = this.frameBase.children[i];
      const sAttr = attrNode._attrName;
      const attrID = warDefines.Attr2ID[sAttr];

      attrNode.getComponent('itemAttribute').initForChara(sAttr, dData.base ? dData.base[attrID] : dData[attrID], dData[attrID]);
    }
  },
  refreshSkill() {
    const dData = this.m_Data;

    if (!dData) return;
    if (!this.frameExtra.active) return;

    if (this.m_TargetID >= 1 && this.m_TargetID <= 15) {
      this.btnSkillDetail.active = true;
    } else {
      this.btnSkillDetail.active = false;
    }
    const skills = dData.skill || dData.skills;
    if (skills) {
      const skillIDS = _.keys(skills);
      if (!this.skillContent._isInited) {
        for (let i = 0; i < skillIDS.length; i++) {
          let node = this.skillInfoTemplate;
          if (i > 0) {
            node = cc.instantiate(this.skillInfoTemplate);
            this.skillContent.addChild(node);
          }
          node._skillID = `${skillIDS[i]}`;
        }
        this.skillContent._isInited = true;
      }
      for (let i = 0; i < this.skillContent.children.length; i++) {
        const node = this.skillContent.children[i];
        if (!node._skillID) continue;
        node.getComponent('skillInfo').reset();
        const com = node.getComponent('skillInfo');
        com.initMe(this.m_TargetID, +node._skillID, skills[node._skillID], this._isMe);
        com.idx = i;
        com.m_Ctrl = this;
      }
    }
  },
  onSkillDetail() {
    const charaID = this.m_TargetID;
    if (charaID >= 1 && charaID <= 15) {
      if (this.skillDetail.active) {
        this.skillDetail.active = false;
        return;
      }
      for (let i = 0; i < 2; i++) {
        const skillID = Number(`${100 + charaID}${i + 1}`);
        const titles = ['一星', '二星', '三星', '四星', '五星'];
        const skillRankStr = mbgGame.getString(`skillrank${skillID}`);
        const skillRankStrs = skillRankStr.split(";");
        const dSkillData = this.m_Data.skill[skillID];

        for (let s = 1; s <= 5; s++) {
          const node = this.skillDetail.getChildByName(`starInfo${i + 1}`).children[s - 1];

          const richText = node.getComponent(cc.RichText);
          const desc = mbgGame.getColorStr(skillRankStrs[s - 1], s <= (dSkillData.s || 0) ? '#ffffff' : '#aaaaaa');
          const title = mbgGame.getColorStr(`${titles[s - 1]}:`, '#FFCC00');
          richText.string = `${title}  ${desc}`;
        }
      }
      this.skillDetail.active = true;
    } else {
      this.skillDetail.active = false;
    }
  },
  setChooseBtn(teamEditCom) {
    this._teamEditCom = teamEditCom;
    const btnKey = this._teamEditCom.isCharaSelected(this.m_TargetID) ? 'offBattle' : 'goBattle';
    this.btnChoose.getComponent('itemBtn').setBtnLabel(mbgGame.getString(btnKey));
  },
  onChoose() {
    if (this._teamEditCom) {
      this._teamEditCom.onChooseCB(this.m_TargetID);
    }
    if (this.node && this.node.isValid && this.node._winBase) {
      this.node._winBase.closeMe();
    }
  },
});