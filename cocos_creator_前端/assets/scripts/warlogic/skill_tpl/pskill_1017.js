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
            行为: "更新临时属性",
            属性: "DefAdd",
            刷新属性: "Def",
            类型: "add",
            值(who, tobj, skobj, dam) {
                return who.getSkillParam("d", skobj);
            },
        },
        4: {
            行为: "更新临时属性",
            属性: "BeAtkWAdd",
            刷新属性: "BeAtkW",
            类型: "add",
            值(who, tobj, skobj, dam) {
                return who.getSkillParam("b", skobj);
            },
        },
    },
    Events: {
        普攻命中: [{
            行为: [1, 2, 3, 4],
        }],
    },
    Conds: {},
};