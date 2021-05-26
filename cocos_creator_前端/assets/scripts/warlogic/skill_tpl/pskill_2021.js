const w_defines = require('../w_defines');

module.exports = {
    Type: "被动",
    Actions: {
        1: {
            行为: "加能量",
            值(who, tobj, skobj, dam) {
                const t = tobj && tobj.getStatesByType(w_defines.StateType.Debuff).length > 0;
                return Math.round(who.getSkillParam("a", skobj) || 0) * (t ? 2 : 1);
            },
        },
        2: {
            行为: "跳字",
            msg: (who, tobj, skobj, dam, dOption) => {
                return `+${dOption.energyAdd}`;
            },
            n: 'energy',
        },
    },
    Attr: {},
    Events: {
        普攻命中: [{
            行为: [1, 2],
            概率(who, tobj, skobj, dam) {
                return 0.01 * who.getSkillParam("b", skobj);
            },
        }],
    },
};