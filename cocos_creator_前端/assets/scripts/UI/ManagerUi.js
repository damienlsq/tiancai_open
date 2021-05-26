const sceneMenu = require('sceneMenu');
const defines = require('warDefines');
const gameTeach = require('gameTeach');

cc.Class({
  extends: cc.Component,

  properties: {
    sceneMenu,

    uiLayerWin: cc.Node,
    uiLayerDialog: cc.Node,

    btnPack: cc.Node,
    btnChara: cc.Node,

    floatMessagePre: cc.Node,
    floatFightMessagePre: cc.Node,

    dialogBubblePre: cc.Prefab,

    teach: gameTeach,
  },

  // use this for initialization
  onLoad() {
    mbgGame.managerUi = this;
    // cc.Camera.main.backgroundColor = cc.color(0, 0, 0, 0);

    this.faceValue = [1000000, 10000, 5000, 1000, 500, 100, 50, 10, 5, 1];
  },

  clearUIWin() {
    const removeObjs = [];
    this.uiLayerWin.children.forEach((x) => {
      removeObjs.push(x);
    });
    removeObjs.forEach((x) => {
      // mbgGame.log("[clearUIWin] remove ", x.name);
      if (x._UIScriptName) {
        const comp = x.getComponent(x._UIScriptName);
        if (comp && comp.closeMe) {
          comp.closeMe();
          return;
        }
      }
      x.destroy();
    });
    this.uiLayerWin.removeAllChildren();
  },
  addUIWin(node, script, needClear) {
    if (needClear) {
      this.clearUIWin();
    }
    // 严禁打开2个相同的名字窗口
    if (this.uiLayerWin.getChildByName(node.name)) {
      // mbgGame.error("addUIWin same name", node.name);
      return;
    }
    if (script) {
      node._UIScriptName = script;
    }
    this.uiLayerWin.addChild(node);
  },
  loadWin(name, node, script, ...args) {
    cc.loader.loadRes(`prefabs/${name}`, cc.Prefab, (err, res) => {
      mbgGame.addBaseWin(this.uiLayerWin, res, node, script, ...args);
    });
  },
  addFullWin(node, script, ...args) {
    return this.loadWin('winFull', node, script, ...args);
  },
  addNormalWin(node, script, ...args) {
    return this.loadWin('winNormal', node, script, ...args);
  },
  addSmallWin(node, script, ...args) {
    return this.loadWin('winSmall', node, script, ...args);
  },
  addTinyWin(node, script, ...args) {
    return this.loadWin('winTiny', node, script, ...args);
  },
  addNoFrameWin(node, script, ...args) {
    return this.loadWin('winNoFrame', node, script, ...args);
  },

  // 显示确定窗口
  createBoxSure(msg, action, link) {
    cc.loader.loadRes(`prefabs/winBoxSure`, cc.Prefab, (err, res) => {
      const node = cc.instantiate(res);
      this.addTinyWin(node, 'boxSure');
      node.getComponent("boxSure").initBox(msg, action, link);
    });
  },

  // 战斗飘字
  floatFightMessage(options, charaNode) {
    // mbgGame.performanceCheck('floatFightMessage', 'start', true);
    if (!this._fightMessagePool) {
      this._fightMessagePool = new cc.NodePool();
    }
    let node = this._fightMessagePool.get();
    if (!node) {
      node = cc.instantiate(this.floatFightMessagePre);
      node.active = true;
    }
    charaNode.addChild(node);
    node.getComponent("floatFightMessage").initMe(options);
    // mbgGame.performanceCheck('floatFightMessage', 'finish');
  },
  floatFightMessageFinish(node) {
    if (this._fightMessagePool) {
      this._fightMessagePool.put(node);
    } else {
      node.destroy();
    }
  },
  // type: itemAttrAni / skillAttrAni
  createWinAttrAni(dData, type) {
    const oldNode = this.uiLayerWin.getChildByName("winAttrAni");
    if (oldNode) {
      oldNode.destroy();
    }
    mbgGame.resManager.loadPrefab('winAttrAni', (prefab) => {
      const node = cc.instantiate(prefab);
      node.setName("winAttrAni");
      this.uiLayerWin.addChild(node);
      const com = node.getComponent("winAttrAni");
      com.initAttrAni(dData, type);
      const com2 = node.getComponent("effectWinOpenClose");
      com2.open(() => {
      });
    });
  },
  // 提示文字
  floatMessage(msg, atlas, fadeOutTime) {
    if (!msg) return;
    msg = msg.trim();
    if (!msg) return;
    mbgGame.floatMessageList = mbgGame.floatMessageList || [];
    const node = cc.instantiate(this.floatMessagePre);
    node.active = true;
    if (mbgGame.floatMessageList.length > 2) {
      const obj = mbgGame.floatMessageList.shift();
      obj.destroy();
    }
    for (let i = 0; i < mbgGame.floatMessageList.length; i++) {
      const obj = mbgGame.floatMessageList[i];
      obj.opacity = Math.min(obj.opacity, 128);
      obj.runAction(cc.fadeOut(fadeOutTime || 1.0));
      obj.runAction(cc.moveBy(0.1, 0, 30));
    }
    mbgGame.floatMessageList.push(node);
    this.uiLayerWin.addChild(node);
    node.getComponent("floatMessage").initMe(msg, atlas);
  },
  createGetAward(data) {
    if (data.id) {
      mbgGame.resManager.loadPrefab('rewardViewFull', (prefab) => {
        const node = cc.instantiate(prefab);
        this.addUIWin(node, 'rewardView');
        node.getComponent('rewardView').init(data);
      });
    } else {
      mbgGame.resManager.loadPrefab('rewardView', (prefab) => {
        const node = cc.instantiate(prefab);
        mbgGame.managerUi.addTinyWin(node, 'rewardView', data);
      });
    }
  },
  // 创建确认窗口
  createConfirmDialog(str, cb, data) {
    if (mbgGame.boxConfirm) {
      return;
    }
    cc.loader.loadRes(`prefabs/winBoxConfirm`, cc.Prefab, (err, res) => {
      const node = cc.instantiate(res);
      this.addTinyWin(node, 'boxConfirm', str, cb, data);
    });
  },
  createLineEditor(option, cb, data) {
    mbgGame.resManager.loadPrefab('winLineEditor', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addTinyWin(node, 'editboxConfirm');
      node.getComponent('editboxConfirm').init(option, cb, data);
    });
  },
  createMultiLineEditor(stringsObj, cb, data) {
    mbgGame.resManager.loadPrefab('winMultiLineEditor', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addTinyWin(node, 'editboxConfirm');
      node.getComponent('editboxConfirm').init(stringsObj, cb, data);
    });
  },
  // 显示怪物的非战时信息
  onShowMonsterInfoById(targetID, lv) {
    mbgGame.warMgr.warUtils().getMonsterInfo(targetID, lv, 'panel', (data) => {
      this.openWinCharaInfo(targetID, {
        charaData: data,
      });
    });
  },

  openWinCharaInfo(...args) {
    mbgGame.resManager.loadPrefab('winCharaInfo', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addNormalWin(node, 'winCharaInfo', ...args);
    });
  },

  splitCoinType0(coins) {
    const splitCoins = [];
    this.faceValue.forEach((e) => {
      while (coins >= e) {
        splitCoins.push(e);
        coins -= e;
      }
    });
    return splitCoins;
  },
  splitCoinType1(coins, count) {
    const splitCoins = [];
    const splitCount = count; // 张数
    const splitNum = Math.ceil(coins / splitCount);
    if (coins < splitCount) {
      splitCoins.push({
        num: coins,
      });
    } else {
      while (coins > 0) {
        if (coins > splitNum) {
          splitCoins.push({
            num: splitNum,
          });
        } else {
          splitCoins.push({
            num: coins,
          });
        }
        coins -= splitNum;
      }
    }

    for (let i = 0; i < splitCoins.length; i++) {
      let icon = 0;
      for (let j = this.faceValue.length - 1; j >= 0; j--) {
        if (splitCoins[i].num >= this.faceValue[j]) {
          icon = this.faceValue[j];
        } else {
          splitCoins[i].icon = icon;
          break;
        }
      }
    }
    return splitCoins;
  },
  closewarResult() {
    if (mbgGame.managerUi.warResult) mbgGame.managerUi.warResult.closeMe();
  },
  // 改昵称
  changeNickName(cb) {
    const self = this;
    let infoStr = mbgGame.getString("chgNameInfo");

    const data = mbgGame.getCache('player.achieveinfo');
    const statID = mbgGame.player.getStatID('chgNameTimes');

    // mbgGame.log('[changeNickName]',statID, data.stat[statID]);
    if (mbgGame.userInfo.nickname && data && data.stat[statID]) {
      infoStr = mbgGame.getString("chgNamePay", {
        price: mbgGame.config.constTable.chgNamePrice,
      });
    }

    mbgGame.managerUi.createLineEditor({
      title: mbgGame.getString("chgNameTitle"),
      info: infoStr,
      hint: mbgGame.userInfo.wechatNickname || mbgGame.getString("editHint"),
      min: 2,
      limit: 8,
    }, (str) => {
      if (self.editBox_lock) return;
      self.editBox_lock = true;

      mbgGame.netCtrl.sendMsg("player.setNickName", {
        name: str,
      }, (x) => {
        mbgGame.log("player.setNickName:", x);
        if (x.status === 0) {
          mbgGame.userInfo.nickname = x.name;
          emitter.emit('updateUserInfo');
          // 改完名刷新一下统计数据
          mbgGame.removeCache('player.achieveinfo');
          mbgGame.checkNetCache('player.achieveinfo');
          if (cb) {
            cb();
          }
        }
        delete self.editBox_lock;
      });
    });
  },

  openPanelGamble(...args) {
    mbgGame.resManager.loadPrefab('panelGamble', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addFullWin(node, 'panelGamble', ...args);
    });
  },
  openSchemeTeamEditor(dData) {
    mbgGame.resManager.loadPrefab('panelSchemeTeamEditor', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addFullWin(node, 'schemeTeamEditor', dData);
    });
  },
  // 改变动画 放大缩小
  changeEffect(node, time, scale) {
    node.stopAllActions();
    node.runAction(cc.sequence(cc.scaleTo(time || 0.2, scale || 2, scale || 2), cc.scaleTo(time || 0.3, 1, 1)));
  },

  checkNodeOutWin(node) {
    let worldPos = node.parent.convertToWorldSpaceAR(node.getPosition());
    worldPos = this.node.convertToNodeSpaceAR(worldPos);
    const leftDis = worldPos.x - (node.width * node.anchorX) + (this.node.width / 2);
    if (leftDis < 0 && Math.abs(leftDis) < node.width) {
      node.x -= leftDis;
      return;
    }
    const rightDis = worldPos.x + (node.width * (1 - node.anchorX)) - (this.node.width / 2);
    if (rightDis > 0 && Math.abs(rightDis) < node.width) {
      node.x -= rightDis;
    }
  },
  openWinGradeAnim(...args) {
    mbgGame.resManager.loadPrefab('winGradeAnim', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addUIWin(node, 'winGradeAnim', false);
      node.getComponent("winGradeAnim").initMe(...args);
    });
  },
  openWinResult(data) {
    mbgGame.resManager.loadPrefab('winResult', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addUIWin(node, 'winResult', true);
      node.getComponent("winResult").initWinResult(data);
    });
  },

  openWinCharaUp(id, data) {
    // mbgGame.log("openWinCharaUp:", id, data);
    mbgGame.resManager.loadPrefab('winCharaUp', (prefab) => {
      const node = cc.instantiate(prefab);
      // 如果不同的角色，就叠加窗口
      node.name = `winCharaUp${id}`;
      mbgGame.managerUi.addUIWin(node, 'winCharaUp');
      node.getComponent("winCharaUp").opened(id, data);
    });
  },
  floatUnitMessage(type, num) {
    const str = mbgGame.getString('unitPrice', {
      unit: `logo_${type}`,
      price: `${num >= 0 ? '+' : '-'}${num}`,
    });
    mbgGame.managerUi.floatMessage(str, mbgGame.preloadRes.uiBase);
  },
  // 获取奖励对象
  getAwardItem(container, dOption) {
    const obj = this.getIconItem();
    container.addChild(obj);
    const com = obj.getComponent("itemPanel");
    if (!dOption.style) {
      dOption.style = 'award';
    }
    com.initMe(dOption);
    return obj;
  },
  showAward(content, award) {
    // todo 物品排第一
    if (award.items) {
      award.items.split(',').forEach((sItem) => {
        const [itemID, n, q, starLv] = sItem.split('x');
        this.getAwardItem(content, {
          itemData: {
            i: +itemID,
            q: +q,
            s: +starLv,
            lv: 1,
          },
          style: 'unidentify',
        });
      });
    }
    [
      'diamonds',
      'gem',
      'mat',
      'sta',
      'coins',
      'score',
    ].forEach((x) => {
      if (!award[x]) return;
      this.getAwardItem(content, { icon: `award_${x}`, count: award[x] });
    });
  },
  getIconCharacter() {
    // 生成一个iconCharacter
    const node = new cc.Node();
    node.addComponent('iconCharacter');
    node.setContentSize(110, 110);
    return node;
  },
  getIconItem() {
    // 生成一个iconCharacter
    const node = new cc.Node();
    node.addComponent('itemPanel');
    node.setContentSize(100, 100);
    return node;
  },
  openItemInfo(dData) {
    mbgGame.resManager.loadPrefab('winItemInfo', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addNormalWin(node, 'winItemInfo', dData);
    });
  },
  addIconFlag(node, flagID, cb) {
    let flagCom;
    let flag;
    if (!node || !node._flagCom) {
      flag = cc.instantiate(mbgGame.preloadRes.itemFlag);
      flagCom = flag.getComponent('itemFlag');
    }

    if (node) {
      if (!node._flagCom) {
        node.addChild(flag);
        node._flagCom = flagCom;
      } else {
        flagCom = node._flagCom;
      }
    }
    if (flagID) {
      flagCom.setIcon(flagID);
    }
    if (cb) {
      flagCom.onChoose = cb;
    }
    if (!flagCom.onChoose) {
      flagCom.node.removeComponent(cc.Button);
    }
    return flagCom;
  },
  // 设置用户的头像
  setPlayerTotem(sprite, totem) {
    totem = totem || 0;
    if (_.isNumber(totem)) {
      mbgGame.resManager.setAutoAtlasFrame(sprite, 'flagIcon', 'flag0');
      return;
    }
    const iconUrl = `${totem.substring(0, totem.lastIndexOf('/'))}/96`;
    cc.loader.load({ url: iconUrl, type: 'png' }, (err, texture) => {
      if (sprite && sprite instanceof cc.Sprite) {
        // 缓存起来
        sprite.spriteFrame = new cc.SpriteFrame(texture);
      }
    });
  },

  initItemFilter(anchorNode, refreshCB, isUpMode) {
    mbgGame.resManager.loadPrefab('itemFilterBtn', (prefab) => {
      if (!anchorNode || !anchorNode.isValid) {
        return;
      }
      const node = cc.instantiate(prefab);
      anchorNode.addChild(node);
      node.defaultMode = 'starLvl';
      const com = node.getComponent('itemFilterBtn');
      if (isUpMode) {
        com.setUpMode();
      }
      com.initFilterBtn(refreshCB);
    });
  },
  // 通用的背包tableview处理
  initItemBagTableView(mbgViewCom, items, itemPanelOptions) {
    mbgViewCom._itemPanelOptions = itemPanelOptions;

    if (!mbgViewCom._isInited) {
      emitter.on(mbgViewCom, "delItems", (sidList) => {
        let itemsData = _.clone(mbgViewCom._dataSource.items);
        itemsData = _.flatten(itemsData);
        for (let i = 0; i < sidList.length; i++) {
          const sid = sidList[i];
          itemsData = _.remove(itemsData, (x) => { return x !== sid; });
        }
        mbgViewCom.updateItems(_.chunk(itemsData, 5));
      });
    }

    mbgViewCom.initTableView({
      items,
      newCellObject(table, idx) {
        const rowIds = table.getDataItem(idx);
        const rowNode = new cc.Node();
        rowNode.width = table.cellWidth;
        rowNode.height = table.cellHeight;
        rowNode.setAnchorPoint(0, 1);
        for (let i = 0; i < rowIds.length; i++) {
          const item = mbgGame.managerUi.getIconItem();
          const options = _.clone(table._itemPanelOptions);
          options.sid = rowIds[i];
          // mbgGame.log('instantiate', sid);
          item.getComponent("itemPanel").initMe(options);

          // const item = mbgGame.managerUi.getItemFromCache(table, rowIds[i]);
          rowNode.addChild(item);
          item.x = (item.width * item.anchorX) + ((item.width + ((table.cellWidth - (item.width * 5)) / 4)) * i);
          item.y = -(table.cellHeight * item.anchorY);

          if (table._addDrag) {
            table._addDrag(item, options.sid);
          }
        }
        return rowNode;
      },
    });
  },

  showItemAttr({
    content,
    subContent,
    effectDesc,
    enchantDesc,
    sid,
    itemData,
    style,
    nextLv,
  }) {
    let dItemData;
    if (sid) {
      dItemData = mbgGame.player.getItemData(sid);
    } else if (itemData) {
      dItemData = itemData;
    }

    if (content) {
      content.active = !!dItemData;
    }
    if (subContent) {
      subContent.active = !!dItemData;
    }
    if (effectDesc) {
      effectDesc.active = !!dItemData;
    }
    if (enchantDesc) {
      enchantDesc.active = !!dItemData;
    }

    const m = mbgGame.player.getItemMainAttrVals(
      dItemData.i,
      dItemData.s,
      dItemData.lv);
    let m2;
    if (nextLv) {
      m2 = mbgGame.player.getItemMainAttrVals(
        dItemData.i,
        dItemData.s,
        nextLv);
    }
    const dItemConfig = mbgGame.config[`item${dItemData.i}`];
    const sMainAttr = defines.ItemMainType2Attr[dItemConfig.mainType];
    // mbgGame.log('dItemData', dItemData);
    // 主属性
    for (let i = 0; i < 3; i++) {
      const node = content.children[i];
      const val = m[i];
      const mainAttrID = defines.MainAttrIDs[i];
      const sAttr = defines.ID2Attr[mainAttrID];
      const sType = mbgGame.player.getItemMainAttrType(dItemData.i);

      let real;
      if (m2) {
        real = m2[i];
      }
      node.name = sAttr;
      node.getComponent('itemAttribute').initForItem({ sAttr, val, sType, real, color: sAttr === sMainAttr ? "#ffcc00" : null });
      node.active = true;
    }
    // 副属性
    let hasSub = false;
    for (let i = 0; i < 2; i++) {
      const node = subContent ? subContent.children[i] : content.children[i + 3];

      if (style === 'unidentify') {
        if (dItemData.q === 1) {
          continue;
        }
        if (dItemData.q === 2 && i === 1) {
          node.active = false;
          continue;
        }
        hasSub = true;
        node.getComponent('itemAttribute').initAsUnknown();
        node.removeComponent('autoTooltips');
        continue;
      }

      const sAttr = mbgGame.player.getItemSubAttrByIdx(dItemData, i);
      if (!sAttr) {
        node.active = false;
        continue;
      }
      const val = mbgGame.player.getItemSubAttrValByIdx(dItemData, i, dItemData.lv || 1);
      let real;
      if (nextLv) {
        real = mbgGame.player.getItemSubAttrValByIdx(dItemData, i, nextLv);
      }
      node.name = sAttr;
      node.getComponent('itemAttribute').initForItem({ sAttr, val, sType: "Add", real });
      node.active = true;
      hasSub = true;
    }
    if (!hasSub && subContent) {
      subContent.active = false;
    }
    // 特效
    let effectStr = '';
    let enchantStr = '';
    if (effectDesc) {
      const rt = effectDesc.getChildByName('desc').getComponent(cc.RichText);
      const dConfig = mbgGame.config[`item${dItemData.i}`];
      const effect = dConfig.effect;
      const effectparam = dConfig.effectparam;
      const lvrank = mbgGame.player.getItemLvRank(dItemData, dItemData.lv || 1);
      let nextLvRank;
      if (nextLv) {
        nextLvRank = mbgGame.player.getItemLvRank(dItemData, nextLv);
      }
      if (!effect) {
        effectStr = '';
      } else if (dConfig.params) { // 有params的都是skill + 技能ID的道具
        const skillID = parseInt(effect.substr(5));
        const dData = {};
        const params = ['a', 'b', 'c', 'd'];
        for (let i = 0; i < params.length; i++) {
          const param = params[i];
          const vals = dConfig.params[param];
          if (vals) {
            let extra = '';
            const nowValue = vals[(dItemData.lv || 1) - 1];
            if (nextLv && nextLv > (dItemData.lv || 1)) {
              const nextValue = vals[nextLv - 1];
              if (nextValue - nowValue !== 0) {
                extra = `<color=#99ff00> +${(nextValue - nowValue).toFixed(1)}</c>`;
              }
            }
            dData[param] = `${nowValue}${extra}`;
          }
        }
        effectStr = mbgGame.getString('effectDesc', {
          s: mbgGame.getString(`skilldetail${skillID}`, dData),
        });
      } else {
        const val = effectparam[lvrank];
        let extra = '';
        if (nextLvRank > nextLv) {
          const val2 = effectparam[nextLvRank] - val;
          if (val2 !== 0) {
            extra = `<color=#99ff00> +${val2}</c>`;
          }
        }
        effectStr = mbgGame.getString('effectDesc', {
          s: mbgGame.getString(`itemdesc${dItemData.i}`, {
            a: val + extra,
          }),
        });
      }

      if (style === 'unidentify') {
        if (dItemData.q === 4) {
          enchantStr = mbgGame.getString('enchantDesc', {
            s: mbgGame.getString('rndEffect'),
          });
        } else {
          enchantStr = '';
        }
      } else if (mbgGame.player.hasEnchant(dItemData)) {
        const eID = mbgGame.player.getEnchantID(dItemData);
        const desc = mbgGame.getString(`enchant${eID}`, {
          a: mbgGame.config.enchant[eID].val,
        });
        enchantStr = mbgGame.getString('enchantDesc', {
          s: desc,
        });
      } else {
        enchantStr = '';
      }

      if (!enchantDesc && enchantStr) {
        effectStr = `${effectStr}<br / >${enchantStr}`;
      }

      rt.string = effectStr;
      effectDesc.active = true;
    }

    if (enchantDesc) {
      const rt = enchantDesc.getChildByName('desc').getComponent(cc.RichText);
      rt.string = enchantStr;
      enchantDesc.active = true;
    }
  },
  checkCachedMessage() {
    const msgList = mbgGame.getCache('message') || [];
    if (msgList.length <= 0) {
      emitter.emit("nocachedmsg");
      return false;
    }
    const data = msgList.shift();
    mbgGame.setCache('message', msgList);
    mbgGame.netCtrl.handle_message(data);
    return true;
  },
});