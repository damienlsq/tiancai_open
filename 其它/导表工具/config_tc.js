const ignoreColTable = {
  单位: 1,
  参数描述a: 1,
  是否完成: 1,
  技能效果说明: 1,
  参数a说明: 1,
  参数b说明: 1,
  参数c说明: 1,
  参数d说明: 1,
  备注: 1,
  程序备注: 1,
  技能名称备注: 1,
  技能类型说明: 1,
  初始速度备用: 1,
  每分钟预期收益: 1,
  对应技能模板编号: 1,
  图标字: 1,
  排序用: 1,
  备忘: 1,
  描述下客户端显示位置: 1,
  客户端红点: 1,
  '关卡ID(备用)': 1,

};

// 直接设置某一列platform
const ColName2Plaform = {
  技能1名字: 0,
  技能2名字: 0,
};

const ColNameTable = {
  // 后台共通的
  描述: 'desc',
  分类: 'category',
  中文: 'zh',
  英文: 'en',
  日文: 'ja',
  编号: 'ID',

  // todo 支持字段级控制每条数据的platform设置
  平台: 'platform',

  // 信息墙系统
  允许赞: 'allowLike',
  允许踩: 'allowUnlike',
  允许打赏: 'allowTips',
  允许转发: 'allowForward',
  允许发表: 'allowPost',
  允许收藏: 'allowMark',
  保存期限: 'expireDays',
  显示数量: 'showCount',
  标题: 'title',
  有效: 'available',
  无效: 'invalid',
  保留数量: 'saveCount',
  匿名: 'rumor',
  文本长度: 'msgMaxLength',
  自动发帖人: 'nameKey',
  自动发帖人图标: 'icon',
  几率万: 'wPercent',
  智能回复: 'aiReply',
  付费用户: 'payUser',
  风格: 'style',
  智能测试: 'AITest',

  // 碎碎念
  场景: 'scene',

  // 商城
  价格: 'price',
  价值: 'value',
  单位: 'unit',
  特殊功能: 'act',
  特殊设置: 'special',
  渠道: 'channel_id',
  图片: 'image',
  周期: 'days',
  限额: 'limit',
  开始日期: 'startDay',
  结束日期: 'endDay',
  标记: 'flag',
  定时刷新: 'refreshTime',

  // 游戏特有的
  星级: 'lv',
  升级消耗金币: 'costcoins',
  升级消耗钻石: 'costdiamonds',
  消耗金币: 'costcoins',
  消耗钻石: 'costdiamonds',
  冷却时间: 'CD',
  PVP中冷却时间: 'pvpCD',
  持续时间: 'duration',
  参数a: 'a',
  参数b: 'b',
  参数c: 'c',
  参数d: 'd',
  参数e: 'e',
  参数: 'param',
  对应世界: 'worldIdx',
  关卡序号: 'idx',
  背景图: 'bg',
  骨骼名: 'spine',
  怪物ID: 'mID',
  bossID: 'bossID',
  怪物数量权重: 'weight',
  等级: 'lv',
  关卡等级: 'lv',
  值: 'Val',
  权重: 'weight',
  影响世界: 'affectWorldIdxes',
  速度: 'Spd',
  暴击: 'Cri',
  暴击伤害: 'CriDam',
  技能效果加成: 'Sk',
  命中率: 'Hit',
  回避率: 'Dodge',
  生命恢复: 'Heal',
  伤害加成: 'DA',
  免伤: 'DM',
  伤害减免: 'DM',
  是否为BOSS: 'isBoss',
  掉落金币: 'dropCoins',
  掉落经验: 'dropExp',
  技能1: 'skill1',
  技能2: 'skill2',
  图标: 'icon',
  初始等级: 'lv',
  怪物等级: 'lv',
  技能等级: 'slv',

  生命值: 'MaxHpInit',
  攻击力: 'AtkInit',
  智力: 'IntInit',
  防御: 'DefInit',

  初始生命值: 'MaxHpInit',
  初始攻击力: 'AtkInit',
  初始智力: 'IntInit',
  初始防御: 'DefInit',
  受击权重: 'BeAtkW',

  MaxHp: 'MaxHp',
  Atk: 'Atk',
  Def: 'Def',

  生命值成长系数: 'MaxHpGrow',
  攻击力成长系数: 'AtkGrow',
  防御成长系数: 'DefGrow',

  初始速度: 'Spd',
  初始暴击: 'Cri',
  初始回避率: 'Dodge',
  初始命中率: 'Hit',
  初始生命恢复: 'Heal',

  技能属性值: 'SkillAttr',

  主动技能: 'a_skill',
  被动技能: 'b_skill',

  出场角色: 'charaIDs',
  关卡ID: 'stageID',
  触发事件: 'event',
  附加条件: 'cond',
  奖励: 'reward',
  序号: 'idx',

  头像: 'head',
  位置: 'pos',
  朝向: 'toward',
  默认排位: 'posPrior',
  对应关卡: 'stageID',
  最高等级: 'maxLv',
  掉落权重: 'weight',
  宝箱权重: 'chestweight',
  英雄属性值: 'attrPoint',
  Boss属性值: 'attrPointBoss',
  小怪属性值: 'attrPointM',

  总动画时间: 'totaltime',
  前摇动画时间: 'pretime',

  场次: 'ID',
  系数a: 'a',
  系数b: 'b',
  系数c: 'c',
  系数d: 'd',
  初始阵容: 'team',
  普攻音效: 'AtkSound',

  是否为近战: 'AtkType',
  普攻帧数: 'NAtkFrames',
  普攻关键帧: "NAtkKeyFrames",
  飞行物起始位置: 'FlyPos',
  飞行物生成时间: 'FlyDelay',
  技能打断关键帧: 'MainFrame',
  技能飞行物飞行帧数: 'FlyFrames',
  技能飞行物: 'SkillFlySpine',
  技能定点动画: 'fixedAni',
  技能飞行物无目标: 'noTarget',
  技能飞行物不旋转: 'FlyNoRot',
  技能施法动画帧数: 'PreFrames',
  技能发动音效: 'UseSound',
  受击点: 'HitPos',
  熔炼消耗: 'smeltCost',
  熔炼经验: 'smeltExp',

  初始效果百分比: 'val',
  效果每级提升: 'valAdd',
  作用时间: 'duration',
  解锁关卡: 'stageIdx',
  效果类型: 'EffectType',
  大小: 'Size',
  技能模板ID: 'TplID',
  专属技能模板ID: 'TplID_Item',
  专属角色: 'c',
  buff动画名: 'buff',
  根据队伍翻转: 'autoFlip',
  复活消耗钻石: 'ReviveCost',
  普攻飞行物: 'AtkFlySpine',
  Boss血量百分比触发: 'HpPercent',
  Boss时间触发: 'UseSkillByTime',
  小怪血量百分比触发: 'HpPercent2',
  小怪时间触发: 'UseSkillByTime2',

  技能列表: 'SkillList',
  受击特效: 'HitAni',
  头像ID: 'HeadID',

  统计名: 'StatName',
  每级数量: 'values',
  奖励列表: 'RewardList',
  奖励钻石: 'diamonds',
  宝箱可掉: 'ChestCanDrop',
  有效时间: 'itemDays',
  品质: 'Quality',

  按ID掉落的道具: 'DropItemByID',
  按品质掉落的道具: 'DropItemByQuality',
  掉落钻石: 'DropDiamond',
  出现权重: 'Weight',
  怪物类型: 'MType',
  附加参数: 'Param',
  出现概率: 'Ratio',
  光效缩放系数: 'EffectScale',
  特性描述: 'TalentDesc',
  骨骼缩放系数: 'Scale',

  小怪: 'mIDs',
  全体复活CD时间: 'GroupReviveCD',
  受击效果动画名: 'HitEffect',
  对白样式: 'DialogType',
  特殊效果: 'HiddenEffect',

  每分钟预期收益: 'CoinPerMinute',
  登场角色: 'NpcIDList',
  自动翻转: 'AutoFlip',
  对应怪物编号: 'MID',
  是否首领: 'IsBoss',
  新闻模板编号: 'NewsTplID',
  新闻权重: 'Weight',
  防御修正值: 'DefRevise',
  旗帜: 'totem',
  进离场行为: 'behaviour',
  Buff位置: 'pos',
  BUFF类型: 'Type',
  PVP是否可用: 'CanPVP',
  buff是否循环播放: 'repeat',
  攻击动画是否循环播放: 'skillRepeat',
  // 奖励表
  道具: 'items',
  钻石: 'diamonds',
  体力: 'sta',
  积分: 'score',
  联盟积分: 'gem',
  斗币: 'mat',
  金币: 'coins',
  个数: 'n',

  // 新闻奖励表
  新闻奖励: 'Reward',
  品质权重: 'QualityTable',
  道具1: 'item1',
  道具2: 'item2',
  道具3: 'item3',
  金币1: 'coin1',
  金币2: 'coin2',
  金币3: 'coin3',
  钻石1: 'diamond1',
  钻石2: 'diamond2',
  钻石3: 'diamond3',
  固定道具掉率1: 'fixedrate1',
  固定道具掉率2: 'fixedrate2',
  固定道具掉率3: 'fixedrate3',
  道具掉率1: 'itemrate1',
  道具掉率2: 'itemrate2',
  道具掉率3: 'itemrate3',
  特殊怪几率1: 'specialrate1',
  特殊怪几率2: 'specialrate2',
  特殊怪几率3: 'specialrate3',
  // 新闻类型表
  杀BOSS: 'KillBoss',
  怪物类型列表: 'MTypeList',
  特定怪物ID: 'NeedMID',
  击杀数量: 'KillNum',
  新闻描述编号: 'DescIDs',
  // 天才争霸排行榜奖励
  排名区间: 'range',
  每日奖励: 'dayReward',
  赛季奖励: 'seasonReward',
  是否隐藏成就: 'hide',

  // 宝箱奖励表
  基本奖励: 'base',
  幸运奖励: 'luck',

  特效: 'effect',
  特效数值: 'effectparam',
  捐赠限制: 'donate',

  // 天才争霸K值表
  积分区间: 'scoreRange',
  胜: 'winK',
  负: 'loseK',
  宝箱奖励: 'rewardName',

  是否VIP道具: 'isVIPItem',
  层次: 'zOrder',
  出售价: 'SellPrice',
  购买价: 'BuyPrice',
  出售次数: 'SellTimes',
  购买次数: 'BuyTimes',
  出售权重: 'SellWeight',
  购买权重: 'BuyWeight',
  购买递增: 'BuyIncr',

  角色: 'chara',
  行为: 'action',
  类型: 'type',
  系数: 'c',
  阵营: 'team',

  奖励货币: 'rewardcoin',
  奖励道具: 'rewarditem',
  限时: 'timeLimit',
  每场奖励道具概率: 'rewardItemRate',
  每次奖励点券: 'rewardGem',
  每次奖励微波: 'rewardMat',
  每次奖励经验: 'rewardExp',
  点券奖励: 'rewardGem',
  竞技场微波: 'rewardMat',
  竞技场经验: 'rewardExp',
  竞技场点券: 'rewardGem',
  竞技场金币: 'rewardCoin',
  死亡不删除: 'dieKeep',


  升级消耗物资: 'costMat',
  每分钟产出: 'outcome',
  需要小时: 'needHour',
  产出上限: 'outcomeMax',
  消耗体力: 'costSta',
  奖励体力: 'addSta',
  产出经验: 'dropExp',
  产出金币: 'dropCoin',
  产出微波: 'dropMat',
  产出物品: 'dropItem',
  升级消耗经验: 'costExp',
  体力上限: 'staMax',
  建造消耗: 'costMat',
  锻炼耗时: 'costTime',
  '锻炼消耗货币(生命值)': 'trCostForMaxHp',
  '锻炼消耗货币(伤害加成)': 'trCostForDA',
  '锻炼消耗货币(免伤)': 'trCostForDM',
  '锻炼消耗货币(暴击)': 'trCostForCri',
  '锻炼消耗货币(命中率)': 'trCostForHit',
  '锻炼消耗货币(回避率)': 'trCostForDodge',
  解锁项目: 'rewards',

  首次通关掉落: 'firstDrop',
  解锁信息: "unlockinfo",
  需要时间: "needTime",
  离线时间: "autoTime", // 收集器的


  骨骼动画名: "ani",
  播放速度: "spd",
  光效: "effect",
  右手附件: "rweapon",
  左手附件: "lweapon",

  怪物类型: 'ibType',
  道具类型: 'ibType',

  通关解锁星级: "starLv",
  属性: 'attr',
  数值: 'val',
  角色ID: 'charaID',
  世界ID: 'worldIdx',
  出售价格: 'sellprice',
  固定属性: 'fixedAttrs',

  对应星级: 'maxStarLv',
  道具ID: 'itemID',

  队伍: 'team',
  技能等级: 'skillLv',
  道具星级: 'itemStarLv',
  道具等级: 'itemLv',
  道具品质: 'itemQ',

  解锁时长: 'duration',

  主属性类型: 'mainType',
  // 防御1 攻击2 辅助3
  防御型: 'main1',
  攻击型: 'main2',
  辅助型: 'main3',

  金币基础产出: 'coinsRate',
  斗币基础产出: 'matRate',
  减时上限: 'bonusTimeLimit',
  掉落几率: 'dropRate',
  所属剧情ID: 'PlotID',

  公会商人系数: 'clanK',

  金币奖励系数: 'labCoinsK',
  经验奖励系数: 'labExpK',
  斗币奖励系数: 'labMatK',
  钻石奖励系数: 'labDiamondsK',
  体力奖励系数: 'labStaK',

  任务时长: 't',
  页数: 'pages',
  等级: 'lv',
  解锁等级: 'lv',
  权重: 'w',
  购买消耗: 'buycost',
  基础经验: 'exp',
  阅读消耗: 'costMat',
  T朱小才: 'c1',
  T钱多多: 'c2',
  T饭桶桶: 'c3',
  T狸聪聪: 'c4',
  T陆大柱: 'c5',
  B朱小才: 'c6',
  B钱多多: 'c7',
  B饭桶桶: 'c8',
  B狸聪聪: 'c9',
  B陆大柱: 'c10',
  G朱小才: 'c11',
  G钱多多: 'c12',
  G饭桶桶: 'c13',
  G狸聪聪: 'c14',
  G陆大柱: 'c15',

  程序用编号: 'id',
  时间段: 'tPair',
  是否可建造: 'canBuild',
  赎回价格: 'redeemPrice',

  属性加成: 'attrAdd',
  消耗斗币: 'mat',

  升级赌博赎回价格: 'redeemPrice2',
  角色等级: "clv",
  坐标: "pos",

  角色类型ID: "mTpl",
  抛物线: 'parabo',

  星数: "stars",
  一段奖励: "reward1",
  二段奖励: "reward2",
  三段奖励: "reward3",

  波数: "wave",

  乱斗经验: "wheelExp",

  解锁条件: 'stageIDs',

  最早出现关卡: 'first',
  打砖块: 'fac_13',
  拳击机: 'fac_12',
  砸锤机: 'fac_14',
  贪吃蛇: 'fac_11',
  小蜜蜂: 'fac_16',
  打鸭子: 'fac_15',

  aoe系数开关: 'aoeKEnabled',
};

// platform 0: 客户端     1: 服务端    3: 根据数据表的“平台”来设定

const CSVConfig = {
  事件表: {
    key: '程序用编号',
    config: {
      type: 'json',
      json: 'events',
      prefix: '',
      platform: 0,
      category: '数据表_事件表',
    },
  },
  随便打打: {
    key: 'id',
    config: {
      type: 'json',
      json: 'tcbattle',
      prefix: '',
      platform: 0,
      category: '数据表_随便打打',
    },
    i18n: {
      platform: 0,
      category: '数据表_随便打打',
      prefix: {
        碎碎念: 'talkbattle_',
      },
    },
  },
  随便打打宝箱: {
    key: '编号',
    config: {
      type: 'json',
      json: 'battlechest',
      prefix: '',
      platform: 0,
      category: '数据表_随便打打宝箱',
    },
  },
  机器人角色: {
    key: '编号',
    config: {
      type: 'json',
      json: 'robotchara',
      prefix: '',
      platform: 1,
      category: '数据表_机器人角色',
    },
  },
  机器人信息: {
    key: '编号',
    config: {
      type: 'json',
      json: 'robotplayer',
      prefix: '',
      platform: 1,
      category: '数据表_机器人信息',
    },
    i18n: {
      platform: 1,
      category: '数据表_机器人信息',
      prefix: {
        名字: 'robotname',
        宣言: 'robotdesc',
      },
    },
  },
  附魔表: {
    key: '附魔ID',
    config: {
      type: 'json',
      json: 'enchant',
      prefix: '',
      platform: 0,
      category: '数据表_附魔',
    },
    i18n: {
      platform: 0,
      category: '数据表_附魔',
      prefix: 'enchant',
    },
  },
  动作表: {
    type: 'json',
    config: {
      json: 'actions',
      prefix: '',
      platform: 0,
      category: '数据表_动作',
      key: '动作名',
    },
  },
  技能升级表: {
    type: 'default',
    config: {
      prefix: 'skillup',
      platform: 0,
      category: '数据表_升级',
      key: '技能等级',
    },
  },
  英雄升级表: {
    type: 'default',
    config: {
      prefix: 'heroup',
      platform: 0,
      category: '数据表_升级',
      key: '英雄等级',
    },
  },
  技能BUFF表: {
    type: 'default',
    config: {
      prefix: 'skillstate',
      platform: 0,
      category: '数据表_技能',
      key: 'BUFF编号',
    },
  },
  技能表: {
    type: 'default',
    key: '技能ID',
    config: {
      platform: 0,
      category: '数据表_技能',
      prefix: 'skill',
    },
    i18n: {
      platform: 0,
      category: '数据表_技能',
      prefix: {
        技能名字: 'skillname',
        技能简介: 'skilldesc',
        技能详细: 'skilldetail',
        阶数加成: 'skillrank',
      },
    },
  },
  技能模板表: {
    type: 'default',
    key: '模板ID',
    config: {
      platform: 0,
      category: '数据表_技能',
      prefix: 'tplskill',
    },
  },
  怪物属性表: {
    type: 'default',
    key: 'id',
    config: {
      prefix: 'mtpl',
      platform: 0,
      category: '数据表_怪物属性',
    },
    i18n: {
      platform: 0,
      category: '数据表_怪物属性',
      prefix: {
        名字: 'mname',
        描述: 'mdesc',
        技能1名字: 'mskillname1_',
        技能2名字: 'mskillname2_',
        击倒对手时: 'talk1_',
        被击倒时: 'talk2_',
        "体力少于30%时": 'talk3_',
        "体力少于30%时且被加血时": 'talk4_',
      },
    },
  },
  怪物数值表: {
    type: 'default',
    key: 'id',
    config: {
      prefix: 'mdata',
      platform: 1,
      category: '数据表_怪物数值',
    },
  },
  英雄表: {
    type: 'default',
    key: '英雄ID',
    config: {
      prefix: 'hero',
      platform: 0,
      category: '数据表_英雄',
    },
    i18n: {
      platform: 0,
      category: '数据表_英雄',
      prefix: {
        名字: 'charaname',
        描述: 'charadesc',
      },
    },
  },
  章节表: {
    type: 'default',
    key: '章节ID',
    config: {
      type: 'json',
      json: 'chapter',
      prefix: '',
      platform: 0,
      category: '数据表_章节',
    },
    i18n: {
      platform: 0,
      category: '数据表_章节',
      prefix: {
        名字: 'chapter',
      },
    },
  },
  关卡表: {
    type: 'default',
    key: '关卡ID',
    config: {
      prefix: 'stage',
      platform: 1,
      category: '数据表_关卡',
    },
    i18n: {
      platform: 0,
      category: '数据表_关卡',
      prefix: {
        名字: 'stagename',
        解锁信息: 'unlockinfo',
      },
    },
  },
  商城表: {
    config: {
      prefix: 'chest',
      platform: 1,
      category: '数据表_商城',
      key: '宝箱编号',
    },
  },

  商品表: {
    type: 'json',
    key: '关键字',
    config: {
      json: 'shopConfig',
      prefix: '',
      platform: 1,
      category: '数据表_商城',
    },
    i18n: {
      platform: 1,
      category: '数据表_商城',
      prefix: {
        名字: 'shopname_',
        副标题: 'shoptitle_',
        内容: 'shopinfo_',
      },
    },
  },
  对白表: {
    key: '新对白ID',
    config: {
      platform: 1,
      category: '数据表_对白',
      prefix: 'dialog',
    },
    i18n: {
      platform: 1,
      category: '数据表_对白',
      prefix: 'dialog',
    },
  },
  道具表: {
    key: '道具ID',
    config: {
      prefix: 'item',
      platform: 0,
      category: '数据表_道具',
      includeID: true,
    },
    i18n: {
      platform: 0,
      category: '数据表_道具',
      prefix: {
        道具名字: 'itemname',
        道具简介: 'itemdesc',
        道具描述: 'itemdetail',
      },
    },
  },
  道具属性: {
    type: 'json',
    key: '星级',
    config: {
      json: 'itemattr',
      prefix: '',
      platform: 0,
      category: '数据表_道具',
      includeID: false,
    },
  },
  常数表: {
    type: 'json',
    config: {
      json: 'constTable',
      prefix: '',
      platform: 0,
      category: '数据表_常数表',
      key: '常数名字',
    },
  },
  道具克制: {
    type: 'json',
    config: {
      json: 'itemBuff',
      prefix: '',
      platform: 0,
      category: '数据表_道具克制',
      key: 'id',
    },
  },
  成就表: {
    key: '成就编号',
    config: {
      prefix: 'achieve',
      platform: 0,
      category: '数据表_统计成就',
    },
    i18n: {
      platform: 0,
      category: '数据表_统计成就',
      prefix: {
        成就名: 'achvname',
        成就描述: 'achvdesc',
      },
    },
  },
  角色天赋: {
    key: 'id',
    config: {
      type: 'json',
      json: 'talent',
      prefix: '',
      platform: 0,
      category: '数据表_角色天赋',
    },
  },
  新闻类型表: {
    config: {
      prefix: 'newstype',
      platform: 1,
      category: '数据表_新闻',
      key: '类型编号',
    },
  },
  新闻描述表: {
    key: '描述编号',
    config: {
      prefix: 'newsdesc',
      platform: 1,
      category: '数据表_新闻',
    },
    i18n: {
      platform: 1,
      category: '数据表_新闻',
      prefix: 'newsdesc',
    },
  },
  错误码表: {
    type: 'json',
    key: '编号',
    config: {
      json: 'ErrCodeList',
      prefix: '',
      platform: 0,
      category: '数据表_错误码',
    },
    i18n: {
      platform: 0,
      category: '数据表_错误码',
      prefix: 'errcode',
    },
  },
  信息墙表: {
    type: 'json',
    key: '关键字',
    config: {
      json: 'boardList',
      prefix: '',
      platform: 0,
      category: '数据表_信息墙',
    },
    i18n: {
      platform: 0,
      prefix: 'boardTitle',
      category: '数据表_信息墙',
    },
  },
  新闻奖励表: {
    type: 'json',
    key: '关卡等级',
    config: {
      json: 'newsreward',
      prefix: '',
      platform: 1,
      category: '数据表_新闻',
    },
  },
  碎碎念表: {
    type: 'json',
    key: '编号',
    config: {
      json: 'rant',
      prefix: '',
      platform: 1,
      category: '数据表_碎碎念',
    },
    i18n: {
      platform: 3,
      prefix: 'rant',
      category: '数据表_碎碎念',
    },
  },
  天才争霸排行榜奖励: {
    type: 'json',
    key: '编号',
    config: {
      json: 'arenarewardlist',
      platform: 1,
      prefix: '',
      category: '数据表_PVP',
    },
  },
  // 只有文字，没有config
  UI文字表: {
    key: '关键字',
    i18n: {
      prefix: '',
      platform: 3,
      category: '数据表_UI文字',
    },
  },
  训练碎碎念: {
    key: 'ID',
    i18n: {
      platform: 0,
      category: '数据表_训练碎碎念',
      prefix: {
        打砖块: 'talk0_13_',
        拳击机: 'talk0_12_',
        砸锤机: 'talk0_14_',
        贪吃蛇: 'talk0_11_',
        小蜜蜂: 'talk0_16_',
        打鸭子: 'talk0_15_',
      },
    },
  },
  工作碎碎念: {
    key: 'ID',
    i18n: {
      platform: 0,
      category: '数据表_工作碎碎念',
      prefix: {
        非常合适: 'talk11_',
        合适: 'talk12_',
        一般: 'talk13_',
        不合适: 'talk14_',
        非常不合适: 'talk15_',
      },
    },
  },
  阅读碎碎念: {
    key: 'ID',
    i18n: {
      platform: 0,
      category: '数据表_阅读碎碎念',
      prefix: {
        非常合适: 'talk21_',
        合适: 'talk22_',
        一般: 'talk23_',
        不合适: 'talk24_',
        非常不合适: 'talk25_',
      },
    },
  },
  统计信息表: {
    type: 'json',
    config: {
      key: '编号',
      json: 'statistics',
      prefix: '',
      platform: 1,
      category: '数据表_统计成就',
    },
    i18n: {
      key: '统计名',
      prefix: 'stat_',
      platform: 3,
      category: '数据表_统计成就',
    },
  },
  红点提示表: {
    type: 'json',
    config: {
      key: '程序用英文名',
      json: 'redtips',
      prefix: '',
      platform: 0,
      category: '数据表_红点提示',
    },
  },
  光效参数表: {
    type: 'default',
    config: {
      key: '光效名字',
      prefix: 'effect',
      platform: 0,
      category: '数据表_光效参数',
    },
  },
  天才争霸K值表: {
    type: 'default',
    config: {
      type: 'json',
      key: '编号',
      json: 'arenaKConfig',
      prefix: '',
      platform: 0,
      category: '数据表_天才争霸K值表',
    },
    i18n: {
      platform: 0,
      key: '编号',
      category: '数据表_天才争霸K值表',
      prefix: {
        段位名称: 'gradename',
      },
    },
  },
  黑市商人表: {
    type: 'json',
    config: {
      key: '品质',
      json: 'blackmarket',
      prefix: '',
      platform: 0,
      category: '数据表_黑市商人',
    },
  },
  制作人员名单: {
    type: 'default',
    key: '编号',
    i18n: {
      platform: 0,
      category: '数据表_制作人员名单',
      prefix: {
        头衔: 'creditstitle',
        名称: 'creditsname',
      },
    },
  },
  研究所: {
    type: 'default',
    key: '等级',
    config: {
      prefix: 'lab',
      platform: 0,
      category: '数据表_研究所',
    },
    i18n: {
      platform: 0,
      category: '数据表_研究所',
      prefix: {
        简介: 'labdesc',
      },
    },
  },
  任务: {
    type: 'default',
    key: '编号',
    config: {
      type: 'json',
      json: 'tasks',
      prefix: '',
      platform: 0,
      category: '数据表_任务',
    },
    i18n: {
      platform: 0,
      prefix: {
        任务名: 'taskname',
        简介: 'taskdesc',
      },
      category: '数据表_任务',
    },
  },
  书籍: {
    type: 'default',
    key: '编号',
    config: {
      type: 'json',
      json: 'books',
      prefix: '',
      platform: 0,
      category: '数据表_书籍',
    },
    i18n: {
      platform: 0,
      prefix: {
        书名: 'bookname',
        简介: 'bookdesc',
      },
      category: '数据表_书籍',
    },
  },
  健身房: {
    type: 'default',
    config: {
      key: '等级',
      prefix: 'gym',
      platform: 0,
      category: '数据表_健身房',
    },
  },
  楼层信息表: {
    key: '楼层类型',
    config: {
      prefix: 'floortype',
      platform: 0,
      category: '数据表_楼层信息表',
    },
    i18n: {
      platform: 0,
      category: '数据表_楼层信息表',
      prefix: {
        楼层名字: 'floorname',
        楼层简介: 'floordesc',
      },
    },
  },
  '建造表(程序专用)': {
    type: 'default',
    key: '设施ID',
    config: {
      prefix: 'facinfo',
      platform: 0,
      category: '数据表_建造表',
    },
    i18n: {
      platform: 0,
      category: '数据表_建造表',
      prefix: {
        解锁提示: 'factips',
      },
    },
  },
  奖励表: {
    type: 'default',
    key: '编号',
    config: {
      type: 'json',
      json: 'award',
      prefix: '',
      platform: 1,
      category: '数据表_奖励表',
    },
    i18n: {
      platform: 0,
      category: '数据表_奖励表',
      prefix: {
        奖励描述: 'awddesc',
        奖励标题: 'awdtitle',
      },
    },
  },
};


const mysqlDBConfig = {
  host: 'rm-wz90fc3pvc40zwi04.mysql.rds.aliyuncs.com',
  port: 3306,
  user: 'dev',
  password: 'gG3Yf324',
  charset: 'utf8',
  debug: false,
  database: 'mbgbills',
};

const redisDBConfig = {
  host: 'r-wz94815c31e61154.redis.rds.aliyuncs.com',
  password: '8xc2c9qzyJi6',
  port: 6379,
};

const xlsxDir = '/data/syncthing/config/tiancai/';

const project = 'tc';

module.exports = {
  ignoreColTable,
  ColNameTable,
  CSVConfig,
  mysqlDBConfig,
  redisDBConfig,
  ColName2Plaform,
  xlsxDir,
  project,
};