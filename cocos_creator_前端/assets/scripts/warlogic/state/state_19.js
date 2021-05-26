module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    Heartbeat: 1,
    Actions: {},
    Attr: {
        Atk: [

            function(who, tobj, skobj, dam) {
                return -who.getSkillParam("d", skobj);
            },
            0,
        ],
    },
    Events: {},
    Conds: [],
};