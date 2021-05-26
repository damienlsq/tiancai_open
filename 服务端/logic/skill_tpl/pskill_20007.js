module.exports = {
    Type: "被动",
    Range: "自己",
    Actions: {
        1: {
            行为: "触发被动",
        },
        2: {
            行为: "选择目标",
            目标: "多个我方",
            排序: "HP百分比降序",
            数量(who, tobj, skobj, dam) {
                return who.getSkillParam("c", skobj);
            },
        },
        3: {
            行为: "治疗",
            值(who, tobj, skobj, dam) {
                return who.getSkillParam("a", skobj);
            },
        },
    },
    Events: {
        普攻命中: [{
            行为: [1, 2, 3],
            概率(who, tobj, skobj, dam) {
                return 0.01 * who.getSkillParam("b", skobj);
            },
        }],
    },
    Conds: {},
};