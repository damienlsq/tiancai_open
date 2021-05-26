const defines = require('warDefines');
const fighterBase = require('fighterBase');

/*
    控制fighter战斗表现的代码放这里

    如果这个文件的代码变多了，那么可以拆成多个子组件，
    这个文件就作为获得子组件的入口
*/

cc.Class({
  extends: fighterBase,
  properties: {
    frameBar: cc.Node,
    shadow: cc.Node,
    lvLayout: cc.Node,
    lvLabel: cc.Label,
  },
  onLoad() {
    this.node.setPosition(10000, 0);
    emitter.on(this, 'story', this.onStory);
    emitter.on(this, 'fightEnd', this.onFightEnd);
    emitter.on(this, 'onFighterValUpdated', this.onValChanged);
    this.effectCtrl().setFloatMsgCB(this.onFloatMsg.bind(this));
  },
  onStory(plotIdx, isStart) {
    if (plotIdx === 1 && !isStart) {
      return;
    }
    // 剧情时间
    this.setShowBarNode(!isStart);
  },
  onFightEnd() {
    // 战斗结束，播放庆祝动作或失败
    this.barCtrl().setShowVIPIcon(false);
    this.setShowBarNode(false);
    this.delAllBuff(true);
    this.haltSkill();
    this.farAtkCtrl().halt();
  },
  // fighter的set接口被调用时会emitter事件，
  // 可以在这里做回调处理
  onValChanged(fighterNode, key, val) {
    const fighter = this.fighter();
    if (fighterNode !== this.node) {
      return;
    }
    const warCom = this.fighter().warCom();
    if (!warCom) {
      return;
    }
    if (key === "hp") {
      this.barCtrl().setHpPercent(fighter.hp() / fighter.maxHp());
    } else if (key === "attr") {
      const sAttr = val;
      this.onAttrChanged(sAttr);
    }
  },
  onFloatMsg(type, dOption) {
    if (type === 'hp') {
      // 跳字时更新血条
      this.addHp(dOption.hp, `floatMsgReal,hp=${dOption.hp}`);
    }
  },
  onAttrChanged(sAttr) {
    mbgGame.log("onAttrChanged", sAttr, this.fighter().getAttr(sAttr));
    if (sAttr === "Scale") {
      mbgGame.log("getScale", this.fighter().getScale());
      const s = this.fighter().getAttr(sAttr) * 0.01;
      this.fighter().setScale(s);
      this.initScale();
    }
    if (sAttr === "CEMul" || sAttr === "CEAdd" ||
      sAttr === "dizzy" || sAttr === "silent") {
      this.btnCtrl() && this.btnCtrl().updateSkillBtn("onAttrChanged");
    }
  },
  addHp(hp, tag) {
    const fighter = this.fighter();
    if (fighter.isDie()) {
      return;
    }
    const oldHpPercent = fighter.hpPercent();
    fighter.setHp(fighter.hp() + hp, `addHp_${tag}`);
    if (hp < 0 && oldHpPercent >= 0.3 && fighter.hpPercent() < 0.3) {
      this.selfTalk(3);
    }
  },
  setClickMeFunc(func) {
    this.m_clickMe = func;
    const btn = this.node.getComponent(cc.Button);
    btn.enabled = func != null;
  },
  onClickFighter() {
    if (this.m_clickMe) {
      this.m_clickMe(this.fighter().charaID());
    }
  },
  onStart() {
    this.setShowBarNode(true);
    if (!this.fighter().isDie() && this.fighter().shouldDie()) {
      this.die('onStart');
    }
    if (this.fighter().isDie()) {
      return;
    }
    this.btnCtrl() && this.btnCtrl().updateSkillBtn("onStart");
  },
  showHurtEffect(arg, hitPos, inverse) {
    const fighter = this.fighter();
    hitPos = hitPos || fighter.getHitPos();
    const team = fighter.getTeam();
    this.effectCtrl().showHurtEffect(arg, hitPos, team, inverse);
  },
  floatMsg(...args) {
    this.effectCtrl().floatMsg(...args);
  },

  // 只要dParam是必须的，其他参数可选
  hurt(dParam) {
    // mbgGame.log('[hurt]', dParam);
    this.floatMsg({
      t: dParam.type || 'hp',
      hp: -dParam.dam,
      msg: `${dParam.dam || ''}`,
      f: dParam.f,
      numType: dParam.numType,
    });
    const e = dParam.effect || dParam.e;
    if (e >= 0 && e <= 4) {
      this.showHurtEffect(`hitstar${e}.png`);
    } else if (e >= 100 && e <= 200) {
      const hurtEffectDict = {
        100: ['hiteffect', 'big2'], // 炸 (Atk buff)
        101: ['hiteffect', 'big1'], // 盾 (Atk debuff)
      };
      mbgGame.log("showHurtEffect", e);
      this.showHurtEffect(hurtEffectDict[e], null, true);
    } else {
      this.showHurtEffect(e);
    }
    if (dParam.die) {
      return;
    }
    if (dParam.type === 'hp' || this.FSM().getState() === "stand") {
      this.spineCtrl().doOnceAction('defense', 'stand');
    }
    if (dParam.f === mbgGame.FontCritic) {
      const com = this.fighter().warCom();
      const sSound = this.fighter().getAtkSound();
      com.playSound(sSound);
    }
  },
  selfTalk(type) {
    // 碎碎念概率
    if (Math.random() > 0.05) {
      return;
    }
    if (this.fighter().getVar(`selfTalk:${type}`)) {
      return;
    }
    this.fighter().setVar(`selfTalk:${type}`, 1);
    const selftalkMsg = mbgGame.getString(`talk${type}_${this.fighter().getMTplID()}`, {}, true);
    if (selftalkMsg) {
      this.say({
        text: selftalkMsg,
        aboutHide: true,
        hideDelay: 1.5,
      });
    }
  },
  die(reason) {
    mbgGame.log("die reason", reason);
    if (this.fighter().isDie()) {
      cc.warn("die again", reason);
      return;
    }
    this.selfTalk(2);
    this.fighter().setDie();
    this.btnCtrl() && this.btnCtrl().updateSkillBtn("die");
    this.haltSkill();
    this.fighter().setHp(0);
    this.delAllBuff();
    const ttt = this.ttt();
    if (ttt) {
      ttt.stopTrace();
    }
    this.node.stopAllActions();
    this.FSM().setState('die');
    /*
    this.node.runAction(cc.sequence(
      cc.moveBy(0.05, cc.v2(x * 20, 0)),
      cc.moveBy(0.2, cc.v2(x * 10, 0)).easing(cc.easeBackOut())));
    */
  },
  resetFighter(reason) {
    mbgGame.log("resetFighter", reason);
    const fighter = this.fighter();
    fighter.clearVarDict();
    const ttt = this.ttt();
    if (ttt) {
      ttt.stopTrace();
    }
    fighter.m_Data = {};
    fighter.turnLeft();
    this.showShadow(false);
    this.walkCtrl().stopMove();
    this.barCtrl().setShowVIPIcon(false);
    this.setShowBarNode(false);
    this.delAllBuff(true);
    fighter.cleanDieFlag();
    this.FSM().curState = '';
    fighter.spineCtrl().setScale(1, 1);
    this.buffIconCtrl().listenTarget();
    if (this.fighter().getStandTeam() === defines.TEAM_LEFT) {
      const com = this.getBtnBuffIconCom();
      if (com) com.listenTarget();
    }
  },
  // data can be null
  initFighter(iTeam, objID, data, worldIdx) {
    if (worldIdx == null) {
      mbgGame.error("initFighter no worldIdx");
    }
    const fighter = this.fighter();
    this.resetFighter('initFighter');
    // 初始化fighter
    if (data) {
      fighter.m_Data = data;
      if (!fighter.charaID()) {
        mbgGame.error("onCreated no ID", data, worldIdx);
      }
      this.initScale();
    } else {
      fighter.m_Data = {};
    }
    this.hideLv();
    fighter.setObjID(objID);
    fighter.setTeam(iTeam);
    fighter.setWorldIdx(worldIdx);
    const warCom = fighter.warCom();
    if (warCom.isDefender()) {
      // 防守方看到的战斗，站位要取反
      fighter.setStandTeam(iTeam === defines.TEAM_LEFT ? defines.TEAM_RIGHT : defines.TEAM_LEFT);
      mbgGame.log("inverse standsteam");
    } else {
      fighter.setStandTeam(iTeam);
    }
    const fixZindex = this.node.getComponent('fixZindex');
    fixZindex.setFix(true);
    if (fighter.getStandTeam() === defines.TEAM_LEFT) {
      let idx = fighter.m_Data.posIdx;
      idx = 4 - idx;
      const com = warCom.buttonSkillComs[idx];
      com.node.active = true;
      com.initMe(fighter.charaID(), fighter.objID());
      if (fighter.btnCtrl()) {
        fighter.btnCtrl().bindBtnCom(com);
        fighter.btnCtrl().setEnabled(false);
      }
    }
    this.buffIconCtrl().listenTarget(objID);
    if (this.fighter().getStandTeam() === defines.TEAM_LEFT) {
      const com = this.getBtnBuffIconCom();
      com.listenTarget(objID);
    }
    // 第一次创建fighter时才做的逻辑
    this.node.setPosition(10000, 0);
  },
  revive() {
    if (!this.fighter().isDie()) return;
    this.fighter().cleanDieFlag();
    this.FSM().setState('revive');
    this.rushCtrl().rushBack();
    this.btnCtrl() && this.btnCtrl().updateSkillBtn("revive");
    this.setShowBarNode(true);
  },
  getBtnBuffIconCom() {
    const warCom = this.fighter().warCom();
    if (!warCom) {
      mbgGame.error("getBtnBuffIconCom, no warCom");
      return null;
    }
    const com = warCom.getButtonSkillComByObjID(this.fighter().objID());
    if (!com) {
      mbgGame.error("getBtnBuffIconCom, no com");
      return null;
    }
    return com.getComponent('fighterBuffIcon');
  },
  // 还有多久CD结束 单位秒
  getSkillLeftCDTime() {
    let iLastUseTime;
    let iCDTime;
    const warCom = this.fighter().warCom();
    if (warCom && !warCom.isStarted()) {
      iLastUseTime = warCom.getWarEndTime();
      iCDTime = mbgGame.config.constTable.WarCD;
    } else {
      iLastUseTime = this.getSkillLastUsedTime();
      iCDTime = mbgGame.config.constTable.SkillCD;
    }
    if (!iLastUseTime) {
      return 0;
    }
    const now = mbgGame.netCtrl.getServerNowTime();
    const iEndTime = iLastUseTime + iCDTime;
    if (iEndTime > now) {
      return iEndTime - now;
    }
    return 0;
  },
  setShowBarNode(b) {
    this.barCtrl().setShow(b);
  },
  heal(hp, nolabel) {
    if (nolabel) {
      this.addHp(hp, `heal`);
      return;
    }
    this.floatMsg({
      t: 'hp',
      hp,
      msg: hp,
      f: mbgGame.FontHeal,
    });
  },
  showLv(lv) {
    this.lvLayout.active = true;
    this.lvLabel.string = mbgGame.getString('levelShow', {
      level: lv,
    });
  },
  hideLv() {
    this.lvLayout.active = false;
  },
  isNeedFlashIn() {
    if (defines.StoryWorlds.indexOf(this.fighter().getWorldIdx()) === -1) {
      return false;
    }
    return !this.fighter().isMonster();
  },
  enterScene() {
    const warCom = this.fighter().warCom();
    let walkTime;
    if (warCom.isStarted()) {
      walkTime = this.walkCtrl().enterScene(null, 0);
    } else {
      walkTime = this.walkCtrl().enterScene(null, 1.7, this.isNeedFlashIn());
    }
    return walkTime;
  },
  initBloodBar() {
    const size = this.fighter().getSize();
    this.frameBar.setPosition(new cc.Vec2(0, size.height));
  },
  initScale() {
    const fighter = this.fighter();
    const s = fighter.getScale();
    fighter.spineCtrl().setScale(s, s);
    this.setShadowScale(s);
    if (fighter.getStandTeam() === defines.TEAM_LEFT) {
      fighter.turnRight();
    } else {
      fighter.turnLeft();
    }
    this.initBloodBar();
  },
  onTouch() {
    mbgGame.managerUi.onCharacterTouch(this);
  },
  /*
  {
      buffname: 若为null，则根据skillID和tplID去获取
      skillID:
      tplID:
      duration:
  }
  */
  addBuff(dOption) {
    this.effectCtrl().addBuff(dOption);
    if (dOption.noIcon) {
      return;
    }
    if (dOption.stateID === 998) {
      this.barCtrl().setShowVIPIcon(true);
      return;
    }
    emitter.emit("addBuffIcon", this.fighter().objID(), dOption);
  },
  refreshBuff(dOption) {
    emitter.emit("refreshBuffIcon", this.fighter().objID(), dOption);
  },
  refreshBuffRound(dRoundInfo) {
    emitter.emit("refreshBuffRound", this.fighter().objID(), dRoundInfo);
  },
  delBuff(dOption) {
    this.effectCtrl().delBuff(dOption);
    if (dOption.stateID === 998) {
      this.barCtrl().setShowVIPIcon(false);
      return;
    }
    emitter.emit("delBuffIcon", this.fighter().objID(), dOption);
  },
  delAllBuff(force) {
    this.effectCtrl().delAllBuff(force);
    if (this.fighter()) {
      emitter.emit("delAllBuffIcon", this.fighter().objID());
    }
  },
  playFixPosEffect(skillID) {
    this.effectCtrl().playFixPosEffect(skillID, this.fighter().getStandTeam());
  },
  playSkillSound() {
    const charaID = this.fighter().charaID();
    if (charaID > 15) {
      mbgGame.playSound('BT_Skill');
      return;
    }
    mbgGame.playSound(`SK_${charaID}`);
  },
  haltCharaSkillSound(charaID) {
    mbgGame.haltSound(`SK_${charaID}`);
  },
  showShadow(show) {
    this.shadow.active = show;
  },
  setShadowScale(s) {
    this.shadow.scale = s;
  },
  delaySay(delay, ...args) {
    this.scheduleOnce(this.say.bind(this, ...args), delay);
  },
  say(dOption) {
    if (!this.node || !this.node.isValid) return;
    this.effectCtrl().say(dOption);
  },
  haltSkill() {
    if (this.FSM().getState() === 'skill') {
      this.FSM().setState('stand', { force: true });
      this.effectCtrl().stopPlayFixPosEffect();
      this.farAtkCtrl().halt();
      if (!this.fighter().isMonster()) {
        const charaID = this.fighter().charaID();
        this.haltCharaSkillSound(charaID);
      }
      return true;
    }
    return false;
  },
  onDestroy() {
    emitter.off(this, 'story');
    emitter.off(this, 'fightEnd');
    emitter.off(this, 'onFighterValUpdated');
    mbgGame.log("[fighterctrl] onDestroy");
  },
  removeMe() {
    this.delAllBuff(true);
    const coms = [
      "Cmd",
      "Btn",
      "BuffIcon",
      "NearAtk",
      "FarAtk",
      "Rush",
      "Walk",
      "Effect",
      "Bar",
    ];
    for (let i = 0; i < coms.length; i++) {
      const com = this.getComponent(`fighter${coms[i]}`);
      if (com && com.removeMe) com.removeMe();
    }
    this.node.destroy();
  },
});