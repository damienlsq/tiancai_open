module.exports = {
    Type: "被动",
    Range: "自己",
    Actions: {
        1: {
            行为: "选择目标",
            目标: "敌方全体",
        },
        2: {
            行为: "加状态",
            编号: 3007,
            时长: 0,
        },
    },
    Events: {
        发动技能: [{
            行为: [1, 2],
        }],
    },
    Conds: {},
};