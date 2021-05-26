module.exports = {
    //  高智商
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
            编号: 3,
            回合(who, tobj, skobj, dam) {
                return who.getSkillParam("c", skobj);
            },
        },
        4: {
            行为: "打断主动技能",
        },
    },
    Attr: {},
    Events: {
        普攻命中: [{
            行为: [1, 2, 3, 4],
            概率(who, tobj, skobj, dam) {
                return 0.01 * who.getSkillParam("b", skobj);
            },
        }],
    },
    Conds: {},
};