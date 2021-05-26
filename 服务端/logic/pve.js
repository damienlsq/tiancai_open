
const defines = require('./w_defines');
const CUnit = require('./w_unit');
const SkillTplData = require('./skill_tpl/skill_index');
const CBase = require('./base');
const FormulaHelper = require('./w_formula');


// 主要是分流下代码

// ///////////////////////////////////////////////////////////////////////////
/*
    pve:{
        scheme: {
            schemeIdx: { } 查看warcommon
        }
    }
*/
// ////////////////////////////////////////////////////////////////////////////


class CPVECtrl extends CBase {
  onInit() { }
  onEnter() { }
  createTmpMonster(mID, lv) {
    const dData = this.calMonsterWarData(mID, lv);
    dData.posIdx = 0;
    const isTmp = true;
    const tmpUnit = new CUnit(isTmp);
    tmpUnit.initAsTmpUnit(dData);
    return tmpUnit;
  }
  getMonsterSkillParams(monsterID, iSkillID, lv, unit) {
    const dSkillConfig = defines.getSkillConfig(iSkillID);
    if (!unit) {
      unit = this.createTmpMonster(monsterID, lv);
    }
    const params = ['a', 'b', 'c', 'd'];
    const dResult = {};
    for (let i = 0; i < 4; i++) {
      const sParam = params[i];
      let val = dSkillConfig[`${sParam}_`] || dSkillConfig[sParam];
      if (typeof (val) === 'function') {
        const func = val;
        const helper = new FormulaHelper();
        val = helper.exec(func, sParam, {
          val,
          slv: lv,
          s: Math.floor(lv / 20),  // 怪物技能的星级照旧,和等级挂钩
          unit,
        });
      }
      dResult[sParam] = val;
    }
    dResult.lv = lv;
    return dResult;
  }
  monsterinfo(mID, lv) {
    const pobj = this.pobj();
    const unit = this.createTmpMonster(mID, lv);
    const dTplConfig = defines.getMTplConfig(mID);
    const skillList = dTplConfig.SkillList;
    let skills;
    if (skillList) {
      skills = [];
      // 只发前2个技能的信息 后面的都是隐藏技能
      for (let i = 0; i < skillList.length && i < 2; i++) {
        const iSkillID = skillList[i];
        const dSkillConfig = mbgGame.config[`skill${iSkillID}`];
        if (!dSkillConfig) {
          this.logError("no dSkillConfig", iSkillID, skillList);
        }
        const type = SkillTplData[dSkillConfig.TplID].Type === '主动' ? 1 : 2;
        const dParam = this.getMonsterSkillParams(mID, iSkillID, lv, unit);
        skills.push({
          ID: iSkillID,
          type,  // 1主动 2被动
          name: pobj.getString(`mskillname${i + 1}_${defines.getMTplID(mID)}`, null, true) ||
            pobj.getString(`skillname${iSkillID}`),
          lv: dParam.lv,
          desc: pobj.getString(`skilldetail${iSkillID}`, dParam),
        });
      }
    }
    const dMonsterData = {
      lv,
      name: pobj.getString(`mname${defines.getMTplID(mID)}`),
      desc: pobj.getString(`mdesc${defines.getMTplID(mID)}`),
      skills,
      image: defines.getHeadID(mID),
    };
    // 客户端没有fighter，需要把战斗属性也发过去
    for (let i = 0; i < defines.FIRST_ATTR.length; i++) {
      const sAttr = defines.FIRST_ATTR[i];
      dMonsterData[defines.Attr2ID[sAttr]] = unit.getAttr(sAttr);
    }
    return dMonsterData;
  }
  calMonsterWarData(monsterID, lv) {
    const dTplConfig = defines.getMTplConfig(monsterID);
    const dDataConfig = defines.getMDataConfig(monsterID, lv);
    if (!dTplConfig) {
      this.logError("[calMonsterWarData] No dTplConfig", monsterID, lv, defines.getMDataConfigKey(monsterID, lv));
      return null;
    }
    if (!dDataConfig) {
      this.logError("[calMonsterWarData] No dDataConfig", monsterID, lv, defines.getMDataConfigKey(monsterID, lv));
      return null;
    }
    const dWarData = {
      type: 1,
      ID: monsterID,
    };
    dWarData.attr = {};
    dWarData.lv = lv;
    dWarData.ib = dTplConfig.ibType;
    const Attr2ID = defines.Attr2ID;
    for (let i = 0; i < defines.FIRST_ATTR.length; i++) {
      const sAttr = defines.FIRST_ATTR[i];
      const attrID = Attr2ID[sAttr];
      if (dDataConfig[sAttr] != null) {
        dWarData.attr[attrID] = dDataConfig[sAttr];
      }
    }
    dWarData.attr[Attr2ID.SkillAttr] = dDataConfig.SkillAttr;
    if (dDataConfig.MaxHpInit > 0) {
      dWarData.attr[Attr2ID.MaxHpInit] = dDataConfig.MaxHpInit;
    }
    if (dDataConfig.AtkInit > 0) {
      dWarData.attr[Attr2ID.AtkInit] = dDataConfig.AtkInit;
    }
    if (dDataConfig.DefInit > 0) {
      dWarData.attr[Attr2ID.DefInit] = dDataConfig.DefInit;
    }
    for (const attrID in dWarData.attr) {
      const sAttr = defines.ID2Attr[attrID];
      const ratio = dTplConfig[sAttr];
      if (!ratio) {
        continue;
      }
      if (defines.TplAttr1.indexOf(+attrID) !== -1) {
        dWarData.attr[attrID] *= (1 + ratio);
      } else if (defines.TplAttr2.indexOf(+attrID) !== -1) {
        dWarData.attr[attrID] += ratio;
      }
      dWarData.attr[attrID] = Math.max(0, dWarData.attr[attrID]);
    }
    dWarData.SkillList = _.clone(dDataConfig.SkillList);
    return dWarData;
  }
  getCurStageID(worldIdx) {
    const stageIdx = this.getCurStageIdx(worldIdx);
    return defines.getStageRealID(worldIdx, stageIdx);
  }
  getCurMaxStageIdx(worldIdx) {
    const dData = this.pobj().getWorldData(worldIdx);
    if (!dData) return 1;
    if (!dData.maxlv) {
      dData.maxlv = dData.lv;
    }
    return dData.maxlv;
  }
  getCurStageIdx(worldIdx) {
    const dData = this.pobj().getWorldData(worldIdx);
    return dData && dData.lv;
  }
  getLeftTeamWarData(charaIDs) {
    const dTeamData = {};
    for (let posIdx = 0; posIdx < 5; posIdx++) {
      const charaID = charaIDs[posIdx];
      if (!charaID) {
        continue;
      }
      if (!this.pobj().hasChara(charaID)) {
        continue;
      }
      const dData = this.getCharaWarData(charaID);
      if (dData.hp != null) {
        delete dData.hp;
      }
      dData.type = 0;
      dData.posIdx = posIdx;  // 同个世界的5个英雄,按顺序排即可
      dTeamData[dData.posIdx] = dData;
    }
    return dTeamData;
  }
  getClientInfo(dOption) {
    const dStageConfig = mbgGame.config[`stage${dOption.stageID}`];
    const mID = dOption.mID || dStageConfig.bossID;
    const name = this.pobj().getString(`mname${defines.getMTplID(mID)}`);
    return {
      left: {
        name: this.pobj().nickName(),
        icon: `head_${dOption.charaID}`,
      },
      right: {
        name,
        icon: `head_${defines.getHeadID(mID)}`,
      },
    };
  }
  getMonsterTeamData(worldIdx, stageID, stageLv, mIDs) {
    const dStageConfig = mbgGame.config[`stage${stageID}`];
    stageLv = stageLv || dStageConfig.lv;
    const dTeamData = {};
    let posIdx = 0;
    const dWarData = this.calMonsterWarData(dStageConfig.bossID, stageLv);
    dWarData.posIdx = posIdx;
    dWarData.boss = 1;
    dTeamData[posIdx] = dWarData;
    posIdx += 1;
    if (!mIDs) {
      const iMonsterNum = 4;
      mIDs = [];
      if (dStageConfig.mIDs &&
        _.isArray(dStageConfig.mIDs)) {
        mIDs = _.clone(dStageConfig.mIDs);
      }
      if (mIDs.length > 0) {
        mIDs = (_.shuffle(mIDs)).slice(0, iMonsterNum);
      }
    }
    // this.logInfo("[mIDs]", mIDs)
    // 到了这里就已经得到要出场的所有怪物ID了
    // 配置小怪
    for (let k = 0; k < mIDs.length; k += 1, posIdx += 1) {
      const mID = mIDs[k];
      const dMonsterWarData = this.calMonsterWarData(mID, stageLv);
      dMonsterWarData.posIdx = posIdx;
      dTeamData[posIdx] = dMonsterWarData;
    }
    return dTeamData;
  }
  getCharaWarData(charaID) {
    const dCharaData = this.pobj().getCharaDBDataByID(charaID);
    return defines.getCharaWarData(charaID, dCharaData);
  }
  // 任何pve战斗，怪物死亡时都会调用这个函数
  // 并且，只有小怪会在这里计算这个小怪的掉落，calMonsterDrop
  onMonsterDie(worldIdx, dData) {
    const pobj = this.pobj();
    pobj.m_Stat.addStatVal('KillM', 1);
    const mType = defines.getMType(dData.mID);
    pobj.m_Stat.addStatVal(`KillMType${mType}`, 1);
    if (dData.instakill) {
      pobj.m_Stat.addStatVal('instakill', 1);
    }
  }
  // 计算关卡掉落
  // charaIDs 使用的角色列表
  calStageDrop(stageID, charaIDs, dDrop) {
    if (!dDrop) {
      dDrop = {};
    }
    const dStageConfig = mbgGame.config[`stage${stageID}`];
    const dropMat = dStageConfig.dropMat;
    const dropItem = dStageConfig.dropItem;
    const dropCoin = dStageConfig.dropCoin;
    const dropExp = dStageConfig.dropExp;
    if (dropMat) {
      dDrop.mat = (dDrop.mat || 0) + dropMat;
    }
    if (dropCoin) {
      dDrop.coins = (dDrop.coins || 0) + dropCoin;
    }
    if (dropExp > 0 && !_.isEmpty(charaIDs)) {
      dDrop.charaexp = {};
      for (let i = 0; i < charaIDs.length; i++) {
        const charaID = charaIDs[i];
        dDrop.charaexp[charaID] = dropExp;
      }
    }
    if (dropItem) {
      if (!dDrop.items) {
        dDrop.items = [];
      }
      for (let itemID in dropItem) {
        const rate = dropItem[itemID]; // x%
        itemID = +itemID;
        const ran = Math.round(Math.random() * 100);
        this.logInfo("dropItem", ran, rate, itemID);
        if (ran < rate) {
          dDrop.items.push([itemID, 1]); // 数量1
        }
      }
      const starLv = this.getStageItemStarLv(stageID);
      dDrop.maxStarLv = starLv;
      this.logInfo("dDrop.items", JSON.stringify(dDrop.items), starLv);
    }
    return dDrop;
  }
  getDayWarTypeByStageIdx(stageIdx) {
    const typeIdx = +(`${stageIdx}`[0]);
    if (typeIdx === 1) {
      return 'coinwar';
    }
    if (typeIdx === 7) {
      return 'matwar';
    }
    return `herowar${typeIdx}`;
  }
  getStageName(worldIdx, stageID, stageIdx) {
    if (worldIdx === defines.dayWorldIdx) {
      const type = this.getDayWarTypeByStageIdx(stageIdx);
      if (!type.startsWith("herowar")) {
        return this.pobj().getString(type);
      }
    }
    const stagename = this.pobj().getString(`stagename${stageID}`);
    /*     if (worldIdx === defines.raidWorldIdx) {
          const lv = this.pobj().m_RaidCtrl.getRaidStageLv(stageIdx);
          const level = this.pobj().getString('level', { lv });
          return `${stagename} ${level}`;
        } */
    return stagename;
  }
  // 这个关卡可以产出的最大星级
  getStageItemStarLv(stageID) {
    const dStageConfig = mbgGame.config[`stage${stageID}`];
    return Math.max(1, Math.floor(dStageConfig.lv / 5));
  }
}

module.exports = CPVECtrl;