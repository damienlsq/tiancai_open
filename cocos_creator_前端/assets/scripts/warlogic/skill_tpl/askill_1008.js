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
            值: (who, tobj, skobj, dam) => {
                const hp = Math.ceil(tobj.hp() * who.getSkillParam("a", skobj) * 0.01);
                skobj.addTemp("AllHp", hp);
                return hp;
            },
        },
        3: {
            行为: "选择目标",
            目标: "自己",
        },
        4: {
            行为: "治疗",
            值(who, tobj, skobj, dam) {
                const hp = skobj.getTemp("AllHp");
                skobj.delTemp("AllHp");
                return hp;
            },
        },
    },
    Events: {
        执行技能效果: [{
            行为: [1, 2, 3, 4],
        }],
    },
    Conds: {},
};