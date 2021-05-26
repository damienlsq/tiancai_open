
const CSimulateListener = require('./simulate_listener');

class CAssureListener extends CSimulateListener {
    CType() {
        "CAssureListener";
    }
    onWarBegin(dData) {
    }
    onWarEnd(dData) {
        const oWar = this.m_war;
        dData.gsvar = oWar.getGSVar();
        mbgGame.logger.info("assureonWarEnd", dData.gsvar);
        this.send2GS("WarEnd", dData);
    }
    onReplayError() {
    }
}


module.exports = CAssureListener;
