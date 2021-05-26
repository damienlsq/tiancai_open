module.exports = {
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
            行为: "打断主动技能",
        },
        3: {
            行为: "攻击",
            值(who, tobj, skobj, dam) {
                return who.getSkillParam("a", skobj);
            },
        },
        4: {
            行为: "加状态",
            编号: 2,
            时长(who, tobj, skobj, dam) {
                return who.getSkillParam("c", skobj);
            },
        },
        5: {
            行为: "加能量",
            值(who, tobj, skobj, dam) {
                return Math.ceil(skobj.getItemEffectVal());
            },
        },
        6: {
            行为: "跳字",
            msg: (who, tobj, skobj, dam, dOption) => {
                return `+${dOption.energyAdd}`;
            },
            n: 'energy',
        },
    },
    Events: {
        执行技能效果: [{
            行为: [1, 2, 3, 4],
        }, {
            行为: [5, 6],
            条件: 1,
        }],
    },
    Conds: {
        1: {
            判断() {
                const who = this.m_Owner;
                const hpPercent = who.hp() / who.maxHp();
                return hpPercent < 0.5;
            },
        },
    },
};