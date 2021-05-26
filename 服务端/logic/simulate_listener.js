const CWarListener = require('./listener').CWarListener;
const defines = require('./w_defines');


class CSimulateListener extends CWarListener {
  CType() {
    "CSimulateListener";
  }
  send2C() { }
  onSaveBotting() { }
  onAction() { }
  onWarBegin(dData) {
    const oWar = this.m_war;
    dData.gsvar = oWar.getGSVar();
    this.send2GS("WarBegin", dData);
  }
  onWarEnd(dData) {
    const oWar = this.m_war;
    dData.gsvar = oWar.getGSVar();
    dData.costTime = oWar.costTime();
    dData.alives = [
      oWar.getAliveUnitsByTeam(defines.TEAM_LEFT).length,
      oWar.getAliveUnitsByTeam(defines.TEAM_RIGHT).length,
    ];
    this.send2GS("WarEnd", dData);
  }
}


module.exports = CSimulateListener;