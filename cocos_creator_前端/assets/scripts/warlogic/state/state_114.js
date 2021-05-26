module.exports = {
    AddType: "叠加",
    Duration: "刷新",
    Heartbeat: 1,
    Actions: {
        1: {
            行为: "中毒扣血",
            值(who, tobj, skobj, dam) {
                return who.getSkillParam("a", skobj);
            },
        },
        2: {
            行为: "选择目标",
            目标: "敌方全体",
        },
        3: {
            行为: "治疗",
            值(who, tobj, skobj, dam) {
                const hp = Math.ceil(dam * skobj.getItemEffectVal() * 0.01);
                // who.wlog("heal enemy team, hp:", hp, "dam:", dam, "itemval:", skobj.getItemEffectVal());
                return hp;
            },
        },
    },
    Attr: {},
    Events: {
        心跳: [{
            行为: 1,
        }],
        中毒攻击后: [{
            行为: [2, 3],
        }],
    },
    Conds: [],
};