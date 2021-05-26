module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    Actions: {
        1: {
            行为: "设置临时值",
            变量: "absorb",
            值(who, tobj, skobj, dam) {
                return who.getSkillParam("a", skobj);
            },
        },
        2: {
            行为: "吸收伤害",
            变量: "absorb",
        },
        3: {
            行为: "结束状态",
        },
        4: {
            行为: "选择目标",
            目标: "敌方全体",
        },
        5: {
            行为: "攻击",
            值: (who, tobj, skobj, dam) => {
                const hp = tobj.maxHp() * who.getSkillParam("b", skobj) * 0.01;
                return hp;
            },
        },
    },
    Attr: {},
    Events: {
        激活状态: [{
            行为: 1,
        }],
        刷新: [{
            行为: 1,
        }],
        被攻击前: [{
            行为: 2,
            条件: 2,
        }],
        吸收伤害后: [{
            行为: 3,
            条件: 1,
        }],
        状态结束: [{
            行为: [4, 5],
            条件: 3,
        }],
    },
    Conds: {
        1: {
            判断: ["absorb", "<=", 0],
        },
        2: {
            判断: ["目标", "==", "自己"],
        },
        3: {
            判断: ["absorb", ">", 0],
        },
    },
};