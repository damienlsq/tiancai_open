module.exports = {
    Type: "被动",
    Range: "自己",
    Actions: {
        1: {
            行为: "选择目标",
            目标: "自己",
        },
        2: {
            行为: "加状态",
            编号: 2019,
            时长: 0,
        },
        3: {
            行为: "删状态",
            编号: 2019,
        },
    },
    Attr: {},
    Events: {
        发动技能: [{
            行为: [1, 2],
        }],
        暴击: [{
            行为: [1, 3],
        }],
    },
    Conds: {},
};