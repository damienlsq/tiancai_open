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
                return who.getSkillParam("a", skobj);
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