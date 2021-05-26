cc.Class({
    extends: cc.Component,

    properties: {
        nameLabel: cc.RichText,
        descLabel: cc.RichText,
    },
    onLoad() {
    },
    playAni(dData, duration) {
        this.skillID = dData.skillID;
        this.oldSkillData = dData.dOldSkillData;
        this.newSkillData = dData.dNewSkillData;
        this.from = dData.from;
        this.to = dData.to;
        this.duration = duration;
        this.t = 0;
        this.nameLabel.string = mbgGame.getString(`skillname${this.skillID}`);
    },
    update(dt) {
        this.t += dt;
        const p = Math.min(this.t / this.duration, 1);
        const dCurData = {};
        for (const k in this.newSkillData) {
            const from = this.oldSkillData[k];
            const to = this.newSkillData[k];
            //  mbgGame.log("upgradeSkill", charaID, 'k', k, 'old', oldVal, 'new', newVal);
            const c = Math.round(from + (p * (to - from)));
            dCurData[k] = `${c}`;
            if ((to - from) !== 0) {
                dCurData[k] += `<color=#00ff00>(${to > from ? "+" : "-"}${to - from})</color>`;
            }
        }
        const desc = mbgGame.getString(`skilldesc${this.skillID}`, dCurData);
        this.descLabel.string = mbgGame.getBoldStr(`${desc}`);
    },
});
