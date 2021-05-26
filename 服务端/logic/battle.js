
const defines = require('./w_defines');
const CBase = require('./base');
const clanCtrl = require('../ctrl/clan');

// ///////////////////////////////////////////////////////////////////////////
// 随便打打
// ////////////////////////////////////////////////////////////////////////////
class CBattleCtrl extends CBase {
  getDBData() {
    let dDBData = this.pobj().getVal('battle');
    if (!dDBData) {
      dDBData = {
        /*
        // 所有宝箱的数据，每个宝箱的id是唯一的
        data: {
          id: {
              idx: 宝箱类型编号
              t: 开始解锁时间戳
              b: 减掉的时长
              bl: 祝福了几次 初始null
              c: 联盟求助联盟 uuid,eventid
              f: free 是否免费秒箱
          }
        },
        i: idCount
        c: { pos:id }, 研究所的宝箱位置
        */
      };
      this.pobj().setValOnly('battle', dDBData);
      this.giveChest(1, true, true);
      this.giveChest(1, false, true);
    }
    return dDBData;
  }
  onInit() { }
  getChestData() {
    const dDBData = this.getDBData();
    if (!dDBData.data) {
      dDBData.data = {};
    }
    return dDBData.data;
  }
  getChestIdCount() {
    const dDBData = this.getDBData();
    if (dDBData.i == null) {
      dDBData.i = 0;
    }
    return dDBData.i;
  }
  getLabChestLimit() {
    return 4;
  }
  getLabChestDict() {
    const dDBData = this.getDBData();
    if (!dDBData.c) {
      dDBData.c = {};
    }
    return dDBData.c;
  }
  getLabChestNum() {
    let n = 0;
    const dData = this.getLabChestDict();
    for (const pos in dData) {
      if (dData[pos] > 0) {
        n += 1;
      }
    }
    return n;
  }
  isLabChest(id) {
    const dData = this.getLabChestDict();
    for (const pos in dData) {
      if (dData[pos] === id) {
        return true;
      }
    }
    return false;
  }
  newChestID() {
    const dDBData = this.getDBData();
    const dChest = this.getChestData();
    let maxId = this.getChestIdCount();
    // 如果最大id还没超过3位数，就再+1
    if (maxId < 100) {
      maxId += 1;
      while (dChest[maxId]) {
        maxId += 1;
      }
      dDBData.i = maxId;
      return maxId;
    }
    dDBData.i = 0;
    // 否则，从1开始找空位
    for (let id = 1; id < 100; id++) {
      if (!dChest[id]) {
        return id;
      }
    }
    return 0;
  }
  getChestDataByID(id) {
    const dChest = this.getChestData();
    return dChest[id];
  }
  hasChest(id) {
    return this.getChestDataByID(id) != null;
  }
  // 新宝箱
  createChest(idx, free) {
    const dChest = this.getChestData();
    const id = this.newChestID();
    dChest[id] = {
      idx,
      h: 0,
      s: 0,
      d: 0,
    };
    if (free) {
      dChest[id].f = 1;
    }
    return id;
  }
  // 删除宝箱
  deleteChest(id) {
    if (!this.hasChest(id)) {
      return false;
    }
    const dData = this.getLabChestDict();
    for (let pos = 0; pos < this.getLabChestLimit(); pos++) {
      if (dData[pos] === id) {
        dData[pos] = 0;
        break;
      }
    }
    const dChest = this.getChestData();
    delete dChest[id];
    this.onSendBattleData();
    return true;
  }
  onSendBattleData() {
    const dDBData = this.getDBData();
    this.pobj().sendCmd("battledata", dDBData);
  }
  // 该箱子已经发送联盟求助
  setClanRequest(chestID, clanUUID) {
    const dChestData = this.getChestDataByID(chestID);
    if (!dChestData) return;
    if (dChestData.c) {
      // 不允许重复帮助
      return;
    }
    dChestData.c = clanUUID;
    // this.logInfo("[battle.setClanRequest]", JSON.stringify(dChestData));
    this.onSendBattleData();
  }
  // 箱子祝福
  blessChest(id) {
    const dChestData = this.getChestDataByID(id);
    if (!dChestData) return false;
    if (dChestData.bl && dChestData.bl >= mbgGame.config.constTable.clanBlessTimes) {
      // 加满了
      return false;
    }
    dChestData.bl = dChestData.bl || 0;
    dChestData.bl += 1;
    // this.logInfo("[battle.blessChest]", id, dChestData.bl);
    this.onSendBattleData();
    return true;
  }
  // 减少箱子时间 t 单位 秒
  reduceChestTime(id) {
    const dChestData = this.getChestDataByID(id);
    if (!dChestData) return;
    const dConfig = mbgGame.config.constTable[`clanchest${dChestData.idx}`];
    dChestData.b = dChestData.b || 0;
    if (dChestData.b < dConfig[1]) {
      let b = dChestData.b || 0;
      b += 5 * 60;
      b = Math.min(b, dConfig[1]);
      dChestData.b = b;
      //  this.logInfo("[battle.dChestData]", JSON.stringify(dChestData));
      this.onSendBattleData();
    }
  }
  isUnlockingChest() {
    const dChest = this.getChestData();
    for (const id in dChest) {
      if (dChest[id].t) {
        return true;
      }
    }
    return false;
  }
  // 开始解锁倒计时
  unlockChest(id) {
    if (!this.hasChest(id)) {
      return false;
    }
    // 同时只能解锁一个宝箱（以后可能会改成多个）
    if (this.isUnlockingChest()) {
      return false;
    }
    if (!this.isLabChest(id)) {
      return false;
    }
    const dChestData = this.getChestDataByID(id);
    dChestData.t = moment().unix();
    this.onSendBattleData();
    return true;
  }
  // 手动领取宝箱
  * recvChest(id, fast) {
    if (!this.hasChest(id)) {
      return mbgGame.config.ErrCode.Battle_ChestNotOpening;
    }
    const dChestData = this.getChestDataByID(id);
    const chestName = `clanchest${dChestData.idx}`;
    const clanUUID = dChestData.c;
    const pobj = this.pobj();
    const dConfig = mbgGame.config.constTable[chestName];
    const now = moment().unix();
    const t = dChestData.t || now;
    const lefttime = Math.max(0, (t + dConfig[0] - (dChestData.b || 0)) - now);
    let needDiamonds = Math.ceil(mbgGame.config.constTable.TCBattleFastRatio * lefttime / 3600);
    if (dChestData.f) { // free
      needDiamonds = 0;
    }
    if (lefttime > 0) {
      if (!fast) {
        return mbgGame.config.ErrCode.Battle_ChestWait;
      }
      // 判断钻石
      if (!pobj.hasDiamonds(needDiamonds)) {
        return mbgGame.config.ErrCode.LackDiamond;
      }
    }
    pobj.addDiamonds(-needDiamonds, null, 'fastChest');
    const dChest = this.getChestData();
    delete dChest[id];
    const dDataLab = this.getLabChestDict();
    for (let pos = 0; pos < this.getLabChestLimit(); pos++) {
      if (dDataLab[pos] === id) {
        dDataLab[pos] = 0;
        break;
      }
    }
    this.onSendBattleData();
    // 给奖励
    const dAward = mbgGame.common.utils.deepClone(mbgGame.config.award[chestName]);
    dAward.bl = dChestData.bl;
    // 产出的斗币数量 随便打打宝箱开箱所需分钟 * 英雄升级表中的斗币基础产出
    const avglv = pobj.getAvgLv();
    const dHeroup = mbgGame.config[`heroup${avglv}`];
    dAward.mat = Math.round(dConfig[0] / 60) * dHeroup.matRate;
    // 客户端播放spine的皮肤编号
    dAward.id = `chest${dChestData.idx === 1 ? 1 : 4}`;
    dAward.chestType = mbgGame.config.constTable.CWType4;
    pobj.giveAward(dAward, chestName);
    if (clanUUID) {
      // 通知联盟，删除帮助请求
      yield clanCtrl.chestISOpen(clanUUID, pobj.dataObj().getUUID(), id);
    }
    return null;
  }
  isWarBegan() {
    return this.m_WarBegan;
  }
  setWarBegan(b) {
    this.m_WarBegan = b;
  }
  createWar(dPVPData) {
    const pobj = this.pobj();
    const nPlayer = pobj.dataObj();
    const dLeftTeamData = mbgGame.WarData.getPVPTeamWarData(dPVPData.attacker.charaIDs, dPVPData.attacker.team);
    const dRightTeamData = mbgGame.WarData.getPVPTeamWarData(dPVPData.defender.charaIDs, dPVPData.defender.team);
    const worldIdx = defines.battleWorldIdx;
    const dItem = {};
    const dAttackerItem = dPVPData.attacker.item;
    const dDefenderItem = dPVPData.defender.item;
    dItem[defines.TEAM_LEFT] = mbgGame.WarData.packWarData_Item(dAttackerItem.bag, dAttackerItem.data);
    dItem[defines.TEAM_RIGHT] = mbgGame.WarData.packWarData_Item(dDefenderItem.bag, dDefenderItem.data);
    const dInfo = defines.getPVPInfoForClient(dPVPData, pobj);
    dInfo.mydesc = pobj.describe();
    dInfo.targetdesc = dPVPData.defender.desc;
    const dBotting = {};
    dBotting[defines.TEAM_LEFT] = dPVPData.attacker.botting;
    dBotting[defines.TEAM_RIGHT] = dPVPData.defender.botting;
    const dData = {
      ft: defines.getForceEndTime(worldIdx),
      worldIdx,
      lt: "",
      record: true,
      bg: mbgGame.config.constTable.PVPBg,
      shortid: nPlayer.getShortID(),
      targetUUID: dPVPData.defender.uuid,
      item: dItem,
      team: {
        left: dLeftTeamData,
        right: dRightTeamData,
      },
      botting: dBotting,
      auto: pobj.isBottingEnabled(),
      cinfo: dInfo,
      sendInit: true,
      send: true,
    };
    mbgGame.bsmgr.createWar(pobj, dData);
    mbgGame.bsmgr.beginWar(pobj, {
      worldIdx,
    });
    this.setWarBegan(true);
    this.m_PVPData = dPVPData;
  }
  onWarEnd(dData) {
    // this.logInfo("battle war end", dData);
    const pobj = this.pobj();
    const worldIdx = defines.battleWorldIdx;
    this.m_WarBegan = false;
    const dPVPData = this.m_PVPData;
    delete this.m_PVPData;
    if (dData.result === defines.WarWin) {
      pobj.addSta(-mbgGame.config.constTable.TCBattleSta, null, 'battle');
      const dDrop = {};
      const avgLvTarget = dPVPData.defender.avglv;
      const rID = dPVPData.defender.rID;
      const dBattleReward = mbgGame.config.tcbattle[rID];
      const dHeroup = mbgGame.config[`heroup${avgLvTarget}`];
      let dRewardChest = null;
      if (dHeroup) {
        let mat = dHeroup.rewardMat;
        let gem = dHeroup.rewardGem;
        let coins = dHeroup.rewardCoin;
        let exp = dHeroup.rewardExp;
        let diamonds = 0;
        const items = [];
        mbgGame.logger.info("battle", rID, dBattleReward && dBattleReward.reward, dBattleReward && dBattleReward.c);
        if (dBattleReward && dBattleReward.reward && dBattleReward.c) {
          const c = dBattleReward.c;
          const type = dBattleReward.reward;
          switch (type) {
            case 'mat':
              mat = Math.round(mat + (dHeroup.matRate * c));
              break;
            case 'exp':
              exp *= c;
              exp = Math.round(exp);
              break;
            case 'coins':
              coins = Math.round(coins + (dHeroup.coinsRate * c));
              break;
            case 'diamonds':
              diamonds = c;
              break;
            case 'gem':
              gem *= c;
              break;
            case 'q3':
            case 'q4':
              {
                const dWeightForBase = pobj.m_ItemBag.getRewardItemWeightDict(mbgGame.config.constTable.CWType1);
                const itemID = defines.chooseOne(dWeightForBase);
                items.push([itemID, 1, +type[1]]);
                break;
              }
            case 'chest1':
            case 'chest4':
              if (this.getLabChestNum() < this.getLabChestLimit()) {
                const idx = +type[5];
                dRewardChest = this.giveChest(idx);
              }
              break;
            default: break;
          }
        }
        dDrop.charaexp = {};
        for (let i = 0; i < dPVPData.attacker.charaIDs.length; i++) {
          const charaID = dPVPData.attacker.charaIDs[i];
          if (!charaID) {
            continue;
          }
          dDrop.charaexp[charaID] = exp;
        }
        dDrop.mat = Math.round(mat);
        dDrop.gem = Math.round(gem);
        dDrop.coins = Math.round(coins);
        dDrop.items = items;
        if (diamonds > 0) dDrop.diamonds = Math.round(diamonds);
      }
      const dWarResult = pobj.m_WarCommon.giveAwardForWar(worldIdx,
        dPVPData.attacker.charaIDs, dDrop, "tcbattle");
      if (dRewardChest) {
        dWarResult.reward.battle = dRewardChest;
      }
      dWarResult.reward.rtype = dBattleReward && dBattleReward.reward;
      pobj.sendCmd("warresult", dWarResult);
      pobj.m_Stat.addStatVal("tcbattleWin", 1);
    } else {
      pobj.sendCmd("warresult", {
        worldIdx,
        result: 2,
      });
    }
    const nPlayer = pobj.dataObj();
    mbgGame.TCBattleMgr.onWarResult(nPlayer, dData.result, dPVPData);
  }
  giveChest(idx, free, dontSend) {
    if (idx > 0) {
      const id = this.createChest(idx, free);
      const dChestDict = this.getLabChestDict();
      for (let pos = 0; pos < this.getLabChestLimit(); pos++) {
        if (!dChestDict[pos]) {
          dChestDict[pos] = id;
          break;
        }
      }
      if (!dontSend) this.onSendBattleData();
      return { type: 1, id, idx };
    }
    return null;
  }
}

module.exports = CBattleCtrl;