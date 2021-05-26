module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    Actions: {
        1: {
            行为: "选择目标",
            目标: "自己",
        },
        2: {
            行为: "对白",
            i18n: "cursedie",
        },
        3: {
            行为: "自杀",
        },
    },
    Attr: {},
    Events: {
        状态结束: [{
            行为: [1, 2, 3],
            条件: 1,
        }],
    },
    Conds: {
        1: {
            判断() {
                const who = this.m_Owner;
                const hpPercent = who.hp() / who.maxHp();
                const ratio = who.getSkillParam("d", this);
                //  who.wlog("judge state 1007, hpPercent", hpPercent, "ratio", ratio);
                return hpPercent < (ratio * 0.01);
            },
        },
    },
};