module.exports = {
    Type: "主动",
    Range: "自己",
    Actions: {
        1: {
            行为: "选择目标",
            目标: "多个我方",
            排序: "乱序",
            数量(who, tobj, skobj, dam) {
                return who.getSkillParam("b", skobj);
            },
        },
        2: {
            行为: "加状态",
            编号: 11,
            时长(who, tobj, skobj, dam) {
                return who.getSkillParam("c", skobj);
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