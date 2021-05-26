const defines = {
  TEAM_LEFT: 1,
  DIR_RIGHT: 1,
  TEAM_RIGHT: 2,
  DIR_LEFT: 2,
  FPS: 30,
};

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

defines.wartypes = [
  'storywar', // 剧情副本

  'battlewar', // 天才乱斗
  'pvpwar', // 天才争霸
  'friendwar', // 友谊赛

  'coinwar', // 金币副本
  'matwar', // 斗币副本
  'wheelwar', // 车轮战副本
  // 英雄副本
  "herowar2",
  "herowar3",
  "herowar4",
  "herowar5",
  "herowar6",
  // 试炼副本1-10
  'raidwar1',
  'raidwar2',
  'raidwar3',
  'raidwar4',
  'raidwar5',
  'raidwar6',
  'raidwar7',
  'raidwar8',
  'raidwar9',
  'raidwar10',
];

defines.Attr2ID = {
  MaxHp: 1,
  Atk: 2, // 秒伤
  Scale: 3,
  Def: 4,
  BeAtkW: 6,
  Cri: 7,
  Dodge: 8,
  Heal: 9,
  Dam: 10, // 攻击力
  CriDam: 11,
  Hit: 12, // 命中率
  Sk: 13, // 技能效果值
  DR: 14, // 攻击力加成
  DA: 15, // 伤害加成
  DM: 16, // 免伤
};

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


defines.ID2Attr = {};
for (const attr in defines.Attr2ID) {
  defines.ID2Attr[defines.Attr2ID[attr]] = attr;
}


defines.WarWin = 1;
defines.WarFail = 2;
defines.WarDraw = 3;


// 主属性列表
defines.MainAttrIDs = [
  defines.Attr2ID.MaxHp,
  defines.Attr2ID.Atk,
  defines.Attr2ID.Def,
];

// 主属性列表
// 防御1 攻击2 辅助3
defines.ItemMainType2Attr = {
  1: 'MaxHp',
  2: 'Atk',
  3: 'Def',
};

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


defines.CharaIDsByStoryWorld = {
  1: [1, 2, 3, 4, 5],
  2: [6, 7, 8, 9, 10],
  3: [11, 12, 13, 14, 15],
};

defines.Attr2Mark = {
  MaxHp: '',
  Atk: '', // 秒伤
  Scale: '',
  Def: '',
  BeAtkW: '',
  Cri: '%',
  Dodge: '',
  Heal: '%',
  Dam: '', // 攻击力
  CriDam: '%',
  Hit: '', // 命中率
  Sk: '%', // 技能效果值
  DR: '', // 攻击力加成
  DA: "%", // 伤害加成
  DM: "%", // 免伤
};

defines.GymAttr2Mark = {
  MaxHp: '%',
  Atk: '', // 秒伤
  Scale: '',
  Def: '',
  BeAtkW: '',
  Cri: '%',
  Dodge: '',
  Heal: '%',
  Dam: '', // 攻击力
  CriDam: '%',
  Hit: '', // 命中率
  Sk: '%', // 技能效果值
  DR: '', // 攻击力加成
  DA: "%", // 伤害加成
  DM: "%", // 免伤
};

defines.HitType = {
  NormalDam: 1, // 等同普攻
  ExtraDam: 3, // 主动技能的额外伤害（二连击）
  ToxicDam: 4, // 中毒伤害
  ReflectDam: 5, // 反伤
  AutoKill: 6, // 自动杀怪道具
  Curse: 7, // 诅咒杀
};

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
  ExtraEnergyCost: 21, // 设置某个人的能量消耗
  RefreshState: 22, // 更新buff
  SetAttr: 23, // 设置单个角色的属性
  FloatMsg: 24, // 跳字
  UpdateStateRound: 25, // 状态剩余回合数
  Resist: 26, // 抵抗
};

defines.getChapterID = function (stageID) {
  for (let chapterID in mbgGame.config.chapter) {
    chapterID = +chapterID;
    const dChapter = mbgGame.config.chapter[chapterID];
    if (dChapter.stageID.indexOf(stageID) !== -1) {
      return chapterID;
    }
  }
  return null;
};

defines.getStageID = function (worldIdx, stageIdx, lv) {
  if ([1, 2, 3, 5, 6].indexOf(worldIdx) !== -1) {
    return 100000 + (1000 * worldIdx) + stageIdx;
  } else if (worldIdx === 4) { // 活动副本
    return 300000 + stageIdx;
  } else if (worldIdx === 9) {
    let stageID;
    if (lv === -1) {
      stageID = 200000 + stageIdx;
    } else {
      const raidIdx = stageIdx;
      lv = lv || mbgGame.player.getRaidLv(raidIdx) || 1;
      stageID = `2${_.padStart(raidIdx, 2, '0')}${_.padStart(lv, 3, '0')}`;
    }
    return Number(stageID);
  }
  return 0;
};

// 战斗跟踪，用于战斗失败时，提示玩法，排前面的优先级高
defines.resetTrackTag = function () {
  delete mbgGame.warTrack;
};

defines.addTrackTag = function (tag, value, type) {
  if (!mbgGame.warTrack) mbgGame.warTrack = {};
  if (type === 'count') {
    // 计数器
    if (!mbgGame.warTrack[tag]) {
      mbgGame.warTrack[tag] = value;
    } else {
      mbgGame.warTrack[tag] += value;
    }
  } else {
    mbgGame.warTrack[tag] = value || true;
  }
};

defines.removeTrackTag = function (tag) {
  if (!mbgGame.warTrack) mbgGame.warTrack = {};
  delete mbgGame.warTrack[tag];
};

defines.getTrackTag = function () {
  if (!mbgGame.warTrack) mbgGame.warTrack = {};
  const sortedTags = ['缺人', '无装', '缺装', '技能差', '需电击', '等级均差大', '自动', '手动', '划水', '无奶', '无T'];
  const tags = [];
  sortedTags.forEach((x) => {
    if (mbgGame.warTrack[x]) {
      tags.push(x);
    }
  });
  if (mbgGame.warTrack['倒计时'] <= 10) {
    tags.push('最后10秒输');
  } else if (mbgGame.warTrack['倒计时'] <= 1) {
    tags.push('超时输');
  }
  if (mbgGame.warTrack['使用技能'] < 1) {
    tags.push('无放技能');
  }
  return tags;
};

// 当前星级对应的段位 0 - 4
defines.getStarRank = function (s) {
  return Math.floor((s - 1) / 5);
};

// 当前星级，显示的星星数量
defines.getStarNum = function (s) {
  return ((s - 1) % 5) + 1;
};

// 返回 1 - 5
defines.calEpoch = function (grade) {
  const epoch = Math.floor((grade - 1) / 5) + 1;
  return epoch;
};

// 5 = V = s5
// 4 = IV = s4
// 3 = III = s3
// 2 = II = s2
// 1 = I = s1
// 返回 1 - 5
defines.calRomanNumIdx = function (grade) {
  return 6 - (((grade - 1) % 5) + 1);
};

defines.calRomanNum = function (grade) {
  return grade % 5;
};

defines.transValToStr = function (val, sAttr, sType) {
  const mark = defines.Attr2Mark[sAttr];
  if (mark || sType === 'Mul') return `${val}%`;
  return `${val}`;
};

// 转成[]
defines.transRewardItems = (items) => {
  if (!_.isString(items)) {
    return items;
  }
  const itemList = [];
  if (typeof (items) === "string") {
    // 奖励物品字段为字符串, 如礼包
    // "102x1x2x10, 103x3x1" = "道具102一个品质为2，道具103三个品质为1"
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
      arr[0] = +arr[0];
      itemList.push(arr);
    });
  }
  return itemList;
};

// 0 <= idx <= 14
defines.getStandPosByIdx = (idx) => {
  const iTeam = Math.floor(idx / 5) + 1;
  const posIdx = (idx % 5);
  return defines.getStandPos(iTeam, posIdx);
};


defines.getStandPos = (iTeam, posIdx) => {
  const pair = mbgGame.config.constTable[`pos_${iTeam}_${posIdx + 1}`];
  if (!pair) {
    mbgGame.error("getStandPos err", iTeam, posIdx);
    return new cc.Vec2(0, 0);
  }
  return new cc.Vec2(pair[0], pair[1]);
};

defines.getCenterStandPos = (iTeam) => {
  let pair;
  if (iTeam === 1) {
    pair = mbgGame.config.constTable.pos_lcenter;
  }
  if (iTeam === 2) {
    pair = mbgGame.config.constTable.pos_rcenter;
  }
  return new cc.Vec2(pair[0], pair[1]);
};


defines.getMTpl_Size = (mTplID) => {
  const dConfig = mbgGame.config[`mtpl${mTplID}`];
  if (!dConfig) {
    mbgGame.error("no mtpl config, mTplID=", mTplID);
  }
  const size = dConfig && dConfig.Size;
  if (size) {
    return new cc.size(size[0], size[1]);
  }
  return new cc.size(100, 100);
};

defines.getSkillTplConfig = (skillID, tplID) => {
  if (!skillID) {
    return null;
  }
  let dConfig;
  if (!tplID) {
    dConfig = mbgGame.config[`skill${skillID}`];
    tplID = dConfig.TplID;
  }
  dConfig = mbgGame.config[`tplskill${tplID}`];
  return dConfig;
};

defines.getSkill_BuffSpineName = (skillID, tplID) => {
  const dConfig = defines.getSkillTplConfig(skillID, tplID);
  return dConfig && dConfig.buff;
};

// 攻击动画是否循环播放
defines.getSkill_IsSkillAniRepeat = (skillID, tplID) => {
  const dConfig = defines.getSkillTplConfig(skillID, tplID);
  return dConfig && dConfig.skillRepeat === 1;
};

defines.getSkill_BuffIsRepeat = (skillID, tplID) => {
  const dConfig = defines.getSkillTplConfig(skillID, tplID);
  return dConfig && dConfig.repeat;
};

defines.isEffectAutoFlip = (sEffect) => {
  const dConfig = mbgGame.config[`effect${sEffect}`];
  return dConfig && dConfig.autoFlip;
};

// 死亡时是否删除该光效
defines.isEffectDieKeep = (sEffect) => {
  const dConfig = mbgGame.config[`effect${sEffect}`];
  return dConfig && dConfig.dieKeep;
};

defines.getSkill_BuffSpinePos = (skillID, tplID) => {
  const dConfig = defines.getSkillTplConfig(skillID, tplID);
  return dConfig && dConfig.pos;
};

defines.getSkill_HitEffectName = (skillID, tplID) => {
  const dConfig = defines.getSkillTplConfig(skillID, tplID);
  return dConfig && dConfig.HitEffect;
};

defines.iconName = {
  Atk: "attr_atk",
  Dam: "attr_atk",
  Def: "attr_def",
  Dodge: "attr_dodge",
  Cri: "attr_cri",
  CriDam: "attr_cridam",
  Hit: "attr_hit",
  Heal: "attr_heal",
  Sk: "attr_skill",
  MaxHp: "attr_hp",
  BeAtkW: "attr_hate",
  DA: "attr_DA",
  DM: "attr_DM",

  DR: "attr_atk",
  MaxHpInit: "attr_atk",
  AtkInit: "attr_atk",
  DefInit: "attr_atk",
  MaxHpGrow: "attr_atk",
  AtkGrow: "attr_atk",
  DefGrow: "attr_atk",
  BeDamAdd: "attr_atk",
  BeDamMul: "attr_atk",
  DamMul: "attr_atk",
  CEAdd: "attr_atk",
  Stuck: "attr_atk",
  IgnDef: "attr_atk",
};


// 怪物数值表
defines.getMType = function (mID) {
  return Math.floor(mID / 10000);
};

// 怪物属性表
defines.getMTplID = function (mID) {
  return mID % 10000;
};

defines.getMTplIDByCharaID = function (charaID) {
  if (charaID > 15) {
    return defines.getMTplID(charaID);
  }
  return 4000 + charaID;
};


// 怪物属性表
defines.getHeadIconByMID = function (mID) {
  const mTplID = defines.getMTplID(mID);
  if (Math.floor(mTplID / 1000) === 4) {
    return mTplID % 4000;
  }
  return mTplID;
};

module.exports = defines;