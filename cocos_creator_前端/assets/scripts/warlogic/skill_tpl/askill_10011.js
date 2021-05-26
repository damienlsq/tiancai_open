module.exports = {
    Type: "主动",
    Range: "自己",
    Actions: {
        1: {
            行为: "选择目标",
            目标: "多个敌方",
            排序: "乱序",
            有放回: true,
            数量: (who, tobj, skobj, dam) => {
                return who.getSkillParam("c", skobj);
            },
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