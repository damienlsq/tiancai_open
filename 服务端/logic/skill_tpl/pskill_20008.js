const w_defines = require('../w_defines');

module.exports = {
    Type: "被动",
    Actions: {
        1: {
            行为: "触发被动",
        },
        2: {
            行为: "二连击",
            值(who, tobj, skobj, dam) {
                return who.getSkillParam("a", skobj);
            },
        },
        3: {
            行为: "加状态",
            编号: 1,
            回合(who, tobj, skobj, dam) {
                return who.getSkillParam("c", skobj);
            },
        },
    },
    Attr: {},
    Events: {
        普攻命中: [{
            行为: [1, 2],
            条件: 1,
        }, {
            行为: [1, 3],
            条件: 2,
            概率(who, tobj, skobj, dam) {
                return 0.01 * who.getSkillParam("b", skobj);
            },
        }],
    },
    Conds: {
        1: {
            判断(dOption) {
                const tobj = dOption.tobj;
                return tobj && tobj.getStatesByType(w_defines.StateType.Debuff).length > 0;
            },
        },
        2: {
            判断(dOption) {
                const tobj = dOption.tobj;
                const b = tobj && tobj.getStatesByType(w_defines.StateType.Debuff).length === 0;
                return b;
            },
        },
    },
};