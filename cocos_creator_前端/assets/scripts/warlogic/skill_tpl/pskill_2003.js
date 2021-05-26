module.exports = { // 攻击生命低于%{a}%的敌人必定暴击。
    Type: "被动",
    Actions: {
        1: {
            行为: "触发被动",
        },
        2: {
            行为: "强制暴击",
        },
    },
    Attr: {},
    Events: {
        暴击失败: [{
            行为: [1, 2],
            条件: 1,
        }],
    },
    Conds: {
        1: {
            判断(dOption) {
                const who = this.m_Owner;
                const tobj = dOption.tobj;
                const hpPercent = tobj.hp() / tobj.maxHp();
                const ratio = who.getSkillParam("a", this);
                return hpPercent < (ratio * 0.01);
            },
        },
    },
};