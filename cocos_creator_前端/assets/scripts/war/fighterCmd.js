const defines = require('warDefines');
const fighterBase = require('fighterBase');

/*
    处理服务器发过来的各种Action
*/

cc.Class({
    extends: fighterBase,
    properties: {
        // 这个文件不需要关联任何UI的东西
    },
    onLoad() {
    },
    handleAction(lstActions) {
        // 找到对应的fighter
        let useskill = false;
        let tFighter = null;
        let skillID = null;
        const fighter = this.fighter();
        const warCom = fighter.warCom();
        for (let i = 0; i < lstActions.length; i++) {
            const arr = lstActions[i];
            const iActionID = arr[0];
            const dParam = arr[1];
            const tobjID = dParam.tobjID;
            //  mbgGame.log("[handleAction]", iActionID, dParam);
            if (tobjID) {
                tFighter = warCom.getFighterByObjID(tobjID);
            }
            if (iActionID === defines.Action.UseSkill) {
                fighter.setSkillLastUsedTime(dParam.t);
                emitter.emit("UseSkillEvent", fighter);
            } else if (iActionID === defines.Action.TriggerPassiveSkill) {
                this.ctrl().effectCtrl().yell(fighter.getSkillName(dParam.skill, dParam.idx));
            } else if (iActionID === defines.Action.SkillTarget) {
                tFighter = warCom.getFighterByObjID(dParam.tobjIDs[0]);
            } else if (iActionID === defines.Action.ShowSkill) {
                if (fighter.isDie()) {
                    continue;
                }
                fighter.ctrl().playSkillSound();
                skillID = dParam.skillID;
                warCom.playSound(this.fighter().getMTplConfig().UseSound || 'se_hit');
                const tplID = dParam.tplID;
                const duration = dParam.duration;
                this.FSM().setState("skill", {
                    target: tFighter,
                    skillID,
                    tplID,
                    duration,
                });
            } else if (iActionID === defines.Action.Attack) {
                // 攻击
                if (dParam.skill) {
                    useskill = true;
                    skillID = dParam.skill;
                } else if (this.FSM().getState() !== 'die') {
                    if (!tFighter) {
                        cc.warn("Normal Attack but no tFighter", dParam);
                    }
                    this.FSM().setState("attack", {
                        target: tFighter,
                        critic: dParam.c,
                        t: dParam.t,
                        force: true, // 可能因为延迟，fighter还在skill状态，可以强行切到attack
                    });
                }
            } else if (iActionID === defines.Action.BeAttack) {
                // 受击
                this.onAttackEndCB(tobjID, useskill, skillID, dParam);
                if (!dParam.m && dParam.h !== defines.HitType.AutoKill && dParam.h !== defines.HitType.Curse) {
                    warCom.uiWar.addXPS(fighter.getStandTeam(), "DPS", dParam.dam);
                    warCom.uiWar.updateXPS(fighter.getStandTeam(), "DPS");
                }
                tFighter = null;
            } else if (iActionID === defines.Action.Resist) {
                tFighter && tFighter.ctrl().hurt({ type: 'resist', numType: 'resist' });
            } else if (iActionID === defines.Action.SkillEffect) {
                // 播放技能受击动画
                tFighter && tFighter.ctrl().showHurtEffect(dParam.name);
            } else if (iActionID === defines.Action.Heal) {
                if (dParam.skill) {
                    useskill = true;
                }
            } else if (iActionID === defines.Action.BeHeal) {
                if (tFighter.fighter().hpPercent() < 0.3) {
                    tFighter.ctrl().selfTalk(4);
                }
                tFighter.ctrl().heal(dParam.hp);
                mbgGame.playSound('BT_Heal');
            } else if (iActionID === defines.Action.Recover) {
                fighter.setHp(dParam.hp);
            } else if (iActionID === defines.Action.FullRecover) {
                this.ctrl().heal(dParam.maxHp, dParam.nolabel);
            } else if (iActionID === defines.Action.RefreshHp) {
                fighter.setHp(dParam.hp);
            } else if (iActionID === defines.Action.HaltSkill) {
                const ok = this.ctrl().haltSkill();
                if (ok) { // 服务端打断，需要气泡提示
                    this.ctrl().say({
                        text: mbgGame.getString("haltskill"),
                        aboutHide: true,
                    });
                }
            } else if (iActionID === defines.Action.AddState) {
                tFighter.ctrl().addBuff(dParam);
            } else if (iActionID === defines.Action.DelState) {
                tFighter.ctrl().delBuff(dParam);
            } else if (iActionID === defines.Action.RefreshState) {
                tFighter.effectCtrl().addBuff(dParam);
                tFighter.ctrl().refreshBuff(dParam);
            } else if (iActionID === defines.Action.UpdateStateRound) {
                fighter.ctrl().refreshBuffRound(dParam.r);
            } else if (iActionID === defines.Action.FloatMsg) {
                // TODO 颜色问题
                this.ctrl().floatMsg({
                    msg: dParam.msg || mbgGame.getString(dParam.i18n, dParam),
                    f: mbgGame.FontSkill,
                    numType: dParam.n,
                });
            } else if (iActionID === defines.Action.Say) {
                if (dParam.msg) {
                    this.ctrl().say({
                        text: dParam.msg,
                        aboutHide: true,
                    });
                } else if (dParam.i18n) {
                    this.ctrl().say({
                        text: mbgGame.getString(dParam.i18n, dParam),
                        aboutHide: true,
                    });
                }
            } else if (iActionID === defines.Action.Msg) {
                if (dParam.err) {
                    let err;
                    if (typeof (dParam.err) === "number") {
                        err = mbgGame.getString(`errcode${dParam.err}`);
                    } else {
                        err = dParam.err;
                    }
                    mbgGame.managerUi.floatMessage(err);
                }
            } else if (iActionID === defines.Action.ExtraEnergyCost) {
                fighter.warCom().setExtraCostEnergy(fighter.charaID(), dParam.e);
                fighter.btnCtrl() && fighter.btnCtrl().updateSkillBtn("ExtraEnergyCost");
            } else if (iActionID === defines.Action.TeamTemp) {
                fighter.warCom().setTeamTemp(dParam.t, dParam.k, dParam.v);
            } else if (iActionID === defines.Action.SetAttr) {
                if (fighter) {
                    fighter.setAttr(dParam.attr, dParam.val);
                    if (fighter.getAttr('dizzy') <= 0 && dParam.val > 0) {
                        mbgGame.playSound('BT_Stun');
                    }
                }
            }
        }
    },
    onAttackEndCB(tobjID, useskill, skillID, dParam) {
        const fighter = this.fighter();
        const warCom = fighter.warCom();
        // mbgGame.log("[onAttackEndCB]", useskill, skillID)
        const tFighter = warCom.getFighterByObjID(tobjID);
        if (!tFighter) {
            return;
        }
        const hittype = dParam.h;
        let fontID;
        // 把伤害类型转成字体类型
        if (useskill ||
            hittype === defines.HitType.ExtraDam ||
            hittype === defines.HitType.ReflectDam ||
            hittype === defines.HitType.Curse ||
            hittype === defines.HitType.AutoKill) {
            fontID = mbgGame.FontSkill;
        } else if (hittype === defines.HitType.ToxicDam) {
            fontID = mbgGame.FontPoison;
        }
        if (dParam.c) {
            fontID = mbgGame.FontCritic;
            mbgGame.playSound('BT_Crit');
        } else {
            mbgGame.playSound('BT_Hit');
        }
        dParam.f = fontID || mbgGame.FontNormal;
        if (dParam.m) {
            tFighter.FSM().setState('miss', dParam);
            return;
        }
        if (dParam.dam > 0) {
            if (hittype === defines.HitType.ReflectDam) {
                dParam.numType = 'reflect';
                tFighter.ctrl().hurt(dParam);
            } else if (hittype === defines.HitType.AutoKill) {
                tFighter.ctrl().hurt(dParam);
                tFighter.ctrl().say({
                    text: mbgGame.getString(`autokillsay`),
                    aboutHide: true,
                    hideDelay: 2,
                });
            } else {
                tFighter.ctrl().hurt(dParam);
            }
        }
        if (dParam.ab) { // 吸收的伤害，单独做一次跳字
            const _dParam = _.clone(dParam);
            _dParam.type = 'absorb';
            _dParam.dam = dParam.ab;
            _dParam.numType = dParam.f === mbgGame.FontNormal ? 'absorbWhite' : 'absorb';
            tFighter.ctrl().hurt(_dParam);
        }
        if (dParam.die) {
            if (dParam.atkerID) {
                const atkFighter = warCom.getFighterByObjID(dParam.atkerID);
                if (atkFighter) {
                    atkFighter.ctrl().selfTalk(1);
                }
            }
            tFighter.ctrl().die('attacked');
        }

    },
});