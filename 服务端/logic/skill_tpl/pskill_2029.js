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
            编号: 2029,
            时长: (who, tobj, skobj, dam) => {
                return who.getSkillParam("c", skobj) || 0;
            },
        },
        3: {
            行为: "加状态",
            delay: [1, '2029'],
            编号: 9999,
            时长: 0,
        },
    },
    Events: {
        用主技后: [{
            行为: [1, 2],
        }],
        发动技能: [{
            行为: [1, 3],
        }],
    },
    Conds: {},
};