module.exports = {
    Type: "主动",
    Range: "自己",
    Actions: {
        1: {
            行为: "选择目标",
            目标: "敌方全体",
        },
        2: {
            行为: "攻击",
            值(who, tobj, skobj, dam) {
                dam = who.getSkillParam("a", skobj);
                dam += who.getAttr("Def") * who.getSkillParam("b", skobj) * 0.01;
                return dam;
            },
        },
    },
    Events: {
        执行技能效果: [{
            行为: [1, 2],
        }],
    },
    Conds: {},
};