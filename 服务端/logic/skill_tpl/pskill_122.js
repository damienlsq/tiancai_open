
module.exports = {
    Type: "被动",
    Range: "自己",
    Actions: {
        1: {
            行为: "触发被动",
        },
        2: {
            行为: "选择目标",
            目标: "自己",
        },
        3: {
            行为: "加状态",
            编号: 1009,
            时长(who, tobj, skobj, dam) {
                return who.getSkillParam("c", skobj);
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