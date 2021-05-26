
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
            编号: 17,
            时长: (who, tobj, skobj, dam) => {
                return who.getSkillParam("c", skobj) || 0;
            },
        },
    },
    Events: {
        暴击: [{
            行为: [1, 2, 3],
        }],
    },
    Conds: {},
};