const defines = require('./../w_defines');

module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    Actions: {
        1: {
            行为: "扣血",
            HitType: defines.HitType.ExtraDam,
            值: (who, tobj, skobj, dam) => {
                return who.getSkillParam("a", skobj);
            },
        },
    },
    Attr: {},
    Events: {
        受伤: [{
            行为: [1],
        }],
    },
    Conds: {},
};