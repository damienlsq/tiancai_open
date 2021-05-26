const labdefines = require('labdefines');
const defines = require('warDefines');

const MOVE_ONE_POINT_PER_TIME = 0.02; // 角色移动一个点所需时间

cc.Class({
  extends: cc.Component,
  properties: {
    nameTitle: cc.Label,
    shadow: cc.Node,
    iconSelected: cc.Node,
    labelNum: cc.Label,
    lv: cc.Label,
    clickLayer: cc.Node,
    selectFrame: cc.Node,
    spineNode: cc.Node,
    npcNode: cc.Node,
  },

  // use this for initialization
  onLoad() {
    this._speed = 1;
    this.resetActionList();
  },
  resetActionList() {
    this.actionList = [
      { action: 'normal', weight: 100 },
    ];
  },
  setClickLayerEnabled(b) {
    this.clickLayer.active = b;
  },
  getRant(conf) {
    const charaID = this.cData.charaID;
    const sayConfigs = [];
    let sayConfig;

    if (!conf) {
      _.mapKeys(mbgGame.config.rant, (value, id) => {
        if (value.scene) {
          if (value.scene !== this.cData.scene) return;
        }
        if (value.chara) {
          if (_.isArray(value.chara)) {
            if (!_.includes(value.chara, charaID)) return;
          } else if (value.chara !== charaID) return;
        }
        value.id = id;
        if (value.special) {
          // 特殊概率设置对白
          if (value.special === -1) return;
          if (_.random(100) > +value.special) {
            return;
          }
        }
        sayConfigs.push(value);
      });
      if (sayConfigs.length) {
        sayConfig = _.sample(sayConfigs);
      }
    } else {
      sayConfig = conf;
    }

    let msg = '';
    if (sayConfig) {
      msg = mbgGame.getString(`rant${sayConfig.id}`);

      if (sayConfig.action) {
        // 有后续对白
        const nextConfig = mbgGame.config.rant[sayConfig.action];
        if (nextConfig) {
          // 查找出改对白配置的角色
          const charaCom = this.cData.sceneCom.getCharacterCom(+nextConfig.chara);
          if (charaCom) {
            // 该角色插播对白
            charaCom.insertSayAction(nextConfig);
          }
        }
      }
    }
    return msg;
  },
  initMe() {
    delete this.m_oldActions;
    this.spineCtrl().unscheduleAllCallbacks();
    this.unscheduleAllCallbacks();
    if (this.cData.mode === "actionList") {
      let needTime = 5;
      this.stand();
      if (this.cData.firstAction === 'holeIn') {
        this.createHole();
      } else if (this.cData.firstAction === 'leftIn') {
        needTime = this.moveIn();
      } else if (this.cData.firstAction === 'rightIn') {
        needTime = this.moveIn(true);
      } else if (this.cData.firstAction === 'transferIn') {
        this.transferIn();
      }
      this.scheduleNextAction(needTime + _.random(5));
    } else if (this.cData.mode === 'holeIn') {
      this.createHole();
      this.playExAction('normal', true);
    } else if (this.cData.mode === 'leftIn') {
      this.moveIn();
    } else if (this.cData.mode === 'rightIn') {
      this.moveIn(true);
    } else if (this.cData.mode === 'randStand') {
      // 随机显示
      this.randStand();
    } else if (this.cData.mode === 'squareInOut') {
      this.squareInOut();
    } else if (this.cData.mode === 'resultIn') {
      this.resultIn();
    } else if (this.cData.mode === 'action') {
      this.playExAction(this.cData.modeAction, true);
    } else {
      this.playExAction('normal', true);
    }
  },
  getAwardObjY() {
    return this.nameTitle.node.y + 10;
  },
  onCreated(data) {
    this.setSelected(false);
    this.showShadow(true);
    if (!data) return;
    this.cData = data;
    if (!data.charaID && !data.spineName) return;
    const spineName = data.spineName || `chara${data.charaID}`;
    if (data.name) {
      this.nameTitle.node.active = true;
      this.nameTitle.string = data.name;
      this.node.name = data.name;
    } else {
      this.nameTitle.node.active = false;
      this.node.name = spineName;
    }
    const size = defines.getMTpl_Size(this.mTplID());
    this.nameTitle.node.y = size.height + 3;
    this.setLv(data.lv);
    if (!this.actionLayer) {
      this.actionLayer = this.node.parent;
    }
    if (this.cData.speed) this._speed = this.cData.speed;
    this.actionList = this.cData.actionList;
    this.node.charaID = data.charaID;
    this.standStr = this.cData.charaID <= 15 ? 'normal' : 'stand';
    this.moveStr = this.cData.charaID <= 15 ? 'go' : 'walk';
    if (this.cData.withWeapon) {
      this.moveStr = 'war_walk'; // 带武器移动
      this.standStr = 'war_stand';
    }
    this.spineCtrl().loadSpine(spineName);

    // 先初始化位置

    if (this.cData.posX) {
      if (this.cData.posX === 'randX') {
        this.node.x = this.getRandX();
      } else if (this.cData.posX === 'randXY') {
        const pos = this.getRandXY();
        this.node.x = pos.x;
        this.node.y = pos.y;
      } else if (_.isNumber(this.cData.posX)) {
        this.node.x = this.cData.posX;
      }
    }

    this.initMe();
  },
  setLv(lv) {
    if (lv) {
      this.lv.node.active = true;
      this.lv.string = `${lv}${mbgGame.getString("lv")}`;
    } else {
      this.lv.node.active = false;
    }
  },
  setTime(timeStr) {
    if (timeStr) {
      this.lv.node.active = true;
      this.lv.string = `${timeStr}`;
    } else {
      this.lv.node.active = false;
    }
  },
  charaID() {
    return this.cData && this.cData.charaID;
  },
  mTplID() {
    return (this.cData && this.cData.mTplID) || defines.getMTplIDByCharaID(this.charaID());
  },
  spine() {
    return this.spineNode;
  },
  isSelected() {
    return this.iconSelected.active;
  },
  showShadow(show) {
    this.shadow.active = show;
  },
  setSelected(select) {
    this.iconSelected.active = select;
  },
  setNum(show, num) {
    if ((show && !this.labelNum.node.parent.active) || this.labelNum.string !== `${num}`) {
      mbgGame.managerUi.changeEffect(this.labelNum.node.parent, 0.1, 1.5);
      this.labelNum.string = `${num}`;
    }
    this.labelNum.node.parent.active = show;
  },
  spineCtrl() {
    return this.spine().getComponent('spineCtrl');
  },
  turnRight() {
    this.spineCtrl().turnRight();
  },
  turnLeft() {
    this.spineCtrl().turnLeft();
  },
  getSceneName() {
    return this.cData.scene;
  },
  getRandX() {
    // 获得一个有效范围内搭随机X
    if (!this.actionLayer) return -1024;
    if (_.random(1)) {
      return _.random((this.actionLayer.width - this.node.width) / 2);
    }
    return _.random((this.actionLayer.width - this.node.width) / 2) * -1;
  },
  getRandY() {
    // 获得一个有效范围内搭随机X
    if (!this.actionLayer) return -1024;
    if (this.cData.posY) {
      return this.cData.posY;
    }
    if (_.random(1)) {
      return _.random(this.actionLayer.height / 2);
    }
    return _.random(this.actionLayer.height / 2) * -1;
  },
  // 计算直角三角形斜边
  calcHypotenuse(a, b) {
    return Math.abs(Math.sqrt((Math.abs(a) ** 2) + (Math.abs(b) ** 2)));
  },
  doRand() {
    let x = -1024;
    let y = -1024;
    if (_.random(1)) {
      y = _.random(this.actionLayer.height / 2);
    } else {
      y = _.random(this.actionLayer.height / 2) * -1;
    }
    if (_.random(1)) {
      x = _.random(this.actionLayer.width / 2);
    } else {
      x = _.random(this.actionLayer.width / 2) * -1;
    }
    return { x, y };
  },
  getRandXY() {
    let xy = this.doRand();
    // todo 记录最上10次移动坐标，随机的不在该范围+-25 以内
    if (this.cData.sceneCom) {
      this.cData.sceneCom._randLog = this.cData.sceneCom._randLog || [];

      if (this.cData.sceneCom._randLog.length > 10) {
        this.cData.sceneCom._randLog.shift();
      }
      let check = true;
      while (check) {
        check = false;
        for (let i = 0; i < this.cData.sceneCom._randLog.length; i++) {
          const checkXY = this.cData.sceneCom._randLog[i];
          if (this.calcHypotenuse(checkXY.x - xy.x, checkXY.y - xy.y) < 30) {
            check = true;
            // mbgGame.log('getRandXY near', checkXY, this.cData.sceneCom._randLog, i);
            break;
          }
        }
        if (check) {
          xy = this.doRand();
        }
      }

      this.cData.sceneCom._randLog.push(xy);
    }

    return xy;
  },
  doAction(...args) {
    if (!this.cData.withWeapon) {
      this.spineCtrl().setVoidWeapon();
    }
    this.spineCtrl().doAction(...args);
  },
  playEffect(spinename) {
    if (spinename) {
      spinename = 'criticeffect';
    }
    const node = new cc.Node();
    node.addComponent(sp.Skeleton);
    const com = node.addComponent("spineObject");
    this.node.addChild(node);
    node.zIndex = -999;
    com.onSpineLoad = function () {
      this.playAnimationAndDestroy(spinename);
    };
    com.loadSpine(spinename);
  },
  playExAction(act, loop) {
    if (!act) {
      return;
    }
    const dAction = mbgGame.config.actions[act];
    if (!dAction) {
      mbgGame.error("[playExAction] no config", act);
      return;
    }
    if (!this.spineCtrl().isSpineLoaded()) {
      this.scheduleOnce(this.playExAction.bind(this, act, loop), 0.5);
      return;
    }
    // mbgGame.log("playExAction", act, loop, dAction, 'chara', this.cData.charaID);
    const ani = dAction.ani;
    const effect = dAction.effect;
    if (effect) {
      this.playEffect(effect);
    }
    const rweapon = dAction.rweapon;
    const lweapon = dAction.lweapon;
    this.spineCtrl().stop();
    this.spineCtrl().doActionNoClear(ani, !!loop);

    // npc不要跑下面的代码
    if (this.charaID() > 15) return;

    const spine = this.spineCtrl().spine();
    spine.timeScale = dAction.spd || 1;
    if (rweapon) {
      try {
        spine.setAttachment("rweapon", rweapon);
      } catch (e) {
        cc.warn("[playExAction] rweapon failed, ", ani, rweapon, this.spineCtrl().spineName());
      }
    } else {
      mbgGame.error("no rweapon", rweapon);
    }
    if (lweapon) {
      try {
        spine.setAttachment("lweapon", lweapon);
      } catch (e) {
        cc.warn("[playExAction] lweapon failed, ", ani, lweapon, this.spineCtrl().spineName());
      }
    } else {
      mbgGame.error("no lweapon", lweapon);
    }
  },
  nextExAction() {
    if (!this.spineCtrl().isSpineLoaded()) {
      this.scheduleNextAction(0.5);
      return;
    }
    const act = this.m_ExActions.shift();
    if (!act) {
      // mbgGame.log("no nextExAction");
      this.scheduleNextAction(5 + _.random(5));
      return;
    }

    this.playExAction(act, this.m_ExActions.length === 0);
    this.spineCtrl().setComplteCB(() => {
      // mbgGame.log("find nextExAction");
      this.nextExAction();
    });
  },
  playExActionList(acts) {
    this.m_ExActions = acts;
    this.nextExAction();
  },
  getExActionPrefix() {
    let prefix = '';
    const facType = labdefines.FacID2Type[this.cData.facID];
    if (facType === labdefines.FacType.Collector) {
      prefix = 'col';
    } else if (facType === labdefines.FacType.Read) {
      prefix = 'read';
    } else {
      prefix = `fac${this.cData.facID}`;
    }
    return prefix;
  },
  insertSayAction(config) {
    // 插队对话action
    this._nextSayConfig = config;
  },
  randAction() {
    if (this.cData && this.cData.actionOnceList) {
      const a = this.cData.actionOnceList.shift();
      if (a) {
        return a;
      }
      return null;
    }
    let actionList = this.actionList;
    if (this.actionLayer && this.actionLayer.actionList) {
      // 场景定义
      actionList = this.actionLayer.actionList;
    }
    const action = mbgGame.chooseFromWeight(actionList);
    if (!action) {
      return { action: 'none' };
    }
    // 获取一个随机动作
    return action;
  },
  floatIcon(iconName) {
    const node = new cc.Node();
    const sprite = node.addComponent(cc.Sprite);
    sprite.type = cc.Sprite.Type.SIMPLE;
    sprite.sizeMode = cc.Sprite.SizeMode.RAW;
    this.node.addChild(node);
    mbgGame.resManager.setAutoAtlasFrame(sprite, 'labIcon', iconName);
    node.y = this.getAwardObjY() - 10;
    node.x = 0;
    node.setAnchorPoint(0.5, 0.0);
    node.opacity = 0;
    node.runAction(cc.sequence(cc.spawn(cc.moveBy(0.15, cc.v2(0, 10)),
      cc.fadeIn(0.15)),
      cc.delayTime(3),
      cc.spawn(cc.moveBy(0.15, cc.v2(0, 10)), cc.fadeOut(0.15)),
      cc.removeSelf()));
  },
  nextAction() {
    if (!this.node || !this.node.isValid) return;
    const spine = this.spineCtrl().spine();
    spine.timeScale = 1; // 重置速度
    const dAction = this.randAction();
    if (!dAction) return;
    let action = dAction.action;
    if (this._nextSayConfig) {
      action = 'say';
    }
    // mbgGame.log("nextAction:", action, this.node.name);
    let actionTime = 0;
    switch (action) {
      case 'move': // 移动
        actionTime = this.move(action.goX);
        break;
      case 'squareMove':
        actionTime = this.squareMove();
        break;
      case 'facidle': {
        // 研究所的idle
        actionTime = 3;
        const num = labdefines.FacID2IdleActionNum[this.cData.facID];
        let idleIdx = _.random(num - 1);
        if (idleIdx === 0) {
          idleIdx = '';
        }
        this.playExActionList([`${this.getExActionPrefix()}_idle${idleIdx}`]);
        break;
      }
      case 'faccritic': {
        actionTime = 3;
        const facData = mbgGame.player.getFacDataByFacID(this.cData.facID);
        if (!facData) {
          this.playExActionList([this.standStr]);
          break;
        }
        if (facData.d) {
          // 超时的就不要冒表情了
          if (moment().unix() >= (facData.d + facData.trT)) {
            this.playExActionList([this.standStr]);
            break;
          }
        }
        if (facData.b) {
          // 用真实的
          const happyLvl = mbgGame.player.getBookHappyLvl(this.cData.charaID, facData.b, 3);
          if (happyLvl < 5) {
            this.playExActionList([this.standStr]);
            break;
          }
        }
        if (facData.idx) { // 任务
          const dTask = mbgGame.player.getCurTasks();
          const task = dTask[facData.idx];
          if (!task) {
            this.playExActionList([this.standStr]);
            break;
          }
          const happyLvl = mbgGame.player.getTaskHappyLvl(this.cData.charaID, task.id);
          if (happyLvl < 5) {
            this.playExActionList([this.standStr]);
            break;
          }
        }
        // 只有喜好大于4的才会显示暴击
        const act = `${this.getExActionPrefix()}_critic`;
        this.playExActionList([`${act}0`, `${act}1`]);
        break;
      }
      case 'idle':
        {
          actionTime = 3;
          // 正在移动就不要idle
          if (this.isMoving) {
            break;
          }
          const idleAction = _.sample(['idle1', 'idle2']);
          this.playExActionList([idleAction]);
          break;
        }
      case 'waridle':
        {
          actionTime = 3;
          // 正在移动就不要idle
          if (this.isMoving) {
            break;
          }
          const idleAction = _.sample([this.standStr]);
          this.playExActionList([idleAction]);
          break;
        }
      case 'showAward': {
        if (dAction.type === "battle") {
          mbgGame.panelSquare && mbgGame.panelSquare.showAward(this);
        }
        break;
      }
      case 'facHappy': {
        const facData = mbgGame.player.getFacDataByFacID(this.cData.facID);
        if (!facData) {
          this.playExActionList([this.standStr]);
          break;
        }
        const now = moment().unix();
        if (facData.d) {
          // 超时的就不要冒表情了
          if (now >= (facData.d + facData.trT)) {
            this.playExActionList([this.standStr]);
            break;
          }
        }
        let happyLvl = 3;
        if (facData.b) {
          // 读书
          happyLvl = mbgGame.player.getBookHappyLvl(this.cData.charaID, facData.b, 2);
          // mbgGame.log('facHappy:', facData, happyLvl);
        } else if (facData.f) {
          // 任务
          if (now - facData.trT <= 15 * 60) {
            this.playExActionList([this.standStr]);
            break;
          }
          happyLvl = mbgGame.player.getTaskHappyLvl(this.cData.charaID, facData.f);
        } else {
          // 娱乐
          happyLvl = mbgGame.player.getGymHappyLvl(this.cData.charaID, this.cData.facID);
        }
        this.floatIcon(`dface${7 - happyLvl}`);
        break;
      }
      case 'say':
        {
          if (mbgGame.player && mbgGame.player.isShowingPlot()) {
            break;
          }
          if (this.cData.sceneCom && this.cData.sceneCom.checkSay) {
            if (this.cData.sceneCom.checkSay(this.cData.charaID)) {
              this.playExActionList([this.standStr]);
              break;
            }
          }
          if (!this.isMoving) {
            // 移动中也可以说话
            this.playExActionList([this.standStr]);
          }
          let msg;
          if (dAction.type === "rant") {
            msg = this.getRant(this._nextSayConfig);
            delete this._nextSayConfig;
          } else if (dAction.type === "lab") {
            msg = mbgGame.player.getFacTalk(this.charaID(), true);
          } else if (dAction.type === "battle") {
            msg = mbgGame.panelSquare && mbgGame.panelSquare.getBattleSelfTalk(this);
          }
          if (msg) {
            this.say(msg, msg.length <= 10 ? 3 : 5);
          }
          break;
        }
      case 'stand': // 站
        // 正在移动就不要idle
        if (this.isMoving) {
          break;
        }
        this.playExActionList(['stand']);
        break;
      case 'normal': // 站
      case 'none':
        // 正在移动就不要idle
        if (this.isMoving) {
          break;
        }
        this.playExActionList([this.standStr]);
        break;
      case 'remove':
        this.removeMe();
        return;
      case 'leftOut':
        this.leftOut();
        return;
      case 'holeOut':
        this.holeOut();
        return;
      case 'transferOut':
        this.transferOut();
        return;
      case 'win':
        this.playExActionList(['win']);
        return;
      default:
        this.playExActionList([action]);
        break;
    }
    this.scheduleNextAction(actionTime + _.random(15));
  },
  scheduleNextAction(t) {
    // mbgGame.log("scheduleNextAction:", t, this.node.name);
    const actions = cc.sequence(cc.delayTime(t),
      cc.callFunc(() => {
        this.nextAction();
      }));
    if (this.m_oldActions) {
      this.node.stopAction(this.m_oldActions);
      delete this.m_oldActions;
    }
    this.node.runAction(actions);
    this.m_oldActions = actions;
  },
  randStand() {
    const pos = this.getRandXY();
    this.node.x = pos.x;
    this.node.y = pos.y;
    this.stand();
    this.scheduleNextAction(5 + _.random(15));
  },
  stand() {
    this.playExAction(this.standStr, true);
  },
  move(goX) {
    this.playExAction(this.moveStr, true);
    let moveToX;
    if (goX == null) {
      moveToX = this.getRandX();
    } else {
      moveToX = goX;
    }
    const toX = moveToX - this.node.x;
    if (moveToX < this.node.x) {
      this.turnLeft();
    } else {
      this.turnRight();
    }
    const needTime = Math.abs(toX * MOVE_ONE_POINT_PER_TIME * this._speed);
    // mbgGame.log("moveTo", moveToX, needTime);
    this.node.runAction(cc.sequence(cc.moveTo(needTime, new cc.Vec2(moveToX, this.node.y)),
      cc.callFunc(() => {
        this.nextAction();
      })));
    return needTime;
  },
  squareMove() {
    if (this.isMoving) {
      this.nextAction();
      return 5;
    }
    this.playExAction(this.moveStr, true);
    const pos = this.getRandXY();
    const goX = pos.x - this.node.x;
    const goY = pos.y - this.node.y;
    if (goX < 0) {
      this.turnLeft();
    } else {
      this.turnRight();
    }
    this.isMoving = true;
    const needTime = Math.abs(this.calcHypotenuse(goX, goY) * MOVE_ONE_POINT_PER_TIME * this._speed);
    // mbgGame.log("moveTo", moveToX, moveToY, needTime);
    this.node.runAction(cc.sequence(
      cc.moveTo(needTime, new cc.Vec2(pos.x, pos.y)),
      cc.callFunc(() => {
        this.playExActionList([this.standStr]);
        delete this.isMoving;
        this.nextAction();
      })));
    return needTime;
  },
  moveIn(isRightIn) {
    const moveToX = this.node.x;
    if (isRightIn) {
      this.node.x = 400 + _.random(30);
    } else {
      this.node.x = -400 - _.random(30);
    }
    this.playExAction(this.moveStr, true);
    const goX = moveToX - this.node.x;
    if (goX < 0) {
      this.turnLeft();
    } else {
      this.turnRight();
    }
    this.isMoving = true;
    const needTime = Math.abs(this.calcHypotenuse(goX, 0) * MOVE_ONE_POINT_PER_TIME * this._speed);
    // mbgGame.log("moveTo", moveToX, needTime);
    this.node.runAction(cc.sequence(
      cc.moveTo(needTime, new cc.Vec2(moveToX, this.node.y)),
      cc.callFunc(() => {
        delete this.isMoving;
        this.playExActionList([this.standStr]);
      })));
    return needTime;
  },
  stopNow() {
    // 暂停下来
    this.node.pauseAllActions();
  },
  resumeNow() {
    // 恢复下来
    this.node.resumeAllActions();
  },
  // 广场进来后就马上走
  squareInOut() {
    let moveToX;
    if (_.random(1)) {
      this.node.x = 400;
      moveToX = -400;
    } else {
      this.node.x = -400;
      moveToX = 400;
    }
    if (moveToX < 0) {
      this.turnLeft();
    } else {
      this.turnRight();
    }
    this.playExAction(this.moveStr, true);
    this.isMoving = true;
    // 走慢点
    const needTime = Math.abs(this.calcHypotenuse(moveToX, 0) * MOVE_ONE_POINT_PER_TIME * this._speed);
    // mbgGame.log("moveTo", moveToX, needTime);
    this.node.runAction(cc.sequence(
      cc.moveTo(needTime, new cc.Vec2(moveToX, this.node.y)),
      cc.callFunc(() => {
        delete this.isMoving;
        this.removeMe();
      })));
    return needTime;
  },
  // 结算界面进入
  resultIn() {
    const moveToX = 0;
    this.node.x = -400;
    const goX = moveToX - this.node.x;
    this.turnRight();
    this.doAction('hintMove', true);
    this.isMoving = true;
    // 走很快
    const needTime = Math.abs(this.calcHypotenuse(goX, 0) * MOVE_ONE_POINT_PER_TIME * this._speed);
    this.node.runAction(cc.sequence(
      cc.moveTo(needTime, new cc.Vec2(moveToX, this.node.y)),
      cc.callFunc(() => {
        delete this.isMoving;
        if (this.cData.msg) {
          this.doAction('hintStand', true);
          this.say(this.cData.msg, 999);
        }
      })));
    return needTime;
  },
  // 结算界面离开
  resultOut() {
    const moveToX = 400;
    this.node.x = 0;
    const goX = moveToX - this.node.x;
    this.turnRight();
    this.doAction('hintMove', true);
    this.isMoving = true;
    // 走很快
    const needTime = Math.abs(this.calcHypotenuse(goX, 0) * MOVE_ONE_POINT_PER_TIME * this._speed);
    this.node.runAction(cc.moveTo(needTime, new cc.Vec2(moveToX, this.node.y)));
    return needTime;
  },
  squareOut(speed) {
    if (!this.isValid) {
      return 5;
    }
    let goX;
    if (this.cData && this.cData.mode === 'holeIn') {
      this.holeOut();
      return 5;
    } else if (this.cData && this.cData.mode === 'leftIn') {
      // 左进右出
      goX = 500;
    } else {
      // 右进左出
      goX = -500;
    }
    this.playExAction(this.moveStr, true);
    if (goX < 0) {
      this.turnLeft();
    } else {
      this.turnRight();
    }
    const needTime = Math.abs(goX * MOVE_ONE_POINT_PER_TIME * (speed || this._speed));
    this.node.runAction(cc.sequence(
      cc.moveTo(needTime, new cc.Vec2(goX, this.node.y)),
      cc.callFunc(() => {
        this.removeMe();
      })));
    return needTime;
  },
  leftOut(speed) {
    this.playExAction(this.moveStr, true);
    const goX = -500;
    if (goX < 0) {
      this.turnLeft();
    } else {
      this.turnRight();
    }
    const needTime = Math.abs(goX * MOVE_ONE_POINT_PER_TIME * (speed || this._speed));
    this.node.runAction(cc.sequence(
      cc.moveTo(needTime, new cc.Vec2(goX, this.node.y)),
      cc.callFunc(() => {
        this.removeMe();
      })));
    return needTime;
  },
  transferIn(isOut) {
    const wormholeNode = new cc.Node();
    this.node.addChild(wormholeNode);
    wormholeNode.setPosition(0, 150);

    if (this.cData.sceneCom) {
      const spineNode = cc.find('tDoor', this.cData.sceneCom.node);
      const transferSpine = spineNode.getComponent('sp.Skeleton');
      transferSpine.setAnimation(0, 'open', false);
      transferSpine.addAnimation(0, 'close', true);
    }

    const mask = this.npcNode.addComponent(cc.Mask);
    mask.type = cc.Mask.Type.ELLIPSE;
    mask.segements = 225;
    this.npcNode.setContentSize(172, 150);

    const spineNode = this.spine();
    if (!isOut) {
      spineNode.y = 200;
      if (this.cData.name) {
        this.nameTitle.node.active = false;
      }
      if (this.cData.lv) {
        this.lv.node.active = false;
      }
    }
    const gravityMoveCom = spineNode.addComponent("gravityMove");
    gravityMoveCom.setVelocity(isOut ? 0 : -10);
    gravityMoveCom.setGravity(isOut ? 450 : -450);
    gravityMoveCom.setTargetPos(
      isOut ? { x: 0, y: 250 } : { x: 0, y: 0 },
      () => {
        this.npcNode.removeComponent(cc.Mask);
        this.npcNode.setContentSize(0, 0);
        wormholeNode.destroy();
        if (isOut) {
          this.removeMe();
        } else {
          if (this.cData.name) {
            this.nameTitle.node.active = true;
          }
          if (this.cData.lv) {
            this.lv.node.active = true;
          }
          if (this.holeInCB) {
            this.holeInCB();
          }
        }
      });
    gravityMoveCom.startMove();

    return wormholeNode;
  },
  transferOut() {
    // 先移动到出发点
    const moveToX = this.cData.posX;
    const toX = moveToX - this.node.x;
    if (moveToX < this.node.x) {
      this.turnLeft();
    } else {
      this.turnRight();
    }
    const needTime = Math.abs(toX * MOVE_ONE_POINT_PER_TIME * this._speed);
    // mbgGame.log("moveTo", moveToX, needTime);
    this.node.runAction(cc.sequence(cc.moveTo(needTime, new cc.Vec2(moveToX, this.node.y)),
      cc.callFunc(() => {
        this.transferIn(true);
      })));
  },

  createHole(isOut) {
    const wormholeNode = new cc.Node();
    this.node.addChild(wormholeNode);
    wormholeNode.addComponent('sp.Skeleton');
    const spineObj = wormholeNode.addComponent("spineObject");
    spineObj.loadSpine('wormhole');
    spineObj.doSequenceAction('start', 'continued');
    wormholeNode.setPosition(0, 200);

    const mask = this.npcNode.addComponent(cc.Mask);
    mask.type = cc.Mask.Type.ELLIPSE;
    mask.segements = 225;
    this.npcNode.setContentSize(172, 200);

    const spineNode = this.spine();
    if (!isOut) {
      spineNode.y = 250;
      if (this.cData.name) {
        this.nameTitle.node.active = false;
      }
      if (this.cData.lv) {
        this.lv.node.active = false;
      }
    }
    const gravityMoveCom = spineNode.addComponent("gravityMove");
    gravityMoveCom.setVelocity(isOut ? 0 : -10);
    gravityMoveCom.setGravity(isOut ? 450 : -450);
    gravityMoveCom.setTargetPos(
      isOut ? { x: 0, y: 250 } : { x: 0, y: 0 },
      () => {
        this.npcNode.removeComponent(cc.Mask);
        this.npcNode.setContentSize(0, 0);
        wormholeNode.destroy();
        if (isOut) {
          this.removeMe();
        } else {
          if (this.cData.name) {
            this.nameTitle.node.active = true;
          }
          if (this.cData.lv) {
            this.lv.node.active = true;
          }
          if (this.holeInCB) {
            this.holeInCB();
          }
        }
      });
    gravityMoveCom.startMove();

    return wormholeNode;
  },
  holeOut() {
    this.createHole(true);
  },
  removeMe() {
    if (this.cData && this.cData.sceneCom && this.cData.sceneCom.charaRemove) {
      this.cData.sceneCom.charaRemove(this);
    }
    this.node.destroy();
  },
  say(text, hideDelay, aboutHide) {
    if (aboutHide == null) aboutHide = true;
    const pos = cc.v2(0, 0);
    let size = defines.getMTpl_Size(this.mTplID());

    if (!size) {
      mbgGame.error("dialog error", '不能根据SpineName拿到size');
      size = new cc.Vec2(100, 100);
    }
    pos.y += size.height + 10;
    this.node.getComponent('say').say(text, pos, 1, aboutHide, hideDelay, false);
  },
  clickCharacter() {
    if (this.cData.clickDisable) return;
    // mbgGame.log('clickCharacter', this.getSceneName(), this.cData);
    if (this.cData.sceneCom && this.cData.sceneCom.clickCharacter) {
      this.cData.sceneCom.clickCharacter(this);
    }
  },
});
