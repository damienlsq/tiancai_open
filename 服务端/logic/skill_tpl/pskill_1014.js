module.exports = {
    Type: "被动",
    Range: "自己",
    Actions: {
        1: {
            行为: "触发被动",
        },
        2: {
            行为: "二连击",
            值(who, tobj, skobj, dam) {
                return who.getSkillParam("a", skobj);
            },
        },
        3: {
            行为: "加状态",
            编号: 2,
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