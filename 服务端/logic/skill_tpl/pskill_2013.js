module.exports = {
    Type: "被动",
    Range: "自己",
    Actions: {
        1: {
            行为: "触发被动",
        },
        2: {
            行为: "反伤",
            值(who, tobj, skobj, dam, dOption) {
                return dOption.odam;
            },
        },
    },
    Events: {
        被攻击后: [{
            行为: [1, 2],
            概率(who, tobj, skobj, dam) {
                return 0.01 * who.getSkillParam("b", skobj);
            },
        }],
    },
    Conds: {},
};