module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    AddRound2: 1,
    Actions: {
        1: {
            行为: "加能量",
            值(who, tobj, skobj, dam) {
                return who.getSkillParam("d", skobj) || 0;
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
    Attr: {
        Atk: [
            function(who, tobj, skobj, dam) {
                return who.getSkillParam("a", skobj);
            },
            0,
        ],
    },
    Events: {
        普攻命中: [{
            行为: [1, 2],
        }],
    },
    Conds: [],
};