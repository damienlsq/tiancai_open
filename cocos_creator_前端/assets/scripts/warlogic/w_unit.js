const assert = require('assert');
const defines = require('./w_defines');
const ActionData = require('./w_action');
const CBase = require('./w_base');
const CSkill = require('./w_skill');
const timer = require('./w_timer');
const FormulaHelper = require('./w_formula');
const SkillTplData = require('./skill_tpl/skill_index');
const utils = require('./w_utils');
const _u = require('./underscore');

const Attr2ID = defines.Attr2ID;

class CUnit extends CBase {
  constructor(isTmp) {
    super();
    this.reset(isTmp);
  }
  CType() {
    return "CUnit";
  }
  reset(isTmp) {
    this.m_TalentAccum = null;
    this.m_RawAttrDict = {};
    this.m_AttrDict = {};
    if (isTmp) {
      // 临时创建的Unit不需要初始化下面的属性
      return;
    }
    this.m_TempDict = {}; // 战斗结束时清空
    this.m_HaloSkillDict = {}; // skillID:skobj
    this.m_PassiveSkillDict = {}; // skillID:skobj
    this.m_StateDict = {}; // iID:stobj
    this.m_SkillAttrDict = {};
    this.m_StateAttrDict = {};
    this.m_Hp = 0; // 当前HP
    this.m_Team = defines.TEAM_LEFT;
    this.m_Die = false;
    this.m_Round = 0;
    this.m_Timer = new timer.CLogicTimer(this, this.onAddFrame);
    this.setLogicTimer(this.m_Timer);
  }
  pushAction(iActionID, dParam) {
    this.m_War.pushAction(this, iActionID, dParam);
  }
  round() {
    return this.m_Round || 0;
  }
  warobj() {
    return this.m_War;
  }
  wlog(...args) {
    if (this.m_War) {
      this.m_War.wlog(...args);
    } else {
      mbgGame.logger.info(...args);
    }
  }
  wlogErr(...args) {
    if (this.m_War) {
      this.m_War.wlogErr(...args);
    } else {
      mbgGame.logError(...args);
    }
  }
  debuglog(...args) {
    if (this.m_War) {
      this.m_War.debuglog(...args);
    }
  }
  initAsTmpUnit(dData) {
    this.reset(true);
    this.m_Data = dData;
    if (!dData) {
      return;
    }
    this.initCommon("tmp");
  }
  // 注意： load和reload里不要触发listener，因为可能上层还没初始化好
  load(dData) {
    this.m_Data = dData;
    if (!dData) {
      return;
    }
    assert(this.ID() > 0, `${JSON.stringify(dData)}`);
    this.initCommon("real");
    this.initUnit();
    this.onLoaded();
    this.m_Loaded = true;
    // //this.wlog("[w_unit.load] ", this.ID(), this.m_Data);
  }
  skillData() {
    return this.m_Data.skill;
  }
  getAttrTrainAdd(sAttr) {
    const dData = this.m_Data.tlv;
    if (!dData) {
      return 0;
    }
    const attrID = Attr2ID[sAttr];
    if (!attrID) {
      return 0;
    }
    const lv = dData[attrID];
    if (!lv) {
      return 0;
    }
    const dConfig = mbgGame.config[`gym${lv}`];
    const v = dConfig[sAttr];
    if (v >= 0) {
      return v;
    }
    return 0;
  }
  hasSkill(skillID) {
    if (!this.m_Data) {
      return false;
    }
    if (!this.m_Data.skill) {
      return false;
    }
    return this.m_Data.skill[skillID] != null;
  }
  onLoaded() {
    // this.wlog("[onLoaded] ID", this.ID(), "hp", this.m_Data.hpPercent);
    if (this.m_Data.hpPercent != null) {
      this.m_Hp = Math.round(this.m_Data.hpPercent * this.maxHp() * 0.01);
    }
    this.isDebug() && this.debuglog(`${this.name()}  ${this.getAllInfo()}`);
  }
  getAllInfo() {
    let s = "";
    s += `hp:${this.hp()}  `;
    for (let i = 0; i < defines.FIRST_ATTR.length; i++) {
      const sAttr = defines.FIRST_ATTR[i];
      s += `${this.m_War.getString(sAttr)}:${this.getAttr(sAttr)}  `;
    }
    return s;
  }
  save() {
    return this.m_Data;
  }
  isReleased() {
    return this.m_Timer == null;
  }
  release() {
    this.removeAllCallout();
    this.releaseSchedules();
    this.m_Timer.releaseLogicTimer();
    this.m_Timer = null;
    this.setLogicTimer(null);
    if (this.m_RawAttrDict) {
      delete this.m_RawAttrDict;
    }
    if (this.m_AttrDict) {
      delete this.m_AttrDict;
    }
    if (this.m_TempDict) {
      delete this.m_TempDict;
    }
    if (this.m_SkillAttrDict) {
      delete this.m_SkillAttrDict;
    }
    if (this.m_Data) {
      delete this.m_Data;
    }
  }
  initCommon(tag) {
    for (let i = 0; i < defines.ALL_ATTR.length; i++) {
      const sAttr = defines.ALL_ATTR[i];
      this.setRawAttr(sAttr, this.getBaseAttr(sAttr) || 0);
    }
    for (let i = 0; i < defines.FIRST_ATTR.length; i++) {
      const sAttr = defines.FIRST_ATTR[i];
      this.refreshAttr(sAttr, null, null, `common_${tag}`);
    }
  }
  initUnit() {
    this.m_Hp = this.maxHp();
  }
  cleanTempDict() {
    this.m_TempDict = {};
  }
  setItemData(itemData) {
    this.m_ItemData = itemData;
  }
  hasTemp(sAttr) {
    return this.m_TempDict && this.m_TempDict[sAttr] != null;
  }
  getTemp(sAttr) {
    return this.m_TempDict && this.m_TempDict[sAttr];
  }
  addTemp(sAttr, iAdd) {
    const val = this.m_TempDict[sAttr] || 0;
    this.m_TempDict[sAttr] = val + (iAdd || 1);
  }
  setTemp(sAttr, val) {
    // this.wlog("[setTemp]", sAttr, val);
    this.m_TempDict[sAttr] = val;
  }
  delTemp(sAttr) {
    if (this.m_TempDict[sAttr] != null) {
      delete this.m_TempDict[sAttr];
    }
  }
  type() {
    return this.m_Data.type;
  }
  isMonster() {
    return this.type() === 1;
  }
  mType() {
    return defines.getMType(this.ID());
  }
  posIdx() {
    return this.m_Data.posIdx;
  }
  isBoss() {
    return this.m_Data.boss;
  }
  getFlyObjDelay() {
    return this.getMTplConfig().FlyDelay / defines.AniFPS;
  }
  getUnitConfig() {
    if (this.isMonster()) {
      return defines.getMTplConfig(this.ID());
    }
    return mbgGame.config[`hero${this.ID()}`];
  }
  getMTplID() {
    if (this.isMonster()) {
      return defines.getMTplID(this.ID());
    }
    return 4000 + this.ID();
  }
  getMTplConfig() {
    return mbgGame.config[`mtpl${this.getMTplID()}`];
  }
  getNormalAtkEffect() {
    return this.getMTplConfig().HitAni;
  }
  calSkillInfo(dUnitData) {
    this.calCharaSkillInfoByMode(this.ID(), dUnitData, false);
    this.calCharaSkillInfoByMode(this.ID(), dUnitData, true);
  }
  calCharaSkillInfoByMode(charaID, dUnitData, basemode) {
    if (_u.isEmpty(dUnitData.skill)) {
      return;
    }
    for (let iSkillID in dUnitData.skill) {
      iSkillID = +iSkillID;
      if (basemode) {
        this.setBaseMode(true);
      }
      const dSkill = dUnitData.skill[iSkillID];
      const lv = dSkill.lv || 1;
      let star = dSkill.s;
      if (star === null && this.isMonster()) {
        star = Math.floor(lv / 20);
      }
      const dSkillup = mbgGame.config[`skillup${lv}`];
      dSkill.upCost = (dSkillup && dSkillup.costcoins) || 0;
      let dInfo = dSkill;
      if (basemode) {
        dInfo = {};
        dSkill.base = dInfo;
      }

      let cd = this.getSkillParamByID("CD", iSkillID, lv, star);
      if (cd) {
        cd = Math.round(cd * 10) / 10;
      }
      dInfo.cd = cd;

      if (defines.isActiveSkill(iSkillID)) {
        // 效果持续时间
        const duration = this.getSkillParamByID("duration", iSkillID, lv, star);
        if (duration) {
          dInfo.duration = duration;
        }
        dInfo.pretime = this.getMTplConfig().PreFrames;
      }
      const params = ["a", "b", "c", "d"];
      for (let i = 0; i < params.length; i++) {
        const p = params[i];
        const v = this.getSkillParamByID(p, iSkillID, lv, star);
        if (v != null) {
          dInfo[p] = v;
        }
      }
      if (basemode) {
        this.setBaseMode(false);
      }
    }
  }
  hashInfo() {
    return {
      die: this.isDie(),
      hp: this.hp(),
      attr: this.m_AttrDict,
    };
  }
  packInfo(tag) {
    const dUnitData = {};
    dUnitData.base = {};
    for (let i = 0; i < defines.FIRST_ATTR.length; i++) {
      const sAttr = defines.FIRST_ATTR[i];
      const attrID = Attr2ID[sAttr];
      dUnitData[attrID] = this.getAttr(sAttr);
      dUnitData.base[attrID] = this.m_BaseAttr[sAttr];
    }
    for (const sAttr in defines.NeedSyncAttrs) {
      const attrID = Attr2ID[sAttr];
      dUnitData[attrID] = this.getAttr(sAttr);
    }
    dUnitData[Attr2ID.Atk] = this.getBaseDam();
    dUnitData.ID = this.ID(); // iCharaID 怪物的话这个ID是怪物的编号
    dUnitData.lv = this.lv();
    if (this.m_Data.skill) {
      dUnitData.skill = _u.clone(this.m_Data.skill);
      this.calSkillInfo(dUnitData);
    }
    // this.wlog('packInfo', tag, JSON.stringify(dUnitData));
    return dUnitData;
  }
  packWarInfo() {
    const dUnitData = this.packInfo('war');
    dUnitData.type = this.type();
    dUnitData.objID = this.objID(); // 在CWar里的唯一ID
    dUnitData.posIdx = this.m_Data.posIdx;
    dUnitData.Hp = this.hp();
    dUnitData.die = this.isDie() ? 1 : 0;
    if (this.isMonster()) {
      if (this.m_Data.boss) {
        dUnitData.boss = 1;
      }
    } else {
      // 道具信息
      if (this.m_ItemData) {
        dUnitData.itemData = this.m_ItemData;
      }
    }
    return dUnitData;
  }
  lv() {
    return (this.m_Data && this.m_Data.lv) || 1;
  }
  maxHp() {
    return this.getAttr("MaxHp");
  }
  hpPercent() {
    return this.hp() / this.maxHp();
  }
  name() {
    if (!this.m_War) {
      return `${this.ID()}`;
    }
    if (!this.isMonster()) {
      const charaname = this.m_War.getString(`charaname${this.ID()}`);
      return `${charaname}(${this.objID()})`;
    }
    const mname = this.m_War.getString(`mname${defines.getMTplID(this.ID())}`);
    return `${mname}(${this.objID()})`;
  }
  team() {
    return this.m_Team;
  }
  setObjID(iObjID) {
    this.m_ObjID = iObjID; // 不存盘
  }
  objID() {
    return this.m_ObjID;
  }
  // iCharaID
  ID() {
    return this.m_Data.ID || 99;
  }
  getBaseAttr(sAttr) {
    return this.m_Data.attr && this.m_Data.attr[Attr2ID[sAttr]];
  }
  addExtraHp(hp) {
    if (!this.m_ExtraHp) {
      this.m_ExtraHp = 0;
    }
    this.m_ExtraHp += hp;
  }
  hp() {
    return this.m_Hp + (this.m_ExtraHp || 0);
  }
  isDebug() {
    if (this.isMonster()) {
      return false;
    }
    return this.m_War && this.m_War.m_Debug;
  }
  enemyTeam() {
    if (this.getAttr("Chaos") > 0) {
      return this.m_Team;
    }
    if (defines.TEAM_LEFT === this.m_Team) {
      return defines.TEAM_RIGHT;
    }
    return defines.TEAM_LEFT;
  }
  getRawAttr(sAttr) {
    return this.m_RawAttrDict[sAttr] || defines.ATTR_DEFAULT_VAL[sAttr] || 0;
  }
  setRawAttr(sAttr, val) {
    this.m_RawAttrDict[sAttr] = val;
  }
  getAttr(sAttr) {
    if (this.m_BaseMode) {
      return this.m_BaseAttr[sAttr];
    }
    if (this.getTemp(sAttr) != null) {
      return this.getTemp(sAttr);
    }
    return this.m_AttrDict[sAttr] || defines.ATTR_DEFAULT_VAL[sAttr] || 0;
  }
  // 自己是进攻方时，计算对目标的克制的属性加成
  getAtkerAttr(sAttr, tobj) {
    const c = this.getAtkerItemBuff(sAttr, tobj);
    const v = this.getAttr(sAttr);
    return v * (1 + c);
  }
  getAtkerItemBuff(sAttr, tobj) {

    /*
    1 道具克制的机制只存在于挑战怪物,不包括对手是天才的情况
    2 角色装备的道具为角色的类型，怪物的类型为配表生成
    3 if { (攻击方类型后两位==防守方类型后两位 && 攻击方类型-防守方类型>0)
    道具相克表中读取该类型的后两位对应的属性变化 }
    */
    let c = 0;
    do {
      if (!tobj) {
        break;
      }
      const ibTypesAtk = this.ibTypes();
      //  if (this.ID() === 1) this.wlog("ib atk", ibTypesAtk);
      if (!ibTypesAtk || ibTypesAtk.length === 0) {
        break;
      }
      const ibTypesDef = tobj.ibTypes();
      // if (this.ID() === 1) this.wlog("ib def", ibTypesDef);
      if (!ibTypesDef || ibTypesDef.length === 0) {
        break;
      }
      for (let i = 0; i < ibTypesAtk.length; i++) {
        const idAtk = ibTypesAtk[i];
        for (let j = 0; j < ibTypesDef.length; j++) {
          const idDef = ibTypesDef[j];
          //  if (this.ID() === 1) this.wlog("idAtk idDef", idAtk, idDef, (idAtk % 100) === (idDef % 100), (idAtk - idDef) > 0);
          if (((idAtk % 100) === (idDef % 100)) && (idAtk - idDef) > 0) {
            const dConfig = mbgGame.config.itemBuff[idAtk % 100];
            //  if (this.ID() === 1) this.wlog("idAtk idDef", idAtk, idDef, dConfig);
            if (!dConfig) {
              continue;
            }
            if (dConfig.attr !== sAttr) {
              continue;
            }
            c = dConfig.c;
            //  if (this.ID() === 1) this.wlog("itembuff", c, idAtk, idDef, sAttr, this.getAttr(sAttr));
            return c;
          }
        }
      }
    } while (0);
    return c;
  }
  ibTypes() {
    if (!this.isMonster()) {
      return this.getExtraAttrData().ib;
    }
    return this.m_Data.ib;
  }
  setAttr(sAttr, val) {
    this.m_AttrDict[sAttr] = val;
  }
  clampFloatVal(val) {
    return Math.round(val * 10) / 10;
  }
  getGrowAttr(sAttr) {
    return mbgGame.config[`hero${this.ID()}`][`${sAttr}Grow`];
  }
  getHeroUpConfig() {
    return mbgGame.config[`heroup${this.lv()}`];
  }
  refreshAttr(sAttr, bOnChanged, dOption, tag) {
    let val = null;
    const attrID = Attr2ID[sAttr];
    if (attrID === Attr2ID.MaxHp || attrID === Attr2ID.Atk || attrID === Attr2ID.Def) { // 有成长值的属性
      val = this.getRawAttr(`${sAttr}Init`);
      const dUpConfig = this.getHeroUpConfig();
      if (!dUpConfig) {
        this.wlog("[refreshAttr] no dUpConfig", this.lv(), this.ID());
      }
      if (!this.isMonster()) {
        const attrVal = dUpConfig[sAttr];
        val += Math.ceil(this.getGrowAttr(sAttr) * attrVal);
      }
    } else if (attrID === Attr2ID.BeAtkW) {
      val = (this.getRawAttr(sAttr) || 100);
    } else if (attrID === Attr2ID.Scale) {
      val = 100;
      if (this.getMTplConfig().Scale > 0) {
        val = this.getMTplConfig().Scale * 100;
      }
    } else {
      val = this.getRawAttr(sAttr);
    }
    const iTrainAdd = this.getAttrTrainAdd(sAttr);
    if (iTrainAdd > 0) {
      if (sAttr !== Attr2ID.MaxHp) {
        val += iTrainAdd;
      } else {
        val *= (1 + (iTrainAdd * 0.01));
      }
    }
    val = Math.round(val);
    if (!this.m_BaseAttr) {
      this.m_BaseAttr = {};
    }
    this.m_BaseAttr[sAttr] = this.checkAttrVal(sAttr, val);
    if (!this.isMonster()) {
      // 天赋
      const dAccum = this.getTalentAccum();
      if (dAccum) {
        val += dAccum[attrID] || 0;
      }
    }
    val += this.getTemp(`${sAttr}Add`) || 0;
    val = this.calOtherAttr(sAttr, val, tag);
    // TODO 是否要把下面的合并到 calOtherAttr
    if (this.m_War && this.m_War.isPVE()) {
      val = this.calPVEAttr(sAttr, val);
    }
    val = this.checkAttrVal(sAttr, val);
    const oldVal = this.getAttr(sAttr); // for debug
    this.isDebug() && this.debuglog(`${this.name()}属性[${sAttr}]:${oldVal}=>${val}`);
    this.setAttr(sAttr, val);
    if (bOnChanged == null) {
      bOnChanged = true;
    }
    if (bOnChanged) {
      this.onAttrChanged(sAttr, oldVal, dOption);
    }
  }
  setExtraAttrData(dExtraAttr) {
    // this.wlog("setExtraAttrData", this.ID(), dExtraAttr);
    this.m_ExtraAttr = dExtraAttr;
  }
  getTalentAccum() {
    // 缓存即可
    if (this.m_War && this.m_TalentAccum) {
      return this.m_TalentAccum;
    }
    this.m_TalentAccum = {};
    // 天赋
    const ta = this.m_Data.ta;
    if (ta && ta[0]) {
      const v = ta[0];
      const n = v % 10;
      const ttLv = Math.floor(v / 10);
      const talentData = mbgGame.config.charatalent[this.ID()];
      const dData = talentData[`${ttLv}-${n}`];
      if (!dData) {
        this.wlogErr("no talent", this.ID(), ttLv, n);
      }
      let dAccum = _u.clone(dData);
      dAccum = this.getSubTalentAccum(dAccum);
      this.m_TalentAccum = dAccum;
    }
    return this.m_TalentAccum;
  }
  getSubTalentAccum(dAccum) {
    // 支线天赋
    const ta = this.m_Data.ta;
    if (ta && ta.length > 1) {
      dAccum = dAccum || {};
      for (let i = 1; i < ta.length; i++) {
        const v = ta[i];
        const ttLv = Math.floor(v / 100);
        const sttIdx = Math.floor((v % 100) / 10); // 右数第二位
        const n = v % 10; // 右数第一位
        const key = `${this.ID()}${utils.pad(ttLv, 3)}${sttIdx}`;
        const dConfig = mbgGame.config.talent[key];
        if (!dConfig) {
          this.wlogErr("[getSubTalentAccum] no config", key);
          continue;
        }
        const attrID = Attr2ID[dConfig.attr];
        if (attrID) {
          for (let k = 0; k <= n; k++) {
            const val = dConfig.attrAdd[k];
            if (val > 0) {
              dAccum[attrID] = (dAccum[attrID] || 0) + val;
            }
          }
        }
      }
    }
    return dAccum;
  }
  getExtraAttrData() {
    return this.m_ExtraAttr || {};
  }
  onExtraAttrDataChanged() {
    // 刷新战斗属性
    for (let i = 0; i < defines.FIRST_ATTR.length; i++) {
      const sAttr = defines.FIRST_ATTR[i];
      this.refreshAttr(sAttr, null, null, "extraChanged");
    }
    this.refreshItemSkills();
  }
  refreshItemSkills() {
    const dExtraAttr = this.m_ExtraAttr;
    // 刷新技能
    const skillIDs = [];
    if (dExtraAttr) {
      for (const sEffect in dExtraAttr) {
        const isSkillAttr = sEffect.startsWith("skill");
        if (isSkillAttr && !sEffect.endsWith("_T")) {
          const skillID = parseInt(sEffect.substr(5));
          skillIDs.push(skillID);
        }
      }
    }
    if (this.m_ItemSkillIDs) {
      // 有旧的道具技能，那么清除全部旧技能
      for (let i = 0; i < this.m_ItemSkillIDs.length; i++) {
        const skillID = this.m_ItemSkillIDs[i];
        // 主动技能
        if (this.m_ActiveSkillObj && this.m_ActiveSkillObj.skillID() === skillID) {
          this.haltActiveSkill();
        } else { // 被动技能
          for (const _skillID in this.m_PassiveSkillDict) {
            const skobj = this.m_PassiveSkillDict[_skillID];
            if (skobj.skillID() === skillID) {
              skobj.end();
              break;
            }
          }
        }
      }
    }
    this.m_ItemSkillIDs = skillIDs;
  }
  getExtraAttr(sAttr) {
    return (this.m_ExtraAttr && this.m_ExtraAttr[sAttr]) || 0;
  }
  calPVEAttr(sAttr, val) {
    return val;
  }
  checkAttrVal(sAttr, val) {
    // 取整
    if (["Cri", "Hit", "CriDam"].indexOf(sAttr) === -1) {
      val = Math.round(val);
    }
    // 需要裁剪值的属性
    if (sAttr === "MaxHp") {
      if (val < 1) {
        val = 1;
      }
    }
    if (defines.NoNegative[sAttr]) {
      if (val < 0) {
        val = 0;
      }
    }
    return val;
  }
  onAttrChanged(sAttr, oldVal, dOption) {
    // this.wlog("onAttrChanged:", this.name(), sAttr, oldVal, "->", this.getAttr(sAttr));
    if (sAttr === "Atk") {
      if (this.getAttr(sAttr) < 1) {
        this.setAttr(sAttr, 1);
      }
    } else if (sAttr === "MaxHp") {
      if (this.m_Hp > this.maxHp()) {
        // 裁剪
        this.m_Hp = this.maxHp();
      } else if (oldVal && oldVal < this.maxHp()) {
        // 福利，maxHp增加时，hp也按比例增加
        this.m_Hp = Math.ceil(this.m_Hp * this.maxHp() / oldVal);
      }
    } else if (sAttr === "BeAtkW") {
      if (this.getAttr(sAttr) < 0) {
        this.setAttr(sAttr, 0);
      }
    } else if (sAttr === "dizzy") {
      if (this.getAttr(sAttr) > 0) {
        if (this.canHaltNormalAtk()) {
          this.haltNormalAtk();
        }
      }
    }
    if (!this.m_Loaded) {
      return;
    }
    if (this.isMonster()) {
      return;
    }
    if (defines.NeedSyncAttrs[sAttr]) {
      if (oldVal !== this.getAttr(sAttr)) {
        const dData = {
          attr: sAttr,
          val: this.getAttr(sAttr),
        };
        this.pushAction(defines.Action.SetAttr, dData);
      }
    }
  }
  calOtherAttr(sAttr, val, tag) {
    let iAdd = 0;
    let iMul = 0;

    // 技能和状态加成
    if (this.m_SkillAttrDict && this.m_SkillAttrDict[sAttr]) {
      const tItem_skill = this.m_SkillAttrDict[sAttr];
      iAdd += (tItem_skill[0] || 0);
      iMul += (tItem_skill[1] || 0);
    }

    if (this.m_StateAttrDict && this.m_StateAttrDict[sAttr]) {
      const tItem_state = this.m_StateAttrDict[sAttr];
      iAdd += (tItem_state[0] || 0);
      iMul += (tItem_state[1] || 0);
    }

    // 道具加成
    const iExtraAdd = this.getExtraAttr(`${sAttr}Add`) || 0;
    iAdd += iExtraAdd;
    const iExtraMul = this.getExtraAttr(`${sAttr}Mul`) || 0;
    iMul += iExtraMul;

    if (iAdd || iMul) {
      val = (val + iAdd) * (1 + (iMul * 0.01));
    }
    return val;
  }
  refreshPassiveSkillAttr(sAttr) {
    let iAdd = 0;
    let iMul = 0;
    for (const iSkillID in this.m_PassiveSkillDict) {
      const skobj = this.m_PassiveSkillDict[iSkillID];
      const attrDict = skobj.attr();
      if (!attrDict) {
        continue;
      }
      for (const sAttr_iter in attrDict) {
        if (sAttr === sAttr_iter) {
          const tItem = attrDict[sAttr_iter];
          if (tItem && tItem.length > 0) {
            iAdd += this.transParam(tItem[0], {
              obj: skobj,
            });
            iMul += this.transParam(tItem[1], {
              obj: skobj,
            });
          }
          break;
        }
      }
    }
    this.m_SkillAttrDict[sAttr] = [iAdd, iMul];
  }
  refreshPassiveSkillAllAttr() {
    for (let i = 0; i < defines.ALL_ATTR.length; i++) {
      const sAttr = defines.ALL_ATTR[i];
      this.refreshPassiveSkillAttr(sAttr);
    }
  }
  refreshAttrBySkillObj(skobj) {
    const attrDict = skobj.attr();
    if (!attrDict || _u.isEmpty(attrDict)) {
      return;
    }
    for (const sAttr in attrDict) {
      if (attrDict[sAttr] && attrDict[sAttr].length > 0) {
        this.refreshPassiveSkillAttr(sAttr);
        this.refreshAttr(sAttr, null, null, "skill");
      }
    }
  }
  transParam(val, dOption, tobj) {
    if (typeof (val) === "function") {
      val = val(this,
        tobj || (dOption && dOption.tobj),
        dOption && (dOption.obj || dOption.skobj),
        dOption && dOption.dam,
        dOption);
    }
    return val;
  }
  cleanAllStates() {
    if (!_u.isEmpty(this.m_StateDict)) {
      const stobjs = _u.values(this.m_StateDict);
      if (stobjs) {
        for (let i = 0; i < stobjs.length; i++) {
          const stobj = stobjs[i];
          stobj.end(null, 'clean');
        }
      }
    }
    this.m_StateDict = {};
  }
  cleanActiveSkillObj() {
    const skobj = this.m_ActiveSkillObj;
    this.m_ActiveSkillObj = null;
    if (skobj) {
      skobj.end();
    }
  }
  cleanPassiveSkillObj() {
    if (!_u.isEmpty(this.m_PassiveSkillDict)) {
      const skobjs = _u.values(this.m_PassiveSkillDict);
      if (skobjs) {
        for (let i = 0; i < skobjs.length; i++) {
          const skobj = skobjs[i];
          skobj.end();
        }
      }
    }
    this.m_PassiveSkillDict = {};
  }
  cleanLastWarState() {
    this.cleanActiveSkillObj();
    this.cleanAllStates();
    this.cleanPassiveSkillObj();
    if (this.m_UseActiveSkillFrame != null) {
      delete this.m_UseActiveSkillFrame;
    }
    this.m_Round = 0;
    // 重置各种计时器
    this.removeAllCallout();
  }
  getCachedStateInfo() {
    return this.m_cachedStateInfo;
  }
  cacheStateInfoBeforeDie() {
    const dInfo = {};
    dInfo[defines.StateType.Debuff] = this.getStatesByType(defines.StateType.Debuff);
    this.m_cachedStateInfo = dInfo;
  }
  // 死亡时要做的清理工作
  dieClean() {
    this.cleanActiveSkillObj();
    // trick 记录死亡前的buff信息，方便做技能逻辑
    this.cacheStateInfoBeforeDie();
    this.cleanAllStates();
    this.cleanPassiveSkillObj();
    if (!_u.isEmpty(this.m_HaloSkillDict)) {
      const skobjs = _u.values(this.m_HaloSkillDict);
      if (skobjs) {
        for (let i = 0; i < skobjs.length; i++) {
          const skobj = skobjs[i];
          skobj.end();
        }
      }
    }
    this.m_HaloSkillDict = {};
    this.removeAllCallout(["Attack", "delayRevive", "delayAddReviveBuff"]);
  }
  die(instakill, firstCreated) {
    if (this.m_Die) {
      return;
    }
    // this.wlog("死亡 ", this.name(), this.ID());
    this.isDebug() && this.debuglog(`${this.name()} 倒下了`);
    this.m_Hp = 0;
    this.m_Die = true;
    if (!firstCreated) {
      this.m_War.broadcastEvent("死亡", {
        tobj: this,
      });
    }
    const ignoreDie = true;
    this.trigger("自己死亡后", {}, ignoreDie); // 可能有被动技能是死亡后触发的，要在删除被动技能对象前trigger下
    if (this.canHaltNormalAtk(true)) {
      this.haltNormalAtk();
    }
    this.dieClean();
    // Debug
    if (this.getAttr("dizzy") > 0) {
      this.wlogErr("dizzy > 0 after die!");
    }
    if (this.getAttr("silent") > 0) {
      this.wlogErr("silent > 0 after die!");
    }
    this.refreshAttr("dizzy");
    this.refreshAttr("silent");
    if (this.getAttr("dizzy") > 0) {
      this.wlogErr("dizzy > 0 after die! 2");
    }
    if (this.getAttr("silent") > 0) {
      this.wlogErr("silent > 0 after die! 2");
    }
    if (!firstCreated) {
      this.m_Listener.on("onDie", {
        unit: this,
        instakill,
        dietime: defines.getNowTime(),
      });
      this.m_War.onUnitDie(this);
    }
  }
  isDie() {
    return this.m_Die;
  }
  onRevive(hp, reason) {
    // this.wlog("onRevive", reason, this.ID());
    this.isDebug() && this.debuglog(this.name(), "复活了");
    if (!this.m_Die) {
      return;
    }
    if (hp) {
      hp = Math.ceil(hp);
    } else {
      hp = this.maxHp();
    }
    if (!(hp > 0)) {
      this.wlogErr("onRevive, wrong hp", hp, reason);
      hp = 1;
    }
    if (this.m_Hp > 0) {
      this.wlogErr("复活目标，但是目标HP不为0");
    }
    this.m_Die = false;
    this.m_Hp = hp;
    this.m_Started = false;
    this.start();
    this.m_Listener.on("onRevive", {
      unit: this,
      hp: this.m_Hp,
    });
  }
  addHp(iAddHp, atker) {
    if (this.isDie()) {
      this.wlog("[err] addHp after die");
      return 0;
    }
    iAddHp = parseInt(Math.round(iAddHp));
    // //this.wlog("[w_unit.addHp]", this.name(), "curHp", this.hp(), "addHp", iAddHp);
    if (this.m_Die) {
      return 0;
    }
    if (iAddHp === 0) {
      return 0;
    }
    if (iAddHp > 0 && this.hp() >= this.maxHp()) {
      return 0;
    }
    const iOldHp = this.hp();
    if (iAddHp > 0) {
      // 加血只能加m_Hp
      this.m_Hp += iAddHp;
      if (this.m_Hp > this.maxHp()) {
        this.m_Hp = this.maxHp();
      }
    } else { // iAddHp < 0
      // 扣血优先扣m_ExtraHp 再扣m_Hp
      if (this.m_ExtraHp > 0) {
        this.m_ExtraHp = this.m_ExtraHp + iAddHp; // 可能不够扣
        if (this.m_ExtraHp < 0) {
          // 不够扣，转而扣m_Hp
          this.m_Hp = this.m_Hp + this.m_ExtraHp;
          this.m_ExtraHp = 0;
        }
      } else {
        this.m_Hp = this.m_Hp + iAddHp;
      }
      if (this.m_Hp <= 0) {
        this.m_Hp = 0;
      }
    }

    const iRealAddHp = this.hp() - iOldHp;
    if (this.hp() <= 0) {
      const instakill = iOldHp >= this.maxHp();
      this.m_War.broadcastEvent("死亡前", {
        tobj: this,
      });
      this.die(instakill);
    }
    return iRealAddHp;
  }
  damage(dam, atker, hittype) {
    const iRealAddHp = this.addHp(-dam, atker);
    if (!atker) {
      const dActionData = {
        tobjID: this.objID(),
        dam,
      };
      if (hittype) {
        dActionData.h = hittype;
      }
      if (this.isDie()) {
        dActionData.die = 1;
      }
      this.pushAction(defines.Action.BeAttack, dActionData);
    }
    if (this.isMonster() && this.m_MSkillIDByHp) {
      this.removeCallOut("checkMSkillByHpPercent");
      this.callOut(this.m_War.secondsToFrames(0.4), "checkMSkillByHpPercent", this.checkMSkillByHpPercent.bind(this));
    }
    return iRealAddHp;
  }
  getBaseDam(c) {
    let atk = Math.max(0, this.getAttr("Atk"));
    const dr = (this.getAttr("DR") * 0.01) + (c || 0);
    if (dr !== 0) {
      atk *= 1 + dr;
    }
    atk = Math.round(atk);
    return atk;
  }
  judgeCriticAtk(tobj) {
    let critic = false;
    const itemBuffC = this.getAtkerItemBuff("Cri", tobj);
    let criticRate = this.getAttr("Cri"); // x%
    if (itemBuffC) {
      criticRate += itemBuffC * 100;
    }
    criticRate = Math.min(100, criticRate);
    const iRan = this.m_War.randomInt(0, 10000) / 100; // [0.00, 100.00]
    if (iRan <= criticRate) {
      critic = true;
    }
    if (!critic) {
      const _dOption = {
        critic,
        tobj,
      };
      this.trigger("暴击失败", _dOption);
      critic = _dOption.critic;
    }
    return critic;
  }
  calDamByTobj(tobj, iDam, isNormalAtk) {
    const tobjDef = tobj.getAttr("Def");
    // this.wlog("calDamByTobj tobjDef", tobjDef, 'iDam', iDam);
    if (tobjDef > 0) {
      let ignDef = 0;
      if (this.getAttr("IgnDef") > 0) {
        ignDef = this.getAttr("IgnDef") * 0.01; // 无视防御百分比
      }
      const tobjDef2 = tobjDef * (1 - ignDef);
      const dUpConfig = this.getHeroUpConfig();
      const tobjDefRate = tobjDef2 / (tobjDef2 + dUpConfig.DefRevise); // 防御修正值对英雄、怪物都适用
      // * (1-防御率) * (1+攻击方伤害加成-防御方免伤)
      iDam *= (1 - tobjDefRate);
      const dOptionDam = {
        isNormalAtk,
        tobj,
      };
      this.trigger("计算伤害", dOptionDam);
      const mul = dOptionDam.mul || 0; // 额外伤害加成
      iDam *= 1 + ((this.getAttr("DA") + mul - tobj.getAttr("DM")) * 0.01);
      this.isDebug() && this.debuglog(`${this.name()} [计算伤害] 计算防御，新伤害值:${iDam} 目标防御:${tobjDef} 目标防御率:${tobjDefRate}`);
    }
    // this.wlog("calDamByTobj new iDam", iDam);
    const tobjBeDamAdd = tobj.getAttr("BeDamAdd");
    const tobjBeDamMul = tobj.getAttr("BeDamMul");
    // 目标的 受到伤害加成
    if (tobjBeDamAdd !== 0 || tobjBeDamMul !== 0) {
      iDam = (iDam + tobjBeDamAdd) * (1 + (tobjBeDamMul * 0.01));
    }
    iDam = Math.max(0, iDam);
    iDam = Math.ceil(iDam);
    return iDam;
  }
  calDam(tobj, dOption = {}) {
    const itemBuffC = this.getAtkerItemBuff("Atk", tobj);
    // if (this.ID() === 1)  this.wlog("calDam", tobj.ID(), itemBuffC);
    let iDam = this.getBaseDam(itemBuffC);
    if (iDam < 0) {
      iDam = 0;
    }
    const isNormalAtk = dOption.obj == null;
    // //this.wlog("[calDam] getBaseDam:", iDam, this.ID(), this.getAttr("Atk"));
    if (dOption.atkVal) {
      iDam = dOption.atkVal;
      if (typeof (iDam) === "function") {
        iDam = this.transParam(iDam, dOption, tobj);
        // this.wlog("calDam, atkVal", iDam);
      }
      if (itemBuffC !== 0) {
        this.wlog("itemBuffC", itemBuffC, iDam, Math.round(iDam * (1 + itemBuffC)));
        iDam *= 1 + itemBuffC;
      }
      iDam = Math.round(iDam);
    }
    this.isDebug() && this.debuglog(`${this.name()} [计算伤害] 初始值:${iDam}`);
    if (isNormalAtk) { // 普攻才有伤害随机
      // //this.wlog("[calDam] iDam:", iDam);
      const iDamReviseMin = 0.9 + this.getAttr("DamReviseMin");
      const iDamReviseMax = 1.1 + this.getAttr("DamReviseMax");
      const iDamRevise = iDamReviseMin + (this.m_War.randomInt(0, Math.ceil((iDamReviseMax - iDamReviseMin) * 10000)) * 0.0001);
      iDam *= iDamRevise;
      this.isDebug() && this.debuglog(`${this.name()} [计算伤害] 波动修正值:${iDam}  ${iDamReviseMin}${iDamReviseMax}${iDamRevise}`);
    }
    if (dOption.damMul) {
      iDam *= dOption.damMul;
    }
    let critic = false;
    if (dOption.critic != null) {
      critic = dOption.critic;
    } else if (isNormalAtk) {
      critic = this.judgeCriticAtk(tobj);
    }
    if (critic) {
      const CriDam = this.getAttr("CriDam");
      iDam *= CriDam * 0.01;
      if (dOption) {
        dOption.CriDam = CriDam;
      }
      this.isDebug() && this.debuglog(`${this.name()} [计算伤害] 发生暴击，新伤害值:${iDam}`);
    }
    iDam = this.calDamByTobj(tobj, iDam, isNormalAtk);
    if (dOption.aoeK > 0) {
      iDam *= dOption.aoeK;
    }
    iDam = Math.ceil(iDam);
    if (_u.isNaN(iDam)) {
      this.wlogErr("[calDam] unvalid, dam=", iDam, "ID:", this.ID(), "isMonster:", this.isMonster(), isNormalAtk ? "normal" : (dOption.obj.skillID()));
      this.wlogErr(this.m_Data);
      this.wlogErr("BaseDam", this.getBaseDam(), "Atk", this.getAttr("Atk"));
      iDam = 0;
    }
    // this.wlog("[calDam] final:", iDam);
    const result = {
      dam: iDam,
      critic,
    };
    if (itemBuffC) {
      result.itemBuffC = itemBuffC;
    }
    return result;
  }
  msgGap() {
    return "#           #";
  }
  isNormalAtking() {
    if (!this.m_PreNAtkFrame) {
      return false;
    }
    const curTime = this.m_War.framesToSeconds(this.m_War.frames() - this.m_PreNAtkFrame);
    if (curTime >= this.getAtkFinishTime()) {
      return false;
    }
    return true;
  }
  // 是否普攻后半段（已命中，收刀中）
  isNormalAtkingBack() {
    if (!this.m_PreNAtkFrame) {
      return false;
    }
    const curTime = this.m_War.framesToSeconds(this.m_War.frames() - this.m_PreNAtkFrame);
    if (curTime > this.getBeAtkTime() && curTime < this.getAtkFinishTime()) {
      return true;
    }
    return false;
  }
  canHaltNormalAtk(isDie) {
    if (!this.hasCallOut("Attack")) {
      return false;
    }
    if (this.isNearAtkType()) {
      // 近战 死了就打断
      if (!isDie) {
        return false;
      }
    } else {
      // 远程 判断是否过了前摇时间
      const flyDelay = this.getFlyObjDelay();
      const curTime = this.m_War.framesToSeconds(this.m_War.frames() - this.m_PreNAtkFrame);
      if (curTime > flyDelay) {
        return false;
      }
    }
    return true;
  }
  haltNormalAtk() {
    this.removeCallOut("Attack");
  }
  isInControlState() {
    if (this.getAttr("NoAtk") > 0) { // 禁止普攻
      return true;
    }
    if (this.getAttr("dizzy")) {
      return true;
    }
    return false;
  }
  validNormalAtk() {
    if (!this.validAttack()) {
      return false;
    }
    if (this.getAttr("NoAtk") > 0) { // 禁止普攻
      return false;
    }
    if (this.m_ActiveSkillObj) {
      return false;
    }
    if (this.getAttr("Stuck")) {
      // 吟唱中
      return false;
    }
    return true;
  }
  validAttack() {
    if (this.isDie()) {
      return false;
    }
    if (this.getAttr("dizzy")) {
      // 眩晕中
      return false;
    }
    return true;
  }
  // 开始普通攻击的前摇
  preAttack(atkFinishTime) {
    // this.onAttackFinish(atkFinishTime);
    this.removeCallOut("atkFinish");
    this.callOut(this.m_War.secondsToFrames(atkFinishTime), "atkFinish", this.onAttackFinish.bind(this, "callout"));
    let tobj = this.getTemp("NextAtkTarget");
    if (tobj) {
      this.delTemp("NextAtkTarget");
      if (tobj.isDie()) {
        tobj = null;
      }
    }
    if (!tobj) {
      tobj = this.chooseTarget();
    }
    if (!tobj) {
      return;
    }
    const critic = this.judgeCriticAtk(tobj);

    this.pushAction(defines.Action.Attack, {
      tobjID: tobj.objID(),
      skill: 0,
      c: critic,
      t: atkFinishTime, // 总普攻耗时
    });
    this.haltNormalAtk();
    this.m_PreNAtkFrame = this.m_War.frames();
    assert(atkFinishTime > this.getBeAtkTime());
    this.callOut(this.m_War.secondsToFrames(this.getBeAtkTime()), "Attack", this.attack.bind(this, {
      tobj,
      critic,
    }));
  }
  // 不管普攻有没成功，都会触发onAttackFinish
  onAttackFinish(tag) {
    /*
      A麻痹之杖：禁止普攻1次，本次攻击不生效，应该在下一次出手才禁止普攻
      B研究研究：普攻加能量1次，应该在本次攻击就生效，生效后buff消失
      C蓄势待发：普攻增加伤害2次
 
      服务端出手后、客户端出手后：
 
        出手过程加了A这类状态，层数+1
        A逻辑不正确，如果加buff时机是在普攻伤害已经生效、正在返回原位置，回去后buff就删了，等于buff没效果
 
        B逻辑和表现都正确，普攻时加了能量，出手后也删了buff
        C逻辑和表现都正确
    */
    // atkFinishTime = atkFinishTime || this.getAtkFinishTime();
    this.m_Round = this.m_War.m_Round;
    const expiredStobjs = [];
    const dRoundInfo = {};// 更新客户端的buff图标
    // 检查有没state要结束
    for (const iID in this.m_StateDict) {
      const stobj = this.m_StateDict[iID];
      if (stobj.isByRound()) {
        const round = stobj.getLeftRound();
        if (round <= 0) {
          expiredStobjs.push(stobj);
        } else {
          dRoundInfo[iID] = round;
        }
      }
    }
    const delStateActions = [];
    for (let i = 0; i < expiredStobjs.length; i++) {
      const stobj = expiredStobjs[i];
      const dOption = { dontPush: true };
      stobj.end(dOption, 'atkfinish');
      delStateActions.push(dOption.actionData);
    }
    this.onAttackFinishForClient(delStateActions, dRoundInfo);
    // this.removeCallOut("atkFinish");
    // this.callOut(this.m_War.secondsToFrames(atkFinishTime), "atkFinish", this.onAttackFinishForClient.bind(this,
    // delStateActions, dRoundInfo));
  }
  onAttackFinishForClient(delStateActions, dRoundInfo) {
    for (let i = 0; i < delStateActions.length; i++) {
      this.pushAction(defines.Action.DelState, delStateActions[i]);
    }
    if (!_u.isEmpty(dRoundInfo)) {
      this.pushAction(defines.Action.UpdateStateRound, { r: dRoundInfo });
    }
  }
  // 这个attack返回的时候，目标就已经扣血了
  attack(dOption) {
    if (this.isDie()) {
      return;
    }
    if (!dOption) {
      dOption = {};
    }
    const isNormalAtk = dOption.obj == null;
    /*
    if (!this.validNormalAtk()) {
      return;
    }*/
    // 发动技能
    let tobjs = dOption.tobjs;
    if (!tobjs) {
      if (dOption.tobj) {
        tobjs = [dOption.tobj];
      } else {
        const tobj = this.chooseTarget();
        if (tobj) {
          tobjs = [tobj];
        }
      }
    }
    if (!tobjs || tobjs.length === 0) {
      return;
    }
    if (!isNormalAtk) {
      this.pushAction(defines.Action.Attack, {
        tobjID: tobjs[0].objID(), // 攻击动作只针对其中一个人
        skill: dOption.obj.skillID(),
      });
    }
    const iDamTimes = dOption.damTimes || this.m_War.getDamTimes(this);
    for (let i = 0; i < tobjs.length; i++) {
      if (this.isDie() || (!isNormalAtk && dOption.obj.isEnded())) {
        break;
      }
      const tobj = tobjs[i];
      for (let k = 0; k < iDamTimes; k++) {
        const bHit = this.hit(tobj, dOption);
        if (!this.isDie() && bHit) {
          if (isNormalAtk) {
            this.trigger("普攻命中", {
              tobj,
              dam: dOption.dam,
              debugTag: tobj && tobj.ID(),
            });
          } else {
            if (!dOption.noEvent) {
              this.trigger("技能命中", {
                tobj,
                dam: dOption.dam,
              });
            }
          }
        }
        if (tobj.isDie() || tobj.isReleased()) {
          continue;
        }
        if (dOption.odam) {
          tobj.trigger("被攻击后", {
            isNormalAtk,
            atker: this,
            tobj: this,
            odam: dOption.odam,
            dam: dOption.dam,
          });
        }
        if (this.isDie()) {
          break;
        }
      }
      if (this.isDie()) {
        break;
      }
    }
  }
  validDam(dam) {
    return dam >= 0;
  }
  debugHit(dam, isNormalAtk, tobj, dOption, ...args) {
    this.wlogErr("[debugHit] dam=",
      dam,
      "ID:", this.ID(),
      isNormalAtk ? "normal" : (dOption.obj.skillID()), ...args);
  }
  hit(tobj, dOption) {
    if (!tobj) {
      return false;
    }
    const isNormalAtk = dOption.obj == null;
    let dam = dOption.dam;
    let critic = false;
    let e = this.getNormalAtkEffect();
    if (!dam || dOption.atkVal) {
      const result = this.calDam(tobj, dOption);
      if (!this.validDam(result.dam)) {
        this.debugHit(dam, isNormalAtk, tobj, dOption, result.dam);
        return false;
      }
      dam = result.dam;
      critic = result.critic;
      if (result.itemBuffC) {
        e = result.itemBuffC > 0 ? 100 : 101;
      }
    }
    if (!this.validDam(dam)) {
      this.debugHit(dam, isNormalAtk, tobj, dOption);
      return false;
    }
    if (critic) {
      // 暴击事件
      this.trigger("暴击", dOption);
    }
    dOption.dam = dam;
    if (tobj.isDie()) {
      // 目标已死，还是会跳字
      const _dActionData = {
        tobjID: tobj.objID(),
        dam,
        h: dOption.hittype,
        e,
      };
      if (critic) {
        _dActionData.c = critic;
      }
      this.pushAction(defines.Action.BeAttack, _dActionData);
      return false;
    }
    if (isNormalAtk) {
      this.isDebug() && this.debuglog(`${this.name()} 攻击了 ${tobj.name()}HP:${this.hp()}/${this.maxHp()}`);
    } else {
      this.isDebug() && this.debuglog(`${this.name()} ${dOption.obj.name()} 攻击了 ${tobj.name()}HP:${this.hp()}/${this.maxHp()}`);
    }
    // 计算回避
    if (isNormalAtk && !dOption.ignoreDodge && !tobj.getAttr("dizzy")) { // 不在眩晕状态时才能回避
      let tobjDodge = tobj.getAttr("Dodge");
      const myHit = this.getAttr("Hit");
      tobjDodge -= myHit;
      if (tobjDodge > 0) {
        const iRan = this.m_War.randomInt(0, 10000) / 100;
        this.isDebug() && this.debuglog(`      计算回避, 对方回避百分比:${tobjDodge}随机数:${iRan}->${(iRan <= tobjDodge) ? "闪避" : "命中"}`);
        if (iRan <= tobjDodge) {
          // 闪避成功
          this.pushAction(defines.Action.BeAttack, {
            tobjID: tobj.objID(),
            m: 1,
            e,
          });
          if (critic) {
            this.trigger("暴击后", dOption);
          }
          tobj.trigger("闪避", {});
          return false;
        }
      }
    }
    dOption.odam = dam; // original dam 用来计算反伤；有odam意味着攻击方成功攻击到目标（但目标不一定扣dam数量的血）
    const tmpOption = {
      tobj,
      isNormalAtk,
      atker: this,
      dam: dOption.dam,
    };
    // 可能有伤害吸收
    this.m_War.broadcastEvent("被攻击前", tmpOption, tobj.team());
    dOption.dam = tmpOption.dam;
    dam = dOption.dam;
    this.isDebug() && this.debuglog(`      ${tobj.name()} 扣血:${dam}${critic ? "[暴击]" : ""} Hp:${tobj.hp()}=>${Math.max(0, tobj.hp() - dam)}`);
    if (!this.validDam(dam)) {
      this.debugHit(dam, isNormalAtk, tobj, dOption);
      return false;
    }
    const iRealAddHp = tobj.damage(dam, this);
    if (critic) {
      this.trigger("暴击后", dOption);
    }
    if (!tobj.isDie()) {
      if (iRealAddHp < 0) {
        // 没死，但是被扣血
        tobj.trigger("受伤", {
          tobj: this,
        });
      }
    }


    const dActionData = {
      tobjID: tobj.objID(),
      dam,
      h: dOption.hittype,
      e,
    };
    if (tmpOption.ab) {
      dActionData.ab = tmpOption.ab;
    }
    if (tobj.isDie()) {
      dActionData.die = 1;
      dActionData.atkerID = this.objID();
    }
    if (critic) {
      dActionData.c = critic;
    }
    this.pushAction(defines.Action.BeAttack, dActionData);
    if (!isNormalAtk && !dOption.noEffect) {
      if (!this.isDie() && !dOption.obj.isEnded()) {
        // 技能受击动画
        this.pushAction(defines.Action.SkillEffect, {
          tobjID: tobj.objID(),
          name: defines.getSkill_HitEffectName(dOption.obj.tplID()),
        });
      }
    }
    return true;
  }
  addMsg(msg) {
    if (!this.m_TmpMsg) {
      this.m_TmpMsg = msg;
    } else {
      this.m_TmpMsg += msg;
    }
  }
  pushAndCleanMsg() {
    this.pushMsg(this.m_TmpMsg);
    delete this.m_TmpMsg;
  }
  pushMsg(msg) {
    this.m_Listener.on("onPushMsg", msg);
  }
  trigger(sEvent, dOption, ignoreDie) {
    if (!dOption) {
      dOption = {};
    }
    dOption.who = this;
    do {
      // 有监听事件的主动技能（同一时刻只有一个）
      if (!ignoreDie && this.isDie()) {
        break;
      }
      if (this.m_ActiveSkillObj) {
        this.m_ActiveSkillObj.trigger(sEvent, dOption);
      }
      if (!ignoreDie && this.isDie()) {
        break;
      }
      let skobjs = _u.values(this.m_PassiveSkillDict); // 有监听事件的被动技能
      // trigger参数如果带目标，那么目标不能被action修改，不然会乱
      // 所以每次trigger完恢复目标参数
      const tobjCached = dOption.tobj;
      const tobjsCached = dOption.tobjs;
      if (skobjs) {
        for (let i = 0, len = skobjs.length; i < len; i++) {
          const skobj = skobjs[i];
          skobj.trigger(sEvent, dOption);
          if (!ignoreDie && this.isDie()) {
            break;
          }
          dOption.tobj = tobjCached;
          dOption.tobjs = tobjsCached;
        }
      }
      skobjs = _u.values(this.m_HaloSkillDict); // 有监听事件的光环技能
      if (skobjs) {
        for (let i = 0, len = skobjs.length; i < len; i++) {
          const skobj = skobjs[i];
          skobj.trigger(sEvent, dOption);
          if (!ignoreDie && this.isDie()) {
            break;
          }
          dOption.tobj = tobjCached;
          dOption.tobjs = tobjsCached;
        }
      }
      const stobjs = _u.values(this.m_StateDict); // 有监听事件的状态
      if (stobjs) {
        for (let i = 0, len = stobjs.length; i < len; i++) {
          const stobj = stobjs[i];
          if (stobj.isEnded()) {
            // this.wlog("[trigger] stobj is ended, SID:", stobj.m_SID, sEvent);
          }
          stobj.trigger(sEvent, dOption);
          if (!ignoreDie && this.isDie()) {
            break;
          }
          dOption.tobj = tobjCached;
          dOption.tobjs = tobjsCached;
        }
      }
    } while (false);
  }
  getSkillLv(iSkillID) {
    const skillData = this.skillData();
    if (skillData && skillData[iSkillID]) {
      return skillData[iSkillID].lv;
    }
    // 可能是道具技能
    const slv = this.getExtraAttr(`skill${iSkillID}_lv`);
    return slv > 0 ? slv : 0;
  }
  getSkillStar(iSkillID) {
    const skillData = this.skillData();
    if (skillData && skillData[iSkillID]) {
      return skillData[iSkillID].s;
    }
    // 可能是道具技能，星阶根据技能等级算
    const slv = this.getSkillLv(iSkillID);
    const star = Math.floor(slv / 20);
    return star;
  }
  getSkillTplID(iSkillID) {
    const dConfig = defines.getSkillConfig(iSkillID);
    // 判断有没使用技能专属道具，专属道具会更改技能的模板ID
    const val = this.getExtraAttr(`skill${iSkillID}_T`);
    if (val > 0 && dConfig.TplID_Item) { // TplID_Item 专属技能模板ID
      if (SkillTplData[dConfig.TplID_Item]) {
        return dConfig.TplID_Item;
      }
    }
    return dConfig.TplID;
  }
  getPassiveSkobj(iSkillID) {
    return this.m_PassiveSkillDict[iSkillID];
  }
  onSkillEnd(skobj) {
    if (this.m_ActiveSkillObj === skobj) {
      this.m_ActiveSkillObj = null;
    }
    if (this.m_HaloSkillDict[skobj.skillID()]) {
      delete this.m_HaloSkillDict[skobj.skillID()];
    }
    if (this.m_PassiveSkillDict[skobj.skillID()]) {
      delete this.m_PassiveSkillDict[skobj.skillID()];
      this.refreshAttrBySkillObj(skobj);
    }
  }
  haltActiveSkill() {
    if (this.m_ActiveSkillObj) {
      this.m_ActiveSkillObj.end();

      this.pushAction(defines.Action.HaltSkill, {});

    }
  }
  validUseSkill(iSkillID) {
    if (!this.isStarted()) {
      return mbgGame.config.ErrCode.UseSkill_NotStarted;
    }
    if (this.isDie()) {
      return mbgGame.config.ErrCode.UseSkill_CharaDie;
    }
    if (!this.isMonster()) {
      const dSkillConfig = defines.getSkillConfig(iSkillID);
      if (!dSkillConfig) {
        return mbgGame.config.ErrCode.UseSkill_NoSkillConfig;
      }
    }
    if (this.isNormalAtking()) {
      return mbgGame.config.ErrCode.UseSkill_NormalAtking;
    }
    if (this.getAttr("silent") > 0 && defines.isActiveSkill(iSkillID) && !this.getAttr("btn")) {
      return mbgGame.config.ErrCode.UseSkill_Silent;
    }
    if (this.getAttr("Stuck")) {
      // 吟唱中
      return mbgGame.config.ErrCode.UseSkill_Stuck;
    }
    if (this.getAttr("dizzy") && !this.getAttr("btn")) {
      // 眩晕中
      return mbgGame.config.ErrCode.UseSkill_Dizzy;
    }
    if (!defines.isActiveSkill(iSkillID) && this.m_PassiveSkillDict[iSkillID]) {
      return mbgGame.config.ErrCode.UseSkill_HasOldPassiveSkill;
    }
    if (defines.isActiveSkill(iSkillID)) {
      if (!this.isMonster()) {
        const iNeedEnergy = this.getSkillCostEnergy(iSkillID);
        const oWar = this.m_War;
        if (oWar.getEnergy(this.team()) < iNeedEnergy) {
          return mbgGame.config.ErrCode.UseSkill_LackEnergy;
        }
        if (this.m_UseActiveSkillFrame != null) {
          const curFrame = oWar.frames();
          const elapsedFrames = curFrame - this.m_UseActiveSkillFrame;
          const elapsedTime = oWar.framesToSeconds(elapsedFrames);
          if (elapsedTime < (mbgGame.config.constTable.SkillCD || 2)) {
            return mbgGame.config.ErrCode.UseSkill_EnergyCD;
          }
        }
      }
      if (this.m_ActiveSkillObj) {
        return mbgGame.config.ErrCode.UseSkill_HasOldActiveSkill;
      }
    }
    return null;
  }
  getSkillCostEnergy(iSkillID) {
    if (!this.isMonster()) {
      iSkillID = iSkillID || defines.getCharaActiveSkillID(this.ID());
      const skillData = this.skillData();
      const dSkill = skillData[iSkillID];
      const iCDTime = this.getSkillParamByID("CD", iSkillID, dSkill.lv, dSkill.s);
      let iNeedEnergy = iCDTime;
      const iCEAdd = this.getAttr("CEAdd");
      const iCEMul = this.getAttr("CEMul");
      iNeedEnergy = Math.max(0, Math.floor((iNeedEnergy + iCEAdd) * (1 + (iCEMul * 0.01))));
      return iNeedEnergy;
    }
    return 0;
  }
  getSkillIdx(iSkillID) {
    if (!this.isMonster()) {
      return null;
    }
    // 怪物才需要知道技能序号
    const skillIDs = this.getMonsterSkillIDs();
    return skillIDs.indexOf(iSkillID);
  }
  useSkill(iSkillID, dData) {
    if (!dData) {
      dData = {};
    }
    const err = this.validUseSkill(iSkillID);
    if (err) {
      this.isDebug() && this.debuglog(this.name(), `使用 [${iSkillID}:${dData.lv}] 失败`);
      return err;
    }
    if (!dData.lv) {
      dData.lv = this.getSkillLv(iSkillID);
    }
    if (!dData.s) {
      dData.s = this.getSkillStar(iSkillID);
    }
    if (!dData.TplID) {
      dData.TplID = this.getSkillTplID(iSkillID);
    }
    const dOption = {};
    this.trigger("使用技能前", dOption);
    if (dOption.forbid) {
      return null;
    }
    // this.wlog("[useSkill] UnitSID:", this.ID(), "iSkillID:", iSkillID, "tpl:", dData.TplID);
    const skobj = new CSkill(iSkillID, this, dData);
    this.isDebug() && this.debuglog(this.name(), `使用了 [${skobj.name()}:${dData.lv}]`, dData);

    if (skobj.isActiveSkill()) {
      if (!this.isMonster() && !dData.free) {
        const iNeedEnergy = this.getSkillCostEnergy(iSkillID);
        if (iNeedEnergy > 0) {
          const _dOption = {
            free: false,
          };
          this.trigger("扣能量前", _dOption);
          if (!_dOption.free) {
            this.m_War.addEnergy(this.team(), -iNeedEnergy);
            this.m_War.onEnergyChanged(this.team());
          }
        }
      }
      this.haltNormalAtk(); // 打断当前可能已经在前摇的普攻
      this.pushAction(defines.Action.UseSkill, {
        skill: iSkillID,
        t: moment().valueOf(),
      });
    }
    skobj.activate({});
    if (skobj.isActiveSkill()) {
      this.m_UseActiveSkillFrame = this.m_War.frames();
      if (!skobj.isEnded()) {
        this.m_ActiveSkillObj = skobj;
      }
      this.pushAction(defines.Action.ShowSkill, {
        skillID: skobj.skillID(),
        tplID: skobj.tplID(),
        duration: skobj.duration(),
      });
      this.trigger("用主技后", {});
    }
    if (!skobj.isEnded()) {
      if (!skobj.isHaloSkill()) {
        if (!skobj.isActiveSkill()) {
          this.m_PassiveSkillDict[iSkillID] = skobj;
          this.onPassiveSkillUpdated(skobj);
        }
      } else {
        this.m_HaloSkillDict[iSkillID] = skobj;
      }
    }

    return null;
  }
  onPassiveSkillUpdated(skobj) {
    // this.isDebug() && this.debuglog(this.name(), "刷新被动技能", skobj.name());
    this.refreshAttrBySkillObj(skobj);
  }
  doAction(dAction, dOption) {
    // this.wlog("[w_unit.doAction]", this.name(), dAction["行为"]);
    const func = ActionData[dAction["行为"]];
    if (!func) {
      this.wlogErr(`[w_unit.doAction] 行为函数不存在:${dAction["行为"]}`);
      return;
    }
    if (dAction.delay) {
      const [frames, flag] = dAction.delay;
      this.callOut(frames,
        `doAction_${flag}`, this.doAction.bind(this, dAction, dOption));
    }
    func(this, dAction, dOption);
  }
  isImmune(iStateType) {
    return this.m_ImmuneStobjID
      && this.m_ImmuneStobjID[iStateType]
      && (this.m_ImmuneStobjID[iStateType].length > 0);
  }
  addImmune(stobjID, iStateType) {
    if (!this.m_ImmuneStobjID) {
      this.m_ImmuneStobjID = {
        // type: [stobjID]
      };
    }
    if (!this.m_ImmuneStobjID[iStateType]) {
      this.m_ImmuneStobjID[iStateType] = [];
    }
    const lst = this.m_ImmuneStobjID[iStateType];
    if (lst.indexOf(stobjID) === -1) {
      lst.push(stobjID);
    }
  }
  removeImmune(stobjID, iStateType) {
    if (!this.m_ImmuneStobjID || !this.m_ImmuneStobjID[iStateType]) {
      return;
    }
    const lst = this.m_ImmuneStobjID[iStateType];
    const idx = lst.indexOf(stobjID);
    if (idx !== -1) {
      lst.splice(idx, 1);
    }
  }
  addState(stobj, dOption, cr) {
    if (!stobj) {
      this.wlogErr("[w_unit.addState] no stobj");
      return;
    }
    this.m_StateDict[stobj.m_ID] = stobj;
    this.refreshAttrByStobj(stobj);
    stobj.activate(dOption, cr);
    // this.wlog("[state add] m_SID:", stobj.m_SID, "ID:", stobj.m_ID, "owner:", this.objID(), this.posIdx());
  }
  refreshStateAttr(sName) {
    let iAdd = 0;
    let iMul = 0;
    for (const iID in this.m_StateDict) {
      const stobj = this.m_StateDict[iID];
      const attrDict = stobj.attr();
      if (!attrDict) {
        continue;
      }
      for (const sName_iter in attrDict) {
        if (sName === sName_iter) {
          const tItem = attrDict[sName_iter];
          if (tItem && tItem.length > 0) {
            iAdd += this.transParam(tItem[0], {
              obj: stobj,
            });
            iMul += this.transParam(tItem[1], {
              obj: stobj,
            });
          }
          break;
        }
      }
    }
    this.m_StateAttrDict[sName] = [iAdd, iMul];
  }
  refreshAttrByStobj(stobj) {
    const attrDict = stobj.attr();
    for (const sAttr in attrDict) {
      if (attrDict[sAttr] && attrDict[sAttr].length > 0) {
        // this.wlog("[state refreshStateAttr]", sAttr);
        this.refreshStateAttr(sAttr);
        this.refreshAttr(sAttr, null, null, "state");
      }
    }
  }
  getStatesBySID(stateSID) {
    const stobjs = [];
    for (const iID in this.m_StateDict) {
      const stobj = this.m_StateDict[iID];
      if (stobj.m_SID === stateSID) {
        stobjs.push(stobj);
      }
    }
    return stobjs;
  }
  getStatesByType(iType) {
    if (this.getCachedStateInfo()) {
      return this.getCachedStateInfo()[iType];
    }
    const stlist = [];
    for (const iID in this.m_StateDict) {
      const stobj = this.m_StateDict[iID];
      if (stobj.getConfig().Type === iType) {
        stlist.push(stobj);
      }
    }
    return stlist;
  }
  removeState(stobj) {
    const _stobj = this.m_StateDict[stobj.m_ID];
    if (_stobj !== stobj) {
      this.wlogErr("removeState _stobj != stobj,  ID:", stobj && stobj.m_ID, _stobj && _stobj.m_ID);
      return;
    }
    delete this.m_StateDict[stobj.m_ID];
    this.refreshAttrByStobj(stobj);
  }
  removeStateBySID(stateSID, dOption) {
    const stobjs = this.getStatesBySID(stateSID);
    for (let i = 0; i < stobjs.length; i++) {
      const stobj = stobjs[i];
      stobj.end(dOption, 'remove');
    }
  }
  removeStateByType(iType, dOption) {
    const stobjs = this.getStatesByType(iType);
    if (!stobjs) {
      return;
    }
    for (let k = 0, len = stobjs.length; k < len; k += 1) {
      const stobj = stobjs[k];
      stobj.end(dOption, 'remove');
    }
  }
  /* ------------------------------------------------主逻辑--------------------------------*/
  chooseTarget() {
    return this.m_War.chooseRandomTarget(this, {
      exclude: this.objID(),
    });
  }
  onAddFrame() {
    this.m_Timer.processSchedule();
  }
  // 尝试使用角色拥有的各个被动技能，包括自带的和道具的
  checkUsePassiveSkills() {
    if (this.isDie()) {
      return;
    }
    // 角色自带的被动技能
    const skillData = this.skillData();
    if (skillData) {
      for (let skillID in skillData) {
        skillID = parseInt(skillID);
        if (!defines.isActiveSkill(skillID)) {
          const err = this.useSkill(skillID);
          if (err) this.wlog("[checkUsePassiveSkills] useSkill err", err);
        }
      }
    }
    // 道具的被动技能
    if (this.m_ItemSkillIDs) {
      for (let i = 0; i < this.m_ItemSkillIDs.length; i++) {
        const skillID = this.m_ItemSkillIDs[i];
        if (!defines.isActiveSkill(skillID)) {
          this.useSkill(skillID);
        }
      }
    }
  }
  isStarted() {
    return this.m_Started;
  }
  // 创建Unit、复活Unit时执行
  start() {
    this.m_Started = true;
    if (this.m_cachedStateInfo) {
      delete this.m_cachedStateInfo;
    }
    if (this.hp() <= 0) {
      // this.wlog("[start] hp <= 0", this.ID());
      this.die();
    }
    // this.wlog("[w_unit.start] isDie:", this.ID(), this.isDie());
    if (this.isDie()) {
      return;
    }

    /* 2017-6-22改：由war按回合制模式管理每个人的普攻
    if (!this.m_Started) {
        this.firstAttack();
    }*/
    // 自然恢复
    this.prepareNextRecover();
    // 英雄和怪物的定制逻辑
    if (!this.isMonster()) {
      // 这里顺序不能动
      this.refreshItemSkills();
      this.checkUsePassiveSkills();
    } else {
      // 怪物拥有的技能
      const skillIDs = this.getMonsterSkillIDs();
      if (skillIDs) {
        for (let i = 0; i < skillIDs.length; i++) {
          const skillID = skillIDs[i];
          const dSkillConfig = mbgGame.config[`skill${skillID}`];
          if (defines.isActiveSkill(skillID)) {
            // 主动技能，按条件触发
            // 要么按血量触发，要么按时间间隔触发
            const hpPercent = this.isBoss() ? dSkillConfig.HpPercent : dSkillConfig.HpPercent2;
            if (hpPercent) {
              // 按血量触发的技能，damage后做检测
              this.m_MSkillIDByHp = skillID;
            } else {
              const useSkillByTime = this.isBoss() ? dSkillConfig.UseSkillByTime : dSkillConfig.UseSkillByTime2;
              if (useSkillByTime) {
                this.callOut(this.m_War.secondsToFrames(useSkillByTime), "checkMSkillByTime", this.checkMSkillByTime.bind(this, skillID));
              }
            }
          } else {
            // 被动技能，和英雄的被动一致
            this.useSkill(skillID, {
              lv: this.getMonsterSkillLv(),
              s: this.getMonsterSkillStar(),
            });
          }
        }
      }
      this.checkWaitingSkill();
    }
    this.refreshPassiveSkillAllAttr();
  }
  getMonsterSkillIDs() {
    let skillIDs = this.getUnitConfig().SkillList;
    if (skillIDs) {
      if (typeof (skillIDs) === "number") {
        skillIDs = [skillIDs];
      }
      return skillIDs;
    }
    return null;
  }
  getMonsterSkillLv() {
    return this.lv();
  }
  getMonsterSkillStar() {
    return Math.floor(this.lv() / 20);
  }
  checkMSkillByTime(skillID) {
    const dSkillConfig = mbgGame.config[`skill${skillID}`];
    const useSkillByTime = this.isBoss() ? dSkillConfig.UseSkillByTime : dSkillConfig.UseSkillByTime2;
    this.callOut(this.m_War.secondsToFrames(useSkillByTime), "checkMSkillByTime", this.checkMSkillByTime.bind(this, skillID));
    this.pushToWaitingSkill(skillID);
  }
  checkMSkillByHpPercent() {
    const skillID = this.m_MSkillIDByHp;
    if (!skillID) {
      return;
    }
    if (!this.m_UsedSkillIdx) {
      this.m_UsedSkillIdx = {}; // { skillID: idx }
      // idx指的是已经到了第几阶段
    }
    if (!defines.isActiveSkill(skillID)) {
      return;
    }
    // 按血量触发，每级血量只能触发一次
    const dSkillConfig = mbgGame.config[`skill${skillID}`];
    const lstHpPercent = this.isBoss() ? dSkillConfig.HpPercent : dSkillConfig.HpPercent2;
    const len = lstHpPercent.length;
    const curIdx = this.m_UsedSkillIdx[skillID];
    // 从hp低到高检查
    // [ 75 50 25]
    // idx = 2->1->0  25->50->75
    const curHpPercent = this.hp() / this.maxHp();
    this.isDebug() && this.debuglog(this.name(), "技能列表", curIdx, lstHpPercent, curHpPercent);
    for (let k = len - 1; k >= 0; k--) {
      if (curIdx != null) {
        if (k === curIdx) {
          break;
        }
      }
      const hpPercent = lstHpPercent[k];
      if (curHpPercent > hpPercent * 0.01) {
        continue;
      }
      this.m_UsedSkillIdx[skillID] = k;
      this.isDebug() && this.debuglog(this.name(), "准备使用技能", skillID, k);
      this.pushToWaitingSkill(skillID);
      break;
    }
  }
  pushToWaitingSkill(skillID) {
    if (!this.m_WaitingSkill) {
      this.m_WaitingSkill = [];
    }
    this.m_WaitingSkill.push(skillID);
    this.checkWaitingSkill();
  }
  checkWaitingSkill() {
    this.removeCallOut("checkWaitingSkill");
    this.callOut(this.m_War.secondsToFrames(1), "checkWaitingSkill", this.checkWaitingSkill.bind(this));
    if (this.m_WaitingSkill && this.m_WaitingSkill.length > 0) {
      const skillID = this.m_WaitingSkill[0];
      if (!this.validUseSkill(skillID)) {
        this.m_WaitingSkill.shift();
        if (this.isMonster()) {
          this.useSkill(skillID, {
            lv: this.getMonsterSkillLv(),
            s: this.getMonsterSkillStar(),
          });
        } else {
          this.useSkill(skillID, {
            free: true,
          });
          if (this.m_WaitingSkill.length === 0) {
            this.removeCallOut("checkWaitingSkill");
          }
        }
      }
    }
  }
  calToxicDam() {
    const skobj = this.m_ToxicDamSkobj;
    if (!skobj || skobj.isEnded() || !skobj.m_Owner || skobj.m_Owner.isDie()) {
      this.cleanToxicDamParam();
      this.onToxicDamEnd();
      return 0;
    }
    const causer = skobj.m_Owner;
    let dam = causer.transParam(this.m_ToxicDamFormulaVal, {
      obj: skobj,
    },
      this);
    dam = Math.ceil(dam);
    return dam;
  }
  prepareNextRecover() {
    this.removeCallOut("Recover");
    this.callOut(this.m_War.secondsToFrames(5), "Recover", this.onRecoverTimeout.bind(this));
  }
  onRecoverTimeout() {
    // this.wlog("[onRecoverTimeout]");
    this.prepareNextRecover();
    if (this.isDie()) {
      return;
    }
    if (this.hp() >= this.maxHp()) {
      return;
    }

    let iAddHp = Math.ceil(this.maxHp() * this.getAttr("Heal") * 0.01 * this.m_War.getHealRatio());
    if (iAddHp <= 0) {
      return;
    }
    const reduceHeal = this.getAttr("ReduceHeal");
    const ratio = -reduceHeal;
    if (ratio !== 0) {
      iAddHp = Math.max(0, iAddHp * (1 + (ratio * 0.01)));
    }
    if (iAddHp <= 0) {
      return;
    }
    // this.wlog("[onRecoverTimeout] iAddHp", iAddHp, this.maxHp(), this.getAttr("Heal"), this.m_Data);
    this.addHp(iAddHp);
    this.pushAction(defines.Action.Recover, {
      hp: this.hp(),
      addHp: iAddHp,
    });
  }
  // 完全恢复：死亡的会复活
  fullRecover(nolabel) {
    if (this.isDie()) {
      this.onRevive(null, "fullRecover");
    } else {
      this.halfRecover(nolabel);
    }
  }
  // 半恢复：没死的回满血，死了的跳过
  halfRecover(nolabel) {
    if (this.isDie()) {
      return;
    }
    const iAddHp = this.maxHp();
    this.addHp(iAddHp);

    this.pushAction(defines.Action.FullRecover, {
      maxHp: this.maxHp(),
      nolabel,
    });
  }
  atkType() {
    if (this.m_AtkType == null) {
      // 缓存
      this.m_AtkType = this.getMTplConfig().AtkType;
    }
    return this.m_AtkType;
  }
  isNearAtkType() {
    return this.atkType() === 1;
  }
  // 普攻总时间
  getAtkFinishTime() {
    if (this.isNearAtkType()) {
      // 近战
      const dConfig = this.getMTplConfig();
      const normalAtkTime = dConfig.NAtkFrames / defines.AniFPS;

      /*
      this.wlog("finish near", mbgGame.config.constTable.AtkRushTime,
        normalAtkTime,
        mbgGame.config.constTable.AtkBackTime,
        mbgGame.config.constTable.AtkWaitTime);
      */
      return mbgGame.config.constTable.AtkRushTime +
        normalAtkTime +
        mbgGame.config.constTable.AtkBackTime +
        mbgGame.config.constTable.AtkWaitTime;
    }
    // 远程
    const delay = this.getFlyObjDelay();

    /*
    this.wlog("finish far", mbgGame.config.constTable.FlyTime,
      delay,
      mbgGame.config.constTable.AtkWaitTime);
    */
    return mbgGame.config.constTable.FlyTime +
      delay +
      mbgGame.config.constTable.AtkWaitTime + 0.2; // 总时长要大于受击时间
  }
  // 返回的是受击时间
  getBeAtkTime() {
    if (this.atkType() === 1) {
      // 近战
      const dConfig = this.getMTplConfig();
      const t = dConfig.NAtkKeyFrames / defines.AniFPS;
      // this.wlog("beatk near", mbgGame.config.constTable.AtkRushTime, t);
      return mbgGame.config.constTable.AtkRushTime +
        t;
    }
    const delay = this.getFlyObjDelay();
    // this.wlog("beatk far", mbgGame.config.constTable.FlyTime, delay);
    return mbgGame.config.constTable.FlyTime + delay + mbgGame.config.constTable.BeAtkDelay;
  }
  getItemEffectVal(skillID) {
    skillID = skillID || defines.getCharaActiveSkillID(this.ID());
    return this.getExtraAttr(`skill${skillID}_T`);
  }
  // 给技能数值计算用的
  setBaseMode(b) {
    this.m_BaseMode = b;
  }
  getSkillParamByID(sParam, skillID, skilllv, star, causer) {
    // this.isDebug() && this.debuglog(this.name(), "[getSkillParamByID]", sParam, skillID, skilllv, star);
    const dConfig = defines.getSkillConfig(skillID);
    const dSkillTable = SkillTplData[this.getSkillTplID(skillID)];
    let val = dConfig[`${sParam}_`] || dConfig[sParam];
    let who = this;
    if (causer) {
      who = causer;
    }
    //  this.wlog("getSkillParamByID", this.ID(), skillID, skilllv, star);
    // 是否是公式
    if (typeof (val) === "function") {
      const func = val;
      const helper = new FormulaHelper();
      val = helper.exec(func, sParam, {
        val,
        s: star,
        slv: skilllv,
        unit: who,
      });
    }
    if (sParam === "CD") {
      if (dSkillTable.Energy) {
        let iEnergy = this.getItemEffectVal(skillID);
        if (dSkillTable.Energy === "-") {
          iEnergy = -iEnergy;
        } else {
          iEnergy = +iEnergy;
        }
        val += iEnergy;
      }
      // this.wlog(this.ID(), "getTemp EnergyAdd", this.getTemp("EnergyAdd"));
      if (this.getTemp("EnergyAdd") != null) {
        val += this.getTemp("EnergyAdd");
      }
      if (val < 0) {
        val = 0;
      }
    }
    return val;
  }
  getSkillParam(sParam, skobj) {
    assert(skobj, sParam);
    return this.getSkillParamByID(sParam, skobj.skillID(), skobj.lv(), skobj.star(), skobj.causer());
  }
  sendState() {
    if (!_u.isEmpty(this.m_StateDict)) {
      for (const stateObjID in this.m_StateDict) {
        const stobj = this.m_StateDict[stateObjID];
        stobj.sendStateActionPacket();
      }
    }
  }
}


module.exports = CUnit;