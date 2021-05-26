module.exports = {
    Type: "主动",
    Range: "自己",
    Actions: {
        1: {
            行为: "选择目标",
            目标: "多个我方",
            排序: "HP百分比降序",
            数量(who, tobj, skobj, dam) {
                return who.getSkillParam("b", skobj);
            },
        },
        2: {
            行为: "治疗",
            值(who, tobj, skobj, dam) {
                let hp = who.getSkillParam("a", skobj);
                const c = who.getSkillParam("c", skobj);
                if (tobj.hpPercent() < c * 0.01) {
                    const d = who.getSkillParam("d", skobj);
                    hp *= (1 + (d * 0.01));
                    hp = Math.round(hp);
                }
                return hp;
            },
        },
    },
    Events: {
        执行技能效果: [{
            行为: [1, 2],
        }],
    },
    Conds: {},
};