module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    Actions: {},
    AddRound2: 1,
    Attr: {
        DR: [
            function(who, tobj, skobj, dam) {
                return -who.getSkillParam("a", skobj);
            },
            0,
        ],
    },
    Events: {},
    Conds: [],
};
