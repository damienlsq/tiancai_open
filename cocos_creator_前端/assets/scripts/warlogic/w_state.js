const utils = require('./w_utils');
const CPfStBase = require('./w_st_pf_base');
const defines = require('./w_defines');
const StateData = require('./state/state_index');


class CState extends CPfStBase {
    constructor(sid, who, dData, skobj) {
        super(who, utils.deepClone(dData));
        this.m_ID = who.m_War.getNewObjID();
        this.m_SID = sid;
        this.m_SkillID = skobj.skillID();
        this.m_TplID = skobj.tplID();
        this.m_skobj = skobj;
        if (dData.lefttime) {
            this.setAutoRemove(dData.lefttime);
        }
        if (dData.round) {
            this.setAutoRemoveByRound(dData.round);
        }
    }
    CType() {
        return "CState";
    }
    causerID() {
        return this.m_CauserID;
    }
    // 这个状态是谁施加的
    causer() {
        if (!this.m_Owner) {
            return null;
        }
        const causerID = this.causerID();
        if (causerID) {
            return this.m_Owner.m_War.getUnitByObjID(causerID);
        }
        return null;
    }
    tplID() {
        return this.m_TplID;
    }
    tableData() {
        return StateData[this.m_SID];
    }
    getConfig() {
        const dStateConfig = mbgGame.config[`skillstate${this.m_SID}`];
        return dStateConfig;
    }
    activate(dOption, cr) {
        this.m_Owner.isDebug() && this.m_Owner.debuglog(this.m_Owner.name(), "状态激活， 状态编号=", this.stateID());
        this.trigger("激活状态", dOption);
        this.m_Option = {
            icon: dOption.icon,
            buffname: dOption.buffname,
            posType: dOption.posType,
        };
        if (!this.isEnded()) {
            this.startHeartbeat();
            this.addAutoRemoveTime(0.2); // 有心跳间隔，为了保证最后一次心跳能触发，稍微延长下删除时间
            this.sendStateActionPacket(dOption, cr);
        }
    }
    sendStateActionPacket(dOption, cr) {
        if (!dOption) {
            dOption = this.m_Option;
        }
        const dData = {
            tobjID: this.m_Owner.objID(),
            skillID: this.m_SkillID,
            tplID: this.m_TplID,
            stobjID: this.m_ID,
            stateID: this.m_SID,
            icon: dOption.icon,
            buffname: dOption.buffname,
            posType: dOption.posType,
        };
        if (this.isByRound()) {
            dData.lr = this.getLeftRound();
            if (cr) {
                dData.lr -= cr;
            }
        } else {
            dData.lt = this.getLeftTime();
        }
        if (this.tableData().notshow) {
            dData.notshow = 1;
        }
        this.m_Owner.pushAction(defines.Action.AddState, dData);
    }
    refreshState(cr) {
        const dData = {
            tobjID: this.m_Owner.objID(),
            skillID: this.m_SkillID,
            tplID: this.m_TplID,
            stobjID: this.m_ID,
            stateID: this.m_SID,
        };
        if (this.isByRound()) {
            dData.lr = this.getLeftRound();
            if (cr) {
                dData.lr -= cr;
            }
        } else {
            dData.lt = this.getLeftTime();
        }
        this.m_Owner.pushAction(defines.Action.RefreshState, dData);
    }
    skillID() {
        return this.m_SkillID;
    }
    stateID() {
        return this.m_SID;
    }
    getItemEffectVal() {
        const causer = this.causer();
        if (causer) {
            return causer.getItemEffectVal(this.skillID());
        }
        return this.m_Owner.getItemEffectVal(this.skillID());
    }
    getLeftTime() {
        if (this.hasCallOut("autoRemove")) {
            const frames = this.getRemainingTime("autoRemove");
            if (frames > 0) {
                return this.m_Owner.m_War.framesToSeconds(frames);
            }
            this.wlog("no frames", frames, "stateID", this.stateID());
        }
        return 0;
    }
    setAutoRemove(t) {
        if (typeof (t) !== "number") {
            this.m_Owner.wlogErr("[setAutoRemove] wrong param, t:", t);
            return;
        }
        this.m_RemoveTime = t;
        // this.m_Owner.wlog("[state setAutoRemove]", t);
        this.callOut(this.m_Owner.m_War.secondsToFrames(t), "autoRemove", this.end.bind(this, null, 'auto'));
    }
    addAutoRemoveTime(t) {
        if (this.m_RemoveTime == null) {
            return;
        }
        const iLeftTime = this.getLeftTime() || this.m_RemoveTime || 0;
        // this.wlog("addAutoRemoveTime", this.getLeftTime(), this.m_RemoveTime, t);
        this.setAutoRemove(iLeftTime + t);
    }
    setAutoRemoveByRound(round) {
        if (typeof (round) !== "number") {
            this.m_Owner.wlogErr("[setAutoRemoveByRound] wrong param, round:", round);
            return;
        }
        this.m_RemoveRound = this.m_Owner.round() + round;
    }
    isByRound() {
        return this.m_RemoveRound != null;
    }
    getRemoveRound() {
        return this.m_RemoveRound || 0;
    }
    getLeftRound() {
        return this.getRemoveRound() - this.m_Owner.round();
    }
    end(dOption, reason) {
        // this.m_Owner.wlog("[state end] stateID:", this.stateID(), "ID:", this.ID());
        if (this.m_End) {
            return;
        }
        // this.m_Owner.wlog("[state end] reason", reason, "m_SID:", this.m_SID, "ID:", this.m_ID, "owner:", this.m_Owner.objID(), this.m_Owner.posIdx());
        const owner = this.m_Owner;
        const dAction = {
            tobjID: owner.objID(),
            skillID: this.skillID(),
            stobjID: this.m_ID,
            stateID: this.m_SID,
        };
        this.trigger("状态结束", dOption);
        // trigger可能导致递归end，所以再判断一次
        if (this.m_End) {
            return;
        }
        owner.isDebug() && owner.debuglog(this.m_Owner.name(), "状态结束， 状态编号=", this.stateID());
        this.m_End = true;
        this.m_CauserID = null;
        this.m_Option = null;
        this.m_skobj = null;
        // debug
        this.m_Backup = {
            data: this.m_Data,
            owner: {
                ID: owner.ID(),
                name: owner.name(),
            },
        };
        this.removeAllCallout();
        this.remove();
        owner.removeState(this);
        if (dOption && dOption.dontPush) {
            dOption.actionData = dAction;
        } else {
            owner.pushAction(defines.Action.DelState, dAction);
        }
    }
}


module.exports = CState;