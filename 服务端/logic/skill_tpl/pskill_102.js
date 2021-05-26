module.exports = {
    Type: "被动",
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
    Attr: {},
    Events: {
        暴击后: [{
            行为: [1, 2],
        }, {
            行为: [3],
            条件: 1,
        }],
    },
    Conds: {
        1: {
            判断: ["目标已死", "!=", true],
        },
    },
};