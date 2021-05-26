const defines = require('./w_defines');
const CUnit = require('./w_unit');
const _u = require('./underscore');
const utils = require('./w_utils');
/*
    道具、人物属性的计算放这里
    GS和BS都用
    GS不需要发送计算后的数据到BS了，只发scheme以及itemdata，BS再用这个class做计算
    注意，所有函数是staic函数，不要随便用this
*/
class CWarData {

  /*
  {
      bag:
      data:
  }
  */
  packWarData_Item(bagDict, dAllItemData) {
    const sidListByTeam = this.getItemSIDListByBagDict(bagDict);
    const dItem = {
      bag: utils.deepClone(bagDict),
      data: {},
    };
    // 因为道具的效果可能是全队的，所以要遍历一遍所有道具
    for (let i = 0; i < sidListByTeam.length; i++) {
      const sid = sidListByTeam[i];
      dItem.data[sid] = utils.deepClone(dAllItemData[sid]);
    }
    return dItem;
  }
  // static
  // charaIDs :      队伍角色ID列表
  // bagDict:        整个队伍的背包数据
  // dAllItemData :     itemIDs列表中的道具的具体数据
  // 返回每个角色的道具加成字典
  getItemExtraTable(charaIDs, bagDict, dAllItemData, noEnchant, tag) {
    // mbgGame.logger.info("getItemExtraTable", charaIDs, bagDict, dAllItemData);
    const dAllExtraAttr = {};
    if (_u.isEmpty(charaIDs) || _u.isEmpty(bagDict) || _u.isEmpty(dAllItemData)) {
      return dAllExtraAttr;
    }
    const sidListByTeam = this.getItemSIDListByBagDict(bagDict);
    // mbgGame.logger.info("getItemExtraTable sidList", sidList);
    // 遍历计算每个角色的道具加成字典
    for (let posIdx = 0; posIdx < 5; posIdx++) {
      const charaID = charaIDs[posIdx];
      if (!charaID) {
        continue;
      }
      const dExtraAttr = this.getExtraAttrDataByCharaID(charaID, posIdx, bagDict, dAllItemData, sidListByTeam, noEnchant, tag);
      // mbgGame.logger.info("getItemExtraTable dExtraAttr", dExtraAttr);
      dAllExtraAttr[charaID] = dExtraAttr;
    }
    // mbgGame.logger.info("getItemExtraTable dAllExtraAttr", dAllExtraAttr);
    return dAllExtraAttr;
  }
  // static
  getItemSIDListByBagDict(bagDict) {
    const posIdx2sidList = bagDict;
    if (_u.isEmpty(posIdx2sidList)) {
      return [];
    }
    const sidList = [];
    for (let posIdx = 0; posIdx < 5; posIdx++) {
      const _sidList = posIdx2sidList[posIdx];
      for (let i = 0; _sidList && i < _sidList.length; i++) {
        const sid = +_sidList[i];
        if (sid > 0) {
          sidList.push(sid);
        }
      }
    }
    return sidList;
  }
  // sidListByTeam 是包含了出战所有角色的所有道具
  // sidListByTeam 可选，不提供则从bagDict生成（为了效率，应该提供）
  getExtraAttrDataByCharaID(charaID, posIdx, bagDict, dAllItemData, sidListByTeam, noEnchant, tag) {
    if (!charaID) {
      return null;
    }
    const posIdx2sidList = bagDict;
    if (!sidListByTeam) {
      sidListByTeam = this.getItemSIDListByBagDict(bagDict);
    }
    const dExtraAttr = {};
    // 因为道具的效果可能是全队的，所以要遍历一遍所有道具
    for (let i = 0; i < sidListByTeam.length; i++) {
      const sid = sidListByTeam[i];
      const dItem = dAllItemData[sid];
      if (!dItem) {
        mbgGame.logError(`[getExtraAttrDataByCharaID] tag:${tag}, no item: ${sid} ${charaID}, 
        ${JSON.stringify(bagDict)},  ${JSON.stringify(dAllItemData)}, ${JSON.stringify(sidListByTeam)}`);
        continue;
      }
      const itemID = dItem.i;
      if (!sid) {
        continue;
      }
      if (defines.isInvalidItem(itemID)) {
        continue;
      }
      if (!dItem) {
        continue;
      }
      const dItemConfig = mbgGame.config[`item${itemID}`];
      if (!dItemConfig) {
        continue;
      }
      // 道具的附魔
      if (!noEnchant && dItem.e && (!dExtraAttr.eIDs || dExtraAttr.eIDs.indexOf(dItem.e) === -1)) {
        const eID = dItem.e;
        const dEnchantConfig = mbgGame.config.enchant[eID];
        const val = dEnchantConfig.val;
        const sAttr = dEnchantConfig.attr;
        const _charaID = dEnchantConfig.charaID;
        const worldIdx = dEnchantConfig.worldIdx;
        // mbgGame.logger.info("eeee", charaID, '_charaID', _charaID, 'worldIdx', worldIdx);
        if ((((charaID - 1) % 5) + 1) === _charaID || worldIdx === defines.getWorldIdxByCharaID(charaID)) {
          // sAttr属性 *= (1 + val%)
          const sType = sAttr === "Sk" ? "Add" : "Mul";
          dExtraAttr[`${sAttr}${sType}`] = (dExtraAttr[`${sAttr}${sType}`] || 0) + val;
          dExtraAttr.eIDs = dExtraAttr.eIDs || [];
          dExtraAttr.eIDs.push(eID);
          // mbgGame.logger.info("eIDs", dExtraAttr.eIDs, `${sAttr}Mul`, dExtraAttr[`${sAttr}Mul`]);
        }
      }
      const _sidList = posIdx2sidList[posIdx];
      const isMyItem = _sidList && _sidList.indexOf(sid) !== -1;
      if (!isMyItem) {
        // 不是装在自己身上，那就没效果
        continue;
      }
      const m = dItem.m || dItemConfig.fixedAttrs;
      const dStarAttr = mbgGame.config.itemattr[dItem.s];

      // 道具的主属性
      if (dItemConfig.isVIPItem) {
        // 都是x%加成
        const arr = m[0];
        for (let k = 0; k < 3; k++) {
          const mainAttrID = defines.MainAttrIDs[k];
          const mainAttr = defines.ID2Attr[mainAttrID];
          dExtraAttr[`${mainAttr}Mul`] = (dExtraAttr[`${mainAttr}Mul`] || 0) + arr[k];
        }
      } else {
        // 根据道具星级读表
        // 防御1 攻击2 辅助3
        const arr = dStarAttr[`main${dItemConfig.mainType}`]; // 攻击、防御、辅助
        const ratio = mbgGame.config.constTable.itemLvRatio[dItem.lv - 1] || 0;
        for (let k = 0; k < 3; k++) {
          const mainAttrID = defines.MainAttrIDs[k];
          const mainAttr = defines.ID2Attr[mainAttrID];
          const a = arr[k];
          const mainAttrAdd = a + (Math.ceil(a * ratio) * (dItem.lv - 1));
          // mbgGame.logger.info("mainAttrAdd", mainAttr, mainAttrAdd, a, ratio, dItem.lv - 1);
          dExtraAttr[`${mainAttr}Add`] = (dExtraAttr[`${mainAttr}Add`] || 0) + mainAttrAdd;
        }
      }
      // 道具的副属性
      for (let k = 1; k <= 2; k++) {
        if (!m[k]) {
          continue;
        }
        const subAttrID = m[k][0];
        const subAttr = subAttrID && defines.ID2Attr[subAttrID];
        if (!subAttr) {
          continue;
        }
        let subAttrAdd = m[k][1];
        const subAttrMul = m[k][2];
        subAttrAdd += defines.getLvRank(dItem.lv) * dStarAttr[`${subAttr}`][1];
        if (subAttrAdd > 0) {
          dExtraAttr[`${subAttr}Add`] = (dExtraAttr[`${subAttr}Add`] || 0) + subAttrAdd;
        }
        if (subAttrMul > 0) {
          dExtraAttr[`${subAttr}Mul`] = (dExtraAttr[`${subAttr}Mul`] || 0) + subAttrMul;
        }
      }
      // 道具克制
      dExtraAttr.ib = dItemConfig.ibType;
      // 道具的特效
      const sEffect = dItemConfig.effect;
      if (!sEffect) {
        continue;
      }
      if (defines.isSpecialEffect(sEffect)) {
        continue;
      }
      const sAttr = sEffect;
      const val = defines.getItemEffectVal(itemID, dItem.lv);
      dExtraAttr[sAttr] = (dExtraAttr[sAttr] || 0) + val;

      // 道具附带技能
      let itemSkillID;
      if (dItemConfig.isVIPItem) {
        itemSkillID = 998;
        dExtraAttr[`skill${itemSkillID}`] = 1;
      } else {
        itemSkillID = mbgGame.config.skillItemID2SkillID[itemID];
      }
      if (itemSkillID) {
        const slv = dItem.lv * 5;
        dExtraAttr[`skill${itemSkillID}_lv`] = slv;
      }
    }
    return dExtraAttr;
  }
  // static
  getPVPTeamWarData(charaIDs, dTeamData) {
    // this.logInfo("[arena] [getPVPTeamWarData] dTeamData", JSON.stringify(dTeamData));
    const dTeamWarData = {};
    for (let i = 0; i < charaIDs.length; i++) {
      const charaID = charaIDs[i];
      if (!charaID) {
        continue;
      }
      const dData = defines.getCharaWarData(charaID, dTeamData[charaID]);
      if (dData.hp != null) {
        delete dData.hp;
      }
      dData.ID = charaID;
      dData.type = 0;
      dData.posIdx = i;
      dTeamWarData[dData.posIdx] = dData;
    }
    // this.logInfo("[arena] [getPVPTeamWarData] dTeamWarData", JSON.stringify(dTeamWarData));
    return dTeamWarData;
  }
  // 计算战斗回放数据角色的信息
  calCharaInfos(dTeam, bagDict, dAllItemData) {
    const dCharaInfos = {};
    for (let posIdx = 0; posIdx < 5; posIdx++) {
      let dChara = dTeam[posIdx];
      if (!dChara) {
        continue;
      }
      const charaID = dChara.ID;
      dChara = utils.deepClone(dChara);
      const tmpUnit = new CUnit(true);
      dChara.type = 0;
      dChara.posIdx = 0;
      tmpUnit.m_Data = dChara;
      const sidListByTeam = this.getItemSIDListByBagDict(bagDict);
      if (!_u.isEmpty(bagDict)) {
        const dExtraAttr = this.getExtraAttrDataByCharaID(
          charaID, posIdx, bagDict, dAllItemData, sidListByTeam, false, 'info');
        tmpUnit.setExtraAttrData(dExtraAttr);
      }
      tmpUnit.initAsTmpUnit(dChara);
      dCharaInfos[charaID] = tmpUnit.packInfo('gs');
    }
    return dCharaInfos;
  }
  getItemDataDictByBag(bag, dItemDBData, dFixedLv) {
    const dAllItem = {};
    for (let posIdx = 0; posIdx < 5; posIdx++) {
      const sidList = bag && bag[posIdx];
      if (!sidList) {
        continue;
      }
      for (let i = 0; i < sidList.length; i++) {
        const sid = sidList[i];
        if (!sid) {
          continue;
        }
        const dItemData = dItemDBData[sid];
        if (!dItemData) {
          mbgGame.logger.warn("[wardata] getItemDataDictByBag no item data, bag:",
            JSON.stringify(bag),
            JSON.stringify(dItemDBData));
          continue;
        }
        dAllItem[sid] = utils.deepClone(dItemData);
        if (dFixedLv) {
          dAllItem[sid].lv = Math.min(dFixedLv.itemLv, defines.getItemMaxLv(dItemData.q));
          dAllItem[sid].s = dFixedLv.starLv;
        }
      }
    }
    return dAllItem;
  }
  calRobotTalent(charaID, charaLv) {
    let ttLv = 1;
    const ta = [0];
    for (; ttLv <= 100; ttLv++) {
      const key = `${charaID}${utils.pad(ttLv, 3)}0`;
      const dTalentConfig = mbgGame.config.talent[key];
      if (!dTalentConfig) {
        break;
      }
      if (dTalentConfig.clv > charaLv) {
        break;
      }
      const subkey = `${charaID}${utils.pad(ttLv, 3)}1`;
      const dSubConfig = mbgGame.config.talent[subkey];
      if (dSubConfig) {
        const sub = +(`${ttLv}14`); // 该主线lv的第1个支线为4层（从0开始数）
        ta.push(sub);
      }
    }
    ttLv -= 1;
    ta[0] = (ttLv * 10) + 1;
    return ta;
  }
}

module.exports = CWarData;