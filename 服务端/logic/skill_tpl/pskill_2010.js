module.exports = { // 对生命大于%{b}%的敌人伤害增加%{a}%，生命值小于%{b}%的敌人伤害减少%{a}%。
    Type: "被动",
    Actions: {
        1: {
            行为: "额外伤害加成",
            mul: (who, tobj, skobj, dam) => {
                return who.getSkillParam("a", skobj);
            },
        },
        2: {
            行为: "额外伤害加成",
            mul: (who, tobj, skobj, dam) => {
                return -who.getSkillParam("a", skobj);
            },
        },
    },
    Attr: {},
    Events: {
        计算伤害: [{
            行为: [1],
            条件: 1,
        }, {
            行为: [2],
            条件: 2,
        }],
    },
    Conds: {
        1: {
            判断(dOption) {
                const who = this.m_Owner;
                const tobj = dOption.tobj;
                return (tobj.hp() / tobj.maxHp()) > (0.01 * who.getSkillParam("b", this));
            },
        },
        2: {
            判断(dOption) {
                const who = this.m_Owner;
                const tobj = dOption.tobj;
                return (tobj.hp() / tobj.maxHp()) < (0.01 * who.getSkillParam("b", this));
            },
        },
    },
};