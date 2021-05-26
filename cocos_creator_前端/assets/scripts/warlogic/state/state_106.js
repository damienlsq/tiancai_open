module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    Actions: {
        1: {
            行为: "更新临时属性",
            属性: "AddPr",
            类型: "set",
            值(who, tobj, skobj, dam) {
                return skobj.getItemEffectVal();
            },
        },
        2: {
            行为: "更新临时属性",
            属性: "AddPr",
            类型: "set",
            值: null,
        },
    },
    Attr: {
        BeAtkW: [
            10000,
            0,
        ],
    },
    Events: {
        激活状态: [{
            行为: 1,
        }],
        状态结束: [{
            行为: 2,
        }],
    },
    Conds: [],
};