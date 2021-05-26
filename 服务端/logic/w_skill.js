const utils = require('./w_utils');
const CPfStBase = require('./w_st_pf_base');
const defines = require('./w_defines');
const SkillTplData = require('./skill_tpl/skill_index');

// 单位可以同时执行多个技能，每个技能可以有多个实例（可选）

class CSkill extends CPfStBase {
    constructor(sid, who, dData) {
        super(who, utils.deepClone(dData));
        this.m_ID = who.m_War.getNewObjID();
        this.m_SID = sid;
        if (!this.m_Owner) {
            mbgGame.logError(`[CSkill.constructor] no owner ${this.m_SID}`);
        }
    }
    CType() {
        return "CSkill";
    }
    activate(dOption) {
        this.trigger("发动技能", dOption);
        const dConfig = this.m_Owner.getMTplConfig();
        const t = defines.transAniFrames2Second(dConfig.MainFrame + dConfig.FlyFrames);
        if (t <= 0) {
            this.activate_real();
        } else {
            this.callOut(this.m_Owner.m_War.secondsToFrames(t), "activate_real", this.activate_real);
        }
    }
    activate_real() {
        // this.m_Owner.wlog("[activate_real]", this.skillID());
        this.trigger("执行技能效果");
        if (this.isEnded()) {
            return;
        }
        if (this.duration() > 0) {
            this.callOut(this.m_Owner.m_War.secondsToFrames(this.duration()), "onEnd", this.end);
        } else if (this.isActiveSkill() && !this.isHaloSkill()) {
            // 没有持续时间又是主动技能且不是光环技能，可以结束掉了
            this.end();
        }
        if (!this.isEnded()) {
            this.startHeartbeat();
        }
    }
    setDuration(duration) {
        this.m_Duration = duration;
    }
    duration() {
        return this.m_Duration;
    }
    tplID() {
        if (!this.m_Data) {
            mbgGame.logError(`[skill] no m_Data, SID: ${this.m_SID}, ID: ${this.m_ID}, owner: ${this.m_Owner != null}`);
        }
        return this.m_Data.TplID;
    }
    tableData() {
        return SkillTplData[this.tplID()];
    }
    skillConfig() {
        return mbgGame.config[`skill${this.skillID()}`];
    }
    getAoeK(tobjNum) {
        const aoeK = (((5 - tobjNum) * mbgGame.config.constTable.aoeK) + 1) || 1;
        // this.wlog("aoeK", aoeK, this.skillID());
        return aoeK;
    }
    needAoeK() {
        const dConfig = mbgGame.config[`tplskill${this.tplID()}`];
        if (dConfig) {
            return !!dConfig.aoeKEnabled;
        }
        return false;
    }
    getItemEffectVal() {
        return this.m_Owner.getItemEffectVal(this.skillID());
    }
    causerID() {
        return null;
    }
    causer() {
        return null;
    }
    skillID() {
        return this.m_SID;
    }
    isActiveSkill() {
        return this.type() !== "被动";
    }
    subType() {
        return this.tableData().SubType || "";
    }
    isHaloSkill() {
        return this.subType() === "光环";
    }
    attr() {
        return this.tableData().Attr;
    }
    end() {
        // this.m_Owner.wlog("[skill end]", this.m_Owner.ID(), this.m_Owner.objID(), this.m_End, this.skillID());
        if (this.m_End) {
            return;
        }
        if (this.m_Stobjs) {
            for (let i = 0; i < this.m_Stobjs.length; i++) {
                const stobj = this.m_Stobjs[i];
                stobj.end(null, 'skill.end');
            }
            this.m_Stobjs = null;
        }
        // this.m_Owner.wlog("[skill end]", this.m_Owner.ID(), this.m_Owner.objID(), this.skillID(), this.m_ID);
        this.trigger("技能结束");
        this.m_End = true;
        this.removeAllCallout();
        const owner = this.m_Owner;
        if (!owner) {
            mbgGame.logError(`[CSkill.end] no owner ${this.m_SID}`);
        }
        owner.onSkillEnd(this);
        this.remove();
    }
    cacheTargets(tobjs) {
        this.cachedTargets = tobjs;
    }
    // 调用者做验证
    getCacheTargets() {
        return this.cachedTargets;
    }
    refState(stobj) {
        if (!this.m_Stobjs) {
            this.m_Stobjs = [];
        }
        if (this.m_Stobjs.indexOf(stobj) === -1) {
            this.m_Stobjs.push(stobj);
        }
    }
    skillIdx() {
        return this.m_Owner.getSkillIdx(this.skillID());
    }

    setTempByState(stateID, sName, val) {
        this.setTemp(`s${stateID}_${sName}`, val);
        // this.wlog("setTempByState", stateID, sName, this.getTempByState(stateID, sName));
    }
    getTempByState(stateID, sName) {
        return this.getTemp(`s${stateID}_${sName}`);
    }
    addTempByState(stateID, sName, addVal) {
        this.addTemp(`s${stateID}_${sName}`, addVal);
        //  this.wlog("addTempByState", stateID, sName, this.getTempByState(stateID, sName));
    }
    delTempByState(stateID, sName) {
        this.delTemp(`s${stateID}_${sName}`);
        // this.wlog("delTempByState", stateID, sName, this.getTempByState(stateID, sName));
    }
    delAllTempByState(stateID) {
        const keys = [];
        for (const k in this.m_TempDict) {
            if (k.startsWith(`s${stateID}`)) {
                keys.push(k);
            }
        }
        // this.wlog("delAllTempByState", keys);
        for (let i = 0; i < keys.length; i++) {
            this.delTemp(keys[i]);
        }
    }
}

module.exports = CSkill;