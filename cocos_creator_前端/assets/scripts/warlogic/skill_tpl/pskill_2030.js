module.exports = {
    Type: "被动",
    Range: "自己",
    Actions: {
        1: {
            行为: "额外伤害加成",
            mul: (who, tobj, skobj, dam) => {
                const elapsedtime = who.m_War.framesToSeconds(who.m_War.frames());
                const k = elapsedtime / 6;
                const v = k * who.getSkillParam("b", skobj);
                // who.wlog("mul", k, v);
                return v;
            },
        },
    },
    Events: {
        计算伤害: [{
            行为: [1],
        }],
    },
    Conds: {},
};