const co = require('co');
const Cache = require('../gameserver/cache');
const clanCtrl = require('./clan');
const defines = require('../logic/w_defines');

/*

    友谊赛管理器
    TODO: 支持跨GS友谊赛

*/


const CodeType = defines.CodeType;

const NInviteCode2UUID = mbgGame.common.db_mgr.CExpireNormal.extend({
  // key: code
  FuncType: "frdwar",
  SubType: "code2uuid",
});

const NInviteUUID2code = mbgGame.common.db_mgr.CExpireNormal.extend({
  // key: {code,type}
  FuncType: "frdwar",
  SubType: "uuid2code",
});


const NInviteCodeSet = mbgGame.common.db_mgr.CSet.extend({
  // key: all
  FuncType: "frdwar",
  SubType: "code",
});

class FriendWarCtrl {
  constructor() {
    this.m_UUID2Data = {};
  }
  * makeCode(uuid, type) {
    if (this.m_UUID2Data[uuid]) {
      // 已经开打了
      return null;
    }
    if (type == null) {
      type = CodeType.Normal;
    }
    if ([
      CodeType.Normal,
      CodeType.Clan1,
      CodeType.Clan2,
    ].indexOf(type) === -1) {
      return null;
    }
    const codeSet = this.getCodeSet();
    this.deleteCode(uuid);
    let code = yield codeSet.spop();
    if (!code) {
      for (let c = 1; c <= 999; c++) {
        if (c >= 100) {
          c = `${c}`;
        } else if (c >= 10) {
          c = `0${c}`;
        } else {
          c = `00${c}`;
        }
        yield codeSet.sadd(c);
      }
      code = yield codeSet.spop();
    }
    if (!code) {
      mbgGame.logError("no invite code");
      return null;
    }
    const nInviteCode2UUID = new NInviteCode2UUID(code);
    const result = yield nInviteCode2UUID.set(uuid);
    if (result !== "OK") {
      return null;
    }
    this.onUpdateCode(uuid, code);
    // 半小时
    yield nInviteCode2UUID.expire(mbgGame.config.friendWarCodeExpireTime || 1800);
    const nInviteUUID2code = new NInviteUUID2code(uuid);
    yield nInviteUUID2code.set(JSON.stringify({ code, type }));
    yield nInviteUUID2code.expire(mbgGame.config.friendWarCodeExpireTime || 1800);
    return code;
  }
  * enterCode(nPlayer, code) {
    mbgGame.logger.info("enterCode:", code);
    const pobj = nPlayer.getPlayerLogic();
    const netCtrl = nPlayer.getNetCtrl();
    const nInviteCode2UUID = new NInviteCode2UUID(code);
    const uuidA = yield nInviteCode2UUID.get();
    if (!uuidA) {
      netCtrl.sendWarning(nPlayer.getString('wronginvidecode'));
      return;
    }
    if (uuidA === pobj.getUUID()) {
      netCtrl.sendWarning(nPlayer.getString('wronginvidecode'));
      return;
    }
    this.deleteCode(pobj.getUUID());
    mbgGame.logger.info("enterCode, inviter found", code);
    const type = yield this.getCodeType(uuidA);
    // 到了这里，已经确定邀请码存在，那么先看看是不是同个GS的玩家，否则发送给目标GS去处理
    const nPlayerA = Cache.get(`Player:${uuidA}`);
    const nPlayerB = nPlayer;
    const pobjB = pobj;
    const uuidB = pobjB.getUUID();
    if (!nPlayerA) {
      // 不同服
      const serverName = yield mbgGame.serverCtrl.getPlayerServer(uuidA);
      if (mbgGame.debuglog) {
        mbgGame.logger.info("enterCode, different GS, serverName:", serverName);
      }
      if (serverName) {
        const redis = mbgGame.common.db_mgr.getDB("redis-stat");
        const dDefender = this.getAttackerData(nPlayerB, pobjB.m_PVPCtrl.getFriendWarSchemeIdx(), type);
        const [FSId, cid] = netCtrl.getFwdPair();
        if (mbgGame.debuglog) {
          mbgGame.logger.info("enterCode, publish to target GS, serverName:", mbgGame.server_config.HOSTNAME, FSId, cid);
        }
        mbgGame.logger.info("enterCode, frdwarBegin", code);
        yield redis.publish(`${mbgGame.ProjectName}:mbg_stat`,
          `frdwarBegin ${serverName} ${code} ${uuidA} ${uuidB} ${mbgGame.server_config.HOSTNAME} ${FSId} ${cid} ${JSON.stringify(dDefender)}`);
      }
      return;
    }
    const pobjA = nPlayerA.getPlayerLogic();
    mbgGame.logger.info("create FrdWar", uuidA, uuidB);
    yield this.beginLocalWar(uuidA, pobjA.m_PVPCtrl.getFriendWarSchemeIdx(), uuidB, pobjB.m_PVPCtrl.getFriendWarSchemeIdx());
  }
  * bindEventID(uuidA, code, eventID) {
    const nInviteUUID2code = new NInviteUUID2code(uuidA);
    const sData = yield nInviteUUID2code.get();
    if (sData) {
      const dData = JSON.parse(sData);
      dData.eventID = eventID;
      yield nInviteUUID2code.set(JSON.stringify(dData));
    }
  }
  * beginRemoteWar(code, uuidA, uuidB, host, FSId, cid, dDefender) {
    FSId = +FSId;
    cid = +cid;
    mbgGame.logger.info("beginRemoteWar", code, uuidA, uuidB);
    const nInviteCode2UUID = new NInviteCode2UUID(code);
    const _uuidA = yield nInviteCode2UUID.get();
    if (!_uuidA || _uuidA !== uuidA) {
      mbgGame.logger.info("wrong code");
      return false;
    }
    const dCodeData = yield this.getCodeData(uuidA);
    const type = dCodeData.type;
    const eventID = dCodeData.eventID;
    this.deleteCode(uuidA);
    this.deleteCode(uuidB);
    this.onUpdateCode(uuidA, null);
    const nPlayerA = Cache.get(`Player:${uuidA}`);
    if (!nPlayerA) {
      return false;
    }
    if (mbgGame.Arena.isPVPing(nPlayerA)) {
      return false;
    }
    if (this.isPVPing(nPlayerA)) {
      return false;
    }
    const pobjA = nPlayerA.getPlayerLogic();
    const dAttacker = this.getAttackerData(nPlayerA, pobjA.m_PVPCtrl.getFriendWarSchemeIdx(), type);
    const dInfo = {
      uuidA,
      uuidB,
      nameA: pobjA.nickName(),
      nameB: dDefender.name,
      type,
      eventID,
    };
    this.m_UUID2Data[uuidA] = dInfo;
    this.createWar(pobjA, dAttacker, dDefender, host, FSId, cid, type);
    return true;
  }
  * getCodeData(uuid) {
    const nInviteUUID2code = new NInviteUUID2code(uuid);
    const sData = yield nInviteUUID2code.get();
    if (sData) {
      return JSON.parse(sData);
    }
    return null;
  }
  * getCode(uuid) {
    const dData = yield this.getCodeData(uuid);
    if (dData) {
      return dData.code;
    }
    return null;
  }
  * getCodeType(uuid) {
    const dData = yield this.getCodeData(uuid);
    if (dData) {
      return dData.type;
    }
    return null;
  }
  deleteCode(uuid) {
    const self = this;
    co(function* () {
      const code = yield self.getCode(uuid);
      if (code) {
        // 把邀请码加到池里
        const codeSet = self.getCodeSet();
        yield codeSet.sadd(code);
        const nInviteUUID2code = new NInviteUUID2code(uuid);
        yield nInviteUUID2code.del();
        const nInviteCode2UUID = new NInviteCode2UUID(code);
        yield nInviteCode2UUID.del();
      }
    }).catch((err, result) => {
      mbgGame.logger.info("[deleteCode] error ", err, result);
    });
  }
  getCodeSet() {
    if (!this.m_CodeSet) {
      this.m_CodeSet = new NInviteCodeSet("all");
    }
    return this.m_CodeSet;
  }
  playerOffline(pobj) {
    const uuid = pobj.getUUID();
    this.cleantWarData(uuid);
    this.deleteCode(uuid);
  }
  onUpdateCode(uuidA, code) {
    const nPlayerA = Cache.get(`Player:${uuidA}`);
    nPlayerA.sendCmd("frdcode", {
      code,
    });
  }
  isPVPing(nPlayer) {
    return this.m_UUID2Data[nPlayer.getUUID()] != null;
  }
  isLeftTeam(nPlayer) {
    const uuid = nPlayer.getUUID();
    const dData = this.m_UUID2Data[uuid];
    return dData.uuidA === uuid;
  }
  getAttackerData(nPlayer, schemeIdx, codeType) {
    return mbgGame.Arena.getAttackerData(nPlayer, schemeIdx, null, codeType === CodeType.Clan2 ? mbgGame.config.constTable.FixedLvConfig : null);
  }
  pobjAttacker(nPlayer) {
    const uuid = nPlayer.getUUID();
    const dData = this.m_UUID2Data[uuid];
    const nPlayerA = Cache.get(`Player:${dData.uuidA}`);
    return nPlayerA.getPlayerLogic();
  }
  // 同GS才调用这个
  validCreateWar(uuidA, uuidB) {
    const nPlayerA = Cache.get(`Player:${uuidA}`);
    if (!nPlayerA) {
      return false;
    }
    const nPlayerB = Cache.get(`Player:${uuidB}`);
    if (!nPlayerB) {
      return false;
    }
    if (mbgGame.Arena.isPVPing(nPlayerA)) {
      return false;
    }
    if (mbgGame.Arena.isPVPing(nPlayerB)) {
      return false;
    }
    return true;
  }
  // uuidA是发起邀请的那方
  * beginLocalWar(uuidA, schemeIdxA, uuidB, schemeIdxB) {
    const dCodeData = yield this.getCodeData(uuidA);
    const type = dCodeData.type;
    const eventID = dCodeData.eventID;
    // 清除验证码记录
    this.deleteCode(uuidA);
    this.deleteCode(uuidB);
    this.onUpdateCode(uuidA, null);
    if (!this.validCreateWar(uuidA, uuidB)) {
      mbgGame.logger.info("validCreateWar failed");
      return;
    }
    const nPlayerA = Cache.get(`Player:${uuidA}`);
    const nPlayerB = Cache.get(`Player:${uuidB}`);
    const pobjA = nPlayerA.getPlayerLogic();
    const pobjB = nPlayerB.getPlayerLogic();
    const dAttacker = this.getAttackerData(nPlayerA, schemeIdxA, type);
    const dDefender = this.getAttackerData(nPlayerB, schemeIdxB, type);
    const dInfo = {
      uuidA,
      uuidB,
      nameA: pobjA.nickName(),
      nameB: pobjB.nickName(),
      type,
      eventID,
    };
    this.m_UUID2Data[uuidA] = dInfo;
    this.m_UUID2Data[uuidB] = dInfo;
    const [FSId, cid] = nPlayerB.getNetCtrl().getFwdPair();
    this.createWar(pobjA, dAttacker, dDefender, mbgGame.server_config.HOSTNAME, FSId, cid, type);
  }
  createWar(pobjA, dAttacker, dDefender, host, FSId, cid, codeType) {
    const dPVPData = {};
    dPVPData.friendwar = true;
    dPVPData.realtime = true;
    dPVPData.noEnchant = codeType === CodeType.Clan2;
    dPVPData.defenderFwdPair = [host, FSId, cid];
    dPVPData.attacker = dAttacker;
    dPVPData.defender = dDefender;
    pobjA.m_PVPCtrl.createPVPWar(dPVPData);
  }
  cleantWarData(uuid) {
    const dData = this.m_UUID2Data[uuid];
    if (!dData) {
      return;
    }
    delete this.m_UUID2Data[uuid];
    if (this.m_UUID2Data[dData.uuidB]) {
      delete this.m_UUID2Data[dData.uuidB];
    }
  }
  onWarEnd(pobj, dResultData) {
    const dData = this.m_UUID2Data[pobj.getUUID()];
    if (!dData) {
      mbgGame.logger.info("onWarEnd no dData");
      return;
    }
    const type = dData.type;
    const eventID = dData.eventID;
    delete this.m_UUID2Data[dData.uuidA];
    delete this.m_UUID2Data[dData.uuidB];
    const nPlayerA = Cache.get(`Player:${dData.uuidA}`);
    const nPlayerB = Cache.get(`Player:${dData.uuidB}`);
    const dReuslt = {
      worldIdx: 99,
      friendwar: true,
      result: dResultData.result,
    };
    // todo 这里应该保存双方的名字
    if (type === CodeType.Clan1 || type === CodeType.Clan2) {
      let winnerName = dData.nameA;
      let loserName = dData.nameB;
      let isDraw = false;
      if (dReuslt.result === 2) {
        winnerName = dData.nameB;
        loserName = dData.nameA;
      } else if (dReuslt.result === 3) {
        // 打平
        isDraw = true;
        winnerName = dData.nameB;
        loserName = dData.nameA;
      }
      clanCtrl.friendWarResult(pobj.dataObj(), winnerName, loserName, isDraw, dResultData.replayUUID, eventID, type);
    }
    if (nPlayerA) {
      nPlayerA.sendCmd("warresult", dReuslt);
      if (dReuslt.result === 1) {
        const pobjA = nPlayerA.getPlayerLogic();
        pobjA.m_Stat.addStatVal("frdWin", 1);
      }
    }
    // 如果没打平 那么翻转战斗结果发给另一个玩家
    if (dReuslt.result === 1) {
      dReuslt.result = 2;
    } else if (dReuslt.result === 2) {
      dReuslt.result = 1;
    }
    if (nPlayerB) {
      nPlayerB.sendCmd("warresult", dReuslt);
      if (dReuslt.result === 1) {
        const pobjB = nPlayerB.getPlayerLogic();
        pobjB.m_Stat.addStatVal("frdWin", 1);
      }
    } else {
      // 在别的服或者下线了
      co(function* () {
        const redis = mbgGame.common.db_mgr.getDB("redis-stat");
        mbgGame.logger.info("redis.publish frdwarEnd", dData.uuidB, dReuslt);
        yield redis.publish(`${mbgGame.ProjectName}:mbg_stat`,
          `frdwarEnd ${dData.uuidB} ${JSON.stringify(dReuslt)}`);
      }).catch((err, result) => {
        mbgGame.logger.info("publish frdwarEnd error ", err, result);
      });
    }
  }
  onRemoteWarEnd(uuidB, dReuslt) {
    mbgGame.logger.info("onRemoteWarEnd", uuidB, dReuslt);
    const nPlayerB = Cache.get(`Player:${uuidB}`);
    if (nPlayerB) {
      nPlayerB.sendCmd("warresult", dReuslt);
      if (dReuslt.result === 1) {
        const pobjB = nPlayerB.getPlayerLogic();
        pobjB.m_Stat.addStatVal("frdWin", 1);
      }
    }
  }
}

module.exports = {
  FriendWarCtrl,
};