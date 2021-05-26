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
            行为: "复活",
            延迟: 1,
            值(who, tobj, skobj, dam) {
                return who.maxHp() * 0.5;
            },
        },
    },
    Events: {
        自己死亡后: [{
            行为: [1, 2, 3],
            概率(who, tobj, skobj, dam) {
                return 0.01 * who.getSkillParam("a", skobj);
            },
        }],
    },
    Conds: {},
};