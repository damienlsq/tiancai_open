module.exports = {
    Type: "被动",
    Range: "自己",
    Actions: {
        1: {
            行为: "触发被动",
        },
        2: {
            行为: "加状态",
            编号: 20015,
            时长(who, tobj, skobj, dam) {
                return who.getSkillParam("c", skobj);
            },
        },
        3: {
            行为: "备份目标",
        },
        4: {
            行为: "选择目标",
            目标: "敌方全体",
            状态编号: 20015,
        },
        5: {
            行为: "攻击",
            值: (who, tobj, skobj, dam) => {
                return who.getSkillParam("a", skobj);
            },
            noEvent: true,
        },
        6: {
            行为: "恢复目标",
        },
    },
    Events: {
        普攻命中: [{
            行为: [3, 4, 5, 6],
        }, {
            行为: [1, 2],
            概率(who, tobj, skobj, dam) {
                return 0.01 * who.getSkillParam("b", skobj);
            },
        }],
        技能命中: [{
            行为: [3, 4, 5, 6],
        }],
    },
    Conds: {},
};