module.exports = {
    Type: "被动",
    Actions: {
        1: {
            行为: "额外伤害加成",
            mul: (who, tobj, skobj, dam) => {
                return who.getSkillParam("a", skobj);
            },
        },
    },
    Attr: {},
    Events: {
        计算伤害: [{
            行为: [1],
            条件: 1,
        }],
    },
    Conds: {
        1: {
            判断(dOption) {
                const who = this.m_Owner;
                const tobj = dOption.tobj;
                return (tobj.hp() / tobj.maxHp()) < (who.hp() / who.maxHp());
            },
        },
    },
};