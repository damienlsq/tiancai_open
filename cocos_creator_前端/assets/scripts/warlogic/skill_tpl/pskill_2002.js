module.exports = { // 使用技能时恢复%{a}%最大生命。
    Type: "被动",
    Actions: {
        1: {
            行为: "选择目标",
            目标: "自己",
        },
        2: {
            行为: "治疗",
            值(who, tobj, skobj, dam) {
                return who.maxHp() * 0.01 * who.getSkillParam("a", skobj);
            },
        },
    },
    Attr: {},
    Events: {
        用主技后: [{
            行为: [1, 2],
        }],
    },
    Conds: {},
};