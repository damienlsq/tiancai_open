module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    AddRound2: 1,
    Actions: {},
    Attr: {
        Cri: [
            function(who, tobj, skobj, dam) {
                return who.getSkillParam("d", skobj);
            },
            0,
        ],
    },
    Events: {},
    Conds: [],
};