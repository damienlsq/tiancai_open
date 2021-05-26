const utils = require('./w_utils');
const _u = require('./underscore');

const defines = {};

// 战斗逻辑代码版本号，不需要每次修改战斗代码都改，
// 如果确定修改后无法兼容旧的代码，对一致性造成影响，就+1
defines.CodeVersion = 1;

defines.tierTotalPVP = 1000;
defines.tierScore = 40;

defines.WarWin = 1;
defines.WarFail = 2;
defines.WarDraw = 3;


defines.FPS = 60;
defines.AniFPS = 30;

defines.StateType = {
  Buff: 0, // 增益
  Debuff: 1, // 减益
};

defines.TEAM_LEFT = 1;
defines.TEAM_RIGHT = 2;

defines.bothTeams = [1, 2];

defines.CanReviveWorlds = [];// [1, 2, 3, 9];
defines.PVEWorlds = [1, 2, 3, 4, 5, 6, 9, 10];
defines.realPVEWorlds = [1, 2, 3, 4, 6, 9]; // 排除掉随便打打的
defines.dayWorldIdx = 4; // 活动副本，金币、经验、专属、车轮战
defines.newbieWorldIdx = 5; // 开机剧情战
defines.mainWorldIdx = 6; // 主线剧情
defines.raidWorldIdx = 9; // 试炼
defines.battleWorldIdx = 10; // 随便打打
defines.pvpWorldIdx = 99; // 天才争霸， 友谊赛
defines.StoryWorlds = [1, 2, 3, 6]; // 分世界支线剧情
defines.AllWorlds = [1, 2, 3, 4, 5, 6, 9, 10, 99];

defines.CharaIDsByStoryWorld = {
  1: [1, 2, 3, 4, 5],
  2: [6, 7, 8, 9, 10],
  3: [11, 12, 13, 14, 15],
};

defines.DaySeconds = 24 * 60 * 60;
defines.DayMiliSeconds = defines.DaySeconds * 1000;

defines.Flag = {
  Clan: 3, // 联盟(公会)
  Arena: 4, // PVP系统
  Smelt: 5, // 道具升级
  NewbiePlot1: 6, // 开机剧情1是否已完成的标记
  NewbiePlot2: 7, // 开机剧情2
  WheelWar: 8, // 车轮战
  TCBattle: 9, // 天才电竞
  NewbiePlot3: 10, // 开机剧情3 研究所1
  NewbiePlot4: 11, // 开机剧情4 研究所2
  NewbiePlot5: 12, // 开机剧情5 研究所3
  TeachItem: 13, // 道具教学
  StoryScheme: 14, // 主线换人
  CoinWar: 15, // 金币本
  MatWar: 16, // 斗币本
  Talent: 17, // 天赋系统
  Gamble: 18, // 竞猜
  Botting: 19, // 自动放技能功能
  HeroWar: 20, // 英雄本
  firstPay: 24, // 首充已领
  NOUSE: 25, // 原本的首充已领，但有bug，导致ID 500之前的玩家可能因为看过广告就设置了首充已领, 先不要再用这个id
};


// 当前时间，单位秒，精确到毫秒（支持小数点）
defines.getNowTime = function() {
  return moment().valueOf() * 0.001;
};

// 当前时间，单位毫秒
defines.getNowTimeInt = function() {
  return moment().valueOf();
};


defines.countCharaIDs = function(charaIDs) {
  let count = 0;
  if (!charaIDs || charaIDs.length === 0) {
    return count;
  }
  for (let i = 0; i < charaIDs.length; i++) {
    if (charaIDs[i] > 0) {
      count += 1;
    }
  }
  return count;
};

defines.WarState = {
  Idle: 1,
  Fighting: 2,
};


defines.EffectDefaultVal = {

};

defines.NewsChannel = {
  default: "d", // 全世界频道
  0: "0", // 天才镇
  1: "1", // 布拉勒
  2: "2", //玛噶特
};

/*
Action包结构
{
    objID: 发动攻击的人
    actions:[
        [action动作名, {参数} ]
        攻击,  {tobjID:2, skill: 没这个字段时是普攻，有的时候代表技能编号}
        受击， {tobjID:2, m(miss):1(闪避成功才有这个字段）, dam:100(伤害值), e:特效, die: 1, h:hitType }
    ]
}*/
defines.Action = {
  Attack: 1, // 攻击
  BeAttack: 2, // 受击
  Heal: 3, // 治疗
  BeHeal: 4, // 被治疗
  Recover: 5, // 自然恢复HP
  TeamTemp: 6, // 同步队伍临时值
  CounterAttack: 7, // 反伤
  FullRecover: 8, // 回满血
  UseSkill: 9, // 发动技能
  SkillTarget: 10, // 设置技能目标
  ShowSkill: 11, // 播放技能骨骼动作
  RefreshHp: 12, // 更新目标的当前HP
  AddState: 13, // 加状态
  DelState: 14, // 删状态
  SkillEffect: 15, // 技能给目标加的特效
  HaltSkill: 16,
  TriggerPassiveSkill: 17,
  Say: 18, // 说话
  ShowLeaveBtn: 19, // 显示离开按钮
  Msg: 20, // 中屏消息
  ExtraEnergyCost: 21, // 技能额外能量消耗
  RefreshState: 22, // 更新buff
  SetAttr: 23, // 设置单个角色的属性
  FloatMsg: 24, // 跳字
  UpdateStateRound: 25, // 状态剩余回合数
  Resist: 26, // 抵抗
};


defines.Attr2ID = {
  MaxHp: 1,
  Atk: 2, // 攻击力
  Scale: 3,
  Def: 4,  // 防御
  SkillAttr: 5, // 技能属性值（怪物用）
  BeAtkW: 6, // 受击权重
  Cri: 7, // 暴击率
  Dodge: 8, // 闪避率
  Heal: 9, // 生命恢复
  Hit: 12, // 命中率

  CriDam: 11, // 暴击伤害
  Sk: 13, // 技能效果值
  DR: 14, // 攻击力加成
  DA: 15, // 伤害加成 x%
  DM: 16, // 伤害降低 x%
  MaxHpInit: 17,
  AtkInit: 18,
  DefInit: 19,
};

// *= 1 + ratio
defines.TplAttr1 = [
  defines.Attr2ID.MaxHpInit,
  defines.Attr2ID.AtkInit,
  defines.Attr2ID.DefInit,
  defines.Attr2ID.SkillAttr,
];

// += ratio
defines.TplAttr2 = [
  defines.Attr2ID.Cri,
  defines.Attr2ID.Hit,
  defines.Attr2ID.Dodge,
  defines.Attr2ID.Heal,
  defines.Attr2ID.DR,
  defines.Attr2ID.DM,
  defines.Attr2ID.BeAtkW,
];


// 主属性列表
defines.MainAttrIDs = [
  defines.Attr2ID.MaxHp,
  defines.Attr2ID.Atk,
  defines.Attr2ID.Def,
];


// 副属性列表
defines.SubAttrIDs = [
  defines.Attr2ID.BeAtkW, // 受击权重
  defines.Attr2ID.Cri, // 暴击
  defines.Attr2ID.Dodge, // 闪避
  defines.Attr2ID.Heal, // 生命恢复
  defines.Attr2ID.CriDam, // 暴击伤害
  defines.Attr2ID.Hit, // 命中率
  defines.Attr2ID.Sk, // 技能效果值
];

defines.HitType = {
  NormalDam: 1, // 等同普攻
  ExtraDam: 3, // 主动技能的额外伤害（二连击）
  ToxicDam: 4, // 中毒伤害
  ReflectDam: 5, // 反伤
  AutoKill: 6, // 自动杀怪道具
  Curse: 7, // 诅咒杀
};


defines.ID2Attr = {};
for (const sAttr in defines.Attr2ID) {
  const ID = defines.Attr2ID[sAttr];
  defines.ID2Attr[ID] = sAttr;
}

defines.transAttrID = function(attr) {
  let attrID;
  if (typeof (attr) === "string") {
    attrID = defines.Attr2ID[attr];
  } else {
    attrID = attr;
  }
  return attrID;
};

defines.ALL_ATTR = [
  "MaxHpInit",
  "AtkInit",
  "DefInit",
  "BeDamAdd",
  "BeDamMul",
  "DamMul",
  "CEAdd",
  "CEMul",
  "Stuck",
  "IgnDef",
  // FIRST_ATTR
  "MaxHp",
  "Atk",
  "Def",
  "Hit",
  "Sk",
  "BeAtkW",
  "Cri",
  "Dodge",
  "Heal",
  "Scale",
  "CriDam",
  "DR",
  "DM",
  "DA",
];

defines.FIRST_ATTR = [
  "MaxHp",
  "Atk",
  "Def",
  "Hit",
  "Sk",
  "BeAtkW",
  "Cri",
  "Dodge",
  "Heal",
  "Scale",
  "CriDam",
  "DR",
  "DM",
  "DA",
];

defines.NoNegative = {
  MaxHp: 1,
  Atk: 1,
  Def: 1,
  Hit: 1,
  Sk: 1,
  BeAtkW: 1,
  Cri: 1,
  Dodge: 1,
  Heal: 1,
  Scale: 1,
  CriDam: 1,
  DR: 1,
};

defines.initDefaultVal = function() {
  defines.ATTR_DEFAULT_VAL = {};
  defines.ATTR_DEFAULT_VAL.CriDam = mbgGame.config.constTable.CriDamAdd;
};


defines.NeedSyncAttrs = {
  Scale: 1,
  CEAdd: 1,
  CEMul: 1,
  Stuck: 1, // 吟唱中
  dizzy: 1, // 眩晕中
  silent: 1, // 沉默中
  btn: 1, // 即使被沉默、眩晕 依然可以发动技能
};

defines.SpecialEffects = {
  exp: 1,
};

defines.isSpecialEffect = function(effect) {
  return defines.SpecialEffects[effect] === 1;
};

defines.isInvalidItem = function(itemID) {
  const invaliditems = mbgGame.config.invaliditems;
  if (invaliditems && invaliditems.indexOf(itemID) !== -1) {
    // 被屏蔽了
    return true;
  }
  return false;
};

// BeAtkW 受击权重
// Atk 每秒伤害
// Cri 暴击率 x%
// Def 防御  x%
// Dodge 回避  x%
// Heal 自然恢复HP x%



defines.FloatToPercent = function(val) {
  if (!val || val === 0) {
    return 0;
  }
  const v = parseFloat(val) * 100;
  v.toFixed(0);
  return parseInt(v);
};

defines.getItemMaxLv = function(q) {
  return mbgGame.config.constTable.itemMaxLv[q];
};


defines.getBitInArray = function(arr, bitPos) {
  const bytes_offset = Math.floor(bitPos / 8); // 25 / 8 = 3
  const b = arr[bytes_offset]; // [0, 1, 2, <3>]
  const bits_offset_inner = bitPos % 8; // 25 % 8 = 1
  return (b >> bits_offset_inner) & 0x1; // 偏移后取第一位
};

defines.setBitInArray = function(arr, bitPos, val) {
  if (!_u.isNumber(val) || val < 0) {
    return;
  }
  if (val > 1) {
    val = 1;
  }
  // val must be 0 or 1
  const bytes_offset = Math.floor(bitPos / 8); // 25 / 8 = 3
  let b = arr[bytes_offset] || 0; // [0, 1, 2, <3>]
  const bits_offset_inner = bitPos % 8; // 25 % 8 = 1
  b |= (val << bits_offset_inner); // 偏移后取第一位
  arr[bytes_offset] = b;
};

defines.setBitsValInArray = function(arr, startPos, bitsNum, val) {
  for (let i = 0; i < bitsNum; i++) {
    defines.setBitInArray(arr, startPos + i, (val >> i) & 0x01);
  }
};

defines.getBitsValInArray = function(arr, startPos, bitsNum) {
  let val = 0;
  let bitVal;
  for (let i = 0; i < bitsNum; i++) {
    bitVal = defines.getBitInArray(arr, startPos + i);
    val |= (bitVal << i);
  }
  return val;
};

defines.isValidObj = function(obj) {
  return !(_u.isNull(obj) || _u.isUndefined(obj));
};

defines.Functor = function(obj, func) {
  return function() {
    func.apply(obj);
  };
};


defines.pad = function(num, size) {
  const s = `0000000000${num}`;
  return s.substr(s.length - size);
};


// 转成[]
defines.transRewardItems = (items) => {
  if (!_u.isString(items)) {
    return items;
  }
  const itemList = [];
  if (typeof (items) === "string") {
    // 奖励物品字段为字符串, 如礼包
    // 102x1x2x10 = 道具类型102, 数量1, 固定品质为2, 固定星级10
    items.split(',').forEach((x) => {
      const arr = x.split('x');
      const itemID = +arr[0];
      if (!mbgGame.config[`item${itemID}`]) {
        return;
      }
      if (arr.length >= 4) {
        arr[3] = +arr[3];
      }
      if (arr.length >= 3) {
        arr[2] = +arr[2];
      }
      if (arr.length >= 2) {
        arr[1] = +arr[1];
      }
      arr[0] = itemID;
      itemList.push(arr);
    });
  }
  return itemList;
};


defines.isSameArray = function(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[2]) {
      return false;
    }
  }
  return true;
};

defines.pairs = function(obj) {
  const keys = _u.keys(obj);
  const length = keys.length;
  const pairs = Array(length);
  for (let i = 0; i < length; i++) {
    pairs[i] = [keys[i], obj[keys[i]]];
  }
  return pairs;
};

defines.chooseOne = function(dTable, rng) {
  if (!rng) {
    rng = Math.random;
  }
  if (_u.isEmpty(dTable)) {
    return null;
  }
  let weightTotal = 0;
  for (const key in dTable) {
    weightTotal += dTable[key];
  }
  let lTable = defines.pairs(dTable);
  lTable = _u.sortBy(lTable, (v) => {
    return v[1];
  });
  const ranVal = rng() * weightTotal;

  let addUp = 0;
  let targetKey = lTable[0][0];
  for (let i = 0, len = lTable.length; i < len; i++) {
    const v = lTable[i];
    const weight = v[1];
    if (weight === 0) {
      continue;
    }
    addUp += weight;
    if (ranVal <= addUp) {
      targetKey = v[0];
      break;
    }
  }
  return targetKey;
};


defines.removeArrayElem = function(arr, v) {
  const idx = arr.indexOf(v);
  if (idx !== -1) {
    arr.splice(idx, 1);
  }
};

defines.getDictIntKeys = function(dDict) {
  return _u.map(_u.keys(dDict), (v) => {
    return parseInt(v);
  });
};
defines.getDictKeys = function(dDict) {
  return _u.map(_u.keys(dDict), (v) => {
    return v;
  });
};

// 把字典2加到字典1
defines.dictAdd = function(dDict1, dDict2) {
  for (const k in dDict2) {
    if (!dDict1[k]) {
      dDict1[k] = dDict2[k];
    } else {
      dDict1[k] += dDict2[k];
    }
  }
};

// 把字典1的每个值都乘以一个倍数，并取整
defines.dictIntMul = function(dDict, mul) {
  const keys = defines.getDictKeys(dDict);
  for (let i = 0, len = keys.length; i < len; i++) {
    dDict[keys[i]] = Math.round(dDict[keys[i]] * mul);
  }
};


defines.getLvRank = function(itemLv) {
  const lvrank = Math.floor(itemLv / 4);
  return lvrank;
};

defines.getItemEffectVal = function(itemID, lv) {
  const dConfig = mbgGame.config[`item${itemID}`];
  if (!dConfig) {
    return 0;
  }
  const effectparam = dConfig.effectparam;
  if (!effectparam) {
    return null;
  }
  const lvrank = Math.floor(lv / 4);

  /*
  0 1 2 3 4 5 6 7    17 18 19 20
  0 0 0 0 1 1 1 1    4  4  4  5
  */
  const val = effectparam[lvrank];
  return Math.ceil(val);
};


// 是否是主动技能
defines.isActiveSkill = function(iSkillID) {
  const dConfig = mbgGame.config[`skill${iSkillID}`];
  if (!dConfig) {
    mbgGame.logError(`[isActiveSkill] no skill ${iSkillID}`);
  }
  const TplID = dConfig.TplID; // 用默认的模板ID来判定技能类型就行了
  const SkillTplData = require('./skill_tpl/skill_index');
  return SkillTplData[TplID].Type === "主动";
};

defines.getCharaActiveSkillID = function(charaID) {
  const dWarData = mbgGame.config[`hero${charaID}`];
  return dWarData.a_skill;
};

defines.getCharaPassiveSkillID = function(charaID) {
  const dWarData = mbgGame.config[`hero${charaID}`];
  return dWarData.b_skill;
};

defines.getSkillKeyName = function(iSkillID) {
  return `skill${iSkillID}`;
};

defines.getStageRealID = function(worldIdx, iStageIdx) {
  return 100000 + (worldIdx * 1000) + iStageIdx;
};


defines.getSkillConfig = function(iSkillID) {
  return mbgGame.config[defines.getSkillKeyName(iSkillID)];
};

defines.getSkill_HitEffectName = function(tplID) {
  const dConfig = mbgGame.config[`tplskill${tplID}`];
  return dConfig.HitEffect;
};


defines.transAniFrames2Second = function(frames) {
  return Math.round((frames / defines.AniFPS) * 100) / 100;
};


defines.sortCharaIDsByPrior = function(charaIDs) {
  return _u.sortBy(charaIDs, (charaID) => {
    const dTableData = mbgGame.config[`hero${charaID}`];
    return dTableData.posPrior;
  });
};


// 战斗使用的数据
defines.getCharaWarData = function(charaID, dCharaData) {
  // mbgGame.logger.info("[arena] [getCharaWarData] ==", JSON.stringify(dCharaData));
  const dHeroConfig = mbgGame.config[`hero${charaID}`];
  if (!dHeroConfig) {
    mbgGame.logError(`[defines.getCharaWarData] no dHeroConfig ${charaID}`);
    return null;
  }
  if (!dCharaData) {
    mbgGame.logError(`[defines.getCharaWarData] no dCharaData ${charaID}`);
    return null;
  }

  /*
  {
    "lv": 12,
    "posPrior": 2,
    "Cri": 5,
    "Hit": 10,
    "Dodge": 3,
    "Heal": 0,
    "BeAtkW": 82,
  }*/
  const dWarData = {};
  dWarData.ID = charaID;
  dWarData.attr = {};
  for (let i = 0; i < defines.FIRST_ATTR.length; i++) {
    const sAttr = defines.FIRST_ATTR[i];
    const attrID = defines.Attr2ID[sAttr];
    dWarData.attr[attrID] = dHeroConfig[sAttr];
  }
  if (dHeroConfig.MaxHpInit > 0) {
    dWarData.attr[defines.Attr2ID.MaxHpInit] = dHeroConfig.MaxHpInit;
  }
  if (dHeroConfig.AtkInit > 0) {
    dWarData.attr[defines.Attr2ID.AtkInit] = dHeroConfig.AtkInit;
  }
  if (dHeroConfig.DefInit > 0) {
    dWarData.attr[defines.Attr2ID.DefInit] = dHeroConfig.DefInit;
  }

  if (dCharaData.ta) {
    dWarData.ta = _u.clone(dCharaData.ta);
  }
  dWarData.lv = dCharaData.lv;
  if (dCharaData.hp != null) {
    dWarData.hp = dCharaData.hp;
  }
  dWarData.lv = dCharaData.lv; // 英雄等级
  if (dCharaData.skill) {
    dWarData.skill = utils.deepClone(dCharaData.skill);
  }
  if (!_u.isEmpty(dCharaData.tlv)) {
    dWarData.tlv = utils.deepClone(dCharaData.tlv);
  }
  // mbgGame.logger.info("[arena]  [getCharaWarData] ", charaID, JSON.stringify(dWarData), JSON.stringify(dCharaData));
  return dWarData;
};


defines.getWorldIdxByCharaID = function(charaID) {
  return Math.ceil(charaID / 5);
};

defines.getStageConfig = function(worldIdx, stageIdx) {
  const dConfig = mbgGame.config[`stage${defines.getStageRealID(worldIdx, stageIdx)}`];
  return dConfig;
};

defines.getForceEndTime = function(worldIdx) {
  return mbgGame.config.constTable[`ForceEndTime${worldIdx}`];
};


defines.getPVPInfoForClient = function(dPVPData, pobj) {
  if (!dPVPData) {
    return null;
  }
  return {
    left: {
      totem: dPVPData.attacker.totem,
      name: dPVPData.attacker.name || (pobj && pobj.nickName()) || '',
      score: dPVPData.attacker.score,
    },
    right: {
      totem: dPVPData.defender.totem,
      name: dPVPData.defender.name,
      score: dPVPData.defender.score,
    },
  };
};

defines.getAttackerLvList = function(dPVPData) {
  const attackerLvList = [];
  for (let i = 0; i < dPVPData.attacker.charaIDs.length; i++) {
    const charaID = dPVPData.attacker.charaIDs[i];
    if (!charaID) {
      attackerLvList.push(0);
      continue;
    }
    const dChara = dPVPData.attacker.team[charaID];
    attackerLvList.push(dChara.lv);
  }
  return attackerLvList;
};


defines.getDefenderLvList = function(dPVPData) {
  const defenderLvList = [];
  for (let i = 0; i < dPVPData.defender.charaIDs.length; i++) {
    const charaID = dPVPData.defender.charaIDs[i];
    if (!charaID) {
      defenderLvList.push(0);
      continue;
    }
    const dChara = dPVPData.defender.team[charaID];
    defenderLvList.push(dChara.lv);
  }
  return defenderLvList;
};

defines.getArenaKConfigByGrade = function(g) {
  const arenaKConfig = mbgGame.config.arenaKConfig;
  const dConfig = arenaKConfig[g];
  return dConfig;
};

defines.getArenaGradeByScore = function(score) {
  const arenaKConfig = mbgGame.config.arenaKConfig;
  for (let i = 1; i < 100; i++) {
    const dConfig = arenaKConfig[i];
    if (!dConfig) {
      break;
    }
    const scoreRange = dConfig.scoreRange;
    if (score >= scoreRange[0] && score < scoreRange[1]) {
      return i;
    }
  }
  return 1;
};

defines.getArenaKConfigByScore = function(score) {
  const arenaKConfig = mbgGame.config.arenaKConfig;
  for (let i = 1; i < 100; i++) {
    const dConfig = arenaKConfig[i];
    if (!dConfig) {
      break;
    }
    const scoreRange = dConfig.scoreRange;
    if (score >= scoreRange[0] && score < scoreRange[1]) {
      return dConfig;
    }
  }
  return null;
};

defines.CodeType = {
  Normal: 1,
  Clan1: 2, // 取玩家正常等级数据
  Clan2: 3, // 取FixedLvConfig的等级数据
};

defines.ClientOp = {
  useSkill: 1,
  stopWar: 2,
  setBotting: 3,
  ready: 4,
};

defines.newSeed = function() {
  return Math.round(1 + (Math.random() * 1000000000));
};

defines.getFirstCharaID = function(charaIDs) {
  for (let i = 0; i < 5; i++) {
    if (charaIDs[i]) return charaIDs[i];
  }
  return 0;
};

// 怪物数值表
defines.getMType = function(mID) {
  return Math.floor(mID / 10000);
};

defines.getMTplID = function(mID) {
  return mID % 10000;
};

defines.getMDataConfigKey = function(mID, lv) {
  const mType = defines.getMType(mID);
  return (mType * 1000) + lv;
};

defines.getMDataConfig = function(mID, lv) {
  return mbgGame.config[`mdata${defines.getMDataConfigKey(mID, lv)}`];
};

defines.getMTplConfig = function(mID) {
  return mbgGame.config[`mtpl${defines.getMTplID(mID)}`];
};

defines.getHeadID = function(mID) {
  const mTplID = defines.getMTplID(mID);
  if (Math.floor(mTplID / 1000) === 4) {
    return mTplID - 4000;
  }
  return mTplID;
};

module.exports = defines;