const CWarListener = require('./listener').CWarListener;
const defines = require('./w_defines');

// 自动发战斗过程中的各种事件给客户端
// 客户端根据事件内容去做表现
class CPVEListener extends CWarListener {
  CType() {
    "CPVEListener";
  }
  onAfterUseSkill(dData) {
    const unit = dData.unit;
    if (unit.team() === defines.TEAM_LEFT) {
      this.send2GS("AfterUseSkill", {
        ID: unit.ID(),
        skillID: dData.skillID,
        err: dData.err,
      });
    }
    if (dData.err) {
      this.send2CByTeam("Error", { err: dData.err, team: unit.team() });
    }
  }
  onDie(dData) {
    /* {
        unit:
    }*/
    const oWar = this.m_war;
    const unit = dData.unit;
    if (unit.team() === defines.TEAM_LEFT) {
      this.send2GS("CharaDie", {
        ID: unit.ID(),
      });
    } else {
      this.send2GS("MonsterDie", {
        mID: unit.ID(),
        instakill: dData.instakill,
        stageIdx: oWar.stageIdx(),
        stageID: oWar.stageID(),
        posIdx: unit.posIdx(),
        isBoss: unit.isBoss(),
      });
    }
  }
  onRevive(dData) {
    /* {
        unit:
    }*/
    const unit = dData.unit;
    if (unit.team() === defines.TEAM_LEFT) {
      this.send2GS("Revive", {
        ID: unit.ID(),
      });
    }
    this.send2C("Revive", dData);
  }
  onWarEnd(dData) {
    /* {
       result:
    }*/
    const oWar = this.m_war;
    oWar.setPVEWarEndData(dData);
    this.send2GS("WarEnd", dData);
    this.send2C("WarEnd", { result: dData.result });
  }
}

module.exports = CPVEListener;