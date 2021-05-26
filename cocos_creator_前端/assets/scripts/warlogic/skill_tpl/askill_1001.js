module.exports = {
    Type: "主动",
    Range: "自己",
    Actions: {
        1: {
            行为: "选择目标",
            目标: "敌方全体",
        },
        2: {
            行为: "加状态",
            编号: 1001,
            时长: (who, tobj, skobj, dam) => {
                return who.getSkillParam("c", skobj) || 0;
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