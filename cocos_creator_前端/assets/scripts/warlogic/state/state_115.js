module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    Heartbeat: 1,
    Actions: {},
    Attr: {
        CEAdd: [
            function(who, tobj, skobj, dam) {
                return -skobj.getItemEffectVal();
            },
            0,
        ],
    },
    Events: {},
    Conds: [],
};