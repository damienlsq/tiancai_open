module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    Actions: {},
    Attr: {
        BeDamMul: [
            function(who, tobj, skobj, dam) {
                return skobj.getItemEffectVal();
            },
            0,

        ],
    },
    Events: {},
    Conds: [],
};