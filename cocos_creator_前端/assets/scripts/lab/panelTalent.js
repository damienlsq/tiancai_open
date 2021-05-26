const warDefines = require('warDefines');
const facWinBase = require('facWinBase');

cc.Class({
  extends: facWinBase,

  properties: {
    headContent: cc.Node,
    talentContent: cc.Node,
    itemTalent: cc.Node,
    mainBtn: cc.Node,
    title: cc.RichText,
    desc1: cc.RichText,
    desc2: cc.RichText,
    desc3: cc.RichText,
    spinePos: cc.Node,
    floorCharaPos: cc.Node,
    linkNodePre: cc.Node,
    sv: cc.ScrollView,
  },
  onLoad() {
    mbgGame.panelTalent = this;
    this.node._winTooltips = mbgGame.getString('tooltips_talentDesc');
  },
  onDestroy() {
    delete mbgGame.panelTalent;
    delete this.m_talents;
  },
  closeMe() {
    this.floorCharaPos.destroy();
  },
  getOrCreateItemTalent(ttLv, sttIdx) {
    this.m_talents = this.m_talents || {};
    const key = `${ttLv}_${sttIdx || ''}`;
    if (this.m_talents[key]) {
      return this.m_talents[key];
    }
    const node = cc.instantiate(this.itemTalent);
    this.talentContent.addChild(node);
    node.name = "itemTalent";
    this.m_talents[key] = node.getComponent("itemTalent");
    return this.m_talents[key];
  },
  getItemTalent(ttLv, sttIdx) {
    const key = `${ttLv}_${sttIdx || ''}`;
    if (this.m_talents && this.m_talents[key]) {
      return this.m_talents[key];
    }
    return null;
  },
  hideItemTalent(ttLv, sttIdx) {
    const com = this.getItemTalent(ttLv, sttIdx);
    if (com) com.node.active = false;
  },
  refreshPosAndLink() {
    let parentNode = null;
    const linkWidth = 14;
    for (let ttLv = 1; ttLv <= 100; ttLv++) {
      const com = this.getItemTalent(ttLv);
      if (!com) {
        break;
      }
      if (com.node.active) {
        if (parentNode) {
          const linkNode = this.showLink(ttLv);
          linkNode.x = (parentNode.x + com.node.x) / 2;
          linkNode.y = (parentNode.y + com.node.y) / 2;
          // mbgGame.log(ttLv, "link", parentNode.x, node.x, linkNode.x, linkNode.y);
          if (parentNode.x === com.node.x) {
            linkNode.setContentSize(linkWidth, Math.abs(parentNode.y - com.node.y));
          } else {
            linkNode.setContentSize(Math.abs(parentNode.x - com.node.x), linkWidth);
          }
        }
        const subcom = this.getItemTalent(ttLv, 1);
        if (subcom && subcom.node.active) {
          const linkNode = this.showLink(ttLv, 1);
          linkNode.x = (com.node.x + subcom.node.x) / 2;
          linkNode.y = (com.node.y + subcom.node.y) / 2;
          if (com.node.x === subcom.node.x) {
            linkNode.setContentSize(linkWidth, Math.abs(com.node.y - subcom.node.y));
          } else {
            linkNode.setContentSize(Math.abs(com.node.x - subcom.node.x), linkWidth);
          }
        } else {
          this.hideLink(ttLv, 1);
        }
      } else {
        this.hideLink(ttLv);
        this.hideLink(ttLv, 1);
      }
      parentNode = com.node;
    }
  },
  showLink(ttLv, sttIdx) {
    if (!this.m_LinkNodes) {
      this.m_LinkNodes = {};
    }
    const key = `${ttLv}_${sttIdx || ''}`;
    if (this.m_LinkNodes[key]) {
      const node = this.m_LinkNodes[key];
      node.active = true;
      return node;
    }
    const node = cc.instantiate(this.linkNodePre);
    this.talentContent.addChild(node, -1);
    this.m_LinkNodes[key] = node;
    return node;
  },
  hideLink(ttLv, sttIdx) {
    const key = `${ttLv}_${sttIdx || ''}`;
    if (this.m_LinkNodes && this.m_LinkNodes[key]) {
      this.m_LinkNodes[key].active = false;
    }
  },
  onAddBaseWin() {
    this.node._winBase.setTitle(mbgGame.getString('title_labtalent'));
    this.refreshCharaHeads(true);

    const node = this.getOrCreateIconChara(0);
    const iconCom = node.getComponent('iconCharacter');
    this.changeChara(iconCom);
    const com = this.refreshTalents();
    this.onSelectTalent(com);
    this.refreshMainBtn();
  },
  onSelectChara(event) {
    const charaCom = event.target.getComponent('iconCharacter');
    this.floorCharaPos.active = true;
    if (this.changeChara(charaCom)) {
      const com = this.refreshTalents();
      this.onSelectTalent(com);
    }
  },
  curTalentTuple(charaID) {
    const lst = mbgGame.player.getCharaDataByID(charaID).ta;
    const v = lst && lst[0];
    let ttLv;
    let n;
    if (v) {
      ttLv = Math.floor(v / 10);
      n = v % 10;
    } else {
      n = -1;
      ttLv = 1;
    }
    return [ttLv, n];
  },
  nextTalentTuple(charaID) {
    const [ttLv, n] = this.curTalentTuple(charaID);
    let ttLvNext = ttLv;
    let nNext = n + 1;
    const dCurConfig = this.getConfig(charaID, ttLv);
    if (nNext === dCurConfig.attrAdd.length) {
      nNext = 0;
      ttLvNext += 1;
    }
    return [ttLvNext, nNext];
  },
  subTalentN(charaID, ttLv, sttIdx) {
    const lst = mbgGame.player.getCharaDataByID(charaID).ta;
    for (let i = 1; lst && i < lst.length; i++) {
      const v = lst[i];
      const _ttLv = Math.floor(v / 100);
      const _sttIdx = Math.floor((v % 100) / 10); // 右数第二位
      if (_ttLv === ttLv && _sttIdx === sttIdx) {
        const n = v % 10;
        return n;
      }
    }
    return -1;
  },
  refreshTalents() {
    const charaID = this.m_curIconCom.getId();
    const [ttLv, n] = this.curTalentTuple(charaID);
    const [ttLvNext, nNext] = this.nextTalentTuple(charaID);
    let aStar = 0; // 用来算星级
    let bStar = 0;
    let curTalentCom = null;
    for (let lv = 1; lv <= 100; lv++) {
      const key = `${charaID}${mbgGame.pad(lv, 3)}0`;
      const dConfig = mbgGame.config.talent[key];
      if (!dConfig) {
        break;
      }
      if (n === -1 && lv > ttLv) { // 还没升过天赋 只显示一个
        this.hideItemTalent(lv);
        this.hideItemTalent(lv, 1);
        continue;
      }
      if (n !== -1 && lv > ttLvNext) {
        this.hideItemTalent(lv);
        this.hideItemTalent(lv, 1);
        continue;
      }
      const com = this.getOrCreateItemTalent(lv);
      if (!com) {
        mbgGame.log("getOrCreateItemTalent no com", lv);
        break;
      }
      com.node.active = true;
      this.setNodePos(com.node, dConfig.pos);
      const attr = dConfig.attr;
      com.setCtrl(this);
      com.setLv(lv);
      let star;
      if (attr === 'a') {
        aStar += 1;
        star = aStar;
        com.setBg("itemBg3");
      } else if (attr === 'b') {
        bStar += 1;
        star = bStar;
        com.setBg("itemBg3");
      } else {
        com.setBg("itemBg2");
      }
      this.refreshOneTalent(com, attr, star);
      let showSubNodes = false;
      let _n;
      const maxN = dConfig.attrAdd ? dConfig.attrAdd.length - 1 : 0;
      if (lv < ttLv) {
        _n = maxN;
        showSubNodes = true;
      } else if (lv === ttLv) {
        _n = n;
        if (n === dConfig.attrAdd.length - 1) {
          showSubNodes = true;
        }
      } else if (lv > ttLv) {
        _n = -1;
      }
      curTalentCom = com;
      com.setN(_n, maxN);
      const subkey = `${charaID}${mbgGame.pad(lv, 3)}1`;
      const dSubConfig = mbgGame.config.talent[subkey];
      if (showSubNodes && dSubConfig) {
        const _maxN = dSubConfig.attrAdd ? dSubConfig.attrAdd.length - 1 : 0;
        const subcom = this.getOrCreateItemTalent(lv, 1);
        subcom.node.active = true;
        this.setNodePos(subcom.node, dSubConfig.pos);
        subcom.setCtrl(this);
        subcom.setBg("itemBg3");
        subcom.setLv(lv);
        subcom.setSubIdx(1);
        subcom.setN(this.subTalentN(charaID, lv, 1), _maxN);
        const subattr = dSubConfig.attr;
        this.refreshOneTalent(subcom, subattr);
      } else {
        this.hideItemTalent(lv, 1);
      }
    }
    this.refreshPosAndLink();
    return curTalentCom;
  },
  setNodePos(node, pos) {
    const width = 150;
    const height = 150;
    node.x = (width * pos[0]) - width;
    node.y = -height * pos[1];
  },
  refreshOneTalent(com, attr, star) {
    if (warDefines.iconName[attr]) {
      com.setIcon(warDefines.iconName[attr], 1.2);
    } else if (attr === 'a') {
      com.setIcon('skillicon_sword', 0.9);
      com.setStar(star);
    } else if (attr === 'b') {
      com.setIcon('skillicon_shield', 0.9);
      com.setStar(star);
    }
  },
  onSelectTalent(com) {
    if (!com) {
      return;
    }
    if (this.m_curTalentCom) {
      this.m_curTalentCom.setSelected(false);
    }
    this.m_curTalentCom = com;
    this.refreshMainBtn();
    com.setSelected(true);
    this.refreshTopInfo();
  },
  refreshTopInfo() {
    const charaID = this.m_curIconCom.getId();
    const n = this.m_curTalentCom.N(); // 当前 0 - 4
    const nNext = n + 1;
    const ttLvNext = this.nextTalentTuple(charaID)[0];
    const dNextConfig = this.getConfig(charaID, ttLvNext);
    const dConfig = this.getSelectedTalentConfig();
    this.title.string = '强化';
    const greyColor = 'dddddd';
    let s = `<color=#${greyColor}>等级: ${n + 1} / ${dConfig.mat.length} </color>`;
    this.desc1.string = s;
    if (warDefines.Attr2ID[dConfig.attr]) {
      const sAttr = mbgGame.getString(dConfig.attr);
      let v = 0;
      for (let i = 0; i <= n; i++) {
        v += dConfig.attrAdd[i];
      }
      s = `<color=#${greyColor}>效果: </color><color=#ffc64c>${sAttr} +${v}${warDefines.Attr2Mark[dConfig.attr]}</color> `;
      this.title.string += sAttr;
    } else if (dConfig.attr === 'a' || dConfig.attr === 'b') {
      const skillID = dConfig.attr === 'a' ? mbgGame.player.getActiveSkillID(charaID) :
        mbgGame.player.getPassiveSkillID(charaID);
      const name = mbgGame.getString(`skillname${skillID}`);
      const infos = mbgGame.getString(`skillrank${skillID}`).split(";");
      const star = this.m_curTalentCom.star();
      mbgGame.log("star", star);
      const nextDesc = infos[star - 1];
      s = `<color=#${greyColor}>效果: </color><color=#ffc64c>${nextDesc}</color>`;
      this.title.string += name;
    }
    this.desc2.string = s;
    const ttLv = this.curTalentTuple(charaID)[0];
    if (this.m_curTalentCom.m_lv === ttLv + 1) {
      if (dNextConfig.clv > mbgGame.player.getCharaLv(charaID)) {
        this.title.string += ` (${dNextConfig.clv}级解锁)`;
      }
    }
    if (dConfig.mat[nNext]) {
      const price = mbgGame.getString('unitPrice', {
        price: dConfig.mat[nNext],
        unit: 'logo_mat',
      });
      s = `<color=#${greyColor}>消耗: ${price}</color>`;
      this.desc3.string = s;
    } else {
      this.desc3.string = '';
    }
  },
  getSelectedTalentConfig() {
    const charaID = this.m_curIconCom.getId();
    const dConfig = this.getConfig(charaID, this.m_curTalentCom.m_lv, this.m_curTalentCom.m_sttIdx);
    return dConfig;
  },
  getConfig(charaID, ttLv, sttIdx) {
    const key = `${charaID}${mbgGame.pad(ttLv, 3)}${sttIdx || 0}`;
    const dConfig = mbgGame.config.talent[key];
    if (!dConfig) {
      cc.warn("no talent", key);
    }
    return dConfig;
  },
  refreshMainBtn() {
    const charaID = this.m_curIconCom.getId();
    const ttLv = this.m_curTalentCom.m_lv;
    const sttIdx = this.m_curTalentCom.m_sttIdx;
    const n = this.m_curTalentCom.N();
    const ttLvCur = this.curTalentTuple(charaID)[0];
    const ttLvNext = this.nextTalentTuple(charaID)[0];
    if (sttIdx != null) {
      const subkey = `${charaID}${mbgGame.pad(ttLv, 3)}${sttIdx}`;
      const dSubConfig = mbgGame.config.talent[subkey];
      const nNext = n + 1;
      this.mainBtn.getComponent('itemBtn').setStatus(dSubConfig.mat[nNext] && ttLv < ttLvNext);
    } else {
      this.mainBtn.getComponent('itemBtn').setStatus(ttLv === ttLvNext);
    }
  },
  // 播放建设施动画
  playUpgradeAni() {
    let node = this.spinePos.getChildByName("shock");
    if (!node) {
      const obj = new cc.Node();
      obj.addComponent("sp.Skeleton");
      obj.name = "shock";
      obj.addComponent("spineObject");
      this.spinePos.addChild(obj);
      node = obj;
    }
    const charaPos = this.floorCharaPos;
    node.active = true;
    charaPos.active = false;
    const com = node.getComponent("spineObject");
    com.onSpineLoad = function() {
      com.doAction("shock");
    };
    com.loadSpine("shock");
    com.setComplteCB(() => {
      node.active = false;
      charaPos.active = true;
    });
  },
  onUpgrade() {
    if (mbgGame.getLock('net', 'uptalent')) {
      return;
    }
    mbgGame.setLock('net', 'uptalent');
    const charaID = this.m_curIconCom.getId();
    const dConfig = this.getSelectedTalentConfig();

    let dOldSkillData;
    let skillID;
    let oldAttrVal;
    if (dConfig.attr === 'a' || dConfig.attr === 'b') {
      skillID = dConfig.attr === 'a' ? mbgGame.player.getActiveSkillID(charaID) :
        mbgGame.player.getPassiveSkillID(charaID);
      dOldSkillData = _.clone(mbgGame.player.getSkillDataByID(charaID, skillID));
    } else {
      oldAttrVal = mbgGame.player.getCharaDataByID(charaID)[dConfig.attr];
    }
    const ttLvNextOld = this.nextTalentTuple(charaID)[0];
    mbgGame.log("[talent] upgrade", this.m_curTalentCom.m_lv, this.m_curTalentCom.m_sttIdx, dConfig.attr);
    mbgGame.netCtrl.sendMsg("player.uptalent", {
      charaID,
      ttLv: this.m_curTalentCom.m_lv,
      sttIdx: this.m_curTalentCom.m_sttIdx,
    }, (data) => {
      this.scheduleOnce(() => {
        mbgGame.clearLock('net', 'uptalent');
      }, 0.2);
      if (data.code === 'ok') {
        if (dOldSkillData) {
          const dNewSkillData = _.clone(mbgGame.player.getSkillDataByID(charaID, skillID));
          mbgGame.managerUi.createWinAttrAni({
            attrs: [{
              skillID,
              dOldSkillData,
              dNewSkillData,
            }],
          }, 'skillAttrAni');
        }
        if (oldAttrVal) {
          const attrs = [];
          attrs.push({
            from: oldAttrVal,
            to: mbgGame.player.getCharaDataByID(charaID)[dConfig.attr],
            type: "Add",
            attr: dConfig.attr,
          });
          mbgGame.managerUi.createWinAttrAni({
            attrs,
          }, 'itemAttrAni');
        }
        this.playUpgradeAni();
        const com = this.refreshTalents();
        this.refreshTopInfo();
        this.refreshMainBtn();
        const ttLvNextNew = this.nextTalentTuple(charaID)[0];
        if (ttLvNextOld !== ttLvNextNew) {
          // 解锁了新的
          this.onSelectTalent(com);
          if (this.talentContent.height >= 550) {
            this.sv.scrollToBottom(0.5);
          }
        }
      } else {
        mbgGame.errMsg(data.err);
      }
    });
  },
});