const itemBtn = require('itemBtn');
const defines = require('warDefines');

const doAni = (obj, duration) => {
  obj.opacity = 0;
  obj.y -= 30;
  obj.runAction(cc.moveBy(duration || 0.1, 0, 30));
  obj.runAction(cc.fadeIn(duration || 0.1));
};
const stopAni = (obj, y) => {
  obj.stopAllActions();
  obj.opacity = 255;
  obj.y = y || 0;
};


cc.Class({
  extends: cc.Component,

  properties: {
    animPos: cc.Node,
    frameItem: cc.Node,
    frameHead: cc.Node,
    frameChara: cc.Node,
    labelTips: cc.Node,
    resultLayout: cc.Node,
    btnShare: cc.Node,
    lostNPC: cc.Node,
    lostNPCSpineNode: cc.Node,
    scoreNode: cc.Node,
    scoreNum: cc.RichText,
    npcCharaId: 2003,
    itemBtnQuit: itemBtn,
    itemBtnNext: itemBtn,
    bg: cc.Node,
  },

  onLoad() {
    emitter.on(this, "closeMe", this.closeMe);
    this.itemBtnQuit.node.active = false;
    this.itemBtnNext.node.active = false;
    this.frameChara.active = false;
    this.lostNPC.active = false;
    this.scoreNode.active = false;
    this.effectGradually = this.node.getComponent('effectGradually');
    this.charaHeads = [];
    this.effectGradually.setPassActionCB(this.onPassAction.bind(this));
  },
  onDestroy() {
    emitter.off(this);
  },
  initWinResult(data) {
    mbgGame.log('winResult', data);
    this.m_Data = data;
    if (data.isLab) {
      const obj = new cc.Node();
      obj.addComponent("sp.Skeleton");
      const com = obj.addComponent("spineObject");
      this.animPos.addChild(obj);
      com.onSpineLoad = function () {
        com.doAction('loop1', true);
      };
      com.loadSpine("upgrade");
    } else {
      this.playResultSpineAni(data);
    }
    this.btnShare.active = !data.replay && data.worldIdx !== 99 && mbgGame.hasClan && data.worldIdx;
    if (data.worldIdx === 5) {
      delete this.m_Data.lostType;
    }
    // pvp积分变化
    if (data.addScore != null) {
      this.playPvpScoreAni(data);
    }
    const dReward = data.reward || {};
    if (data.result === 1) {
      if (mbgGame.player.checkFacDesignAward()) {
        dReward.design = 1;
      }
      this.setupRewardAction(dReward);
    } else {
      this.frameItem.parent.y -= 160;
    }
    this.effectGradually.pushAction(() => {
      this.labelTips.active = false;
    }, () => {
      this.finalShow();
    }, "same", 0);
    this.effectGradually.readyAction();
    this.effectGradually.startAction();
  },
  playResultSpineAni(data) {
    const animNode = new cc.Node();
    animNode.addComponent(sp.Skeleton);
    const so = animNode.addComponent("spineObject");
    this.animPos.addChild(animNode);
    so.onSpineLoad = function () {
      mbgGame.log("winResult onSpineLoad");
      this.doSequenceAction('animOpen', 'animLoop');
    };
    let duration = 1.5;
    let _so = null;
    const stagestar = data.stagestar;
    if (stagestar > 0) {
      const starNode = new cc.Node();
      starNode.addComponent(sp.Skeleton);
      _so = starNode.addComponent("spineObject");
      this.animPos.addChild(starNode);
      _so.onSpineLoad = function () {
        mbgGame.log("threestar onSpineLoad");
        this.doSequenceAction(`start${stagestar}`, `loop${stagestar}`);
      };
      _so.loadSpine('threestar');
      duration += 1;
    }
    switch (data.result) {
      case 1: // 胜利
        so.loadSpine('resultWin');
        mbgGame.resManager.playMusic("battleWin");
        this.effectGradually.pushAction(
          () => {
          },
          () => {
          },
          () => {
            so.node.active = true;
            so.doAction('animLoop', true);
            if (_so) {
              _so.node.active = true;
              _so.doAction(`loop${stagestar}`, true);
            }
          },
          duration,
        );
        break;
      case 2: // 失败
        so.loadSpine('resultLose');
        mbgGame.resManager.playMusic("battleLose");
        this.m_Data.lostType = 1;
        break;
      case 3: // 平手
        so.loadSpine('resultDraw');
        mbgGame.resManager.playMusic("battleLose");
        break;
      default:
        break;
    }
  },
  getLostMsg() {
    const sayConfigs = [];
    let sayConfig;
    const tags = defines.getTrackTag();
    // mbgGame.log('getLostMsg:', tags);
    _.mapKeys(mbgGame.config.rant, (value, id) => {
      if (value.scene !== 'l') return;
      if (value.special) {
        if (!_.includes(tags, value.special)) return;
      }
      value.id = id;
      sayConfigs.push(value);
    });
    if (sayConfigs.length) {
      sayConfig = _.sample(sayConfigs);
    }

    let msg = '加油！老铁！';
    if (sayConfig) {
      // mbgGame.log('getLostMsg', sayConfig);
      msg = mbgGame.getString(`rant${sayConfig.id}`);
    }
    return msg;
  },
  showLostNPC() {
    const msg = this.getLostMsg();
    if (!msg) return;
    this.lostNPC.active = true;
    const charaNode = cc.instantiate(mbgGame.preloadRes.floorCharacter);
    this.lostNPCSpineNode.addChild(charaNode);
    this.lostNPCCom = charaNode.getComponent('floorCharacter');
    this.lostNPCCom.onCreated({
      mTplID: this.npcCharaId,
      spineName: mbgGame.config[`mtpl${this.npcCharaId}`].spine,
      scene: 'l',
      charaID: this.npcCharaId,
      sceneCom: this,
      mode: 'resultIn',
      speed: 0.125,
      msg,
      clickDisable: true,
    });
    // 输了就有90%的几率刷一个特惠出来
    mbgGame.sceneMenu.refreshShopItemList(10);
  },
  playPvpScoreAni(data) {
    // pvp积分变化
    if (data.addScore != null) {
      this.scoreNode.active = true;
      let str = null;
      const y = this.m_Data.result === 2 ? 0 : 232;
      this.scoreNode.y = y;
      let baseAddScore = data.addScore;
      if (data.allWin) {
        baseAddScore -= mbgGame.config.constTable.PVPBonusScore;
        const s = `+${mbgGame.config.constTable.PVPBonusScore}`;
        str = `${baseAddScore} ${mbgGame.getColorStr(s, '#21FF29')}`;
      } else {
        str = `${baseAddScore}`;
      }
      this.scoreNum.string = str;
      this.effectGradually.pushAction(
        () => {
          this.scoreNode.active = false;
        },
        () => {
          this.scoreNode.active = true;
          doAni(this.scoreNode, 0.2);
        },
        () => {
          this.scoreNode.active = true;
          stopAni(this.scoreNode, y);
        },
        0.2);
    }
  },
  finalShow() {
    mbgGame.log('finalShow');
    if (this.m_Data.result === 1 && defines.StoryWorlds.indexOf(this.m_Data.worldIdx) !== -1) {
      const stageIdx = this.m_Data.stageIdx;
      mbgGame.log('stageIdx', stageIdx, this.m_Data.stagestar);
      if (!this.m_Data.stagestar) {
        this.itemBtnQuit.node.active = true;
        this.itemBtnNext.node.active = true;
        const str = `<br />${mbgGame.getString('unitPrice', {
          unit: 'logo_sta',
          price: 6,
        })}`;
        if (mbgGame.player.canFightStoryStageBoss(this.m_Data.worldIdx, stageIdx)) {
          this.itemBtnNext.setBtnLabel(`挑战首领${str}`);
        } else {
          this.itemBtnNext.setBtnLabel(`挑战下一波${str}`);
        }
        if (stageIdx === 1 && !mbgGame.player.hasFinishPlot(4)) {
          this.itemBtnQuit.node.active = false;
          this.itemBtnNext.node.active = false;
        }
        return;
      }
    }
    this.itemBtnQuit.node.active = false;
    this.itemBtnNext.node.active = false;
    this.playTipsAni();
  },
  onQuit() {
    this.onClose();
  },
  onNext() {
    mbgGame.log("onNext");
    this.bg.runAction(cc.fadeIn(0.2));
    const idx = mbgGame.player.getSavedSchemeIdx(`storywar${this.m_Data.worldIdx}`);
    const cb = this.onBeginWarCB.bind(this);
    mbgGame.warMgr.tryBeginWar(() => {
      mbgGame.netCtrl.sendMsg('story.beginWar', {
        param: {
          worldIdx: this.m_Data.worldIdx, // 哪个世界
          stageIdx: this.m_Data.stageIdx, // 哪一关
          schemeIdx: idx,
        },
      }, cb);
    });
  },
  onBeginWarCB(data) {
    mbgGame.log('[winResult] onBeginWarCB', data);
    if (data.code === 'ok') {
    } else {
      mbgGame.managerUi.floatMessage(data.err);
    }
  },
  playTipsAni() {
    this.labelTips.active = true;
    this.labelTips.opacity = 0;
    this.labelTips.stopAllActions();
    this.labelTips.runAction(cc.sequence(cc.fadeTo(1.0, 100), cc.fadeIn(1.0)).repeatForever());
  },
  addBattleBonusLabel(obj) {
    const labelNode = new cc.Node();
    const rt = labelNode.addComponent(cc.RichText);
    rt.string = mbgGame.getColorStr('额外奖励', '#21FF29');
    rt.fontSize = 20;
    obj.addChild(labelNode);
    labelNode.y = -60;
  },
  setupRewardAction(dReward) {
    const self = this;
    ['diamonds', 'gem', 'mat', 'sta', 'coins', 'score', 'design'].forEach((x) => {
      if (!dReward[x]) return;
      const obj = mbgGame.managerUi.getAwardItem(this.frameItem,
        { icon: `award_${x}`, count: Math.abs(dReward[x]) });
      if (dReward.rtype && dReward.rtype === x) {
        this.addBattleBonusLabel(obj);
      }
      self.effectGradually.pushAction(
        () => {
          obj.active = false;
        },
        () => {
          obj.active = true;
          doAni(obj);
        },
        () => {
          obj.active = true;
          stopAni(obj);
        },
        0.2);
    });
    // 物品
    if (dReward.dataList) {
      const f = (itemdata) => {
        const obj = mbgGame.managerUi.getAwardItem(self.frameItem, { itemData: itemdata });
        self.effectGradually.pushAction(
          () => {
            obj.active = false;
            obj.stopAllActions();
          },
          () => {
            obj.active = true;
            doAni(obj);
            mbgGame.playSound('UI_ItemGet');
          },
          () => {
            obj.active = true;
            stopAni(obj);
          },
          0.2);
      };
      for (let i = 0; i < dReward.dataList.length; i++) {
        const itemdata = dReward.dataList[i];
        f(itemdata);
      }
    }
    // 宝箱
    if (dReward.battle && dReward.battle.type === 1) {
      const idx = dReward.battle.idx;
      const obj = mbgGame.managerUi.getAwardItem(self.frameItem, { icon: `icon_chest${idx}` });
      this.addBattleBonusLabel(obj);
      self.effectGradually.pushAction(
        () => {
          obj.active = false;
          obj.stopAllActions();
        },
        () => {
          obj.active = true;
          doAni(obj);
          mbgGame.playSound('UI_ItemGet');
        },
        () => {
          obj.active = true;
          stopAni(obj);
        },
        0.2);
    }
    this.frameItem.emit("computeLayout", {});

    // 经验大框
    if (dReward.charaexp) {
      this.effectGradually.pushAction(
        () => {
          this.frameChara.active = false;
        },
        () => {
          this.frameChara.active = true;
        },
        () => {
          this.frameChara.active = true;
        },
        0.01);
    }
    const lowCharaIDs = dReward.lc;

    // 经验  头像
    if (dReward.charaexp) {
      const charaIDs = _.keys(dReward.charaexp);
      if (charaIDs.length === 1) {
        this.frameHead.width = 106;
      }
      for (let i = 0; i <= charaIDs.length; i++) {
        const charaID = charaIDs[i];
        const exp = dReward.charaexp[charaID];
        if (!exp) {
          continue;
        }
        const obj = this.addChara(charaID, `head_${charaID}`, lowCharaIDs.indexOf(charaID) !== -1);
        this.effectGradually.pushAction(
          () => {
            obj.active = false;
          },
          () => {
            obj.active = true;
            this.frameHead.emit("computeLayout", {});
            doAni(obj);
          },
          () => {
            obj.active = true;
            stopAni(obj);
          },
          0.2,
        );
      }
      this.frameHead.getComponent("gridlayout").setIgnoreActive(true);
      this.frameHead.emit("computeLayout", {});

      // 经验增加动画
      this.effectGradually.pushAction(
        () => { },
        () => {
          _.each(charaIDs, (charaID) => {
            if (this.charaHeads[charaID]) {
              const obj = this.charaHeads[charaID];
              const com = obj.getComponent('iconCharacter');
              const exp = dReward.charaexp[charaID];
              com.addExpAni(exp);
              const progressCom = com.getSprite('expBar').getComponent('effectProgressBar');
              const startPercent = this.m_Data.charas.old[charaID].exp / this.m_Data.charas.old[charaID].upCost;
              const loop = this.m_Data.charas.cur[charaID].lv - this.m_Data.charas.old[charaID].lv;
              const endPercent = this.m_Data.charas.cur[charaID].exp / this.m_Data.charas.cur[charaID].upCost;
              progressCom.setProgressAnim(startPercent, loop, endPercent, 2);
              progressCom.fullCallback = () => {
                const lv = com.getLv() + 1;
                com.setLv(lv, mbgGame.getString('lv'));
                com.showLevelUp();
                com.addButton(this, "winResult", "onShowCharaUp", `${charaID}`);
                self.addCharaHeadLight(obj);
                mbgGame.playSound('UI_LvlUp');
                mbgGame.managerUi.openWinCharaUp(+charaID, this.m_Data);
              };
            }
          });
        },
        () => {
          _.each(charaIDs, (charaID) => {
            if (this.charaHeads[charaID]) {
              const obj = this.charaHeads[charaID];
              const com = obj.getComponent('iconCharacter');
              const exp = dReward.charaexp[charaID];
              com.stopExpAni(exp);
              const progressCom = com.getSprite('expBar').getComponent('effectProgressBar');
              const endPercent = this.m_Data.charas.cur[charaID].exp / this.m_Data.charas.cur[charaID].upCost;
              progressCom.setProgressAnim(0, 0, endPercent, 0);
              const lv = this.m_Data.charas.cur[charaID].lv;
              com.setLv(lv, mbgGame.getString('lv'));
              if (this.m_Data.charas.cur[charaID].lv !== this.m_Data.charas.old[charaID].lv) {
                com.showLevelUp();
                com.addButton(this, "winResult", "onShowCharaUp", `${charaID}`);
                self.addCharaHeadLight(obj);
              } else {
                com.touchCb = () => {
                  mbgGame.managerUi.openWinCharaInfo(com.getId());
                };
              }
            }
          });
        },
        2,
      );
    }
  },
  onShowCharaUp(evt, charaID) {
    // mbgGame.log("onShowCharaUp", charaID, this, this.m_Data);
    mbgGame.managerUi.openWinCharaUp(+charaID, this.m_Data);
  },
  addCharaHeadLight(obj) {
    if (obj.getChildByName("effectobj")) {
      return;
    }
    const effectobj = new cc.Node("effectobj");
    effectobj.addComponent(sp.Skeleton);
    const spineObj = effectobj.addComponent("spineObject");
    obj.addChild(effectobj);
    // obj.setContentSize(0, 0);
    spineObj.onSpineLoad = function () {
      this.playAnimation("headlight");
    };
    spineObj.loadSpine("headlight");
  },
  // 头像
  addChara(charaID, icon, hasBonus) {
    const obj = mbgGame.managerUi.getIconCharacter();
    this.frameHead.addChild(obj);
    const com = obj.getComponent('iconCharacter');
    const oldLv = this.m_Data.charas.old[charaID].lv;
    com.initMe({
      charaID,
    });
    com.hideLvBg();
    com.showBottomLvLevel(oldLv);
    com.setExperience(this.m_Data.charas.old[charaID].exp / this.m_Data.charas.old[charaID].upCost);
    com.addInfoButton();
    if (hasBonus) {
      com.addBonusLabel();
    }
    mbgGame.log('winResult addChara', com.getId(), "hasBonus", hasBonus);
    this.charaHeads[charaID] = obj;
    return obj;
  },

  onPassAction() {
    this.frameItem.emit("computeLayout", {});
    this.frameHead.emit("computeLayout", {});
  },
  finsh() {
    this.effectGradually.passAction();
  },
  closeMe() {
    // mbgGame.log('winResult closeMe');
    this.node.destroy();
  },
  onClose() {
    // mbgGame.log("winResult onClose");
    if (this.m_Data.result === 2 && this.m_Data.lostType) {
      // 失败第一次点击，出胡十三
      if (!this.lostNPC.active) {
        this.showLostNPC();
        return;
      }
      if (this.lostNPCCom && this.lostNPCCom.node && this.lostNPCCom.node.isValid) {
        this.lostNPCCom.resultOut();
      }
    }
    if (this.node && this.node.isValid) {
      if (!this.effectGradually.actionFinish) {
        this.finsh();
        return;
      }
      mbgGame.warMgr.fadeToBlack_WinResult(this.m_Data.worldIdx);
    }
  },
  onShare() {
    // 先保存录像拿到replayUUID
    mbgGame.netCtrl.sendMsg("war.saveRelay", {
      worldIdx: this.m_Data.worldIdx,
    }, (data) => {
      mbgGame.log("[war.saveRelay]", data);
      if (data.code === "ok") {
        mbgGame.log("replayUUID", data.data.replayUUID);
        mbgGame.player.doShareWar(data.data.replayUUID);
      } else {
        // 已过期
      }
    });
  },
});