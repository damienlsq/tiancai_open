const defines = require('warDefines');
const fighterBase = require('fighterBase');

/*
    fighter只有2个临时变量：m_Members和m_Data

    这里放fighter基本属性的getter/setter接口
*/

cc.Class({
  extends: fighterBase,
  properties: {
    // 这个文件不需要关联任何UI的东西
  },
  clearVarDict() {
    this.m_Members = null;
  },
  // 取消m_XXX写法，所有成员变量放进m_Members管理
  getVar(key) {
    if (!this.m_Members) {
      return null;
    }
    return this.m_Members[key];
  },
  setVar(key, v) {
    if (!this.m_Members) {
      this.m_Members = {};
    }
    this.m_Members[key] = v;
  },
  emitValChanged(key, val) {
    emitter.emit("onFighterValUpdated", this.node, key, val);
  },
  setName(name) {
    this.setVar("name", name);
  },
  charaID() {
    return this.getVar("ID") || this.m_Data.ID;
  },
  setCharaID(ID) {
    this.setVar("ID", ID);
  },
  objID() {
    return this.getVar("objID");
  },
  setObjID(objID) {
    this.setVar("objID", objID);
  },
  getTeam() {
    return this.getVar("team");
  },
  setTeam(iTeam) {
    this.setVar("team", iTeam);
  },
  setStandTeam(iTeam) {
    this.setVar("standTeam", iTeam);
  },
  getStandTeam() {
    // 如果设了standTeam就用standTeam，否则用逻辑上的team
    return this.getVar("standTeam") || this.getTeam();
  },
  getEnemyCenterPos() {
    let pos;
    if (this.getStandTeam() === defines.TEAM_LEFT) {
      pos = defines.getCenterStandPos(defines.TEAM_RIGHT);
    } else {
      pos = defines.getCenterStandPos(defines.TEAM_LEFT);
    }
    return pos;
  },
  setWorldIdx(worldIdx) {
    this.setVar("WorldIdx", worldIdx);
  },
  getWorldIdx() {
    return this.getVar("WorldIdx");
  },
  posIdx() {
    let posIdx = this.getVar("posIdx");
    if (posIdx == null) {
      posIdx = this.m_Data.posIdx;
    }
    return posIdx;
  },
  setPosIdx(posIdx) {
    this.setVar("posIdx", posIdx);
  },
  // 普攻/默认飞行物
  getFlySpineName() {
    return this.getMTplConfig().AtkFlySpine;
  },
  getHitPos() {
    const dConfig = this.getMTplConfig();
    const dir = this.getDir();
    const HitPos = dConfig.HitPos;
    if (HitPos) {
      const x = dir === defines.DIR_RIGHT ? -HitPos[0] : HitPos[0];
      return new cc.Vec2(x, HitPos[1]);
    }
    return new cc.Vec2(0, 0);
  },
  getFlyDelay() {
    return this.getMTplConfig().FlyDelay / defines.FPS;
  },
  getFlyPos() {
    const dConfig = this.getMTplConfig();
    const dir = this.getDir();
    const FlyPos = dConfig.FlyPos;
    if (FlyPos) {
      const x = dir === defines.DIR_RIGHT ? -(+FlyPos[0]) : +FlyPos[0];
      return new cc.Vec2(x, +FlyPos[1]);
    }
    return null;
  },
  setDir(dir) {
    this.setVar("dir", dir);
  },
  getDir() {
    return this.getVar("dir");
  },
  getPos(iTeam, posIdx) {
    if (!iTeam) {
      iTeam = this.getStandTeam();
    }
    if (!posIdx) {
      posIdx = this.posIdx();
    }
    return defines.getStandPos(iTeam, posIdx);
  },
  hpPercent() {
    return this.hp() / this.maxHp();
  },
  setMaxHp(maxHp) {
    this.setVar("maxHp", maxHp);
  },
  maxHp() {
    return this.getVar("maxHp");
  },
  hp() {
    return this.getVar("hp");
  },
  setHp(hp) {
    const maxHp = this.maxHp();
    if (hp < 0) {
      hp = 0;
    }
    if (hp >= maxHp) {
      hp = maxHp;
    } else if (hp < 0) {
      hp = 0;
    }
    this.setVar("hp", hp);
    this.emitValChanged("hp", hp);
  },
  setScale(iScale) {
    this.setVar("scale", iScale * 100);
  },
  getScaleBase() {
    return (this.getVar("scale") || 100) * 0.01;
  },
  getRushTime() {
    return mbgGame.config.constTable.AtkRushTime;
  },
  getFlyTime() {
    return mbgGame.config.constTable.FlyTime;
  },
  data() {
    return this.m_Data;
  },
  // 服务端已死，客户端未死
  shouldDie() {
    return (this.m_Data && this.m_Data.die) || this.hp() <= 0;
  },
  // 服务端已死，客户端已死
  isDie() {
    return this.getVar("die");
  },
  cleanDieFlag() {
    if (!this.isDie()) return;
    // mbgGame.log('[revive]');
    this.setVar("die", false);
    if (this.m_Data.die != null) {
      delete this.m_Data.die;
    }
  },
  setDie() {
    this.setVar("die", true);
  },
  isMonster() {
    return this.m_Data.type === 1;
  },
  isBoss() {
    return this.m_Data && this.m_Data.boss;
  },
  getAttr(sAttr) {
    const val = this.m_Data[sAttr];
    if (!val) {
      if (sAttr === "CriDam") {
        return mbgGame.config.constTable.CriDamAdd;
      }
      return 0;
    }
    return val;
  },
  getActiveSkillID() {
    if (this.charaID() <= 15) {
      return mbgGame.player.getActiveSkillID(this.charaID());
    }
    // TODO
    return null;
  },
  getSkillTplID(skillID) {
    const dConfig = mbgGame.config[`skill${skillID}`];
    return dConfig.TplID;
  },
  getSkillTplConfig(skillID) {
    return defines.getSkillTplConfig(skillID, this.getSkillTplID(skillID));
  },
  getReviveCost() {
    return mbgGame.player.getReviveCost(this.charaID());
  },
  getSkillName(skillID, idx) {
    if (this.charaID() > 15) {
      // 怪物自定义技能名
      const mskillname = mbgGame.getString(`mskillname${idx + 1}_${this.getMTplID()}`, null, true);
      if (mskillname) {
        return mskillname;
      }
    }
    return mbgGame.getString(`skillname${skillID}`);
  },
  getMTplID() {
    const mTplID = this.getVar("mTplID");
    if (mTplID) {
      return mTplID;
    }
    if (this.isMonster()) {
      return defines.getMTplID(this.charaID());
    }
    return 4000 + this.charaID();
  },
  setMTplID(mTplID) {
    if (mTplID <= 15) {
      mTplID += 4000;
    }
    this.setVar("mTplID", mTplID);
  },
  getMTplConfig() {
    return mbgGame.config[`mtpl${this.getMTplID()}`];
  },
  getAtkSound() {
    return this.getMTplConfig().AtkSound;
  },
  getAtkType() {
    return this.getMTplConfig().AtkType;
  },
  // 秒
  getSkillLastUsedTime() {
    return (this.getVar("lastskill_t") || 0) * 0.001;
  },
  // 毫秒
  setSkillLastUsedTime(t) {
    this.setVar("lastskill_t", t);
  },
  // 秒
  getLastAtkTime() {
    return (this.getVar("lastatk_t") || 0);
  },
  setLastAtkTime(t) {
    this.setVar("lastatk_t", t);
  },
  getSpineName() {
    const spinename = this.getVar("spinename");
    if (!spinename) {
      return this.getMTplConfig().spine;
    }
    return spinename;
  },
  setSpineName(spinename) {
    if (!spinename) {
      mbgGame.error('[fighter] setSpineName null', this.charaID());
    }
    this.setVar("spinename", spinename);
  },
  setAttr(sAttr, val) {
    this.m_Data[sAttr] = val;
    if (!this.isMonster()) {
      this.emitValChanged("attr", sAttr);
    }
  },
  turnRight() {
    this.setDir(defines.DIR_RIGHT);
    this.spineCtrl().turnRight();
  },
  turnLeft() {
    this.setDir(defines.DIR_LEFT);
    this.spineCtrl().turnLeft();
  },
  getSpineScale() {
    const dConfig = this.getMTplConfig();
    return (dConfig && dConfig.Scale) || 1;
  },
  getSpineSize() {
    return defines.getMTpl_Size(this.getMTplID());
  },
  getScale() {
    let s;
    if (this.isMonster()) {
      if (this.isBoss()) {
        s = this.getSpineScale();
      } else {
        s = 1;
      }
    } else {
      s = this.getScaleBase();
    }
    return s;
  },
  getSize() {
    const size = this.getSpineSize();
    return {
      width: size.width * this.getScale(),
      height: size.height * this.getScale(),
    };
  },
  effectScale() {
    const dConfig = this.getMTplConfig();
    return this.getScale() * ((dConfig && dConfig.EffectScale) || 1);
  },
  getSkillCostEnergy() {
    let iCost;
    const charaID = this.charaID();
    const warCom = this.warCom();
    if (warCom.m_CostEnergy != null) {
      iCost = warCom.m_CostEnergy[charaID];
    } else {
      iCost = mbgGame.player.getSkillCostEnergy(charaID);
    }
    if (this.m_ExtraCostEnergy && this.m_ExtraCostEnergy[charaID]) {
      const v = this.m_ExtraCostEnergy[charaID];
      iCost += v;
    }
    const iCEAdd = this.getAttr("CEAdd");
    const iCEMul = this.getAttr("CEMul");
    // mbgGame.log("getSkillCostEnergy", iCEAdd, iCEMul, "iCost", iCost);
    iCost = (iCost + iCEAdd) * (1 + (iCEMul * 0.01));
    // mbgGame.log("getSkillCostEnergy iCost", iCost, Math.round(iCost));
    iCost = Math.max(0, Math.floor(iCost));
    return iCost;
  },
});