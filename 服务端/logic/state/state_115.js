module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    Heartbeat: 1,
    Actions: {},
    Attr: {
        CEAdd: [
            function(who, tobj, skobj, dam) {
                if (who.ID() === 14) {
                    return 0;
                }
                return -skobj.getItemEffectVal();
            },
            0,
        ],
    },
    Events: {},
    Conds: [],
};