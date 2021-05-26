const warDefines = require('warDefines');
const plotCtrlBase = require('plotCtrlBase');

const DefaultActionTime = 1.7;

cc.Class({
  extends: plotCtrlBase,
  properties: {
  },
  onLoad() {
    mbgGame.plotStory = this;
    this.m_CachedPlotFighters = [];
  },
  /*
  data = {
    plotID:
    dialogIDs:[101,102]
   }
   */
  customInitPlot() {
    const plotID = this.plotData().plotID;
    const worldIdx = +(`${plotID}`[2]);
    const stageID = Math.floor(plotID / 10);
    this.plotData().worldIdx = worldIdx;
    this.plotData().stageID = stageID;

    mbgGame.log("customInitPlot", this.plotData(), worldIdx, stageID);
    const warCom = mbgGame.warMgr.getWarCom(worldIdx);
    // 关闭所有窗口
    emitter.emit('closeMe');
    emitter.emit('story', this.plotIdx(), true);
    // 背景图
    const dStageConfig = mbgGame.config.allstageinfo[stageID];
    if (dStageConfig) {
      warCom.initBg({
        image: dStageConfig.bg,
      });
    }
    warCom.onShowPlot(this.plotIdx());
    this.showNextDialog();
  },
  showNextDialog() {
    const dConfig = this.getDialogs()[this.m_DialogIdx];
    let waitTime = 0;
    if (dConfig.event) {
      waitTime = this.onDialogEvent(dConfig);
    }
    if (this.m_Skip) {
      return;
    }
    const lastFighterCom = this.getLastFighterCom();
    if (lastFighterCom) {
      lastFighterCom.getComponent("say").hideDialogBubble();
    }
    if (!dConfig.str) {
      if (waitTime) {
        this.setWait(waitTime);
        this.scheduleOnce(() => {
          this.onFinishDialog();
        }, waitTime + 0.05);
      } else {
        this.onFinishDialog();
      }
      return;
    }
    if (waitTime) {
      this.setWait(waitTime);
      this.scheduleOnce(() => {
        this.fighterSay(dConfig);
      }, waitTime);
    } else {
      this.fighterSay(dConfig);
    }
  },
  fighterSay(dConfig) {
    // 对白事件
    const fighterCom = this.getSayFighterCom(dConfig);
    if (fighterCom) {
      const dOption = {
        arrowType: 1,
        text: dConfig.str,
      };
      if (fighterCom.isDie()) {
        const waitTime = 1;
        this.setWait(waitTime);
        this.scheduleOnce(() => {
          fighterCom.ctrl().revive();
          fighterCom.ctrl().say(dOption);
        }, waitTime);
      } else {
        fighterCom.ctrl().say(dOption);
      }
      this.lastFighterCom = fighterCom;
      mbgGame.log("fighterSay", dConfig);
    } else {
      mbgGame.error("fighterSay error", `不能根据对话id找到fighter`, dConfig, dConfig.str);
      // 下一句
    }
  },
  changeWorldIdx(targetWorldIdx) {
    this.m_CurrentWorldIdx = targetWorldIdx;
  },
  getWorldIdx() {
    if (this.m_CurrentWorldIdx != null) {
      return this.m_CurrentWorldIdx;
    }
    return this.m_CurPlotData.worldIdx;
  },
  onDialogEvent(dConfig) {
    let waitTime = 0;
    const event = dConfig.event;
    if (!event) {
      return waitTime;
    }
    const worldIdx = this.getWorldIdx();
    const action = event[0];
    if (action === "全体入场" || action === "全体闪进") {
      const npcPos = event[2]; // npc站位:  右/左/中
      for (let idx = 1; idx <= 5; idx++) {
        this.createFighterByIdx(npcPos, idx, action === "全体闪进");
      }
      waitTime = DefaultActionTime;
      if (action === "全体闪进") {
        waitTime = 0.8;
      }
      const dNextConfig = this.getNextDialogConfig();
      if (this.isEnterOrLeaveEvent(dNextConfig)) {
        waitTime = 0;
      }
    } else if (action === "全体离场") {
      waitTime = DefaultActionTime;
      let walkTime = DefaultActionTime;
      if (this.m_Skip) {
        walkTime = 0.01;
      }
      const dir = event[1];
      const warCom = mbgGame.warMgr.getWarCom(worldIdx);
      const npcPos = event[2]; // npc站位:  右/左/中
      const iTeam = this.pos2Team(npcPos);
      const lst = warCom.getFightersByTeam(iTeam);
      for (let i = 0; i < lst.length; i++) {
        const fighterCom = lst[i];
        fighterCom.ctrl().walkCtrl().leaveScene(dir, walkTime);
      }
      const dNextConfig = this.getNextDialogConfig();
      if (this.isEnterOrLeaveEvent(dNextConfig)) {
        waitTime = 0;
      }
    } else if (action === "入场" || action === "闪进") {
      const idx = event[1];
      const npcPos = event[2];
      const mTplID = event[3];
      const flashIn = action === "闪进";
      if (mTplID) {
        this.createFighter(dConfig, flashIn);
      } else {
        this.createFighterByIdx(npcPos, +idx, flashIn);
      }
      const dNextConfig = this.getNextDialogConfig();
      waitTime = 2;
      if (action === "闪进") {
        waitTime = 0.8;
      }
      if (this.isEnterOrLeaveEvent(dNextConfig)) {
        waitTime = 0;
      }
    } else if (action === "移动") {
      // 能移动的都是已经在场上的人
      const fighterCom = this.getSayFighterCom(dConfig);
      if (fighterCom) {
        waitTime = DefaultActionTime;
        const fighter = fighterCom.node;
        fighterCom.FSM().setState('walk');
        let walkTime = DefaultActionTime;
        if (this.m_Skip) {
          walkTime = 0.01;
        }
        const posIdx = +event[1];
        const npcPos = event[2]; // npc站位:  右/左/中
        const iTeam = this.pos2Team(npcPos);
        const pos = warDefines.getStandPos(iTeam, posIdx);
        if (pos.x < fighterCom.getPos().x) {
          fighterCom.turnLeft();
        } else if (pos.x > fighterCom.getPos().x) {
          fighterCom.turnRight();
        }
        fighterCom.setPosIdx(posIdx);
        fighterCom.setTeam(iTeam);
        fighter.runAction(cc.sequence(
          cc.moveTo(walkTime, pos),
          cc.callFunc(() => {
            fighterCom.FSM().setState('stand');
            if (iTeam === 1) { // 左
              fighterCom.turnRight();
            }
            if (iTeam === 2) { // 右
              fighterCom.turnLeft();
            }
            if (iTeam === 3) { // 中
              fighterCom.turnLeft();
            }
          })));
      }
    } else if (action === "离场" || action === "闪退") {
      const fighterCom = this.getSayFighterCom(dConfig);
      fighterCom.getComponent("say").hideDialogBubble();
      if (fighterCom) {
        waitTime = DefaultActionTime;
        if (action === "闪退") {
          waitTime = 0.5;
        }
        let walkTime = DefaultActionTime;
        if (this.m_Skip) {
          walkTime = 0.01;
        }
        const dir = event[1];
        fighterCom.ctrl().walkCtrl().leaveScene(dir, walkTime, action === "闪退");
        this.removeCachedFighterCom(fighterCom);
      } else {
        mbgGame.error("[onDialogEvent] 离场, no fighterCom", dConfig);
      }
      const dNextConfig = this.getNextDialogConfig();
      if (this.isEnterOrLeaveEvent(dNextConfig)) {
        waitTime = 0;
      }
    }
    return waitTime;
  },
  isEnterOrLeaveEvent(dNextConfig) {
    const evt = dNextConfig && dNextConfig.event && dNextConfig.event[0];
    return ['入场', '闪进', '离场', '闪退', '全体入场', '全体闪进', '全体离场'].indexOf(evt) !== -1;
  },
  createFighterByIdx(npcPos, idx, flashIn) {
    const worldIdx = this.getWorldIdx();
    const warCom = mbgGame.warMgr.getWarCom(worldIdx);
    const dir = npcPos === "左" ? "右" : "左";
    const iTeam = this.pos2Team(npcPos);
    let walkTime = DefaultActionTime;
    if (this.m_Skip) {
      walkTime = 0.01;
    }
    const fighter = warCom.getFighterByPosIdx(iTeam, idx - 1);
    let fighterCom;
    if (fighter) {
      fighterCom = fighter.getComponent('fighter');
      if (fighterCom.isDie()) {
        fighterCom.ctrl().revive();
      }
      fighterCom.walkCtrl().enterScene(dir, walkTime, flashIn);
    }
  },
  createFighter(dDialogConfig, flashIn) {
    const self = this;
    let fighter;
    let exist = false;
    const worldIdx = this.getWorldIdx();
    const warCom = mbgGame.warMgr.getWarCom(worldIdx);
    const event = dDialogConfig.event;
    const posIdx = +event[1];
    const npcPos = event[2]; // npc站位:  右/左/中
    const dir = npcPos === "左" ? "右" : "左";
    const iTeam = this.pos2Team(npcPos);
    const spinename = this.getSpineName(dDialogConfig);
    mbgGame.log("createFighter, posIdx", posIdx, "npcPos", npcPos, "event", event);
    let walkTime = DefaultActionTime;
    if (this.m_Skip) {
      walkTime = 0.01;
    }
    fighter = warCom.getFighterBySpine(spinename, iTeam);
    let fighterCom;
    if (fighter) {
      fighterCom = fighter.getComponent('fighter');
      exist = true;
    }
    if (!exist) {
      fighter = cc.instantiate(mbgGame.preloadRes.fighter);
      fighterCom = fighter.getComponent('fighter');
      fighterCom.ctrl().resetFighter('createFighter');
      fighterCom.setTeam(iTeam);
      fighterCom.setWorldIdx(worldIdx);
      fighterCom.setMTplID(dDialogConfig.mTpl);
      // fighterCom.ctrl().initFighter(iTeam, null, null, worldIdx);
      fighterCom.setPosIdx(posIdx);
      fighterCom.ctrl().showShadow(false);
      warCom.getLayerGame().addChild(fighter);
      // fighterCom.effectCtrl().setYellLayer(warCom.getYellLayer());
    }
    if (exist) {
      if (fighterCom.isDie()) {
        fighterCom.ctrl().revive();
      }
      fighterCom.walkCtrl().enterScene(dir, walkTime, flashIn);
      return;
    }
    this.m_CachedPlotFighters.push(fighter);
    if (spinename) {
      // 位置
      const pos = warDefines.getStandPos(fighterCom.getTeam(), fighterCom.posIdx());
      fighterCom.spineCtrl().onSpineLoad = function () {
        self.setSpineCb(fighter, spinename, dDialogConfig.scale);
        fighterCom.ctrl().walkCtrl().enterScene(dir, walkTime, flashIn);
        if (npcPos === "左") {
          fighterCom.setTeam(1);
        } else { // 右
          fighterCom.setTeam(2);
        }
      };
      fighterCom.spineCtrl().loadSpine(spinename);
    } else {
      fighter.opacty = 0;
      fighter.active = false;
      mbgGame.error("[createFighter] no spine", spinename, dDialogConfig.mTpl);
    }
  },
  pos2Team(sPos) {
    let iTeam;
    switch (sPos) {
      case "左":
        iTeam = 1;
        break;
      case "中":
        iTeam = 3;
        break;
      case "右":
        iTeam = 2;
        break;
      default:
        break;
    }
    return iTeam;
  },
  setSpineCb(fighterNode, spine, scale) {
    const fighter = fighterNode.getComponent('fighter');
    const ctrl = fighter.ctrl();
    fighter.setSpineName(spine);
    if (scale) {
      fighter.setScale(scale);
    }
    ctrl.initScale();
    if (spine === 'blank') {
      ctrl.showShadow(false);
    } else {
      ctrl.showShadow(true);
      ctrl.FSM().setState('walk');
    }
  },
  getLastFighterCom() {
    if (this.lastFighterCom) {
      if (!this.lastFighterCom.node) {
        delete this.lastFighterCom;
      }
    }
    return this.lastFighterCom;
  },
  customFinishPlot() {
    if (this.m_Skip) {
      if (this.m_DialogIdx < this.getDialogs().length) {
        for (let idx = this.m_DialogIdx + 1; idx < this.getDialogs().length; idx += 1) {
          this.m_DialogIdx = idx;
          this.showNextDialog();
        }
      }
    }
    if (this.m_BlankFighter) {
      this.m_BlankFighter.active = false;
    }
    const worldIdx = this.getWorldIdx();
    const warCom = mbgGame.warMgr.getWarCom(worldIdx);
    emitter.emit('story', this.plotIdx(), false);
    this.m_CurrentWorldIdx = null;
    const lastFighterCom = this.getLastFighterCom();
    if (lastFighterCom) {
      lastFighterCom.getComponent("say").hideDialogBubble();
    }
    this.lastFighterCom = null;
    if (this.m_CachedPlotFighters) {
      // 人物管理
      for (let i = 0; i < this.m_CachedPlotFighters.length; i++) {
        const fighter = this.m_CachedPlotFighters[i];
        const fighterCom = fighter.getComponent('fighter');
        warCom.addPlotFighter(fighterCom);
      }
    }
    warCom.onShowPlotEnd(this.plotIdx());
    this.m_CachedPlotFighters = [];
    this.doEndCB();
  },
  plotIdx() {
    return +((this.plotData().plotID).toString().substr(-1));
  },
  getSayFighterCom(dConfig) {
    let fighterCom = this.getCachedFighterCom(dConfig);
    if (!fighterCom) {
      const worldIdx = this.getWorldIdx();
      const warCom = mbgGame.warMgr.getWarCom(worldIdx);
      if (dConfig.mTpl < 0) {
        const posIdx = Math.abs(dConfig.mTpl) - 1;
        fighterCom = warCom.getFighterByPosIdx(warDefines.TEAM_RIGHT, posIdx);
      } else {
        const spinename = this.getSpineName(dConfig);
        fighterCom = warCom.getFighterComBySpine(spinename);
      }
    }
    return fighterCom;
  },
  getCachedFighterCom(dConfig) {
    // 根据spinename找到剧情里对应的fighter
    for (let i = 0; i < this.m_CachedPlotFighters.length; i++) {
      const fighterCom = this.m_CachedPlotFighters[i].getComponent('fighter');
      if (!fighterCom) {
        continue;
      }
      if (fighterCom && fighterCom.getMTplID() === dConfig.mTpl) {
        return fighterCom;
      }
    }
    return null;
  },
  // 从数组中删除即可
  removeCachedFighterCom(fighterCom) {
    for (let i = 0; i < this.m_CachedPlotFighters.length; i++) {
      const _fighterCom = this.m_CachedPlotFighters[i].getComponent('fighter');
      if (_fighterCom === fighterCom) {
        this.m_CachedPlotFighters.splice(i, 1);
        break;
      }
    }
  },
});