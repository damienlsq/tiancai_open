const labdefines = require('labdefines');

const Type = {
  Auto: 0,
  Msg: 1,
  Click: 2, // fix y
  Click2: 3,
};

const TeachList = {
  story: [
    [Type.Click, 'storypage', {
      btnpos: cc.v2(-53, -519),
      scale: 0.7,
      msg: '点击进入冒险模式',
      msgpos: cc.v2(-53, -430),
    }],
    [Type.Click, 'storywar', {
      btnpos: cc.v2(0, 300),
      msg: '点击选择冒险剧本',
      msgpos: cc.v2(0, 390),
    }],
    [Type.Click, 'chapter', {
      btnpos: cc.v2(0, 305),
      msg: '点击选择冒险篇章',
      msgpos: cc.v2(0, 195),
    }],
    [Type.Click, 'stage', {
      btnpos: cc.v2(222, 302),
      msg: '点击选择篇章小节',
      msgpos: cc.v2(150, 190),
    }],
    [Type.Click2, 'fight', { btnpos: cc.v2(0, -445) }],
  ],
  wakeup: [
    [Type.Click, 'charapage', {
      btnpos: cc.v2(53, -519),
      scale: 0.7,
      msg: '点击进入「天才休息室」',
      msgpos: cc.v2(53, -430),
    }],
    [Type.Click, 'chara6', {
      btnpos: cc.v2(-186, -120),
      //   msg: '选择已解锁的角色。',
      msgpos: cc.v2(-186, 120),
    }],
    [Type.Msg, 'info', '唤醒天才需要一定的时间，一次只能唤醒一位天才。'],
    [Type.Click, 'wakeupchara6', {
      btnpos: cc.v2(205, 400),
      msg: '点击唤醒「天才」',
      msgpos: cc.v2(200, 300),
    }],
  ],
  chara: [
    [Type.Click, 'charapage', {
      btnpos: cc.v2(53, -519),
      scale: 0.7,
      msg: '点击进入「天才休息室」',
      msgpos: cc.v2(53, -430),
    }],
    [Type.Msg, 'info', '这里是升级角色与道具的地方。'],
    [Type.Click, 'chara2', {
      btnpos: cc.v2(-95, 30),
      msg: '随着剧情的推进，\n会解锁更多的角色。',
      msgpos: cc.v2(-95, 140),
    }],
    [Type.Click, 'chara1', {
      btnpos: cc.v2(-186, 30),
      msg: '选择已解锁的角色。',
      msgpos: cc.v2(-186, 120),
    }],
    [Type.Click, 'skill1', {
      btnpos: cc.v2(210, 273),
      msg: '升级主动技能。',
      msgpos: cc.v2(210, 360),
    }],
    [Type.Click, 'skill2', {
      btnpos: cc.v2(210, 177),
      msg: '升级被动技能。',
      msgpos: cc.v2(210, 264),
    }],
    [Type.Click, 'chara1head', {
      btnpos: cc.v2(-230, 385),
      msg: '点击头像\n查询角色详细信息。',
      msgpos: cc.v2(0, 385),
    }],
    [Type.Click2, 'skill', {
      btnpos: cc.v2(-75, 185),
      msg: '点击查看主动技能与\n被动技能的详细信息。',
      msgpos: cc.v2(150, 200),
    }],
    [Type.Click2, 'quit', {
      btnpos: cc.v2(267, 400),
      msg: '点击确定、右上角的「X」按钮、\n或空白处，都可以关闭窗口。',
      scale: 0.7,
      msgpos: cc.v2(-60, 400),
    }],
    [Type.Click, 'storypage', {
      btnpos: cc.v2(-53, -519),
      scale: 0.7,
      msg: '准备就绪后，继续「冒险」，\n以解锁更多角色。',
      msgpos: cc.v2(-53, -430),
    }],
  ],
  item: [
    [Type.Click, 'charapage', {
      btnpos: cc.v2(53, -519),
      scale: 0.7,
      msg: '点击进入「天才休息室」',
      msgpos: cc.v2(53, -430),
    }],
    [Type.Click, 'itembtn', {
      btnpos: cc.v2(160, -410),
      msg: '点击查看「道具」',
      msgpos: cc.v2(160, -300),
    }],
    [Type.Click, 'item1', {
      btnpos: cc.v2(-235, 380),
      msgpos: cc.v2(-250, 280),
      msg: '这些都是你获得的道具',
      arrow: 'LT',
    }],
    [Type.Click, 'item2', {
      btnpos: cc.v2(-235, 380),
      msgpos: cc.v2(-250, 260),
      msg: '颜色代表道具的品质，从低到高分别是：\n绿、蓝、紫、橙。\n品质越高，道具越稀有，附加属性也越多。',
      arrow: 'LT',
    }],
    [Type.Click, 'item3', {
      btnpos: cc.v2(-235, 380),
      msgpos: cc.v2(-250, 250),
      msg: '左上角的英文代表道具的评级，\n从低到高分别是：\nD、C、B、A、S\n评级越高，基础属性更高。',
      arrow: 'LT',
    }],
    [Type.Click, 'item4', {
      btnpos: cc.v2(-235, 380),
      msgpos: cc.v2(-250, 270),
      msg: '右下角数字代表的是道具的等级，\n等级越高，整体属性越高。',
      arrow: 'LT',
    }],
    [Type.Msg, 'info', '道具在各种模式下，均可在出战前装备。'],
    [Type.Click, 'storypage', {
      btnpos: cc.v2(-53, -519),
      scale: 0.7,
      msg: '进入「冒险模式」获取更多道具吧！',
      msgpos: cc.v2(-53, -430),
    }],
  ],
  equip: [ // 已经打开布阵界面
    [Type.Click2, 'clickitem', {
      btnpos: cc.v2(-217, -15),
      msg: '选择一个道具',
      msgpos: cc.v2(-210, -115),
    }],
    [Type.Click2, 'equipitem', {
      btnpos: cc.v2(135, -325),
      msgpos: cc.v2(135, -255),
      msg: '点击装备上道具',
    }],
    [Type.Click2, 'equipitem2', {
      btnpos: cc.v2(210, 175),
      msgpos: cc.v2(225, 65),
      msg: '选择需要装备道具的天才',
      arrow: "RT",
    }],
    [Type.Click2, 'fight', { btnpos: cc.v2(0, -445) }],
  ],
  smelt: [ // 已经打开布阵界面
    [Type.Click2, 'clickitem', {
      btnpos: cc.v2(-217, -15),
      msg: '选择一个道具',
      msgpos: cc.v2(-210, -115),
    }],
    [Type.Click2, 'smeltitem', {
      btnpos: cc.v2(-135, -320),
      msgpos: cc.v2(-135, -215),
      msg: '点击升级道具',
    }],
    [Type.Msg, 'info', '升级道具需要融合其他道具，\n融合同名道具会获得双倍的基础经验。'],
  ],
  talent: [
    [Type.Click, 'labpage', {
      btnpos: cc.v2(-106 - 53, -519),
      scale: 0.7,
      msg: '点击进入「天才研究所」',
      msgpos: cc.v2(-96 - 53, -430),
    }],
    [Type.Auto, 'labscroll', labdefines.FloorType.Talent],
    [Type.Click, 'buildfloor', {
      btnpos: cc.v2(0, -40),
      msgpos: cc.v2(0, 60),
      msg: '点击建造「电激厅」',
    }, labdefines.FloorType.Talent],
    [Type.Click, 'opentalent', {
      btnpos: cc.v2(0, -40),
      msgpos: cc.v2(0, 60),
      msg: '进入「电激厅」',
    }],
    [Type.Msg, 'info', '通过电击，激发天才们的天赋，提升各个属性与技能。\n天才每提升5级，就可以学习新的天赋。\n电击的过程将消耗大量的斗币。'],
    [Type.Click2, 'uptalent', { btnpos: cc.v2(0, -440) }],
    [Type.Click2, 'uptalent', { btnpos: cc.v2(0, -440) }],
    [Type.Click2, 'uptalent', { btnpos: cc.v2(0, -440) }],
    [Type.Msg, 'info', '斗币如果不够，可以在历险篇奖励的箱子中获得。'],
  ],
  chest: [
    [Type.Click, 'labpage', {
      btnpos: cc.v2(-106 - 53, -519),
      scale: 0.7,
      msg: '点击进入「天才研究所」',
      msgpos: cc.v2(-96 - 53, -430),
    }],
    [Type.Auto, 'labscroll', labdefines.FloorType.Chest],
    [Type.Click, 'buildfloor', {
      btnpos: cc.v2(0, -40),
      msgpos: cc.v2(0, 60),
      msg: '点击建造「解码厅」',
    }, labdefines.FloorType.Chest],
    [Type.Click, 'clickchest', { btnpos: cc.v2(-200, -45) }],
    [Type.Click2, 'openchest', {
      btnpos: cc.v2(115, -220),
      msg: '暴力破解密码箱需要等待一段时间。\n破解密码箱可获得大量的道具。',
      msgpos: cc.v2(0, -320),
    }],
    [Type.Click, 'clickchest', { btnpos: cc.v2(-200, -45) }],
    [Type.Click2, 'openchest2', {
      btnpos: cc.v2(115, -220),
      msg: '立即破解箱子需要消耗钻石，\n你们才刚刚被唤醒，\n让我破例帮助你们一次吧。',
      msgpos: cc.v2(0, -320),
    }],
  ],
};

cc.Class({
  extends: cc.Component,

  properties: {
    bg: cc.Node,
    smallBtn: cc.Node,
    centerTeach: cc.Node,
    posTeach: cc.Node,
  },
  onLoad() {
  },
  setBgClickEnabled(b) {
    this.m_bgClickEnabled = b;
  },
  showTeach(key) {
    if (this.m_key) {
      return;
    }
    this.m_key = key;
    mbgGame.log("showTeach", key);
    this.node.active = true;
    this.beginTeach(TeachList[key]);
  },
  isShowingTeach() {
    return this.m_teachList != null;
  },
  beginTeach(lst) {
    this.m_teachList = lst;
    this.m_teachIdx = -1;
    this.nextTeach();
  },
  nextTeach() {
    this.m_teachIdx += 1;
    if (this.m_teachIdx >= this.m_teachList.length) {
      delete this.m_teachList;
      delete this.m_teachIdx;
      this.node.active = false;
      let dData = mbgGame.player.getLocalItem('showteach');
      if (dData) {
        dData = JSON.parse(dData);
        delete dData[this.m_key];
        mbgGame.player.setLocalItem('showteach', JSON.stringify(dData));
      }
      this.m_key = null;
      return;
    }
    this.showStep(this.m_teachList[this.m_teachIdx]);
  },
  showStep(lst) {
    this.setBgClickEnabled(false);
    this.smallBtn.active = false;
    this.posTeach.active = false;
    const type = lst[0];
    let t = 0.5;
    if (type === Type.Auto) {
      const act = lst[1];
      const param = lst[2];
      switch (act) {
        case "labscroll":
          mbgGame.panelLab.scrollToFloorByType(param, t);
          break;
        default:
          t = 0.0001;
          this.doAction(act);
          break;
      }
      this.scheduleOnce(() => {
        this.nextTeach();
      }, t);
      return;
    }
    if (type === Type.Msg) {
      this.setBgClickEnabled(true);
      this.centerTeach.active = true;
      const label = this.centerTeach.getChildByName('label').getComponent(cc.RichText);
      label.string = lst[2];
    } else {
      this.centerTeach.active = false;
    }

    if (type === Type.Click || type === Type.Click2) {
      const dParam = lst[2];
      const btnpos = dParam.btnpos;
      const scale = dParam.scale;
      this.smallBtn.active = true;
      this.smallBtn.setScale(scale || 1);
      this.smallBtn.setPosition(type === Type.Click ? this.getFixedPos(btnpos) : btnpos);
      if (dParam.msg) {
        this.posTeach.active = true;
        const msgpos = dParam.msgpos;
        this.posTeach.setPosition(type === Type.Click ? this.getFixedPos(msgpos) : msgpos);
        const label = this.posTeach.getChildByName('label').getComponent(cc.RichText);
        const arrow = dParam.arrow || '1';
        mbgGame.resManager.setImageFrame(this.posTeach, 'images', `dialog${arrow}`);
        let anchor = 0.5;
        if (arrow.indexOf('R') !== -1) anchor = 1;
        if (arrow.indexOf('L') !== -1) anchor = 0;
        label.node.setAnchorPoint(cc.v2(anchor, 0.5));
        label.node.x = 0;
        label.node.y = 0;
        label.string = dParam.msg;
      }
    }
    this.onShowStep();
  },
  getBtnPos(type, dParam) {
    // const btnpos = dParam.btnpos;
  },
  getFixedPos(pos) {
    const p = cc.v2(pos.x, pos.y + ((pos.y >= 0 ? 1 : -1) * (mbgGame.fixed_y / 2)));
    mbgGame.log("getFixedPos", pos, p);
    return p;
  },
  onShowStep() {
    const clickType = this.m_teachList[this.m_teachIdx][1];
    mbgGame.log("onShowStep clickType", clickType);
    switch (clickType) {
      case 'beginitem':
        {
          const com = mbgGame.panelCharacters;
          if (com && com.nowMode === 2) com.changeMode();
          break;
        }
      default:
        break;
    }
  },
  onClickBg() {
    if (this.m_bgClickEnabled) {
      this.onClick();
    }
  },
  onClick() {
    const lst = this.m_teachList[this.m_teachIdx];
    const clickType = lst[1];
    mbgGame.log("onClick clickType", clickType);
    this.doAction(clickType, lst);
    this.nextTeach();
  },
  doAction(act, lst) {
    mbgGame.log("doAction", act);
    switch (act) {
      case 'storypage':
        mbgGame.sceneMenu._clickMode = true;
        mbgGame.sceneMenu.showPanel('panelStory');
        break;
      case 'storywar':
        mbgGame.panelStory.onShowWorld(6);
        break;
      case 'chapter':
        {
          const com = mbgGame.panelStory.getItemChapter(0);
          if (com) com.onEnter();
          break;
        }
      case 'stage':
        {
          const com = mbgGame.panelStory.getItemStage(0);
          if (com) com.onEnter();
          break;
        }
      case 'fight':
        mbgGame.schemeTeamEditor.onFinish();
        break;
      case 'chara2':
        mbgGame.panelCharacters.clickCharaByID(2);
        break;
      case 'charapage':
        mbgGame.sceneMenu.showPanel('panelCharacters');
        break;
      case 'labpage':
        mbgGame.sceneMenu.showPanel('panelLab');
        break;
      case 'info':
        this.centerTeach.active = false;
        break;
      case 'chara1':
        mbgGame.panelCharacters.clickCharaByID(1);
        break;
      case 'chara6':
        mbgGame.panelCharacters.clickCharaByID(6);
        break;
      case 'wakeupchara6':
        mbgGame.panelCharacters.getCharacterDetail().onClickUnlockBtn();
        break;
      case 'skill1':
        {
          const com0 = mbgGame.panelCharacters.getSkillInfo(0);
          const btn = com0.skillBtn;
          btn.runAction(cc.sequence(cc.scaleTo(0.1, 0.95), cc.scaleTo(0.1, 1.0)));

          com0.upgradeSkill();
          break;
        }
      case 'skill2':
        {
          const com1 = mbgGame.panelCharacters.getSkillInfo(1);
          const btn = com1.skillBtn;
          btn.runAction(cc.sequence(cc.scaleTo(0.1, 0.95), cc.scaleTo(0.1, 1.0)));
          com1.upgradeSkill();
          break;
        }
      case 'chara1head':
        mbgGame.managerUi.openWinCharaInfo(1);
        break;
      case 'skill':
        mbgGame.winCharaInfo.clickBtnExtra();
        break;
      case 'quit':
        emitter.emit("closeMe");
        break;
      case 'itembtn':
        {
          const com = mbgGame.panelCharacters;
          com.changeMode();
          break;
        }
      case 'opentalent':
        {
          const com = mbgGame.panelLab.getFloorCom(labdefines.FloorType.Talent);
          com.clickTalent();
          break;
        }
      case 'buildfloor':
        {
          mbgGame.panelLab.buildFloor(null, lst[3]);
          break;
        }
      case 'uptalent':
        {
          if (mbgGame.panelTalent) {
            const mainBtn = mbgGame.panelTalent.mainBtn;
            mainBtn.runAction(cc.sequence(cc.scaleTo(0.1, 0.95), cc.scaleTo(0.1, 1.0)));
            mbgGame.panelTalent.onUpgrade();
            mbgGame.playSound('UI_Shock', 2);
          }
          break;
        }
      case 'clickchest':
        {
          const com = mbgGame.panelLab.getFloorCom(labdefines.FloorType.Chest);
          const itemBattleChest = com.getChest(0);
          mbgGame.log("clickchest", itemBattleChest.m_Idx, itemBattleChest.getChestID());
          if (itemBattleChest) itemBattleChest.onClick();
          break;
        }
      case 'openchest':
        {
          if (mbgGame.winChestBox) {
            mbgGame.winChestBox.onConfirm();
          }
          break;
        }
      case 'openchest2':
        {
          if (mbgGame.winChestBox) {
            mbgGame.winChestBox.onConfirm();
          }
          break;
        }
      case 'clickitem':
        {
          const sidList = mbgGame.schemeTeamEditor.getSidList();
          const sid = sidList && sidList[0];
          if (sid) mbgGame.schemeTeamEditor.openItemInfo(sid);
          break;
        }
      case 'equipitem':
        {
          if (mbgGame.winItemInfo) mbgGame.winItemInfo.onEquip();
          break;
        }
      case 'equipitem2':
        {
          mbgGame.schemeTeamEditor.useItem(0);
          break;
        }
      case 'smeltitem':
        {
          if (mbgGame.winItemInfo) mbgGame.winItemInfo.onUpgrade();
          break;
        }
      default:
        break;
    }
  },
});