
const _u = require('./underscore');

class CPfStBase {
    constructor(who, dData) {
        this.m_Data = dData;
        this.m_Owner = who;
        this.m_TempDict = {};
    }
    CType() {
        return "CPfStBase";
    }
    ID() {
        return this.m_ID;
    }
    isEnded() {
        return this.m_End === true;
    }
    name() {
        return `[c${this.m_Owner && this.m_Owner.ID()}  ${this.CType()}${this.m_SID}]`;
    }
    type() {
        return this.tableData().Type || "";
    }
    attr() {
        return this.tableData().Attr;
    }
    setLv(lv) {
        this.m_Data.lv = lv;
    }
    needAoeK() {
        return false;
    }
    star() {
        if (this.m_Data && this.m_Data.s != null) {
            return this.m_Data && this.m_Data.s;
        }
        const lv = this.lv();
        const s = Math.floor(lv / 20);
        return s;
    }
    lv() {
        if (!this.m_Data) {
            mbgGame.logError(`lv() no m_Data, skillID ${this.m_SID} CType ${this.CType()}`);
            mbgGame.logError(`lv() m_Backup, ${this.m_Backup}`);
            if (this.m_End) {
                mbgGame.logError(`lv() ended ${this.m_SID}`);
            }
            if (this.m_Owner) {
                mbgGame.logError(`lv() m_Owner ${this.m_Owner.name()}`);
            }
        }
        return this.m_Data.lv || 1;
    }
    wlog(...args) {
        if (this.m_Owner) {
            this.m_Owner.wlog(...args);
        }
    }
    debuglog(...args) {
        if (this.m_Owner) {
            this.m_Owner.debuglog(...args);
        }
    }
    remove() {
        delete this.m_Owner;
        delete this.m_Data;
        delete this.m_TempDict;
        // //this.wlog("removed",this.m_ID)
    }
    trigger(sEvent, dOption) {
        if (this.isEnded()) {
            return;
        }
        if (!this.m_Owner) {
            mbgGame.logError(`[trigger] no m_Owner, skill: ${this.skillID()} tplID: ${this.tplID()} event: ${sEvent}`);
            return;
        }
        const who = (dOption && dOption.who) || this.m_Owner;

        let dEventData = this.tableData().Events; // 通用
        // this.m_Owner.isDebug() && this.m_Owner.debuglog(this.name(), "[事件 step1]", sEvent, dEventData);
        if (dEventData && dEventData[sEvent]) {
            this.m_Owner.isDebug() && this.m_Owner.debuglog(this.name(), "[onEvent]", sEvent, dEventData);
            this.onEvent(sEvent, dEventData, dOption);
        }
        if (this.isEnded()) {
            return;
        }
        dEventData = this.tableData().Events_Owner; // 施法者专用
        if (who.objID() === this.m_Owner.objID()) {
            if (dEventData && dEventData[sEvent]) {
                this.onEvent(sEvent, dEventData, dOption);
            }
        }
        if (this.isEnded()) {
            return;
        }
        dEventData = this.tableData().Events_NotOwner; // 被施法者专用
        if (who.objID() !== this.m_Owner.objID()) {
            if (dEventData && dEventData[sEvent]) {
                this.onEvent(sEvent, dEventData, dOption);
            }
        }
    }
    flag(sFlag) {
        return `${this.CType()}_${this.m_ID}_${sFlag}`;
    }
    startHeartbeat() {
        const dOption = this.checkOption({});
        const iHeartbeat = this.m_Owner.transParam(this.tableData().Heartbeat, dOption);
        if (iHeartbeat) {
            this.callOut(this.m_Owner.m_War.secondsToFrames(iHeartbeat), "Heartbeat", this.onHeartbeat);
        }
    }
    onHeartbeat() {
        this.m_Owner.isDebug() && this.m_Owner.debuglog(this.m_Owner.name(), "心跳", this.name());
        this.trigger("心跳");
        if (!this.isEnded()) {
            this.startHeartbeat();
        }
    }
    getRemainingTime(sFlag) {
        return this.m_Owner.getRemainingTime(this.flag(sFlag));
    }
    hasCallOut(sFlag) {
        return this.m_Owner.hasCallOut(this.flag(sFlag));
    }
    callOut(iDelay, sFlag, func, ...args) {
        const self = this;
        const wrapper = function() {
            func.apply(self, ...args);
        };
        // this.wlog("callOut", this.flag(sFlag));
        this.m_Owner.removeCallOut(this.flag(sFlag));
        this.m_Owner.callOut(iDelay, this.flag(sFlag), wrapper);
    }
    removeCallOut(sFlag) {
        if (!this.m_Owner) {
            return;
        }
        this.m_Owner.removeCallOut(this.flag(sFlag));
    }
    removeAllCallout() {
        if (!this.m_Owner) {
            return;
        }
        const flags = [];
        for (const sFlag in this.m_Owner.m_Flag2SchCount) {
            flags.push(sFlag);
        }
        const self = this;
        const prefix = `${this.CType()}_${this.m_ID}`;
        for (let i = 0; i < flags.length; i++) {
            const flag = flags[i];
            if (flag && flag.startsWith(prefix)) {
                self.m_Owner.removeCallOut(flag);
            }
        }
    }
    onEvent(sEvent, dEventData, dOption) {
        if (!this.m_Data) {
            return;
        }
        dOption = this.checkOption(dOption);
        // this.wlog("[onEvent]", sEvent, JSON.stringify(dEventData), dOption.tobj != null, dOption.tobjs && dOption.tobjs.length);
        this.m_Owner.isDebug() && this.m_Owner.debuglog(this.name(), "[事件 step2]", sEvent);
        let dEvent = dEventData[sEvent];
        if (!dEvent) {
            return;
        }
        let dEventList;
        if (dEvent) {
            if (!_u.isArray(dEvent)) {
                dEventList = [dEvent];
            } else {
                dEventList = dEvent;
            }
        }
        for (let i = 0; i < dEventList.length; i++) {
            dEvent = dEventList[i];
            if (this.isEnded()) {
                this.wlog(this.name(), "[事件] 自己已经结束了", sEvent, dEvent);
                break;
            }
            this.m_Owner.isDebug() && this.m_Owner.debuglog(this.name(), "处理事件", sEvent);
            if (dEvent["概率"]) {
                let p = dEvent["概率"];
                p = this.m_Owner.transParam(p, dOption);
                const iRan = this.m_Owner.m_War.randomInt(0, 10000);
                this.m_Owner.isDebug() && this.m_Owner.debuglog(this.name(), "[onEvent] 概率", "ran", iRan, "p", p);
                if (iRan > p * 10000) {
                    continue;
                }
            }
            this.m_Owner.isDebug() && this.m_Owner.debuglog(this.name(), "概率计算通过");
            if (!this.doCond(dEvent, dOption)) {
                this.m_Owner.isDebug() && this.m_Owner.debuglog(this.name(), "doCond失败");
                continue;
            }
            let aclist = dEvent["行为"];
            this.m_Owner.isDebug() && this.m_Owner.debuglog(this.name(), "执行行为", aclist);
            if (typeof (aclist) === "string") {
                this.doAction({
                    行为: aclist,
                }, dOption);
                continue;
            }
            if (typeof (aclist) === 'number') {
                aclist = [aclist];
            }
            let repeatTimes = dEvent["重复"];
            if (repeatTimes) {
                if (typeof (repeatTimes) === "function") {
                    repeatTimes = this.m_Owner.transParam(repeatTimes, dOption);
                }
            } else {
                repeatTimes = 1;
            }
            for (let k = 0; repeatTimes > 0 && k < repeatTimes; k++) {
                this.doActionList(aclist, dOption);
            }
        }
    }
    calParam(p, data) {
        if (p === "目标") {
            return data.tobj;
        }
        if (p === "目标已死") {
            return data.tobj && data.tobj.isDie();
        }
        if (p === "自己") {
            return this.m_Owner;
        }
        if (p === "施加者") {
            return this.causer();
        }
        if (p === "目标队伍") {
            if (!data.target) {
                return null;
            }
            return data.target.m_Team;
        }
        if (p === "我的队伍") {
            return this.m_Owner.m_Team;
        }
        if (p === "HP百分比") {
            return this.m_Owner.getHPPercent();
        }
        if (p === "目标HP百分比") {
            return data.tobj.getHPPercent();
        }
        if (p === "敌人数量") {
            return this.m_Owner.m_War.countUnits(this.m_Owner.enemyTeam());
        }
        const val = this.getTemp(p);
        if (val != null) {
            return val;
        }
        return p;
    }
    // 三个参数的式子
    // e.g.:
    // a + b
    // a * b
    // a < b
    calFomula(cond, data) {
        if (cond == null) {
            return cond;
        }
        let result;
        const p = [];
        for (let idx = 0; idx < 3; idx++) {
            const sub = cond[idx];
            if (typeof (sub) === "object") {
                p.push(this.calFomula(sub, data)); // recursive
            } else {
                p.push(this.calParam(sub, data));
            }
        }
        switch (p[1]) {
            case "+":
                result = p[0] + p[2];
                break;
            case "-":
                result = p[0] - p[2];
                break;
            case "*":
                result = p[0] * p[2];
                break;
            case "||":
                result = p[0] || p[2];
                break;
            case "/":
                result = p[0] / p[2];
                break;
            case "%":
                result = p[0] % p[2];
                break;
            case "<":
                result = p[0] < p[2];
                break;
            case ">":
                result = p[0] > p[2];
                break;
            case "<=":
                result = p[0] <= p[2];
                break;
            case ">=":
                result = p[0] >= p[2];
                break;
            case "==":
                result = (p[0] === p[2]);
                break;
            case "!=":
                result = (p[0] !== p[2]);
                break;
            default:
                break;
        }
        // this.wlog("calFomula", cond, p, result);
        // this.m_Owner.isDebug() && this.m_Owner.debuglog("calFomula", cond, p, result);
        return result;
    }
    validCondition(dCond, dOption) {
        // //this.wlog("validCondition", dCond);
        let result = false;
        let cond = null;
        if (typeof (dCond) === "function") {
            cond = dCond;
        } else {
            cond = dCond["判断"];
        }
        if (cond) {
            if (typeof (cond) === "function") {
                result = cond.call(this, dOption);
            } else {
                result = this.calFomula(cond, dOption);
            }
        }
        return result;
    }
    doCond(dAction, dOption) {
        if (dAction["条件"]) {
            this.m_Owner.isDebug() && this.m_Owner.debuglog("doCond", dAction);
            let condIDList = dAction["条件"];
            if (typeof (condIDList) === "function") {
                if (!this.validCondition(condIDList, dOption)) {
                    return false;
                }
            } else {
                if (typeof (condIDList) === "number") {
                    condIDList = [condIDList];
                }
                // //this.wlog("doCond condIDList",condIDList);
                for (let i = 0, len = condIDList.length; i < len; ++i) {
                    const condID = condIDList[i];
                    const dCond = this.tableData().Conds[condID];
                    if (!dCond) {
                        this.wlogErr("[doCond] no dCond", this.tableData());
                        return false;
                    }
                    // //this.wlog("doCond dOption",dOption);
                    if (!this.validCondition(dCond, dOption)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    doAction(dAction, dOption) {
        if (!this.doCond(dAction, dOption)) {
            return;
        }
        this.m_Owner.doAction(dAction, dOption);
    }
    doActionByIdx(idx, dOption) {
        if (this.m_End) {
            return;
        }
        dOption = this.checkOption(dOption);
        if (dOption) {
            dOption.obj = this;
        }
        const dAction = this.tableData().Actions[idx];
        if (!dAction) {
            this.m_Owner.wlogErr("No dAction, idx", idx, "skillID", this.skillID(), this.CType());
            return;
        }
        this.doAction(dAction, dOption);
    }
    doActionList(aclist, dOption) {
        if (this.m_End) {
            return;
        }
        dOption = this.checkOption(dOption);
        for (let i = 0, len = aclist.length; i < len; i++) {
            if (this.m_End) {
                break;
            }
            const idx = aclist[i];
            const dAction = this.tableData().Actions[idx];
            if (!dAction) {
                this.m_Owner.wlogErr("No dAction, idx", idx, "skillID", this.skillID(), this.CType());
                return;
            }
            dOption.obj = this; // 保证每次doAction的obj参数都是这个对象，防止被覆盖
            this.doAction(dAction, dOption);
        }
    }
    checkOption(dOption) {
        dOption = dOption || {};
        dOption.obj = this;
        return dOption;
    }
    setTemp(sName, val) {
        this.m_TempDict[sName] = val;
    }
    getTemp(sName) {
        return this.m_TempDict[sName];
    }
    addTemp(sName, addVal) {
        let val = null;
        addVal = addVal || 1;
        if (typeof (addVal) === "number") {
            val = this.m_TempDict[sName] || 0;
            this.m_TempDict[sName] = val + addVal;
        } else if (typeof (addVal) === "object") {
            val = this.m_TempDict[sName] || {};
            for (const k in addVal) {
                const v = val[k] || 0;
                val[k] = v + addVal[k];
            }
            this.m_TempDict[sName] = val;
            // //this.wlog("addTemp val",val);
        }
    }
    delTemp(sName) {
        if (this.m_TempDict[sName]) {
            delete this.m_TempDict[sName];
        }
    }
    onAddFrame() {

    }
    end() { }
}


module.exports = CPfStBase;