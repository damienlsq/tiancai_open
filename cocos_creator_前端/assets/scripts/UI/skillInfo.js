cc.Class({
  extends: cc.Component,

  properties: {
    skillIcon: cc.Sprite,
    skillLvl: cc.Label,
    skillName: cc.Label,
    skillCost: cc.RichText,
    skillInfo: cc.RichText,
    skillDesc: cc.RichText,
    skillBtn: cc.Node,

    starsNode: cc.Node,
  },

  reset() {
    const starCom = this.starsNode.getComponent('stars');
    starCom.reset();
  },
  initMe(charaID, skillID, dSkillData, isMe) {
    dSkillData = dSkillData || {};
    mbgGame.log("initMe dSkillData", dSkillData);
    if (charaID) {
      this._charaID = charaID;
    }
    if (skillID) {
      this._skillID = skillID;
    }

    this.skillName.string = dSkillData.name || mbgGame.getString(`skillname${skillID}`);
    this.skillLvl.string = mbgGame.getString('levelShow', {
      level: dSkillData.lv || 1,
    });

    if (this.skillCost) {
      this.skillCost.string = "";
    }
    if (this.skillInfo) {
      if (!isMe) {
        // 加大一点desc长度
        this.skillInfo.maxWidth = 480;
      }
      this.skillInfo.string = dSkillData.desc || mbgGame.player.getSkillDetail(this._charaID, skillID, dSkillData);
    }
    if (this.skillDesc) {
      this.skillDesc.string = mbgGame.player.getSkillDesc(this._charaID, skillID, dSkillData);
    }
    let skillIcon = 'skillicon_shield';
    if (dSkillData.type === 1 || (skillID % 2 === 1 && isMe)) {
      skillIcon = 'skillicon_sword';
      if (isMe && this.skillCost) {
        this.skillCost.string = mbgGame.getString('costenergy', {
          count: mbgGame.player.getSkillCostEnergy(this._charaID),
        });
      }
    } else {
      if (this._charaID >= 1 && this._charaID <= 15 && (skillID % 2 === 1)) {
        skillIcon = 'skillicon_sword';
      }
      if (dSkillData.type === 1) {
        skillIcon = 'skillicon_sword';
      }
    }
    mbgGame.resManager.setAutoAtlasFrame(this.skillIcon, 'uiBase', skillIcon);
    this.hasExtendInfo = false;
    const starCom = this.starsNode.getComponent('stars');
    const star = dSkillData.s || 0;
    if (dSkillData.s) {
      starCom.setStar(star, 5);
    }

    if (isMe) {
      this.skillBtn.active = true;
      if (dSkillData.lv >= 100 || !mbgGame.player.hasChara(charaID)) {
        // 满级了
        this.skillBtn.active = false;
        return;
      }
      const btnStr = `${mbgGame.getBoldStr(mbgGame.getString('learn'))}<br />${mbgGame.getString('unitPrice', {
        unit: 'logo_coins',
        price: mbgGame.smartNum(dSkillData.upCost),
      })}`;
      this.skillBtn.getComponent('itemBtn').setBtnLabel(btnStr);

      // 金币不够   大于等于人物等级  按钮变灰
      if (dSkillData.upCost > mbgGame.player.getCoins()) {
        this.skillBtn.getComponent('itemBtn').setStatus(false, mbgGame.getString("moneyNotEnough", {
          unit: mbgGame.getString("coins"),
        }));
      } else if (dSkillData.lv >= mbgGame.player.getCharaLv(this._charaID)) {
        this.skillBtn.getComponent('itemBtn').setStatus(false, mbgGame.getString("sLvLimit"));
      } else if (dSkillData.lv >= mbgGame.config.constTable[`MaxCharaLv`]) {
        this.skillBtn.getComponent('itemBtn').setStatus(false, mbgGame.getString("maxlv"));
      } else {
        this.skillBtn.getComponent('itemBtn').setStatus(true);
      }
    } else {
      this.skillBtn.active = false;
    }
  },

  upgradeSkill() {
    /*
    if (mbgGame.getLock('net', 'upgradeSkill')) {
      mbgGame.managerUi.floatMessage('请等待');
      return;
    }
    mbgGame.setLock('net', 'upgradeSkill');
    */
    const charaID = this._charaID;
    const skillID = this._skillID;
    const dOldSkillData = _.clone(mbgGame.player.getSkillDataByID(charaID, skillID));
    mbgGame.netCtrl.sendMsg(
      'player.upgradeskill', {
        data: {
          charaID,
          skillID,
        },
      },
      (data) => {
        // mbgGame.log('[upgradeskill]', data);
        // mbgGame.clearLock('net', 'upgradeSkill');
        if (data.code === 'ok') {
          const dNewSkillData = _.clone(mbgGame.player.getSkillDataByID(charaID, skillID));
          mbgGame.managerUi.createWinAttrAni({
            attrs: [{
              skillID,
              dOldSkillData,
              dNewSkillData,
            }],
          }, 'skillAttrAni');
          emitter.emit('updateCharaData', charaID);
        }
        if (data.code === 'err') {
          mbgGame.managerUi.floatMessage(data.err);
        }
      });
  },
});