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
            行为: "加状态",
            编号: 15,
            时长(who, tobj, skobj, dam) {
                return who.getSkillParam("c", skobj);
            },
        },
        3: {
            行为: "加状态",
            编号: 10014,
            时长(who, tobj, skobj, dam) {
                return who.getSkillParam("c", skobj);
            },
        },
    },
    Events: {
        执行技能效果: [{
            行为: [1, 2, 3],
        }],
    },
    Conds: {},
};