const CWarListener = require('./listener').CWarListener;

class CPVPListener extends CWarListener {
    CType() {
        return "CPVPListener";
    }
    onSendEmote(dData) {
        this.send2CByTeam("Emote", dData);
    }
    onWarEnd(dData) {
        /* {
           result:
        }*/
        const oWar = this.m_war;
        dData.friendwar = oWar.isFriendWar();
        dData.realtime = oWar.isRealTimePVP();
        this.send2GS("WarEnd", dData);
        this.send2C("WarEnd", { result: dData.result });
    }
}

module.exports = CPVPListener;