module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    Actions: {
    },
    Attr: {
        Def: [
            0,
            function(who, tobj, skobj, dam) {
                return -skobj.getItemEffectVal();
            },
        ],
        Cri: [
            50,
            0,
        ],
    },
    Events: {},
    Conds: [],
};