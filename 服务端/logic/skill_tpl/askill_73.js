module.exports = {
    Type: "主动",
    Range: "自己",
    Actions: {
        1: {
            行为: "选择目标",
            目标: "真的我方全体",
            排序: "HP百分比降序",
            数量: 1,
        },
        2: {
            行为: "复活",
            满血: false,
            延迟: 1,
            值(who, tobj, skobj, dam) {
                return who.getSkillParam("a", skobj);
            },
        },
        3: {
            行为: "设置能量消耗",
            目标: "自己",
            值(who, tobj, skobj, dam) {
                return skobj.getItemEffectVal();
            },
        },
        4: {
            行为: "选择目标",
            目标: "多个我方",
            排序: "HP百分比降序",
            数量: 1,
        },
        5: {
            行为: "治疗",
            值(who, tobj, skobj, dam) {
                return who.getSkillParam("a", skobj);
            },
        },
        6: {
            行为: "设置能量消耗",
            目标: "自己",
            值: 0,
        },
    },
    Events: {
        执行技能效果: [
            {
                行为: [1, 2, 3],
                条件: 1,
            },
            {
                行为: [4, 5, 6],
                条件: 2,
            }],
    },
    Conds: {
        1: {
            判断() {
                const who = this.m_Owner;
                const oWar = who.m_War;
                return oWar.hasDeadUnit(who.team());
            },
        },
        2: {
            判断() {
                const who = this.m_Owner;
                const oWar = who.m_War;
                return !oWar.hasDeadUnit(who.team());
            },
        },
    },
};