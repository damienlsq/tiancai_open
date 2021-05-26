
module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    Actions: {
        1: {
            行为: "额外伤害加成",
            mul: (who, tobj, skobj, dam) => {
                return who.getSkillParam("a", skobj);
            },
        },
    },
    Attr: {
        Cri: [
            100,
            0,
        ],
    },
    Events: {
        计算伤害: [{
            行为: [1],
            条件: 1,
        }],
    },
    Conds: {
        1: {
            判断(dOption) {
                return dOption.isNormalAtk;
            },
        },
    },
};