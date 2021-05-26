const defines = require('warDefines');
const fighterBase = require('fighterBase');
const assert = require('assert');

/*
    一些只和表现有关的函数（ 要写成函数化，不要用到其他fighter组件 ）
    由fighterctrl.js调用

    目前放了以下接口：
    buff特效
    受击特效
    技能定点特效
    头顶冒字
    说话
*/


cc.Class({
  extends: fighterBase,
  properties: {
    fixPosObject: cc.Node,
    buffIcon: cc.Prefab,
    buffObject: cc.Node,
  },
  onLoad() {
    emitter.on(this, "delAllBuff", () => {
      this.delAllBuff(true);
    });
    emitter.on(this, "UseSkillEvent", this.onUseSkill);
    this.node.on('position-changed', () => {
      this.fixAllObjPos();
    });
  },
  onDestroy() {
    emitter.off(this, "delAllBuff");
  },
  // 技能统一光效
  onUseSkill(fighter) {
    if (fighter !== this.fighter()) {
      return;
    }
    this.addBuff({
      stobjID: -1,
      buffname: "useskill",
    });
  },
  // 受击特效
  showHurtEffect(arg, hitPos, team, inverse) {
    const effectname = arg || 'hitstar0.png';
    if (effectname.indexOf('.png') === -1) {
      let spinename;
      let aniname;
      if (typeof (arg) !== "string") {
        spinename = arg[0];
        aniname = arg[1];
      } else {
        spinename = arg;
        aniname = arg;
      }
      // spine特效
      let flip = false;
      if (defines.isEffectAutoFlip(spinename)) { // 要根据队伍翻转的特效
        if (team === defines.TEAM_RIGHT) {
          flip = true;
        }
      }
      if (inverse) {
        flip = !flip;
      }
      // 都是动态生成删除的
      const hitSpine = cc.instantiate(this.fixPosObject);
      hitSpine.active = true;
      this.node.addChild(hitSpine);
      hitSpine.position = hitPos;
      const so = hitSpine.getComponent('spineObject');
      so.loadSpine(spinename);
      so.playAnimationAndDestroy(aniname);
      if (flip) {
        so.turnRight();
      }
    } else {
      // 图片特效
      const imgname = effectname.substr(0, effectname.length - 4);
      const obj = cc.instantiate(this.buffIcon);
      const com = obj.getComponent('buffIcon');
      mbgGame.resManager.setAutoAtlasFrame(com.icon, 'uiBase', imgname);
      this.node.addChild(obj);
      obj.position = hitPos;
      // 技能受击，动态生成删除
      this.scheduleOnce(() => {
        obj.destroy();
      }, 0.1);
    }
  },
  addBuff(dOption, size, effectScale, standTeam) {
    if (dOption.notshow) {
      return;
    }
    size = size || this.fighter().getSize();
    standTeam = standTeam || this.fighter().getTeam();
    effectScale = effectScale || this.fighter().effectScale();
    dOption = dOption || {};
    const buffname = dOption.buffname || defines.getSkill_BuffSpineName(dOption.skillID, dOption.tplID);
    if (!buffname) {
      return;
    }
    const posType = dOption.posType || defines.getSkill_BuffSpinePos(dOption.skillID, dOption.tplID);
    const obj = cc.instantiate(this.buffObject);
    obj.active = true;
    assert(dOption.stobjID, `AddState failed no stobjID${JSON.stringify(dOption)}`);
    obj._BuffObjID = dOption.stobjID;
    obj._stateID = dOption.stateID;
    this.delBuff(dOption);
    this.node.addChild(obj);
    const dEffectConfig = mbgGame.config[`effect${buffname}`];
    if (dEffectConfig && dEffectConfig.zOrder !== 0) {
      obj.zIndex = dEffectConfig.zOrder;
    }
    const pos = new cc.Vec2(0, 0);
    /*
    buff基准点：
        1：脚底
        2：中间（骨骼高度除以2）
        3：头顶（骨骼高度）
     */
    if (posType === 2) {
      pos.y = size.height * 0.5;
    } else if (posType === 3) {
      pos.y = size.height;
    }
    // mbgGame.log('addBuffsss', posType, pos, size, dOption);
    obj.setPosition(pos);
    // mbgGame.log("addBuff add", buffname, obj._BuffObjID);
    const so = obj.getComponent('spineObject');
    so.setScale(effectScale, effectScale);
    let flip = false;
    if (defines.isEffectAutoFlip(buffname)) { // 要根据队伍翻转的特效
      if (standTeam === defines.TEAM_RIGHT) {
        flip = true;
      }
    }
    if (flip) {
      so.turnRight();
    }
    so.loadSpine(buffname);
    let repeat = dOption.repeat;
    if (repeat == null) {
      repeat = defines.getSkill_BuffIsRepeat(dOption.skillID, dOption.tplID);
    }
    if (repeat) {
      // repeat 等服务器通知删除
      so.playAnimation(so.spineName());
    } else {
      so.playAnimationAndDestroy(so.spineName());
    }
  },
  delBuff(dOption) {
    const fighter = this.fighter();
    const removeObjs = [];
    this.node.children.forEach((x) => {
      if ((dOption.stobjID && x._BuffObjID === dOption.stobjID) ||
        (dOption.stateID && x._stateID === dOption.stateID)) {
        const spineObject = x.getComponent('spineObject');
        const spineName = spineObject.spineName();
        if (fighter.isDie() && defines.isEffectDieKeep(spineName)) {
          return;
        }
        removeObjs.push(x);
      }
    });
    removeObjs.forEach((x) => {
      x.destroy();
    });
  },
  // force: 强制删除全部buff
  delAllBuff(force) {
    const removeObjs = [];
    this.node.children.forEach((x) => {
      if (x._BuffObjID) {
        if (!force) {
          const spineObject = x.getComponent('spineObject');
          const spineName = spineObject._spineName;
          if (defines.isEffectDieKeep(spineName)) {
            return;
          }
        }
        removeObjs.push(x);
      }
    });
    removeObjs.forEach((x) => {
      x.destroy();
    });
  },
  // 定点动画，和人无关
  playFixPosEffect(skillID, standTeam) {
    if (this.m_FixPosEffectObj) {
      return;
    }
    if (this.m_playFixPosEffectRealCB) {
      return;
    }
    const fixedAni = this.fighter().getMTplConfig().fixedAni;
    if (!fixedAni) {
      return;
    }
    const name = fixedAni[0];
    const delay = fixedAni[1] / defines.FPS;
    this.m_playFixPosEffectRealCB = this.playFixPosEffectReal.bind(this, name, standTeam);
    this.scheduleOnce(this.m_playFixPosEffectRealCB, delay);
  },
  playFixPosEffectReal(name, standTeam) {
    if (!this.node || !this.node.isValid) return;

    this.m_playFixPosEffectRealCB = null;
    const obj = cc.instantiate(this.fixPosObject);
    obj.active = true;
    const worldNode = this.node.parent;
    this.m_FixPosEffectObj = obj;
    worldNode.addChild(obj);
    obj.zIndex = 9999;
    if (standTeam === defines.TEAM_LEFT) {
      obj.setPosition(defines.getCenterStandPos(defines.TEAM_RIGHT));
    } else {
      obj.setPosition(defines.getCenterStandPos(defines.TEAM_LEFT));
    }
    const so = obj.getComponent('spineObject');
    so.loadSpine(name);
    so.playAnimationAndDestroy(so.spineName(), () => {
      this.m_FixPosEffectObj = null;
    });
  },
  stopPlayFixPosEffect() {
    if (this.m_playFixPosEffectRealCB) {
      this.unschedule(this.m_playFixPosEffectRealCB);
      this.m_playFixPosEffectRealCB = null;
    }
    if (!this.m_FixPosEffectObj) {
      return;
    }
    const worldNode = this.node.parent;
    worldNode.removeChild(this.m_FixPosEffectObj);
    this.m_FixPosEffectObj = null;
  },
  // 头顶冒字
  floatMsg(...args) {
    // mbgGame.log('=== [floatMsg] msg', this.name, msg);
    const iNowTime = moment().valueOf(); // ms
    if (this.lastFloatMsgTime && iNowTime - this.lastFloatMsgTime < 100) {
      if (!this.m_msgQueue) {
        this.m_msgQueue = [];
      }
      this.m_msgQueue.push(args);
      // this.logInfo('m_msgQueue.push', ...args);
    } else {
      this.floatMsgReal(...args);
    }
  },
  stopFloatMsg() {
    this.m_msgQueue = [];
  },
  update() {
    if (!this.m_msgQueue || this.m_msgQueue.length === 0) {
      return;
    }
    const iNowTime = moment().valueOf(); // ms
    if (this.lastFloatMsgTime && iNowTime - this.lastFloatMsgTime > 200) {
      const args = this.m_msgQueue.shift();
      this.floatMsgReal(...args);
    }
  },
  setFloatMsgCB(cb) {
    this.m_FloatMsgCB = cb;
  },
  /*
  {
      t: 'hp',  type 类型
      f: 图片字体编号 1-5
      msg:
      back: null/1 是否有背景遮罩
      offset: 偏移
  }
  */
  floatMsgReal(dOption) {
    const type = dOption.t;
    const fontID = dOption.f;
    const msg = dOption.msg;
    if (this.m_FloatMsgCB) {
      this.m_FloatMsgCB(type, dOption);
    }
    this.lastFloatMsgTime = moment().valueOf(); // ms
    let fighterChar = this.fighter();
    fighterChar.floatMsgLog = fighterChar.floatMsgLog || {
      lLastFloatMsgTime: 0,
      mLastFloatMsgTime: 0,
      rLastFloatMsgTime: 0,
    };
    let offset_X = 0;
    if (this.lastFloatMsgTime - fighterChar.floatMsgLog.mLastFloatMsgTime > 500) {
      fighterChar.floatMsgLog.mLastFloatMsgTime = this.lastFloatMsgTime;
    } else if (this.lastFloatMsgTime - fighterChar.floatMsgLog.lLastFloatMsgTime > 500) {
      fighterChar.floatMsgLog.lLastFloatMsgTime = this.lastFloatMsgTime;
      offset_X = -40;
    } else {
      fighterChar.floatMsgLog.rLastFloatMsgTime = this.lastFloatMsgTime;
      offset_X = 40;
    }
    let offset = new cc.Vec2(offset_X, this.fighter().getSize().height + 30); // 血条高度30
    if (dOption.offset) {
      offset = offset.add(dOption.offset);
    }
    mbgGame.managerUi.floatFightMessage({
      msg,
      pos: offset,
      fontID,
      bg: dOption.back ? 'frameAngle01' : '',
      numType: dOption.numType,
    }, this.node);
  },
  setYellLayer(layer) {
    this.yellLayer = layer;
  },
  getYellLayer() {
    if (this.yellLayer) {
      return this.yellLayer;
    }
    const warCom = this.fighter().warCom();
    if (warCom) return warCom.getYellLayer();
    return this.node;
  },
  getYellNode() {
    // 生成一个iconCharacter
    const node = new cc.Node();
    const label = node.addComponent(cc.Label);
    label.fontSize = 18;
    label.lineHeight = 22;
    label.HorizontalAlign = cc.Label.HorizontalAlign.CENTER;
    node.anchorY = 0;
    const com = node.addComponent(cc.LabelOutline);
    com.width = 1.5;
    com.color = mbgGame.hex2color('#232529');
    return node;
  },
  // 不能挂在fighter节点上，要放在所有fighter上层
  yell(msg) {
    const layer = this.getYellLayer();
    if (!this.yellObj) {
      this.yellObj = this.getYellNode();
      layer.addChild(this.yellObj);
    }
    this.fixYellObjPos();
    const label = this.yellObj.getComponent(cc.Label);
    label.string = msg;
    this.yellObj.opacity = 255;
    //  this.yellObj.stopAllActions();
    //  this.yellObj.setScale(0, 0);
    //  this.yellObj.runAction(cc.sequence(cc.scaleTo(0.2, 1, 1), cc.delayTime(1), cc.fadeOut(0.2)));
    this.yellObj.stopAllActions();
    this.yellObj.setScale(1);
    const dir = new cc.Vec2(0, 1);
    const dis = 100;
    const actionMove = cc.moveBy(1.3, dir.mul(_.random(0.7 * dis, dis)));
    this.yellObj.runAction(actionMove);
    const scaleSeq = cc.sequence(cc.scaleTo(0, 1.5), cc.delayTime(0.5), cc.spawn(cc.scaleTo(0.4, 1), cc.fadeOut(0.4)));
    this.yellObj.runAction(scaleSeq);
  },
  fixYellObjPos() {
    const size = this.fighter().getSize();
    const offset = cc.v2(0, 0);
    offset.y = size.height - 10;
    offset.x = 0;
    if (this.fighter().getStandTeam() === defines.TEAM_LEFT) {
      offset.x = +offset.x;
    } else {
      offset.x = -offset.x;
    }
    this.yellObj.setPosition(this.node.getPosition().add(offset));
  },
  // 说话
  say(dOption) {
    const text = dOption.text;
    const aboutHide = dOption.aboutHide;
    const hideDelay = dOption.hideDelay;
    const sayCom = this.node.getComponent('say');
    const layer = this.node;
    if (!sayCom.dialogBubble) {
      const dialogBubble = cc.instantiate(mbgGame.managerUi.dialogBubblePre);
      layer.addChild(dialogBubble);
      sayCom.setDialogBubble(dialogBubble);
    }
    sayCom.say(text, this.getBuddlePos(), dOption.arrowType || 0, aboutHide, hideDelay, true);
  },
  getBuddlePos() {
    const size = this.fighter().getSize();
    const offset = cc.v2(0, 0);
    offset.y = 15 + size.height;
    offset.x = 0;
    return offset;
  },
  fixBuddlePos(dialogBubble) {
    const dialogBubbleCom = dialogBubble.getComponent('dialogBubble');
    dialogBubbleCom.simpleSetPos(this.getBuddlePos());
  },
  fixAllObjPos() {
    if (this.yellObj) {
      this.fixYellObjPos();
    }
    const sayCom = this.node.getComponent('say');
    if (sayCom.dialogBubble) {
      this.fixBuddlePos(sayCom.dialogBubble);
    }
  },
});