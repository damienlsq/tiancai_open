module.exports = { // 使用技能不消耗能量, 但会损失%{a}%最大生命。
    Type: "被动",
    Actions: {
        1: {
            行为: "扣血",
            值: (who, tobj, skobj, dam) => {
                return Math.ceil(who.maxHp() * 0.01 * who.getSkillParam("a", skobj));
            },
        },
        2: {
            行为: "阻止施法",
        },
        3: {
            行为: "错误",
            err: () => {
                return mbgGame.config.ErrCode.UseSkill_LackHp;
            },
        },
    },
    Attr: {
        CEAdd: [
            (who, tobj, skobj, dam) => {
                return -(who.getSkillParam("b", skobj) || 0);
            },
            0,
        ],
    },
    Events: {
        使用技能前: [{
            行为: [2, 3],
            条件: 2,
        }, {
            行为: [1],
            条件: 1,
        }],
    },
    Conds: {
        1: {
            判断(dOption) {
                const who = this.m_Owner;
                const hp = who.maxHp() * 0.01 * who.getSkillParam("a", this);
                return hp < who.hp();
            },
        },
        2: {
            判断(dOption) {
                const who = this.m_Owner;
                const hp = who.maxHp() * 0.01 * who.getSkillParam("a", this);
                return hp >= who.hp();
            },
        },
    },
};