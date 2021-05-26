module.exports = {
    Type: "被动",
    Range: "自己",
    Actions: {
        1: {
            行为: "队伍临时值",
            键: "EMul",
            值(who, tobj, skobj, dam) {
                return who.getSkillParam("a", skobj);
            },
        },
    },
    Events: {
        发动技能: [{
            行为: [1],
        }],
    },
    Conds: {},
};