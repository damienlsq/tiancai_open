const utils = require("../gameserver/utils");

const defines = require('./w_defines');
const CBase = require('./base');

// ///////////////////////////////////////////////////////////////////////////
// Raid 试炼剧情代码
// ////////////////////////////////////////////////////////////////////////////
class CRaidCtrl extends CBase {
  onInit() { }
  getDBData() {
    let dDBData = this.pobj().getVal("raid");
    if (!dDBData) {
      dDBData = {
        ul: 0, // is unlock
        d: {
          // raidIdx: [lv, maxLv]
        },
        i: 0, // schemeIdx,
      };
      this.pobj().setValOnly("raid", dDBData);
    }
    return dDBData;
  }
  unlock() {
    const dDBData = this.getDBData();
    if (dDBData.ul) {
      return false;
    }
    dDBData.ul = 1;
    return true;
  }
  isUnlocked() {
    const dDBData = this.getDBData();
    return dDBData.ul;
  }
  onSendRaidData() {
    const dDBData = this.getDBData();
    this.pobj().sendCmd("raiddata", dDBData);
  }
  unlockRaidStage(raidIdx) {
    raidIdx = Math.round(raidIdx);
    const dDBData = this.getDBData();
    const d = dDBData.d;
    if (!(raidIdx >= 1 && raidIdx <= mbgGame.config.constTable.MaxRaidStageIdx)) {
      return false;
    }
    if (!d[raidIdx]) {
      d[raidIdx] = [0, 0];
      this.pobj().m_Stat.setStatVal(`raid${raidIdx}`, 0);
      return true;
    }
    return false;
  }
  getRaidStageLv(raidIdx) {
    const dDBData = this.getDBData();
    const d = dDBData.d;
    if (d[raidIdx]) {
      return d[raidIdx][0];
    }
    return 0;
  }
  getRaidStageMaxLv(raidIdx) {
    const dDBData = this.getDBData();
    const d = dDBData.d;
    if (d[raidIdx]) {
      return d[raidIdx][1];
    }
    return 0;
  }
  getAllRaidCanDropItemIDs() {
    const dDBData = this.getDBData();
    const d = dDBData.d;
    const itemIDs = [];
    for (const raidIdx in d) {
      const maxlv = this.getRaidStageMaxLv(raidIdx) || 1;
      const dStageConfig = this.getRaidStageConfig(raidIdx, maxlv);
      if (!dStageConfig) {
        continue;
      }
      const dropItem = dStageConfig.dropItem;
      if (!dropItem) {
        continue;
      }
      for (const itemID in dropItem) {
        const rate = dropItem[itemID]; // x%
        if (rate > 0) {
          itemIDs.push(+itemID);
        }
      }
    }
    return itemIDs;
  }
  setRaidStagelv(raidIdx, newLv) {
    const dDBData = this.getDBData();
    const d = dDBData.d;
    const arr = d[raidIdx];
    if (!arr) {
      return false;
    }
    const stageID = this.getRaidStageID(raidIdx, newLv);
    if (!mbgGame.config[`stage${stageID}`]) {
      return false;
    }
    arr[0] = newLv;
    if (arr[1] < arr[0]) {
      arr[1] = arr[0];
      this.pobj().m_Stat.setStatVal(`raid${raidIdx}`, newLv);
    }
    return true;
  }
  addRaidStageLv(raidIdx, n) {
    const dDBData = this.getDBData();
    const d = dDBData.d;
    const arr = d[raidIdx];
    if (!arr) {
      return false;
    }
    let newLv = arr[0] + n;
    newLv = Math.max(1, newLv);
    return this.setRaidStagelv(raidIdx, newLv);
  }
  isRaidStageUnlocked(raidIdx) {
    const dDBData = this.getDBData();
    const d = dDBData.d;
    return d[raidIdx] != null;
  }
  // 获取这个试炼副本对应的关卡表ID
  getRaidStageID(raidIdx, lv) {
    if (!lv) {
      return null;
    }
    const stageID = `2${utils.pad(raidIdx, 2)}${utils.pad(lv, 3)}`;
    return Number(stageID);
  }
  getRaidStageIdx(raidIdx, lv) {
    if (!lv) {
      return null;
    }
    const stageIdx = `${utils.pad(raidIdx, 2)}${utils.pad(lv, 3)}`;
    return Number(stageIdx);
  }
  getRaidStageConfig(raidIdx, lv) {
    const stageID = this.getRaidStageID(raidIdx, lv);
    return mbgGame.config[`stage${stageID}`];
  }
  isWarBegan() {
    return this.m_WarBegan;
  }
  validBeginRaidWar(dParam) {
    if (this.m_WarBegan) {
      return mbgGame.config.ErrCode.Raid_WarBegan;
    }
    // this.logInfo("beginRaidWar", dParam);
    const worldIdx = defines.raidWorldIdx;
    const raidIdx = dParam.raidIdx; // 哪一关
    const pobj = this.pobj();
    if (!(raidIdx >= 1 && raidIdx <= mbgGame.config.constTable.MaxRaidStageIdx)) {
      return mbgGame.config.ErrCode.Raid_WrongRaidIdx;
    }
    const dStageConfig = this.getRaidStageConfig(raidIdx, dParam.lv);
    if (_.isEmpty(dStageConfig)) {
      return mbgGame.config.ErrCode.Raid_NoStage;
    }
    const costSta = dStageConfig.costSta;
    if (pobj.getSta() < costSta) {
      return mbgGame.config.ErrCode.Raid_LackSta;
    }
    const schemeIdx = Math.round(dParam.schemeIdx); // 哪一个阵型
    const dScheme = pobj.m_WarCommon.getSchemeData(worldIdx, schemeIdx);
    if (_.isEmpty(dScheme)) {
      return mbgGame.config.ErrCode.Raid_NoCharaIDs;
    }
    const count = defines.countCharaIDs(dScheme.charaIDs);
    if (count === 0) {
      return mbgGame.config.ErrCode.Raid_NoCharaIDs;
    }
    return mbgGame.config.ErrCode.OK;
  }
  // 发送战场信息
  beginRaidWar(dParam) {
    const next = !!dParam.next;
    let lv = this.getRaidStageLv(dParam.raidIdx);
    lv = next ? lv + 1 : lv;
    lv = Math.min(lv, 45);
    lv = Math.max(1, lv);
    dParam.lv = lv;
    const errCode = this.validBeginRaidWar(dParam);
    if (errCode) {
      return errCode;
    }
    const pobj = this.pobj();
    const worldIdx = defines.raidWorldIdx;
    const raidIdx = Math.round(dParam.raidIdx); // 哪一关
    const schemeIdx = Math.round(dParam.schemeIdx); // 哪一个阵型
    const dStageConfig = this.getRaidStageConfig(raidIdx, lv);
    const dScheme = pobj.m_WarCommon.getSchemeData(worldIdx, schemeIdx);
    const dItem = {};
    dItem[defines.TEAM_LEFT] = mbgGame.WarData.packWarData_Item(dScheme.bag, pobj.m_ItemBag.getItemDBData());
    const dBotting = {};
    dBotting[defines.TEAM_LEFT] = dScheme.botting;
    this.m_WarRaidLv = lv;
    const stageID = this.getRaidStageID(raidIdx, lv);
    const dData = {
      ft: defines.getForceEndTime(worldIdx),
      worldIdx,
      stageID,
      stageIdx: this.getRaidStageIdx(raidIdx, lv),
      lt: "PVE",
      record: true,
      bg: dStageConfig.bg,
      shortid: pobj.getShortID(),
      item: dItem,
      team: {
        left: pobj.m_PVECtrl.getLeftTeamWarData(dScheme.charaIDs),
        right: pobj.m_PVECtrl.getMonsterTeamData(worldIdx, stageID),
      },
      botting: dBotting,
      auto: pobj.isBottingEnabled(),
      sendInit: true,
      send: true,
      cinfo: pobj.m_PVECtrl.getClientInfo({
        stageID,
        charaID: defines.getFirstCharaID(dScheme.charaIDs),
      }),
    };
    // this.logInfo("raidwar left:", JSON.stringify(dData.team.left));
    // this.logInfo("raidwar right:", JSON.stringify(dData.team.right));
    mbgGame.bsmgr.createWar(pobj, dData);
    mbgGame.bsmgr.beginWar(pobj, {
      worldIdx,
    });
    this.m_WarBegan = true;
    this.m_RaidIdx = raidIdx;
    return null;
  }
  onWarEnd(dData) {
    const worldIdx = defines.raidWorldIdx;
    this.m_WarBegan = false;
    // this.logInfo("raidwar end", dData);
    const pobj = this.pobj();
    const raidIdx = this.m_RaidIdx;
    const curLv = this.getRaidStageLv(raidIdx);
    const lv = this.m_WarRaidLv;
    const dStageConfig = this.getRaidStageConfig(raidIdx, lv);
    const stageID = this.getRaidStageID(raidIdx, lv);
    if (dData.result === defines.WarWin) {
      let dDrop = {};
      const costSta = dStageConfig.costSta;
      pobj.addSta(-costSta, null, 'raid');
      // pobj.logInfo("after boss drop", dDrop);
      pobj.m_PVECtrl.calStageDrop(stageID, dData.charaIDs, dDrop);
      const dCurStageConfig = this.getRaidStageConfig(raidIdx, lv);
      // pobj.logInfo("after stage drop", dDrop);
      const oldMaxLv = this.getRaidStageMaxLv(raidIdx);
      if (lv > curLv) {
        const ok = this.addRaidStageLv(raidIdx, 1);
        if (ok) {
          const newMaxLv = this.getRaidStageMaxLv(raidIdx);
          if (newMaxLv !== oldMaxLv) {
            const nPlayer = pobj.dataObj();
            nPlayer.updateRaidRank(raidIdx, newMaxLv);
            if (dCurStageConfig.firstDrop) {
              dDrop = pobj.concatAwardData(dDrop, dCurStageConfig.firstDrop);
              // pobj.logInfo("[raid] after stage first drop", dDrop);
            }
          }
        } else {
          pobj.logInfo("[raid] addRaidStageLv failed", raidIdx);
        }
      }
      const dWarResult = pobj.m_WarCommon.giveAwardForWar(worldIdx, dData.charaIDs, dDrop, "raid");
      pobj.sendCmd("warresult", dWarResult);
      this.onSendRaidData();
    } else {
      if (lv === curLv) {
        this.addRaidStageLv(raidIdx, -1);
        this.onSendRaidData();
      }
      pobj.sendCmd("warresult", {
        worldIdx,
        result: 2,
      });
    }
  }
}

module.exports = CRaidCtrl;