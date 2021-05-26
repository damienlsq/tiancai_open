module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    Actions: {
        1: {
            行为: "设置临时值",
            变量: "absorb",
            值(who, tobj, skobj, dam) {
                const d = who.getSkillParam("d", skobj);
                const absorb = who.getSkillParam("a", skobj) + Math.round(skobj.causer().getAttr("Def") * d * 0.01);
                // who.wlog("111 a", who.getSkillParam("a", skobj), "causer def", skobj.causer().getAttr("Def"), "d", d);
                return absorb;
            },
        },
        2: {
            行为: "吸收伤害",
            变量: "absorb",
        },
        3: {
            行为: "选择目标",
            目标: "攻击者",
        },
        4: {
            行为: "攻击",
            debug: true,
            值(who, tobj, skobj, dam) {
                const causer = skobj.causer();
                const def = causer.getAttr("Def");
                const a = causer.getItemEffectVal();
                let hp = def * a * 0.01;
                hp = Math.round(hp);
                // who.wlog(causer.name(), "state.111 def", def, "a", a, 'hp', hp);
                return hp;
            },
        },
        5: {
            行为: "结束状态",
        },
        6: {
            行为: "清除伤害",
        },
    },
    Attr: {

    },
    Events: {
        激活状态: [{
            行为: 1,
        }],
        刷新: [{
            行为: 1,
        }],
        被攻击前: [{
            行为: 2,
            条件: 2,
        }],
        吸收伤害后: [{
            行为: 5,
            条件: 1,
        }],
        被攻击后: [{
            行为: [6, 3, 4],
        }],
    },
    Conds: {
        1: {
            判断: ["absorb", "<=", 0],
        },
        2: {
            判断: ["目标", "==", "自己"],
        },
    },
};