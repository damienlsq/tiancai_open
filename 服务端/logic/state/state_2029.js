const w_defines = require('../w_defines');

module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    Actions: {
        1: {
            行为: "删状态",
            类型: w_defines.StateType.Debuff,
        },
        2: {
            行为: "免疫",
            类型: w_defines.StateType.Debuff,
        },
        3: {
            行为: "结束免疫",
            类型: w_defines.StateType.Debuff,
        },
    },
    Attr: {
    },
    Events: {
        激活状态: [{
            行为: [1, 2],
        }],
        状态结束: [{
            行为: [3],
        }],
        刷新: [{
            行为: 1,
        }],
    },
    Conds: {
    },
};