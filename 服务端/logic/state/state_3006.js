module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    Actions: {},
    Attr: {
        Sk: [
            function(who, tobj, skobj, dam) {
                return -who.getSkillParam("a", skobj);
            },
            0,
        ],
    },
    Events: {},
    Conds: [],
};