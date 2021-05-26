const timer = require('./w_timer');

class CBase extends timer.CSchedule {
    CType() {
        return "CBase";
    }
    registerListener(oListener) {
        this.m_Listener = oListener;
    }
    getListener() {
        return this.m_Listener;
    }
    // 数据容器（存盘）
    addDataObj(name, obj) {
        if (!this.m_DataObjDict) {
            this.m_DataObjDict = {};
        }
        this.m_DataObjDict[name] = obj;
    }
    getDataObj(name) {
        if (!this.m_DataObjDict) {
            return null;
        }
        return this.m_DataObjDict[name];
    }
    save() {
        const dataObj = this.dataObj();
        return dataObj.data();
    }
    data() {
        const dataObj = this.dataObj();
        return dataObj.data();
    }
    setPlayer(pobj) {
        this.m_Player = pobj;
    }
    getPlayer() {
        return this.m_Player;
    }
};


module.exports = CBase;