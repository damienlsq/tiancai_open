module.exports = {
    Type: "被动",
    Actions: {
        1: {
            行为: "选择目标",
            目标: "自己",
        },
        2: {
            行为: "加状态",
            编号: 1002,
            时长: 0,
        },
    },
    Attr: {},
    Events: {
        受伤: [{
            行为: [1, 2],
            条件: 1,
        }],
    },
    Conds: {
        1: {
            判断() {
                const who = this.m_Owner;
                const hpPercent = who.hp() / who.maxHp();
                const b = who.getSkillParam("b", this);
                // who.wlog("judge 1001, hpPercent", hpPercent, "b", b);
                return hpPercent < b * 0.01;
            },
        },
    },
};