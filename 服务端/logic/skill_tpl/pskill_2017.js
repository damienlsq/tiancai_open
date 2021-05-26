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
            编号: 2017,
            时长: (who, tobj, skobj, dam) => {
                return who.getSkillParam("c", skobj) || 0;
            },
        },
        3: {
            行为: "加状态",
            编号: 2015,
            时长: (who, tobj, skobj, dam) => {
                return who.getSkillParam("c", skobj) || 0;
            },
        },
    },
    Events: {
        被攻击后: [{
            行为: [1, 2, 3],
            概率(who, tobj, skobj, dam) {
                return 0.01 * who.getSkillParam("b", skobj);
            },
        }],
    },
    Conds: {},
};