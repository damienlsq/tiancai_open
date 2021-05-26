const utils = require('./w_utils');
const assert = require('assert');
const defines = require('./w_defines');
const CState = require('./w_state');
const StateData = require('./state/state_index');
const _u = require('./underscore');


function getTarget(who, dAction, dOption, defaultTObjs) {
  let num = dAction["数量"];
  const exclude = dAction["排除"];
  const stateSID = dAction["状态编号"];
  const putBack = dAction["有放回"];
  if (typeof (num) === "function") {
    num = who.transParam(num, dOption);
  }
  const sSort = dAction["排序"];
  let tobjs = null;
  if (dAction["目标"]) { // 有明确的目标
    const sTarget = dAction["目标"];
    if (sTarget === "已锁定目标") {
      tobjs = dOption.obj && dOption.obj.getCacheTargets();
      tobjs = _u.filter(tobjs, (tobj) => {
        return !tobj.isDie();
      });
    } else if (sTarget === "攻击者") {
      // who.wlog("选择目标 攻击者", dOption.atker && dOption.atker.name());
      assert(dOption.atker);
      tobjs = [dOption.atker];
    } else {
      tobjs = who.m_War.getUnitByCond(who, dAction["目标"], {
        num,
        sort: sSort,
        tobj: dOption.tobj,
        exclude,
        putBack,
      });
    }
    // who.wlog("getTarget", dAction["目标"], tobjs);
  } else if (dOption.tobjs) { // 没有明确目标，优先用dOption的tobjs、tobj
    tobjs = dOption.tobjs;
    if (sSort) {
      tobjs = who.m_War.doSortUnits(tobjs, {
        sort: sSort,
      });
    }
    if (num) {
      tobjs = _u.last(tobjs, num);
    }
  } else if (dOption.tobj) {
    tobjs = [dOption.tobj];
  } else if (dOption.obj) { // tobjs和tobj都没有时，根据技能/状态的type，重新找目标
    const sTargetType = dOption.obj.targetType() || "敌方";
    if (sTargetType === "自己") {
      tobjs = [who];
    } else {
      tobjs = who.m_War.getUnitByCond(who, sTargetType, {
        num,
      });
    }
  } else if (defaultTObjs) {
    tobjs = defaultTObjs;
  } else {
    tobjs = [who.chooseTarget()];
  }
  if (exclude) {
    if (exclude === "自己") {
      tobjs = _u.without(tobjs, who);
    }
  }
  if (stateSID) {
    // who.wlog("gg stateSID", stateSID, tobjs.length);
    // 根据是否有该状态，筛选
    tobjs = _u.filter(tobjs, (_tobj) => {
      return _tobj.getStatesBySID(stateSID).length > 0;
    });
    // who.wlog("dd stateSID", stateSID, tobjs.length);
  }
  return tobjs;
}

function get_tobjs(dOption) {
  let tobjs = dOption.tobjs;
  if (!tobjs) {
    if (dOption.tobj) {
      tobjs = [dOption.tobj];
    } else {
      return null;
    }
  }
  return tobjs;
}

const ActionData = {
  设置技能时长(who, dAction, dOption) {
    const obj = dOption.obj;
    const val = dAction["时长"];
    const duration = who.transParam(val, dOption);
    // who.wlog("duration", duration);
    obj.setDuration(duration);
  },
  设置技能目标(who, dAction, dOption) {
    if (!dOption.obj) {
      return;
    }
    const tobjs = getTarget(who, dAction, dOption);
    dOption.tobjs = tobjs;
    dOption.obj.cacheTargets(tobjs);
    const tobjIDs = _u.map(tobjs, (tobj) => {
      return tobj.objID();
    });
    who.pushAction(defines.Action.SkillTarget, {
      tobjIDs,
    });
  },
  备份目标(who, dAction, dOption) {
    dOption._tobj = dOption.tobj;
    dOption._tobjs = dOption.tobjs;
  },
  恢复目标(who, dAction, dOption) {
    dOption.tobj = dOption._tobj;
    dOption.tobjs = dOption._tobjs;
    delete dOption._tobj;
    delete dOption._tobjs;
  },
  选择目标(who, dAction, dOption) {
    const tobjs = getTarget(who, dAction, dOption);
    dOption.tobj = null; // 选择目标了，原来的目标得去掉
    dOption.tobjs = tobjs;
  },
  自杀(who, dAction, dOption) {
    const tobjs = get_tobjs(dOption);
    if (!tobjs) {
      return;
    }
    for (let i = 0; i < tobjs.length; i++) {
      const tobj = tobjs[i];
      if (tobj.isDie()) {
        continue;
      }
      const hittype = defines.HitType.Curse;
      tobj.damage(9999999, null, hittype);
    }
  },
  溅射(who, dAction, dOption) {
    dOption = dOption || {};
    const val = dAction["值"];
    if (!val) {
      return;
    }
    if (who.isDie()) {
      return;
    }
    let tobjs = dOption.tobjs;
    if (!tobjs) {
      tobjs = getTarget(who, dAction, dOption);
    }
    if (tobjs) {
      utils.removeArrayElem(tobjs, dOption.tobj);
    }
    if (!tobjs || _u.isEmpty(tobjs)) {
      return;
    }
    dOption.atkVal = val;
    for (let i = 0; i < tobjs.length; i++) {
      const tobj = tobjs[i];
      dOption.tobj = tobj;
      who.hit(tobj, dOption);
    }
  },
  二连击(who, dAction, dOption) {
    const val = dAction["值"];
    const tobjs = get_tobjs(dOption);
    if (!tobjs) {
      return;
    }
    const dam = who.transParam(val, dOption);
    if (!_u.isNumber(dam) || dam <= 0) {
      return;
    }
    dOption.ignoreDodge = true;
    dOption.hittype = defines.HitType.ExtraDam; // 给客户端做表现用
    for (let i = 0; i < tobjs.length; i++) {
      const _tobj = tobjs[i];
      if (!_tobj) {
        continue;
      }
      dOption.tobj = _tobj;
      dOption.dam = who.calDamByTobj(_tobj, dam, false);
      who.hit(_tobj, dOption);
    }
  },
  增加额外血量(who, dAction, dOption) {
    if (!dOption.tobjs) {
      return;
    }
    const val = dAction["值"];
    const hp = who.transParam(val, dOption);
    for (let i = 0; i < dOption.tobjs.length; i++) {
      const tobj = dOption.tobjs[i];
      tobj.addExtraHp(hp);
      who.pushAction(defines.Action.RefreshHp, {
        tobjID: tobj.objID(),
        hp: tobj.hp(),
      });
    }
  },
  打断主动技能(who, dAction, dOption) {
    if (!dOption.tobjs) {
      return;
    }
    for (let i = 0; i < dOption.tobjs.length; i++) {
      const tobj = dOption.tobjs[i];
      tobj.haltActiveSkill();
    }
  },
  播放受击效果(who, dAction, dOption) {
    if (!dOption.tobjs) {
      return;
    }
    for (let i = 0; i < dOption.tobjs.length; i++) {
      const tobj = dOption.tobjs[i];
      who.pushAction(defines.Action.SkillEffect, {
        tobjID: tobj.objID(),
        name: defines.getSkill_HitEffectName(dOption.obj.tplID()),
      });
    }
  },
  攻击(who, dAction, dOption) {
    const skobj = dOption.obj;
    dOption = dOption || {};
    const prob = dAction["概率"];
    const noEvent = dAction.noEvent || 0;
    const val = dAction["值"];
    const noEffect = dAction.noEffect;
    if (prob) {
      if (!who.m_War.doProb(prob)) {
        return;
      }
    }
    if (who.isDie()) {
      return;
    }
    const tobjs = dOption.tobjs;
    if (_u.isEmpty(tobjs)) {
      // 是有可能没目标，例如精确打击，先锁定了目标，但是攻击的时候目标已经死了
      // who.wlogErr("[攻击] tobjs is empty", dOption.obj && dOption.obj.name());
      return;
    }
    if (val) {
      dOption.atkVal = val;
    }
    if (skobj.needAoeK()) {
      dOption.aoeK = skobj.getAoeK(tobjs.length);
    }
    dOption.noEffect = noEffect;
    dOption.damTimes = 1; // 用action的攻击，攻击次数固定是1
    dOption.noEvent = noEvent;
    who.attack(dOption);
  },
  嘲讽(who, dAction, dOption) {
    if (!dOption.obj) {
      return;
    }
    const iCauserID = dOption.obj.causerID();
    const causer = who.m_War.getObj(iCauserID);
    if (!causer || causer.isDie() || causer.isDizzy() || causer.isFrozen()) {
      return;
    }
    // who.wlog(who.name(), "被嘲讽，攻击前改变目标->", causer.name());
    dOption.tobjs = [causer];
  },
  重复普攻目标(who, dAction, dOption) {
    const tobj = dOption.tobj;
    if (tobj && !tobj.isDie()) {
      who.setTemp("NextAtkTarget", tobj.objID);
    }
  },
  播放受击(who, dAction, dOption) {
    const tobjs = get_tobjs(dOption);
    if (!tobjs) {
      return;
    }
    for (let i = 0; i < tobjs.length; i++) {
      const tobj = tobjs[i];
      who.pushAction(defines.Action.SkillEffect, {
        tobjID: tobj.objID(),
        name: defines.getSkill_HitEffectName(dOption.obj.tplID()),
      });
    }
  },
  反伤(who, dAction, dOption) {
    let dam = dAction["值"];
    const tobj = dOption.tobj;
    if (!tobj || tobj.isDie()) {
      return;
    }
    dam = who.transParam(dam, dOption);
    if (!(dam > 0)) {
      return;
    }
    dam = who.calDamByTobj(tobj, dam, false);
    who.pushAction(defines.Action.SkillEffect, {
      tobjID: who.objID(),
      name: defines.getSkill_HitEffectName(dOption.obj.tplID()),
    });
    who.hit(tobj, {
      obj: dOption.obj,
      dam,
      counter: true,
      hittype: defines.HitType.ReflectDam,
      noEffect: true,
    });
  },
  死亡免疫(who, dAction, dOption) {
    const val = dAction["值"];
    const hp = who.transParam(val, dOption);
    dOption.hp = hp;
    dOption.die = false;
  },
  复活(who, dAction, dOption) {
    if (!dOption.tobjs) {
      return;
    }
    let delay = dAction["延迟"] || 0.2;
    if (delay <= 0) {
      delay = 0.2;
    }
    const val = dAction["值"];
    const fullRevive = dAction["满血"];
    for (let i = 0; i < dOption.tobjs.length; i++) {
      const tobj = dOption.tobjs[i];
      if (tobj.isDie() && !tobj.hasCallOut("delayRevive")) {
        let hp;
        if (fullRevive) {
          hp = tobj.maxHp();
        } else if (val) {
          hp = tobj.transParam(val, dOption);
        } else {
          hp = 1;
        }
        // 复活都要做延迟
        tobj.callOut(tobj.m_War.secondsToFrames(delay), "delayRevive", tobj.onRevive.bind(tobj, hp, "action"));
        tobj.callOut(tobj.m_War.secondsToFrames(0.2), "delayAddReviveBuff", () => {
          const _dAction = {
            tobjID: tobj.objID(),
            skillID: 0,
            tplID: 0,
            stobjID: tobj.m_War.getNewObjID(),
            stateID: 2016,
            icon: "",
            repeat: false,
            buffname: "imback",
            posType: 1, // 脚底
          };
          tobj.pushAction(defines.Action.AddState, _dAction);
        });
      }
    }
  },
  治疗(who, dAction, dOption) {
    const skobj = dOption.obj;
    // who.wlog("治疗");
    const tobjs = get_tobjs(dOption);
    if (!tobjs) {
      return;
    }
    if (skobj.needAoeK()) {
      dOption.aoeK = skobj.getAoeK(tobjs.length);
    }
    const obj = dOption.obj;
    const val = dAction["值"];
    who.pushAction(defines.Action.Heal, {
      skill: obj.skillID(),
    });
    who.isDebug() && who.debuglog(who.name(), " 治疗, 目标数：", dOption.tobjs && dOption.tobjs.length);
    for (let i = 0; i < tobjs.length; i++) {
      const tobj = tobjs[i];
      let hp = who.transParam(val, dOption, tobj);
      if (dOption.aoeK > 0) {
        hp *= dOption.aoeK;
      }
      // who.wlog("治疗3", hp);
      if (!_u.isNumber(hp) || hp <= 0) {
        continue;
      }
      who.isDebug() && who.debuglog(who.name(), " 治疗", tobj.name(), "治疗量:", hp);
      const reduceHeal = tobj.getAttr("ReduceHeal");
      const incrHeal = tobj.getAttr("IncrHeal");
      const ratio = -reduceHeal + incrHeal;
      if (ratio !== 0) {
        who.isDebug() && who.debuglog(who.name(), " 治疗", tobj.name(), "reduceHeal", reduceHeal, "incrHeal", incrHeal);
        hp = Math.max(0, hp * (1 + (ratio * 0.01)));
      }
      hp *= who.m_War.getHealRatio();
      hp = Math.round(hp);
      if (!_u.isNumber(hp) || hp <= 0) {
        continue;
      }
      // who.wlog("治疗4", hp, tobj.ID(), tobj.name());
      const iActualHp = tobj.addHp(hp);
      who.isDebug() && who.debuglog(who.name(), " 治疗", tobj.name(), "实际治疗量:", iActualHp);
      who.pushAction(defines.Action.BeHeal, {
        tobjID: tobj.objID(),
        hp,
      });
      who.pushAction(defines.Action.SkillEffect, {
        tobjID: tobj.objID(),
        name: defines.getSkill_HitEffectName(obj.tplID()),
      });
    }
    delete dOption.aoeK;
  },
  更改全局普攻次数(who, dAction, dOption) {
    const num = dAction["值"];
    who.m_War.setDamTimes(who.team(), num);
  },
  选择技能(who, dAction, dOption) {
    const sid = dAction["编号"];
    const iPrior = dAction["优先级"] || 0;
    const iCurPrior = who.getTemp("NextSkillIDPrior");
    if (iCurPrior && iPrior < iCurPrior) {
      return;
    }
    who.setTemp("NextSkillIDPrior", iPrior);
    who.setTemp("NextSkillID", sid);
  },
  扣血(who, dAction, dOption) {
    const val = dAction["值"];
    let hittype = dAction.HitType;
    if (hittype == null) {
      hittype = defines.HitType.NormalDam;
    }
    let dam = who.transParam(val, dOption);
    dam = Math.ceil(dam);
    if (dam > 0) {
      who.addHp(-dam);
      const dActionData = {
        tobjID: who.objID(),
        dam,
        c: false,
        die: who.isDie() ? 1 : null,
        h: hittype,
      };
      dActionData.atkerID = who.objID();
      who.pushAction(defines.Action.BeAttack, dActionData);
    }
  },
  // 中毒buff的行为，扣的是who
  中毒扣血(who, dAction, dOption) {
    const val = dAction["值"];
    let dam = who.transParam(val, dOption);
    dam = who.calDamByTobj(who, dam, false); // 中毒要计算防御
    if (!(dam > 0)) {
      dam = 1;
    }
    // who.wlog("[中毒扣血] lv:", dOption.obj.lv(), "dam:", dam);
    who.addHp(-dam);
    who.pushAction(defines.Action.BeAttack, {
      tobjID: who.objID(),
      dam,
      die: who.isDie() ? 1 : null,
      h: defines.HitType.ToxicDam,
    });

    who.trigger("中毒攻击后", {
      tobj: who,
      dam,
    });
  },
  自定义(who, dAction, dOption) {
    const obj = dOption.obj;
    const iIdx = dAction["编号"];
    const dCustom = obj.m_Data.Custom;
    const func = dCustom[iIdx];
    return func(who, dAction, dOption);
  },
  更新临时属性(who, dAction, dOption) {
    const sAttr = dAction["属性"];
    const sRefreshAttr = dAction["刷新属性"];
    const sType = dAction["类型"] || "set"; // "add"
    let val = dAction["值"];
    val = who.transParam(val, dOption);
    if (sType === "set") {
      if (val != null) {
        who.setTemp(sAttr, val);
      } else {
        who.delTemp(sAttr, val);
      }
    } else {
      who.addTemp(sAttr, val);
    }
    if (sRefreshAttr) {
      who.refreshAttr(sRefreshAttr, null, null, "action");
    }
  },
  更改技能(who, dAction, dOption) {
    const iSkillID = dAction["编号"];
    who.setTemp("ChangeSkill", iSkillID);
    // who.wlog("更改技能",who.name());
  },
  修改暴击倍率(who, dAction, dOption) {
    let val = dAction["值"];
    if (!_u.isNumber(dOption.CriDam)) {
      return;
    }
    val = who.transParam(val, dOption);
    // who.wlog('修改暴击倍率', dOption.CriDam, "->", val);
    dOption.CriDam = val;
  },
  删除状态临时值(who, dAction, dOption) {
    const obj = dOption.obj;
    if (obj && obj.m_skobj && !obj.m_skobj.isEnded()) {
      const stateID = obj.stateID();
      obj.m_skobj.delAllTempByState(stateID);
    }
  },
  设置临时值(who, dAction, dOption) {
    const obj = dOption.obj;
    const sVar = dAction["变量"];
    let val = dAction["值"];
    const stateSID = dAction["状态"];
    val = who.transParam(val, dOption);
    if (stateSID) {
      obj.setTempByState(stateSID, sVar, val);
    } else {
      obj.setTemp(sVar, val);
    }
    who.isDebug() && who.debuglog(who.name(), "设置临时值", sVar, val);
  },
  增加临时值(who, dAction, dOption) {
    const obj = dOption.obj;
    const sVar = dAction["变量"];
    let val = dAction["值"];
    const stateSID = dAction["状态"];
    val = who.transParam(val, dOption);
    if (stateSID) {
      obj.addTempByState(stateSID, sVar, val);
    } else {
      obj.addTemp(sVar, val);
    }
    who.isDebug() && who.debuglog(who.name(), "增加临时值", sVar, val);
  },
  删除临时值(who, dAction, dOption) {
    const obj = dOption.obj;
    const sVar = dAction["变量"];
    const stateSID = dAction["状态"];
    if (stateSID) {
      obj.delTempByState(stateSID, sVar);
    } else {
      obj.delTemp(sVar);
    }
    who.isDebug() && who.debuglog(who.name(), "删除临时值", sVar);
  },
  吸收伤害(who, dAction, dOption) {
    who.isDebug() && who.debuglog(who.name(), "吸收伤害");
    const obj = dOption.obj;
    const sVar = dAction["变量"];
    const sType = dAction["类型"];
    if (sType && sType === "技能" && dOption.isNormalAtk) {
      return;
    }
    let iLeftAbsorb = obj.getTemp(sVar);
    if (iLeftAbsorb <= 0) {
      return;
    }
    const dam = dOption.dam;
    if (!(dam > 0)) {
      return;
    }
    let iAbsorb;
    if (iLeftAbsorb >= dam) {
      iAbsorb = dam;
      iLeftAbsorb -= iAbsorb;
      dOption.dam = 0;
      dOption.ab = iAbsorb;
      obj.setTemp(sVar, iLeftAbsorb);
    } else {
      iAbsorb = iLeftAbsorb;
      dOption.dam -= iLeftAbsorb;
      dOption.ab = iAbsorb;
      obj.setTemp(sVar, 0);
    }
    who.isDebug() && who.debuglog(who.name(), "吸收伤害, 吸收量:", iAbsorb);
    obj.trigger("吸收伤害后", dOption);
  },
  清除伤害(who, dAction, dOption) {
    if (dOption) {
      delete dOption.dam;
    }
  },
  加状态(who, dAction, dOption) {
    // who.wlog("[加状态] dOption", dOption.tobj != null, dOption.tobjs && dOption.tobjs.length);
    const skobj = dOption.obj;
    const tobjs = get_tobjs(dOption);
    if (!tobjs) {
      // who.wlogErr("AddState 没有目标", skobj.CType(), dOption.debugTag, skobj.skillID && skobj.skillID(), skobj.stateID && skobj.stateID());
      return;
    }
    const iStateSID = dAction["编号"];
    let iTimeLen = dAction["时长"];
    let roundNum = dAction["回合"];
    let icon = dAction["图标"];
    const buffname = dAction.buffname;
    const posType = dAction.posType;
    if (icon) {
      icon = who.transParam(icon, dOption);
      dOption.icon = icon;
    }
    if (buffname) {
      dOption.buffname = buffname;
    }
    if (posType != null) {
      dOption.posType = posType;
    }
    iTimeLen = iTimeLen && who.transParam(iTimeLen, dOption);
    roundNum = roundNum && who.transParam(roundNum, dOption);
    who.isDebug() && who.debuglog(who.name(), "[加状态] 状态编号：", iStateSID, "时长：", iTimeLen);
    if (iTimeLen === -1 || (iTimeLen == null && roundNum == null)) {
      who.wlogErr("AddState iTimeLen -1");
      return;
    }
    const dStateData = StateData[iStateSID];
    const dStateConfig = mbgGame.config[`skillstate${iStateSID}`];
    if (!dStateData || !dStateConfig) {
      who.wlogErr("AddState no state, SID:", iStateSID);
      return;
    }
    // who.wlog("AddState  SID:", iStateSID, tobjs.length);
    // AddType:
    // 唯一：目标已有此状态时，不能再添加同个状态
    // 覆盖：目标已有此状态时，先删除原来了，然后再继续添加
    // 刷新：目标已有此状态时，不需要添加状态，而仅仅是刷新原状态的持续时间
    // 叠加：不管有没此状态，都添加新的
    // Duration:
    // Note：AddType为刷新时才会用到Duration
    // 刷新: 目标已有此状态时，持续时间重置为新的
    // 叠加：目标已有此状态时，持续时间加上新的
    for (let i = 0; i < tobjs.length; i++) {
      const tobj = tobjs[i];
      if (tobj.isDie()) {
        const ignoreDie = dAction["无视死亡"];
        if (!ignoreDie) {
          return;
        }
      }
      if (dStateData.Resist) {
        // 控制类buff要做一个概率判断
        /* 命中率=（施法者技能等级-受击者人物等级）%+（施法者命中-受击者敏捷）+75% 
        小于0时取0
        基础命中75%配常数表
        技能的伤害百分百命中，只有控制部分进行判断
        技能被抵抗，用类似闪避的飘字
        */
        let ratio = skobj.lv() - tobj.lv() + skobj.m_Owner.getAttr('Hit') - tobj.getAttr('Dodge') + mbgGame.config.constTable.CtrlBuffRatio;
        ratio = Math.max(0, ratio);
        // who.wlog("ctrl buff ratio", ratio, skobj.lv(), tobj.lv(), skobj.m_Owner.getAttr('Hit'), tobj.getAttr('Dodge'));
        const iRan = who.m_War.randomInt(0, 10000);
        if (iRan > ratio * 100) {
          // 触发抵抗
          tobj.pushAction(defines.Action.Resist, {
            tobjID: tobj.objID(),
          });
          continue;
        }
      }
      // 免疫判断
      if (tobj.isImmune(dStateConfig.Type)) {
        continue;
      }

      let cr = 0;
      let round = roundNum;
      // 回合数补偿机制1（控制buff、反刺buff）
      if (round && dStateData.AddRound1 && tobj.isNormalAtking()) {
        round += dStateData.AddRound1;
        //  who.wlog("[state cr] 1 SID", iStateSID);
        cr = 1; // compensate round 补偿标记，为了解决客户端图标2变1问题
      }
      // 回合数补偿机制2，和普攻是否触发有关系得buff，例如研究研究加攻buff
      if (round && dStateData.AddRound2 && tobj.isNormalAtkingBack()) {
        round += dStateData.AddRound2;
        //  who.wlog("[state cr] 2 SID", iStateSID);
        cr = 1;
      }
      let stobj;
      const old_stobj = _u.find(tobj.m_StateDict, (_stobj) => {
        return _stobj.m_SID === iStateSID;
      });
      let bNeedCreate = true;
      if (dStateData.AddType === "唯一") {
        if (old_stobj) {
          who.isDebug() && who.debuglog("[加状态] 失败，已有该状态", iStateSID);
          return;
        }
      } else if (dStateData.AddType === "覆盖") {
        tobj.removeStateBySID(iStateSID);
      } else if (dStateData.AddType === "刷新") {
        if (old_stobj) {
          bNeedCreate = false;
          stobj = old_stobj;
        }
      } else if (dStateData.AddType === "叠加") {
        // ss
      }

      if (bNeedCreate) {
        const dData = {
          lv: skobj.lv(),
          star: skobj.star(),
          lefttime: iTimeLen,
          round,
        };
        // who.wlog("iTimeLen", iTimeLen, "iStateSID", iStateSID);
        stobj = new CState(iStateSID, tobj, dData, skobj);
        stobj.m_CauserID = who.objID();
        tobj.addState(stobj, dOption, cr);
        if (typeof (skobj.isActiveSkill) !== "function") {
          who.wlogErr("skobj.isActiveSkill no a function ", skobj.isActiveSkill, skobj.CType());
        }
        if (!skobj.isActiveSkill() && !stobj.isEnded() && tobj === who) {
          // 被动技能给自己加的state，当被动技能end时要删除这个state
          skobj.refState(stobj);
        }
        who.isDebug() && who.debuglog(who.name(), "[加状态] 成功, 状态编号:", iStateSID, "时长：", iTimeLen);
      } else if (dStateData.Duration === "刷新") {
        if (iTimeLen) {
          stobj.setAutoRemove(iTimeLen);
        }
        if (round) {
          stobj.setAutoRemoveByRound(round);
        }
        stobj.refreshState(cr);
        who.isDebug() && who.debuglog(who.name(), "[加状态] 已存在，刷新, 状态编号:", iStateSID, "时长：", iTimeLen);
        stobj.trigger("刷新", dOption);
      } else if (dStateData.Duration === "叠加") {
        if (iTimeLen) {
          stobj.addAutoRemoveTime(iTimeLen);
        }
        if (round) {
          const iLeftRound = stobj.getLeftRound();
          stobj.setAutoRemoveByRound(iLeftRound + round);
        }
        stobj.refreshState(cr);
      }
    }
  },
  删状态(who, dAction, dOption) {
    const iType = dAction["类型"];
    const stateSID = dAction["编号"];
    const reason = dAction.reason;
    const force = true;
    const tobjs = get_tobjs(dOption);
    if (!tobjs) {
      return;
    }
    for (let i = 0; i < tobjs.length; i++) {
      const tobj = tobjs[i];
      if (stateSID) {
        tobj.removeStateBySID(stateSID, { force, reason });
      } else {
        tobj.removeStateByType(iType, { force, reason });
      }
    }
  },
  结束状态(who, dAction, dOption) {
    const obj = dOption.obj;
    if (obj) {
      obj.end(null, 'action.end');
    }
  },
  免疫(who, dAction, dOption) {
    const obj = dOption.obj;
    who.addImmune(obj.ID(), dAction['类型']);
  },
  结束免疫(who, dAction, dOption) {
    const obj = dOption.obj;
    who.removeImmune(obj.ID(), dAction['类型']);
  },
  掉落(who, dAction, dOption) {
    const sType = dAction["类型"];
    let val = dAction["值"];
    val = who.transParam(val, dOption);
    const oWar = who.m_War;
    const worldIdx = oWar.worldIdx();
  },
  刷新属性(who, dAction, dOption) {
    const sAttr = dAction["属性"];
    const obj = dOption.obj;
    if (obj.CType() === "CSkill") {
      who.refreshPassiveSkillAttr(sAttr);
    } else {
      who.refreshStateAttr(sAttr);
    }
    who.refreshAttr(sAttr, null, null, "action");
  },
  触发被动(who, dAction, dOption) {
    const obj = dOption.obj;
    const skillID = obj.skillID();
    const skillIdx = obj.skillIdx();
    const times = dAction["次数"];// 喊话次数控制
    if (times && who.getTemp(`${skillID}tri`) >= times) {
      return;
    }
    who.addTemp(`${skillID}tri`, 1);
    who.pushAction(defines.Action.TriggerPassiveSkill, {
      skill: skillID,
      idx: skillIdx,
    });

  },
  强制暴击(who, dAction, dOption) {
    dOption.critic = true;
  },
  不扣能量(who, dAction, dOption) {
    dOption.free = true;
  },
  阻止施法(who, dAction, dOption) {
    dOption.forbid = true;
  },
  队伍临时值(who, dAction, dOption) {
    const k = dAction["键"];
    let v = dAction["值"];
    v = who.transParam(v, dOption);
    v = Math.round(v);
    who.m_War.setTeamTemp(who.team(), k, v);
    who.pushAction(defines.Action.TeamTemp, {
      t: who.team(),
      k,
      v,
    });
  },
  额外伤害加成(who, dAction, dOption) {
    let mul = dAction.mul;
    mul = who.transParam(mul, dOption);
    dOption.mul = mul;
  },
  // 中屏消息
  错误(who, dAction, dOption) {
    who.m_Listener.send2CByTeam("Error", {
      err: dAction.err(),
      team: who.team(),
    });
  },
  跳字(who, dAction, dOption) {
    const dData = {};
    if (dAction.i18n) {
      dData.i18n = dAction.i18n;
      if (dAction.a) {
        dData.a = who.transParam(dAction.a, dOption);
      }
    } else {
      dData.msg = who.transParam(dAction.msg, dOption);
    }
    if (dAction.n) dData.n = dAction.n;
    who.pushAction(defines.Action.FloatMsg, dData);
  },
  对白(who, dAction, dOption) {
    const dData = {};
    if (dAction.i18n) {
      dData.i18n = dAction.i18n;
    } else {
      dData.msg = who.transParam(dAction.msg, dOption);
    }
    who.pushAction(defines.Action.Say, dData);
  },
  加能量(who, dAction, dOption) {
    const val = dAction["值"];
    const iAdd = who.transParam(val, dOption);
    who.m_War.addEnergy(who.team(), iAdd);
    who.m_War.onEnergyChanged(who.team());
    dOption.energyAdd = iAdd;
  },
  免费技能(who, dAction, dOption) {
    const iSkillID = defines.getCharaActiveSkillID(who.ID());
    who.pushToWaitingSkill(iSkillID);
  },
  // 临时增加消耗，用主技后恢复正常
  设置能量消耗(who, dAction, dOption) {
    let val = dAction["值"];
    val = who.transParam(val, dOption);
    who.setTemp('EnergyAdd', val);
    const dData = {
      e: who.getSkillCostEnergy(),
    };
    // who.wlog("设置能量消耗", val, dData.e);
    who.pushAction(defines.Action.ExtraEnergyCost, dData);
  },
  全局自动施法(who, dAction, dOption) {
    let t = dAction["间隔"];
    t = who.transParam(t, dOption);
    who.m_War.beginAutoUseSkill(who.team(), t);
  },
  停止全局自动施法(who, dAction, dOption) {
    who.m_War.stopAutoUseSkill();
  },
  全局自动杀怪(who, dAction, dOption) {
    let t = dAction["间隔"];
    t = who.transParam(t, dOption);
    who.m_War.beginAutoKillMonster(t);
  },
  停止全局自动杀怪(who, dAction, dOption) {
    who.m_War.stopAutoKillMonster();
  },
};


module.exports = ActionData;