cc.Class({
  extends: cc.Component,

  properties: {
    iconNode: cc.Node,
    nameLabel: cc.Label,
    hpLabel: cc.Label,
    hateLabel: cc.Label,
    atkLabel: cc.Label,
    defLabel: cc.Label,
    expBar: cc.ProgressBar,
    expInfo: cc.Label,
    // 技能
    skillInfoContent: cc.Node,
    skillInfoTemplate: cc.Node,
    btnUnlock: cc.Node,
  },

  // use this for initialization
  onLoad() {
    emitter.on(this, "updateCharaData", this.showCharacter);
  },
  onDestroy() {
    emitter.off(this, "updateCharaData");
  },
  getOrCreateCharaIcon() {
    if (!this.charaIconCom) {
      const icon = mbgGame.managerUi.getIconCharacter();
      this.iconNode.addChild(icon);
      this.charaIconCom = icon.getComponent('iconCharacter');
    }
    return this.charaIconCom;
  },
  refreshBaseInfo(charaID, forceChangeID) {
    this.nameLabel.string = mbgGame.player.getCharaName(charaID);
    const dCharaData = mbgGame.player.getCharaDataByID(charaID);
    if (mbgGame.player.hasChara(charaID)) {
      this.atkLabel.string = (dCharaData.Atk) + (dCharaData.Dam || 0);
      this.defLabel.string = dCharaData.Def;
      this.hpLabel.string = dCharaData.MaxHp;
      this.hateLabel.string = dCharaData.BeAtkW;
      const exp = mbgGame.player.getCharaExp(charaID);
      this.expInfo.string = `${exp} / ${dCharaData.upCost}`;
      this.expBar.progress = exp / dCharaData.upCost;
      // this.upCostLabel.string = mbgGame.smartNum(dCharaData.upCost);
    } else {
      this.expInfo.string = ``;
      this.expBar.progress = 0;
      this.atkLabel.string = this.getBaseAttr(charaID, "Atk");
      this.defLabel.string = this.getBaseAttr(charaID, "Def");
      this.hpLabel.string = this.getBaseAttr(charaID, "MaxHp");
      this.hateLabel.string = this.getBaseAttr(charaID, "BeAtkW");
    }
    for (let i = 0; i < 2; i++) {
      const skillID = Number(`${100 + charaID}${i + 1}`);
      const dSkillData = dCharaData && dCharaData.skill[skillID];

      if (!this[`_skillInfoNode${i}`]) {
        let node = this.skillInfoTemplate;
        if (i > 0) {
          node = cc.instantiate(this.skillInfoTemplate);
          this.skillInfoContent.addChild(node);
        }
        this[`_skillInfoNode${i}`] = node;
      }
      const com = this[`_skillInfoNode${i}`].getComponent('skillInfo');
      if (forceChangeID) {
        com.reset();
      }
      com.initMe(charaID, skillID, dSkillData, true);
    }
    this.skillInfoContent.active = true;
  },
  getBaseAttr(charaID, sAttr) {
    if (sAttr === "BeAtkW") {
      return this.getHeroAttr(charaID, sAttr);
    }
    const dUpConfig = this.getHeroUpConfig(1);
    const attrVal = dUpConfig[sAttr];
    let val = this.getInitAttr(charaID, sAttr);
    val += Math.ceil(this.getGrowAttr(charaID, sAttr) * attrVal);
    return val;
  },
  getHeroUpConfig(lv) {
    return mbgGame.config[`heroup${lv}`];
  },
  getHeroAttr(charaID, sAttr) {
    return mbgGame.config[`hero${charaID}`][`${sAttr}`];
  },
  getInitAttr(charaID, sAttr) {
    return mbgGame.config[`hero${charaID}`][`${sAttr}Init`];
  },
  getGrowAttr(charaID, sAttr) {
    return mbgGame.config[`hero${charaID}`][`${sAttr}Grow`];
  },
  refreshUnlockBtn() {
    this.btnUnlock.active = mbgGame.player.hasAllWorld1Charas() && !mbgGame.player.hasChara(this._charaID);
    if (!this.btnUnlock.active) {
      return;
    }
    const itemBtn = this.btnUnlock.getComponent('itemBtn');
    const cID = mbgGame.player.getUnlockingCharaID();
    if (cID) {
      if (this._charaID === cID) {
        const diamonds = mbgGame.player.getFastUnlockCharaDiamond();
        if (diamonds > 0) {
          const cost = mbgGame.getString('unitPrice', {
            price: diamonds,
            unit: 'logo_diamonds',
          });
          itemBtn.setBtnLabel(`唤醒中<br />${cost}`);
        } else {
          itemBtn.setBtnLabel('唤醒');
        }
        itemBtn.setStatus(true);
      } else {
        itemBtn.setBtnLabel('唤醒');
        itemBtn.setStatus(false);
      }
    } else {
      itemBtn.setStatus(true);
      const duration = mbgGame.player.getUnlockingCharaDuration();
      const t = mbgGame.transTime(duration);
      itemBtn.setBtnLabel(`唤醒<br />${t}`);
    }
  },
  onRefresh() {
    this.refreshUnlockBtn();
  },
  showCharacter(charaID, forceChangeID) {
    const oldCharaID = this._charaID;
    if (charaID) {
      if (!forceChangeID && oldCharaID !== charaID) return;
      this._charaID = charaID;
    } else {
      charaID = this._charaID;
    }
    this.refreshBaseInfo(charaID, forceChangeID);
    this.unschedule(this.onRefresh);
    if (!mbgGame.player.hasChara(charaID)) {
      this.schedule(this.onRefresh, 10, cc.macro.REPEAT_FOREVER);
      this.getOrCreateCharaIcon().initMe({
        charaID,
      });
      this.refreshUnlockBtn();
      return;
    }
    this.btnUnlock.active = false;
    // icon.setScale(0.9);
    this.getOrCreateCharaIcon().initMe({
      charaID,
      lv: mbgGame.player.getCharaLv(charaID),
    });

    // mbgGame.log('showCharacter', dCharaData);

    // this.upDescLabel.string = mbgGame.getString("upgrade");

  },
  onClickSkill() {
    mbgGame.managerUi.openWinCharaInfo(this._charaID, {
      goSkill: true,
    });
  },
  onClickChara() {
    if (!mbgGame.player.hasChara(this._charaID)) {
      return;
    }
    mbgGame.managerUi.openWinCharaInfo(this._charaID);
  },
  onClickUnlockBtn() {
    const cID = mbgGame.player.getUnlockingCharaID();
    if (!cID && !mbgGame.player.hasChara(this._charaID)) {
      mbgGame.managerUi.createConfirmDialog(mbgGame.getString("beginunlock", {
        c: this.nameLabel.string,
      }),
        () => {
          mbgGame.netCtrl.sendMsg("story.startUnlock", {
            charaID: this._charaID,
          }, (data) => {
            mbgGame.log("story.startUnlock", data);
            if (data.code === "ok") {
              this.refreshUnlockBtn();
              emitter.emit("startCharaUnlock");
            } else {
              mbgGame.errMsg(data.err);
            }
          });
        });
      return;
    }
    if (cID && cID === this._charaID) {
      const diamonds = mbgGame.player.getFastUnlockCharaDiamond();
      if (diamonds > 0) {
        mbgGame.managerUi.createConfirmDialog(mbgGame.getString("fastunlock", {
          s: mbgGame.getString('unitPrice', {
            price: diamonds,
            unit: 'logo_diamonds',
          }),
          c: this.nameLabel.string,
        }),
          () => {
            mbgGame.netCtrl.sendMsg("story.tryUnlock", {
              fast: true,
            }, (data) => {
              mbgGame.log("story.tryUnlock fast", data);
              if (data.code === "ok") {
                this.refreshUnlockBtn();
                emitter.emit("endCharaUnlock");
              } else {
                mbgGame.errMsg(data.err);
              }
            });
          });
      } else {
        mbgGame.netCtrl.sendMsg("story.tryUnlock", {
        }, (data) => {
          mbgGame.log("story.tryUnlock", data);
          if (data.code === "ok") {
            this.refreshUnlockBtn();
            emitter.emit("endCharaUnlock");
          } else {
            mbgGame.errMsg(data.err);
          }
        });
      }
    }
  },
});