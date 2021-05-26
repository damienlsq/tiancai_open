const defines = require('./w_defines');
const CBase = require('./base');
const CUnit = require('./w_unit');

// ///////////////////////////////////////////////////////////////////////////
/*
dScheme: {
    charaIDs: 允许跳过位置如 [0, 0, 1, 0, 3]
    botting:
    bag:{
        posIdx: sidList
    }
}
*/
// ////////////////////////////////////////////////////////////////////////////
class CWarCommon extends CBase {
  validSchemeBeforeWar(worldIdx, schemeIdx) {
    const dScheme = this.getSchemeData(worldIdx, schemeIdx);
    // 只要有出战角色列表，就OK了，item、botting可选
    if (_.isEmpty(dScheme.charaIDs)) {
      return false;
    }
    let hasChara = false;
    for (let i = 0; i < dScheme.charaIDs.length; i++) {
      const charaID = dScheme.charaIDs[i];
      if (!charaID) {
        continue;
      }
      if (!this.pobj().hasChara(charaID)) {
        return false;
      }
      hasChara = true;
    }
    if (!hasChara) {
      return false;
    }
    return true;
  }
  validSetBotting(dScheme, charaIDs) {
    const bottingNum = mbgGame.config.constTable.BottingNum || 10;
    if (_.isEmpty(charaIDs)) {
      return true;
    }
    if (charaIDs.length <= bottingNum) {
      for (let i = 0; i < charaIDs.length; i++) {
        const charaID = charaIDs[i];
        if (!(charaID >= 1 && charaID <= 15)) return false;
        if (!this.pobj().hasChara(charaID)) return false;
        const _charaIDs = dScheme.charaIDs;
        if (!_charaIDs || _charaIDs.indexOf(charaID) === -1) {
          return false;
        }
      }
      return true;
    }
    return false;
  }
  isEmptyScheme(worldIdx, schemeIdx) {
    const dScheme = this.getSchemeData(worldIdx, schemeIdx);
    const count = defines.countCharaIDs(dScheme.charaIDs);
    return count === 0;
  }
  // 任何玩法的阵容设置 都通过这个接口做验证
  validSchemeCharaIDs(worldIdx, charaIDs) {
    // this.logInfo("validSchemeCharaIDs", worldIdx, charaIDs);
    const pobj = this.pobj();
    if (!_.isArray(charaIDs) || charaIDs.length > 5) {
      return mbgGame.config.ErrCode.WrongParam;
    }
    const countByCharaID = []; // 判断重复
    // 把null变成0 以及取整
    for (let i = 0, len = charaIDs.length; i < 5; i++) {
      const charaID = charaIDs[i];
      charaIDs[i] = Math.round(charaID || 0);
      if (charaID > 0) {
        countByCharaID[charaID] = (countByCharaID[charaID] || 0) + 1;
        if (countByCharaID[charaID] >= 2) {
          return mbgGame.config.ErrCode.WrongParam;
        }
      }
    }
    // 必须是拥有的角色
    for (let i = 0; i < charaIDs.length; i++) {
      const charaID = charaIDs[i];
      if (!(charaID >= 0)) {
        return mbgGame.config.ErrCode.WrongParam;
      }
      if (charaID && !pobj.hasChara(charaID)) {
        return mbgGame.config.ErrCode.NoChara;
      }
    }
    if (_.isEmpty(charaIDs)) {
      return mbgGame.config.ErrCode.Scheme_NoCharaIDs;
    }
    let hasCharaID = false;
    for (let i = 0; i < 5; i++) {
      if (charaIDs[i]) {
        hasCharaID = true;
        break;
      }
    }
    if (!hasCharaID) {
      return mbgGame.config.ErrCode.Scheme_NoCharaIDs;
    }
    // 剧情世界
    if ([1, 2, 3].indexOf(worldIdx) !== -1) {
      // 支线剧情，必须都是这个世界的人，且全都出动
      return mbgGame.config.ErrCode.Scheme_WrongStoryCharaIDs;
    }
    return mbgGame.config.ErrCode.OK;
  }
  validSchemeParam(dScheme, dParam) {
    const charaIDs = dParam.charaIDs;
    const botting = dParam.botting;
    const sid = dParam.sid;
    const charaIdx = dParam.charaIdx;
    const type = dParam.type;
    const worldIdx = dParam.worldIdx;
    if (charaIDs) {
      const err = this.validSchemeCharaIDs(worldIdx, charaIDs);
      if (err) return err;
    } else if (sid && charaIdx != null) {
      if (type === 1) {
        const err = this.pobj().m_ItemBag.validUseItem(sid, worldIdx, charaIdx, dScheme.charaIDs, dScheme.bag);
        if (err) return err;
      }
    } else if (dParam.switch === 1) {
      // 验证是否有道具？
    } else if (botting) {
      const ok = this.validSetBotting(dScheme, botting);
      if (!ok) {
        return mbgGame.config.ErrCode.Scheme_WrongBottingCharaIDs;
      }
    } else {
      return mbgGame.config.ErrCode.WrongParam;
    }
    return mbgGame.config.ErrCode.OK;
  }
  getSchemeData(worldIdx, schemeIdx, dParam) {
    const type = dParam && dParam.type;
    /* 2017-8-10改:
      试炼(9)、友谊赛&争霸(99)、随便打打(10)都用争霸的阵型数据
      时空隧道(0)、剧情模式(1、2、3、6)的阵型设置不变
    */
    if (worldIdx === defines.dayWorldIdx && type === "wheelwar") {
      return this.pobj().m_WheelWar.getSchemeData();
    }
    if (worldIdx === defines.dayWorldIdx ||
      worldIdx === defines.raidWorldIdx ||
      worldIdx === defines.battleWorldIdx ||
      (worldIdx === 6 && this.pobj().isStorySchemeUnlocked())) {
      worldIdx = 99;
    }
    if (defines.StoryWorlds.indexOf(worldIdx) !== -1) {
      return this.pobj().m_StoryWar.getSchemeData(worldIdx, schemeIdx, dParam && dParam.stageIdx);
    } else if (worldIdx === 99) {
      const dScheme = this.pobj().m_PVPCtrl.getSchemeData(schemeIdx);
      return dScheme;
    }
    return null;
  }
  /*
  设置阵型方案：
  (一次设置一项；争取所有战斗都用这个接口设置阵型）
  1.角色顺序:
  dParam = {
      charaIDs:
  }
  2.道具:
  dParam = {
      sid:
      charaIdx:
  }
  3.放技能顺序:
  dParam = {
      botting: charaIDs
  }
  4.交换:
    dParam = {
      switch: 1,
      idx1:
      idx2:
  }
  */
  setScheme(dScheme, dParam) {
    const err = this.validSchemeParam(dScheme, dParam);
    if (err) {
      this.logInfo("[setScheme] err", err);
      return err;
    }
    if (!dScheme.bag) {
      dScheme.bag = {};
    }
    if (dParam.charaIDs && !_.isEqual(dParam.charaIDs, dScheme.charaIDs)) {
      const oldCharaIDs = dScheme.charaIDs;
      dScheme.charaIDs = dParam.charaIDs;
      // 2017.2.3 优化：改变角色列表后，不能直接重置道具和技能
      // 没有old角色列表：清空botting和bag
      // 角色被移除：从botting中删除该角色，从bag中删除该角色
      // 角色换位：不改变botting和bag
      if (!oldCharaIDs || oldCharaIDs.length === 0) {
        dScheme.botting = null;
        dScheme.bag = {};
      } else {
        // diffCharaIDs是指 在oldCharaIDs里，但不在dScheme.charaIDs里的ID
        const diffCharaIDs = _.difference(oldCharaIDs, dScheme.charaIDs);
        if (diffCharaIDs && diffCharaIDs.length > 0) {
          // 不只是换位
          // 被去掉的角色，删除它的botting信息
          dScheme.botting = _.without(dScheme.botting, ...diffCharaIDs);
        }
      }
    }
    if (dParam.charaIdx != null) {
      if (!dScheme.bag[dParam.charaIdx]) {
        dScheme.bag[dParam.charaIdx] = [];
      }
      const sidList = dScheme.bag[dParam.charaIdx];
      const pos = 0; // TODO  目标道具格子
      if (dParam.type === 1) {
        // 装上
        if (dParam.sid) {
          sidList[pos] = dParam.sid;
        }
      } else {
        // 卸下
        sidList[pos] = 0;
      }
    }
    if (dParam.switch === 1) {
      // 交换道具
      if (!dScheme.bag[dParam.idx1]) {
        dScheme.bag[dParam.idx1] = [];
      }
      if (!dScheme.bag[dParam.idx2]) {
        dScheme.bag[dParam.idx2] = [];
      }
      const sidList1 = dScheme.bag[dParam.idx1];
      const sidList2 = dScheme.bag[dParam.idx2];
      const pos = 0; // TODO  目标道具格子
      const tmpSid = sidList1[pos];
      sidList1[pos] = sidList2[pos];
      sidList2[pos] = tmpSid;
    }

    if (dParam.botting) {
      dScheme.botting = dParam.botting;
    }
    //   this.logInfo("[setScheme]", JSON.stringify(dScheme));
    return null;
  }
  checkWorldSchemeItem(worldIdx, schemeIdx) {
    if (worldIdx >= 1 && worldIdx <= 3 && schemeIdx >= 0) {
      const dScheme = this.getSchemeData(worldIdx, schemeIdx);
      for (const charaIdx in dScheme.bag) {
        const sidList = dScheme.bag[charaIdx];
        const sid = sidList && sidList[0];
        if (sid) {
          const itemID = this.pobj().m_ItemBag.getItemID(sid);
          const dConfig = mbgGame.config[`item${itemID}`];
          if (dConfig && dConfig.worldIdx && dConfig.worldIdx !== worldIdx) {
            sidList.shift();
          }
        }
      }
      this.sendScheme(worldIdx, schemeIdx);
    }
  }
  sendScheme(worldIdx, schemeIdx) {
    schemeIdx = schemeIdx || 0;
    const dScheme = this.getSchemeData(worldIdx, schemeIdx);
    this.pobj().sendCmd("scheme", {
      worldIdx,
      schemeIdx,
      data: dScheme,
    });
  }
  // 查看阵型里的某一个角色的信息
  // dScheme 可选
  getCharaInfo(charaID, dScheme) {
    if (!this.m_TmpUnit) {
      const isTmp = true;
      this.m_TmpUnit = new CUnit(isTmp);
    }
    const tmpUnit = this.m_TmpUnit;
    const dData = this.pobj().m_PVECtrl.getCharaWarData(charaID);
    if (!dData) {
      return null;
    }
    dData.ID = charaID;
    dData.type = 0;
    dData.posIdx = 0;
    tmpUnit.m_Data = dData;
    // this.logInfo("getCharaInfo charaID", charaID, "tlv", dData.tlv);
    // this.logInfo("getCharaInfo charaID", charaID, "bag", dScheme.bag);
    tmpUnit.setExtraAttrData(null);
    if (dScheme && dScheme.charaIDs && dScheme.bag) {
      const charaIDs = dScheme.charaIDs;
      const posIdx = charaIDs.indexOf(charaID);
      //  this.logInfo("getCharaInfo", posIdx, charaID);
      if (posIdx !== -1) {
        const dExtraAttr = mbgGame.WarData.getExtraAttrDataByCharaID(
          charaID, posIdx, dScheme.bag, this.pobj().m_ItemBag.getItemDBData(), null, false, 'info2');
        // this.logInfo("getCharaInfo dExtraAttr", dExtraAttr);
        // this.logInfo("getCharaInfo dScheme.bag", dScheme.bag);
        // this.logInfo("getCharaInfo getItemDBData", this.pobj().m_ItemBag.getItemDBData());
        tmpUnit.setExtraAttrData(dExtraAttr);
      }
    }
    tmpUnit.initAsTmpUnit(dData);
    return tmpUnit.packInfo('gs');
  }
  packCharaInfoForWarResult(charaIDs) {
    const pobj = this.pobj();
    const dCharas = {};
    for (let i = 0; i < charaIDs.length; i++) {
      const charaID = charaIDs[i];
      if (!charaID) {
        continue;
      }
      if (!pobj.hasChara(charaID)) {
        pobj.logWarn("packCharaInfoForWarResult no chara", charaID, charaIDs);
        continue;
      }
      const dData = pobj.getCharaDataForClientByID(charaID);
      dCharas[charaID] = {
        lv: dData.lv,
        exp: dData.exp,
        upCost: dData.upCost,
        MaxHp: dData.base[defines.Attr2ID.MaxHp],
        Def: dData.base[defines.Attr2ID.Def],
        Atk: dData.base[defines.Attr2ID.Atk],
      };
    }
    return dCharas;
  }
  giveAwardForWar(worldIdx, charaIDs, dDrop, reason) {
    const dOldCharas = this.packCharaInfoForWarResult(charaIDs);
    // 2017-11-9 低等级角色经验buff
    const labLv = this.pobj().m_Lab.getLv();
    const lowCharaIDs = [];
    if (dDrop.noBonus) {
      delete dDrop.noBonus;
    } else if (labLv >= mbgGame.config.constTable.ExpBonusLabLv) {
      const bonusLv = this.pobj().m_Lab.getBonuslv();
      for (let charaID in dDrop.charaexp) {
        charaID = +charaID;
        const charaLv = this.pobj().getCharaLv(charaID);
        if (charaLv < bonusLv) {
          dDrop.charaexp[charaID] *= mbgGame.config.constTable.ExpBonusRatio;
          lowCharaIDs.push(charaID);
        }
      }
    }
    dDrop.lc = lowCharaIDs;
    this.pobj().giveAward(dDrop, reason, true);
    const dNewCharas = this.packCharaInfoForWarResult(charaIDs);
    const dWarResult = {
      worldIdx,
      result: 1,
      reward: dDrop,
      charas: {
        old: dOldCharas,
        cur: dNewCharas,
      },
    };
    return dWarResult;
  }
}

module.exports = CWarCommon;
