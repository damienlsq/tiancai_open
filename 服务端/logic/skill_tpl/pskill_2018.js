module.exports = {
    Type: "被动",
    Actions: {
        1: {
            行为: "触发被动",
            次数: 1,
        },
        2: {
            行为: "选择目标",
            目标: "自己",
        },
        3: {
            行为: "加状态",
            编号: 2018,
            时长: 0,
        },
        4: {
            行为: "删状态",
            编号: 2018,
        },
    },
    Attr: {},
    Events: {
        受伤: [{
            行为: [1, 2, 3],
            条件: 1,
        }, {
            行为: [2, 4],
            条件: 2,
        }],
    },
    Conds: {
        1: {
            判断() {
                const who = this.m_Owner;
                const hpPercent = who.hp() / who.maxHp();
                const b = who.getSkillParam("b", this);
                // who.wlog("judge 2018, hpPercent", hpPercent, "b", b);
                return hpPercent < b * 0.01;
            },
        },
        2: {
            判断() {
                const who = this.m_Owner;
                const hpPercent = who.hp() / who.maxHp();
                const b = who.getSkillParam("b", this);
                // who.wlog("judge 2018, hpPercent", hpPercent, "b", b);
                return hpPercent > b * 0.01;
            },
        },
    },
};