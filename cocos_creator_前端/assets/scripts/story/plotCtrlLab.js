const plotCtrlBase = require('plotCtrlBase');

cc.Class({
  extends: plotCtrlBase,
  properties: {

  },
  onLoad() {
    this.maskDuration = 0.001;
    mbgGame.plotLab = this;
  },
  onDestroy() {
    delete mbgGame.plotLab;
  },
  customInitPlot() {
    this.plotMaskCom().setMaskMode('labHall');
    this.showNextDialog();
  },
  customFinishPlot() {
    this.doEndCB();
    if (this.m_Fighters) {
      const fighters = _.clone(this.m_Fighters);
      for (const mTplID in fighters) {
        this.destroyFighter(mTplID);
      }
    }
    // 一人一个虫洞
    if (this.m_Holes) {
      const holes = _.clone(this.m_Holes);
      for (const spinename in holes) {
        this.destroyWormhole(spinename);
      }
    }
    this.m_Holes = null;
    this.m_Fighters = null;
    mbgGame.log("lab plot, fighters released");
  },
  getHoleHeight() {
    return 164;
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
    if (this.lastFighter) {
      this.lastFighter.getComponent("say").hideDialogBubble();
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
  onDialogEvent(dConfig) {
    let waitTime = 0;
    const event = dConfig.event;
    const spinename = this.getSpineName(dConfig);
    if (!event) {
      return waitTime;
    }
    const action = event[0];
    if (action === "洞进") {
      const dis = +event[1];
      waitTime = 1.3;
      const x = -200 + dis;
      const holePos = { x, y: this.getHoleHeight() };
      this.createWormhole(spinename, holePos, true);
      // 放到mask节点里
      const maskNode = this.createMaskNode(holePos);
      const originPos = { x: 0, y: 0 };
      const targetPos = { x: 0, y: -162 };
      const fighter = this.createFighter(dConfig.mTpl, spinename,
        originPos, targetPos, maskNode);
      fighter._x = x;
      const dNextConfig = this.getNextDialogConfig();
      if (this.isEnterOrLeaveEvent(dNextConfig)) {
        waitTime = 0;
      }
      // { x: holePos.x, y: holePos.y - 40 }
    } else if (action === "前进") {
      const fighterCom = this.getFighterCom(dConfig.mTpl);
      const fighter = fighterCom.node;
      const maskNode = fighter.parent;
      fighter.removeFromParent(false);
      maskNode.destroy();
      this.getFloorNode(1).addChild(fighter);
      fighter.x = fighter._x;
      fighter.y = 0;
      delete fighter.m_targetPos;
      this.destroyWormhole(spinename);
      waitTime = 2;
      fighterCom.FSM().setState('walk');
      const dis = +event[1];
      const dir = event[2];
      fighter.stopAllActions();
      fighter.runAction(cc.sequence(
        cc.moveBy(2, cc.v2(dir === "右" ? dis : -dis, 0)),
        cc.callFunc(() => {
          if (fighterCom && fighterCom.isValid) {
            fighterCom.FSM().setState('stand');
          }
        })
      ));
      const dNextConfig = this.getNextDialogConfig();
      const evt = dNextConfig && dNextConfig.event && dNextConfig.event[0];
      if (evt === "前进") {
        waitTime = 0;
      }
    } else if (action === "洞退") {
      waitTime = 2;
      const dNextConfig = this.getNextDialogConfig();
      if (this.isEnterOrLeaveEvent(dNextConfig)) {
        waitTime = 0;
      }
      const fighterCom = this.getFighterCom(dConfig.mTpl);
      const fighter = fighterCom.node;
      const holePos = { x: fighter.x, y: this.getHoleHeight() };
      this.createWormhole(spinename, holePos, false);
      const maskNode = this.createMaskNode(holePos);
      fighter.removeFromParent(false);
      maskNode.addChild(fighter);
      fighterCom.spineCtrl().loadSpine(spinename);
      fighter.x = 0;
      fighter.y = -162;
      const gravityMoveCom = fighterCom.node.getComponent("gravityMove");
      gravityMoveCom.setVelocity(-10);
      gravityMoveCom.setGravity(250);
      const targetPos = { x: 0, y: 0 };
      gravityMoveCom.setTargetPos(targetPos);
      gravityMoveCom.startMove();
      this.scheduleOnce(() => {
        this.destroyFighter(dConfig.mTpl);
        this.destroyWormhole(spinename);
      }, 1.9);
    }
    return waitTime;
  },
  isEnterOrLeaveEvent(dNextConfig) {
    const evt = dNextConfig && dNextConfig.event && dNextConfig.event[0];
    return evt === '洞进' || evt === '洞退';
  },
  getFloorCom(idx) {
    const floorCom = mbgGame.panelLab.getFloorCom(idx);
    return floorCom;
  },
  getFloorNode(idx) {
    const floorCom = mbgGame.panelLab.getFloorCom(idx);
    return floorCom.node;
  },
  getFighterCom(mTplID) {
    return this.m_Fighters[mTplID];
  },
  createMaskNode(pos) {
    const node = new cc.Node();
    node.anchorY = 1;
    node.setContentSize(172, 314);
    this.getFloorNode(1).addChild(node);
    const mask = node.addComponent(cc.Mask);
    mask.type = cc.Mask.Type.ELLIPSE;
    mask.segements = 225;
    node.x = pos.x;
    node.y = pos.y;
    return node;
  },
  createFighter(mTplID, spinename, pos, targetPos, parent) {
    const fighter = cc.instantiate(mbgGame.preloadRes.fighter);
    parent.addChild(fighter);
    const fighterCom = fighter.getComponent("fighter");
    fighterCom.spineCtrl().onSpineLoad = function() {
      fighterCom.FSM().setState('stand');
      fighterCom.ctrl().showShadow(false);
      fighterCom.turnRight();
    };
    fighterCom.ctrl().resetFighter('plotLab');
    fighterCom.setMTplID(mTplID);
    fighterCom.setSpineName(spinename);
    fighterCom.spineCtrl().loadSpine(spinename);
    fighter.x = pos.x;
    fighter.y = pos.y;
    const gravityMoveCom = fighter.addComponent("gravityMove");
    gravityMoveCom.setVelocity(-10);
    gravityMoveCom.setGravity(-250);
    gravityMoveCom.setTargetPos(targetPos);
    gravityMoveCom.startMove();
    if (!this.m_Fighters) {
      this.m_Fighters = {};
    }
    this.m_Fighters[mTplID] = fighterCom;
    return fighter;
  },
  destroyFighter(mTplID) {
    const fighterCom = this.m_Fighters[mTplID];
    if (!fighterCom) {
      return;
    }
    if (this.lastFighter && this.lastFighter === fighterCom.node) {
      delete this.lastFighter;
    }
    delete this.m_Fighters[mTplID];
    fighterCom.node.destroy();
  },
  destroyWormhole(spinename) {
    const node = this.m_Holes[spinename];
    node.destroy();
    delete this.m_Holes[spinename];
  },
  createWormhole(spinename, pos, holeIn) {
    const node = new cc.Node();
    node.addComponent('sp.Skeleton');
    const spineObj = node.addComponent("spineObject");
    this.getFloorNode(1).addChild(node);
    node.x = pos.x;
    node.y = pos.y;
    spineObj.onSpineLoad = function() {
      this.doAction('start', false);
    };
    spineObj.loadSpine('wormhole');
    if (!this.m_Holes) {
      this.m_Holes = {};
    }
    this.m_Holes[spinename] = node;
  },
  fighterSay(dConfig) {
    const spinename = this.getSpineName(dConfig);
    let fighterCom = this.getFighterCom(dConfig.mTpl);
    if (fighterCom) {
      this.lastFighter = fighterCom.node;
      fighterCom.FSM().setState('stand');
      const ctrl = fighterCom.ctrl();
      ctrl.say({
        arrowType: 1,
        text: dConfig.str,
      });
      return;
    }
    // 一样有say函数就行了
    const node = this.getFloorCom(1).getCharacter(spinename);
    if (!node) {
      mbgGame.error("[plotCtrlLab] getCharacter", spinename, dConfig.mTpl);
      return;
    }
    fighterCom = node.getComponent('floorCharacter');
    fighterCom.say(dConfig.str, null, false);
    this.lastFighter = fighterCom.node;
  },
});
