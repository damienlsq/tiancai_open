
module.exports = {
    // 脸皮冲撞
    Type: "主动",
    Range: "自己",
    Actions: {
        1: {
            行为: "选择目标",
            目标: "多个敌方",
            排序: "乱序",
            数量(who, tobj, skobj, dam) {
                return who.getSkillParam("b", skobj);
            },
        },
        2: {
            行为: "攻击",
            值(who, tobj, skobj, dam) {
                let hp = who.getSkillParam("a", skobj);
                const c = who.getSkillParam("c", skobj);
                if (tobj.hpPercent() < c * 0.01) {
                    const d = who.getSkillParam("d", skobj);
                    hp *= (1 + (d * 0.01));
                    hp = Math.round(hp);
                }
                return hp;
            },
        },
        3: {
            行为: "选择目标",
            // 这里不填目标类型，才能用到action-1的tobjs
            排序: "乱序",
            数量: 1,
        },
        4: {
            行为: "加状态",
            编号: 10001,
            时长: 6,
        },
    },
    Events: {
        执行技能效果: [{
            行为: [1, 2, 3, 4],
        }],
    },
    Conds: {},
};