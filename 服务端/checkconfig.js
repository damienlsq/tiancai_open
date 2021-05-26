const defines = require('./logic/w_defines');
const FormulaHelper = require('./logic/w_formula');
const utils = require("./gameserver/utils");
const fs = require("fs");

const buildNameFilterList = function() {
  if (!mbgGame.i18n) {
    return;
  }
  if (!mbgGame.avoid_lang) {
    return;
  }
  mbgGame.filterNames = [];

  _.map(mbgGame.i18n, (value, key) => {
    if (key.substring(0, 5) === "mname" ||
      key.substring(0, 9) === "charaname"
    ) {
      mbgGame.avoid_lang.forEach((x) => {
        if (value[x]) {
          mbgGame.filterNames.push(value[x]);
        }
      });
    }
  });
  mbgGame.filterNames = _.union(mbgGame.filterNames);
  // console.log("mbgGame.filterNames",mbgGame.filterNames);
};

const buildRantConfig = function() {
  if (!mbgGame.i18n) {
    return;
  }
  let clientConf; // 发送给客户端的配置
  _.map(mbgGame.config.rant, (value, key) => {
    // 根据对应的对白的平台设置
    const i18nData = mbgGame.i18n.client[`rant${key}`];
    if (i18nData) {
      clientConf = clientConf || {};
      clientConf[key] = value;
    }
  });
  if (clientConf) {
    // 同步配置客户端配置
    mbgGame.config.client.rant = clientConf;
  }
  // console.log("rant1", mbgGame.config.rant, mbgGame.config.client.rant);
};

// 客户端的关卡信息
const buildClientStageInfo = function(stageIDList) {
  const dAllStageInfo = {};
  for (let k = 0; k <= stageIDList.length; k++) {
    const stageID = stageIDList[k];
    const dStageConfig = mbgGame.config[`stage${stageID}`];
    if (!dStageConfig) {
      // console.log("[buildClientStageInfo] no such stage:", stageID);
      continue;
    }
    const bossID = dStageConfig.bossID;
    const data = {
      bI: bossID,
      lv: dStageConfig.lv,
      cI: dStageConfig.charaIDs,
      hI: defines.getHeadID(bossID),
      bg: dStageConfig.bg,
      cS: dStageConfig.costSta,
      dI: dStageConfig.dropItem,
      fM: dStageConfig.mIDs,
      w: dStageConfig.wave,
    };
    if (dStageConfig.dropCoin > 0) {
      data.dC = dStageConfig.dropCoin;
    }
    if (dStageConfig.dropMat > 0) {
      data.dM = dStageConfig.dropMat;
    }
    dAllStageInfo[stageID] = data;
  }
  return dAllStageInfo;
};


const buildErrorCode = function(config) {
  if (config.ErrCodeList) {
    config.ErrCode = {
      Ok: 0,
      OK: 0,
      ok: 0,
      Error: 1,
    };
    for (let err in config.ErrCodeList) {
      const sName = config.ErrCodeList[err];
      err = +err;
      config.ErrCode[sName] = err;
    }
    config.client.ErrCode = config.ErrCode;
  } else {
    console.log("no ErrCodeList");
  }
};


const buildSortedCharaIDs = function(config) {
  config.sortedCharaIDs = {};
  // 缓存3个世界的英雄排序
  config.sortedCharaIDs[0] = defines.sortCharaIDsByPrior([1, 2, 3, 4, 5]);
  config.sortedCharaIDs[1] = defines.sortCharaIDsByPrior([6, 7, 8, 9, 10]);
  config.sortedCharaIDs[2] = defines.sortCharaIDsByPrior([11, 12, 13, 14, 15]);
  config.client.sortedCharaIDs = config.sortedCharaIDs;
};

const buildArena = function(config) {
  config.tier2kConfig = {};
  const arenaKConfig = config.arenaKConfig;
  for (let i = 0; i <= defines.tierTotalPVP; i++) {
    for (let k = 1; k < 100; k++) {
      const iTier = i * defines.tierScore;
      const dConfig = arenaKConfig[k];
      if (!dConfig) {
        break;
      }
      const scoreRange = dConfig.scoreRange;
      if (iTier >= scoreRange[0] && iTier < scoreRange[1]) {
        config.tier2kConfig[iTier] = dConfig;
      }
    }
  }
};

const buildTalent = function(config) {
  const dData = {};
  const talent = config.talent;
  // 天赋主线的数值可以预先累加
  for (let charaID = 1; charaID <= 15; charaID++) {
    const dChara = {}; // `${lv}-${n}`: dAccum
    const dAccum = {};
    for (let lv = 1; lv <= 100; lv++) {
      const key = `${charaID}${utils.pad(lv, 3)}0`;
      const dConfig = talent[key];
      if (!dConfig) {
        break;
      }
      const sAttr = dConfig.attr;
      const attrID = defines.Attr2ID[sAttr];
      // mbgGame.logger.info('c', charaID, 'lv', lv, sAttr, attrID);
      if (attrID) {
        for (let n = 0; n < dConfig.attrAdd.length; n++) {
          dAccum[attrID] = (dAccum[attrID] || 0) + dConfig.attrAdd[n];
          dChara[`${lv}-${n}`] = _.clone(dAccum);
        }
      } else {
        dChara[`${lv}-${0}`] = _.clone(dAccum);
        dChara[`${lv}-${1}`] = _.clone(dAccum);
      }
    }
    dData[charaID] = dChara;
  }
  config.charatalent = dData;
  config.client.charatalent = dData;
};

const buildStatName2StatID = function(config) {
  const StatName2StatID = {};
  const statistics = config.statistics;
  for (let iStatID in statistics) {
    iStatID = parseInt(iStatID);
    const dStat = statistics[iStatID];
    StatName2StatID[dStat.StatName] = iStatID;
  }
  config.StatName2StatID = StatName2StatID;
  config.client.StatName2StatID = StatName2StatID;
};

const buildWarDefaultVal = function(config) {
  defines.initDefaultVal();
};

const buildEnchant = function(config) {
  const e = config.enchant;
  config.enchantIDs = [];
  for (let eID in e) {
    eID = +eID;
    config.enchantIDs.push(eID);
  }
};

const buildItemSkillDesc = function(config) {
  const skillItemIDs = config.skillItemIDs;
  const helper = new FormulaHelper();
  const params = ['a', 'b', 'c', 'd'];
  for (let i = 0; i < skillItemIDs.length; i++) {
    const itemID = skillItemIDs[i];
    const dItemConfig = config[`item${itemID}`];
    if (!dItemConfig.effect) {
      continue;
    }
    const skillID = parseInt(dItemConfig.effect.substr(5));
    const dSkillConfig = config[`skill${skillID}`];
    if (!dSkillConfig) {
      console.log("[buildItemSkillDesc] no dSkillConfig", skillID);
      continue;
    }
    dItemConfig.params = {};
    for (let s = 0; s < params.length; s++) {
      const sParam = params[s];
      const vals = [];
      for (let lv = 1; lv <= 20; lv++) {
        const func = dSkillConfig[`${sParam}_`];
        if (!func) {
          continue;
        }
        const slv = lv * 5;
        const star = Math.floor(slv / 20);
        const val = helper.exec(func, sParam, {
          s: star,
          slv,
        });
        vals.push(val);
      }
      if (vals.length > 0) {
        dItemConfig.params[sParam] = vals;
      }
    }
    // console.log("itemID", itemID, "dItemConfig.params", dItemConfig.params);
  }
};

const buildBlackMarket = function(config) {
  const blackmarket = config.blackmarket;
  const dWeight = {};
  for (const Q in blackmarket) {
    const dConfig = blackmarket[Q];
    if (dConfig.w > 0) {
      dWeight[Q] = dConfig.w;
    }
  }
  config.BuyWeightDict = dWeight;
};

const buildChapter = function(config) {
  const stageID2ChapterID = {};
  for (let chapterID in config.chapter) {
    chapterID = +chapterID;
    const dChapter = config.chapter[chapterID];
    for (let i = 0; i < dChapter.stageID.length; i++) {
      const stageID = dChapter.stageID[i];
      stageID2ChapterID[stageID] = [
        chapterID,
        i === dChapter.stageID.length - 1,
      ];
    }
  }
  config.stageID2ChapterID = stageID2ChapterID;
};

const checkconfig = function() {
  try {
    const config = mbgGame.config;
    const constTable = mbgGame.config.constTable;
    config.ChestCanDropItemIDs = []; // 宝箱可掉物品
    config.allitemIDs = [];
    constTable.allNewsType = [];
    config.PlotID2DialogIDs = {};
    config.StatName2AchieveSID = {};
    config.charaItemIDs = [];
    config.skillItemIDs = []; // 附带技能的道具
    config.skillItemID2SkillID = []; // 附带技能的道具对应的技能ID

    let w_gen = '';

    const stageIDList = [];
    for (const k in config) {
      const dData = config[k];
      if (k.indexOf("skill") !== -1) {
        const skillID = Number(k.substr("skill".length));
        const keys = _.keys(dData);
        let sSkill = '';
        for (let i = 0, len = keys.length; i < len; i++) {
          const s = keys[i];
          const val = dData[s];
          if (s === "CD" ||
            s === "duration" ||
            s === "a" ||
            s === "b" ||
            s === "c" ||
            s === "d") {
            // 函数
            if (val) {
              sSkill += `\t\t${s} : function(d) { return ${val}; },\n`;
              try {
                dData[`${s}_`] = new Function(`return function(d) { return ${val}; }`)();
              } catch (e) {
                console.log("[onConfigUpdated] eval err, key:", k, "val:", s);
                console.log("[onConfigUpdated] eval err", e);
              }
            }
          }
        }
        if (sSkill) {
          w_gen += `\t${skillID} : {\n${sSkill}},\n`;
        }
      }
      if (k.indexOf("dialog") !== -1) {
        const dialogID = +(k.substr("dialog".length));
        if (dData.PlotID) {
          if (!config.PlotID2DialogIDs[dData.PlotID]) {
            config.PlotID2DialogIDs[dData.PlotID] = [];
          }
          config.PlotID2DialogIDs[dData.PlotID].push(dialogID);
        }
      } else if (k.indexOf("item") !== -1) {
        const itemID = Number(k.substr("item".length));
        if (!itemID || !_.isNumber(itemID)) {
          continue;
        }
        config.allitemIDs.push(itemID);
        if (dData.ChestCanDrop) {
          // 非剧情道具，可以在宝箱中抽到
          const lst = config.ChestCanDropItemIDs;
          lst.push(itemID);
        }
        if (dData.effect && dData.effect.startsWith("skill") && !dData.effect.endsWith("_T")) {
          config.skillItemIDs.push(itemID);
          config.skillItemID2SkillID[itemID] = parseInt(dData.effect.substr(5));
        }
        if (dData.effect && dData.effect.endsWith("_T")) {
          config.charaItemIDs.push(itemID);
        }
      } else if (k.indexOf("newstype") !== -1) {
        const iNewsYype = parseInt(k.substr("newstype".length));
        constTable.allNewsType.push(iNewsYype);
      } else if (k.indexOf("achieve") !== -1) {
        const achieveID = Number(k.substr("achieve".length));
        if (!dData.values) {
          console.log("achieve error", k);
        }
        dData.maxLv = dData.values.length;
        config.StatName2AchieveSID[dData.StatName] = achieveID;
      } else if (k.indexOf("stage") !== -1) {
        stageIDList.push(Number(k.substr("stage".length)));
      }
    }
    fs.writeFileSync('./logic/w_gen.js',
      `module.exports = {\n${w_gen}};\n`,
      {
        flags: 'w',
      });
    // 对白id排序
    for (const plotID in config.PlotID2DialogIDs) {
      const lst = config.PlotID2DialogIDs[plotID];
      lst.sort((a, b) => {
        return a - b;
      });
    }
    // 只在GS执行的
    if (mbgGame.server && mbgGame.server.name() !== "BS") {
      config.client.allstageinfo = buildClientStageInfo(stageIDList);
    }

    // 客户端需要的
    config.client.Attr2ID = defines.Attr2ID;
    config.client.skillItemID2SkillID = config.skillItemID2SkillID;
    // 各种build
    buildNameFilterList();
    buildRantConfig();
    buildStatName2StatID(config);
    buildItemSkillDesc(config);
    buildErrorCode(config);
    buildSortedCharaIDs(config);
    buildWarDefaultVal(config);
    buildBlackMarket(config);
    buildEnchant(config);
    buildArena(config);
    buildTalent(config);
    buildChapter(config);

    const robotIDs = [];
    for (const robotID in mbgGame.config.robotplayer) {
      robotIDs.push(+robotID);
    }
    mbgGame.config.robotIDs = robotIDs;

    console.log("onConfigUpdated OK");
  } catch (e) {
    console.log("onConfigUpdated, err:", e);
  }
};


module.exports = checkconfig;