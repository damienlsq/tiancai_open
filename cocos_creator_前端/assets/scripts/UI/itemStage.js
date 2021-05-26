const mbgGame = require('mbgGame');
const defines = require('warDefines');

cc.Class({
  extends: cc.Component,

  properties: {
    dropLabel: cc.Label,
    titleBar1: cc.Node,
    titleBar2: cc.Node,
    title1: cc.Label,
    title2: cc.Label,
    desc1: cc.RichText,
    desc2: cc.RichText,
    mdesc: cc.RichText,
    itemPosList: {
      type: cc.Node,
      default: [],
    },
    headBoss: cc.Sprite,
    headAllLayout: cc.Node,
    checkedSp: cc.Sprite,
    frame: cc.Node,
    frameTitle: cc.Sprite,
    starsNode: cc.Node,
    costSta: cc.RichText,
    stageBar: cc.ProgressBar,
    fightBtn: cc.Node,
    finishSp: cc.Node,
  },
  onLoad() {
    emitter.on(this, "raiddata", this.onRefresh);
    emitter.on(this, "timeVarUpdate", (data) => {
      if (!data || (data.coinwar == null && data.matwar == null)) {
        return;
      }
      this.onRefresh();
    });
  },
  onDestroy() {
    emitter.off(this, "raiddata");
  },
  getStageID() {
    const stageID = defines.getStageID(this.m_worldIdx, this.m_stageIdx);
    return stageID;
  },
  getStageConfig() {
    const stageID = this.getStageID();
    const dStageConfig = mbgGame.config.allstageinfo[stageID];
    return dStageConfig;
  },
  doNewAni() {
    this.node.stopAllActions();
    this.node.scale = 0.001;
    this.node.runAction(cc.scaleTo(0.6, 1, 1).easing(cc.easeBackOut()));
  },
  onRefresh() {
    this.initMe();
    mbgGame.log("onRefresh", this.m_worldIdx, this.m_stageIdx);
  },
  initMe(worldIdx, stageIdx) {
    try {
      mbgGame.log("stage initMe", worldIdx, stageIdx);
      //	mbgGame.performanceCheck("itemStage", 'initMe begin', true);
      this.m_worldIdx = +worldIdx || this.m_worldIdx;
      this.m_stageIdx = +stageIdx || this.m_stageIdx;
      const dStageConfig = this.getStageConfig();
      if (!dStageConfig) {
        mbgGame.log("no dStageConfig", worldIdx, stageIdx, this.getStageID());
        return;
      }
      this.titleBar1.active = true;
      this.titleBar2.active = false;
      let frameImg = 'itemStageBg';
      let frameImgTitle = 'itemStageTitleBg';
      const stageID = this.getStageID();
      const costSta = dStageConfig.cS;
      let sTitle = '';
      let desc = '';
      if (defines.StoryWorlds.indexOf(this.m_worldIdx) !== -1) {
        sTitle = mbgGame.getString(`mname${defines.getMTplID(dStageConfig.bI)}`);
        // mbgGame.log("sTitle", sTitle);
      } else if (this.m_worldIdx === 4) {
        sTitle = mbgGame.getString(`stagename${stageID}`);
      } else if (this.m_worldIdx === 9) {
        const level = mbgGame.getString('level', { lv: mbgGame.player.getRaidLv(this.m_stageIdx) || 1 });
        sTitle = `${level} ${mbgGame.getString(`stagename${stageID}`)}`;
      }
      this.starsNode.active = false;
      this.headBoss.node.active = true;
      const maxLv = mbgGame.player.getCurWorldMaxLv(this.m_worldIdx);
      this.checkedSp.node.active = false;
      this.stageBar.node.active = false;
      this.headAllLayout.active = false;
      let showAwardItems = false;
      let showAwardCoins = false;
      let showAwardMat = false;
      this.fightBtn.active = true;
      this.finishSp.active = false;
      this.mdesc.node.active = false;
      if (defines.StoryWorlds.indexOf(this.m_worldIdx) !== -1) {
        const onLight = maxLv === this.m_stageIdx;
        if (onLight) {
          frameImg = 'itemStageBgLight';
          frameImgTitle = 'itemStageTitleBgLight';
        }
        this.dropLabel.node.active = false;
        const unlockinfo = mbgGame.getString(`unlockinfo${stageID}`, {}, true);
        desc = unlockinfo || "";
        if (desc) {
          desc = mbgGame.getColorStr(desc, maxLv === this.m_stageIdx ? '#ffffff' : '#7dd746');
        }
        this.checkedSp.node.active = unlockinfo && this.m_stageIdx < maxLv;
        const lstData = mbgGame.player.getStoryStageData(this.m_worldIdx, stageIdx);
        const w = dStageConfig.w || 2;
        this.stageBar.node.active = lstData[1] === 0;
        this.starsNode.active = lstData[1] > 0;
        if (this.starsNode.active) {
          const stars = this.starsNode.getComponent('stars');
          stars.m_star = null;
          stars.setStar(lstData[1], 3);
        } else {
          const percent = lstData[0] / w;
          const len = w * 58;
          this.stageBar.node.width = len;
          const bar = this.stageBar.node.getChildByName('bar');
          bar.width = len;
          this.stageBar.totalLength = len;
          this.stageBar.progress = 1 - percent;
          if (percent === 1) {
            this.mdesc.node.active = true;
            this.mdesc.string = mbgGame.getString(`mdesc${defines.getMTplID(dStageConfig.bI)}`);
          }
        }
      } else if (this.m_worldIdx === 4) {
        desc = '';
        this.dropLabel.node.active = false;
        const type = mbgGame.player.getDayWarTypeByStageIdx(this.m_stageIdx);
        if (type === 'coinwar' || type === 'matwar' || type.startsWith('herowar')) {
          if (type === 'coinwar') {
            showAwardCoins = true;
          } else if (type === 'matwar') {
            showAwardMat = true;
          } else if (type.startsWith('herowar')) {
            showAwardItems = true;
          }
          const lefttimes = mbgGame.player.getDayLeftTimes(type);
          const maxTimes = mbgGame.config.constTable[`${type}Times`];
          desc = `剩余次数：${lefttimes} / ${maxTimes}`;
          this.dropLabel.node.active = true;
        } else if (type === 'wheelwar') {
          frameImg = 'itemStageBg2';
          this.titleBar1.active = false;
          this.titleBar2.active = true;
          this.headBoss.node.active = false;
          const dWheelWarData = mbgGame.player.getWheelWarDayData();
          mbgGame.log("dWheelWarData", dWheelWarData);
          this.m_SmallMonsterIDs = dWheelWarData.mIDs;
          mbgGame.log("mIDs", this.m_SmallMonsterIDs);
          const finish = dWheelWarData.r >= 15;
          this.fightBtn.active = !finish;
          this.finishSp.active = finish;
          this.headAllLayout.active = true;
          const allIDs = [dStageConfig.bI].concat(dWheelWarData.mIDs);
          desc = `场次：${dWheelWarData.r} / 15`;
          for (let i = 0; i < allIDs.length; i++) {
            const mID = allIDs[i];
            const headNode = this.headAllLayout.children[i];
            this.setHeadInfo(headNode, defines.getHeadIconByMID(mID), finish ? 0 : dWheelWarData.rivalhp[mID]);
          }
        }
      } else if (this.m_worldIdx === 9) {
        // 试炼
        showAwardItems = true;
        this.dropLabel.node.active = true;
        desc = '';
        this.checkedSp.node.active = false;
      }
      if (costSta > 0) {
        this.costSta.string = mbgGame.getString('unitPrice', {
          price: costSta,
          unit: 'logo_sta',
        });
      } else {
        this.costSta.string = '';
      }
      mbgGame.resManager.setImageFrame(this.frame, 'images', frameImg);
      mbgGame.resManager.setAutoAtlasFrame(this.frameTitle, 'uiClear', frameImgTitle);
      // mbgGame.log("stageID", stageID, dStageConfig);
      let idx = 0;
      if (showAwardItems || showAwardCoins || showAwardMat) {
        const dropItem = dStageConfig.dI;
        if (showAwardItems && dropItem) {
          for (let itemID in dropItem) {
            itemID = +itemID;
            if (dropItem[itemID] <= 0) {
              continue;
            }
            const dItemConfig = mbgGame.config[`item${itemID}`];
            if (dItemConfig.worldIdx === 0) {
              continue;
            }
            const posNode = this.itemPosList[idx];
            posNode.active = true;
            this.setItem(idx, itemID, this.getStageItemStarLv());
            idx += 1;
          }
        }
        const dropCoin = dStageConfig.dC;
        if (showAwardCoins && dropCoin) {
          const posNode = this.itemPosList[idx];
          posNode.active = true;
          this.setItem2(idx, "coins", dropCoin);
          idx += 1;
        }
        const dropMat = dStageConfig.dM;
        if (showAwardMat && dropMat) {
          const posNode = this.itemPosList[idx];
          this.setItem2(idx, "mat", dropMat);
          posNode.active = true;
          idx += 1;
        }
      }
      for (; idx < this.itemPosList.length; idx++) {
        const posNode = this.itemPosList[idx];
        posNode.active = false;
      }
      if (this.headBoss.node.active) {
        this.setHeadIcon(this.headBoss, defines.getHeadIconByMID(dStageConfig.bI));
      }

      this.setTitle(sTitle);
      this.setDesc(desc);
    } catch (e) {
      mbgGame.player.sendLog(`[itemStage] err:${e} ${e.stack}`);
    }
  },
  setTitle(sTitle) {
    if (this.titleBar1.active) {
      this.title1.string = sTitle;
    } else {
      this.title2.string = sTitle;
    }
  },
  setDesc(desc) {
    if (this.titleBar1.active) {
      this.desc1.string = desc;
    } else {
      this.desc2.string = desc;
    }
  },
  setHeadInfo(node, headID, hpPercent) {
    const spriteNode = node.getChildByName('head');
    this.setHeadIcon(spriteNode.getComponent(cc.Sprite), headID);
    const barNode = node.getChildByName('hp');
    barNode.getComponent(cc.ProgressBar).progress = hpPercent * 0.01;
  },
  setHeadIcon(sprite, headID) {
    if (headID <= 15) {
      mbgGame.resManager.setAutoAtlasFrame(sprite, 'labIcon', `head_${headID}`);
    } else {
      mbgGame.resManager.setImageFrame(sprite, 'images', `head_${headID}`);
    }
  },
  setItem(idx, itemID, starLv) {
    this.itemPosList[idx].removeAllChildren();
    const node = mbgGame.managerUi.getIconItem();
    this.itemPosList[idx].addChild(node);
    const com = node.getComponent('itemPanel');
    com.initMe({
      itemData: {
        i: itemID,
        q: 4,
        s: starLv,
        lv: 1,
      },
      style: 'unidentify',
    });
  },
  setItem2(idx, type, count) {
    this.itemPosList[idx].removeAllChildren();
    const node = mbgGame.managerUi.getIconItem();
    this.itemPosList[idx].addChild(node);
    const com = node.getComponent('itemPanel');
    com.initMe({ icon: `award_${type}`, count: +count, style: 'award' });
  },
  onEnter() {
    mbgGame.panelStory.onEnterStage(this.m_worldIdx, this.m_stageIdx);
  },
  // 当前关卡可以产出的星级
  getStageItemStarLv() {
    let lv = null;
    if (this.m_worldIdx === defines.raidWorldIdx) {
      lv = mbgGame.player.getRaidLv(this.m_stageIdx);
    }
    const stageID = defines.getStageID(this.m_worldIdx, this.m_stageIdx, lv);
    const dStageConfig = mbgGame.config.allstageinfo[stageID];
    return Math.max(1, Math.floor(dStageConfig.lv / 5));
  },
  getSmallMonsterIDs() {
    return this.m_SmallMonsterIDs;
  },
  getStageLv() {
    if (this.m_worldIdx === 4) {
      const type = mbgGame.player.getDayWarTypeByStageIdx(this.m_stageIdx);
      if (type === 'wheelwar') {
        const dWheelWarData = mbgGame.player.getWheelWarDayData();
        const avglv = dWheelWarData.avglv;
        const offset = mbgGame.config.constTable.WheelWarLv[mbgGame.player.getWheelWarCurRound()];
        return Math.min(Math.max(1, avglv + offset), 100);
      }
    }
    const dStageConfig = this.getStageConfig();
    return dStageConfig.lv;
  },
  onClickMonster(obj, idx) {
    mbgGame.log("onClickMonster", idx);
    const dStageConfig = this.getStageConfig();
    const lv = this.getStageLv();
    idx = +idx;
    if (idx === 0) {
      mbgGame.managerUi.onShowMonsterInfoById(dStageConfig.bI, lv);
    } else {
      mbgGame.managerUi.onShowMonsterInfoById(this.getSmallMonsterIDs()[idx - 1], lv);
    }
  },
});