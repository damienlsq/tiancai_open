const NetCtrlWS = require('netctrlws');
const timer = require('timer');
const NetCtrlForwarder = require('netctrlfwd');
const NetCtrlProxy = require('netctrlproxy');

const netCtrl = {
  initCtrl() {
    this.m_TimerOwnerID = timer.newOwnerID();
    this.m_Proxy = new NetCtrlProxy();
    this.m_Proxy.m_onReceivedServerMsg = this.onReceivedServerMsg.bind(this);
    this.m_Proxy.m_onConnected = this.onConnected.bind(this);
    this.m_Proxy.m_onDisconnected = this.onDisconnected.bind(this);
    this.m_Proxy.m_onPushPacket = this.onPushPacket.bind(this);
    this.m_fwdType = 'enet';
    this.resetNetCtrl('fwd', this.m_fwdType);
  },
  resetNetCtrl(netType, fwdType) {
    if (this.m_CtrlObj) {
      this.m_CtrlObj.release();
      delete this.m_CtrlObj;
    }
    /*
    if (cc.sys.isNative && netType === "fwd") {
      // 手机版才能用forwarder
      this.m_NetType = "fwd";
      this.m_CtrlObj = new NetCtrlForwarder(fwdType);
    } else {
      this.m_NetType = "ws";
      this.m_CtrlObj = new NetCtrlWS();
    }
    */
    // 放弃forwarder
    this.m_NetType = 'ws';
    this.m_CtrlObj = new NetCtrlWS();
    this.m_Proxy.setNetCtrlObj(this.m_CtrlObj);
  },
  base64Encode(str) {
    return this.getCtrlObj().base64Encode(str);
  },
  base64Decode(str) {
    return this.getCtrlObj().base64Decode(str);
  },
  // 可重载
  onPushPacket(dPacketData) {
    if (mbgGame.state && mbgGame.state.token) {
      dPacketData.header._token = mbgGame.state.token;
    }
  },
  reconnect(reason, netType) {
    netType = netType || 'fwd';
    mbgGame.log('[netctrl.reconnect]', reason);
    if (this.m_ReconnectTime) {
      if (moment().valueOf() - this.m_ReconnectTime < 5000) {
        return; // 防止重复重连
      }
    }

    if (!this.m_ReconnectCount) {
      this.m_ReconnectCount = 0;
    }
    this.m_ReconnectCount += 1;
    this.m_fwdType = this.m_ReconnectCount % 2 ? 'ws' : 'enet';
    if (mbgGame.isRemoteRes()) {
      this.m_fwdType = 'ws';
    }

    this.m_ReconnectTime = moment().valueOf();
    // mbgGame.managerUi && mbgGame.managerUi.floatMessage(`开始重连 reason:${reason} type:${this.m_fwdType}`, null, 5);
    if (mbgGame.loading) {
      mbgGame.loading.setLoadBar(
        `${mbgGame.getString('connecting') || '正在连接服务器'}${this.m_fwdType === 'enet' ? '1' : '2'}`,
        0,
      );
    }
    this.resetNetCtrl(netType, this.m_fwdType);
    this.getCtrlObj().setServerConfig(this.m_serverConfig);
    this.getCtrlObj().setupConnect();
    this.initReconnectTimer();
  },
  initReconnectTimer() {
    timer.removeCallOut(this, 'reconnect');
    timer.callOut(
      this,
      () => {
        if (this.m_ReconnectTime) {
          delete this.m_ReconnectTime;
        }
        this.disconnect();
        this.reconnect('repeat');
      },
      {
        time: 15, // 15秒内连不上，就尝试重连
        flag: 'reconnect',
        forever: false,
      },
    );
  },
  disconnect() {
    mbgGame.log('[netctrl.disconnect]');
    this.getCtrlObj().disconnect();
  },
  cleanServerConfig() {
    this.m_serverConfig = null;
    this.getCtrlObj().cleanServerConfig();
  },
  setServerConfig(serverConfig) {
    this.m_serverConfig = serverConfig;
    this.m_serverConfig.ws_url = `wss://${serverConfig.host}/ws/tc`;
    this.getCtrlObj().setServerConfig(this.m_serverConfig);
  },
  getServerConfig() {
    return this.m_serverConfig;
  },
  setupConnect() {
    mbgGame.log('setupConnect');
    if (!this.m_serverConfig) return;
    mbgGame.log(`connect to ${this.m_serverConfig.host}`);
    this.getCtrlObj().setupConnect();

    this.initReconnectTimer();
  },
  getCtrlObj() {
    return this.m_Proxy;
  },
  onConnected() {
    mbgGame.log(`[onConnected] ${this.m_NetType}`);
    timer.removeCallOut(this, 'reconnect');
    if (this.m_ReconnectTime) {
      // const now = moment().valueOf();
      // const cost = now - this.m_ReconnectTime;
      delete this.m_ReconnectTime;
      // mbgGame.managerUi && mbgGame.managerUi.floatMessage(`重连耗时 ${cost}ms`);
    }
    this.netCount = 0;
    if (mbgGame.loading) {
      mbgGame.loading.setLoadBar(mbgGame.getString('login_now'), 10);
    }
    mbgGame.clearAllLock();
    // 连接成功后第一个发送的包需要是login
    mbgGame.player.sendLogin();
  },
  onDisconnected() {
    mbgGame.log('[onDisconnected]', this.m_NetType);
    // mbgGame.managerUi && mbgGame.managerUi.floatMessage(`连接断开`);
    if (mbgGame.ploting) {
      mbgGame.restart();
      return;
    }
    this.reconnect('disconnect');
    const isConnected = false;
    mbgGame.gameScene && mbgGame.gameScene.onConnect(isConnected);
  },
  isConnected() {
    return this.getCtrlObj().isConnected();
  },
  isConnecting() {
    return this.getCtrlObj().isConnecting();
  },
  netIsAlive() {
    this.netCount += 1;
  },
  getNetCount() {
    return this.netCount;
  },
  sendMsg(cmd, dData, callback, ...args) {
    return this.getCtrlObj().sendMessage(cmd, dData, callback, ...args);
  },
  sendMsgLimited(interval, cmd, dData, callback, ...args) {
    if (!this.m_LastSent) {
      this.m_LastSent = {};
    }
    const nowTime = moment().valueOf();
    if (this.m_LastSent[cmd]) {
      const t = this.m_LastSent[cmd];
      if (nowTime - t < interval * 1000) {
        callback({ code: 'err' });
        return null;
      }
    }
    this.m_LastSent[cmd] = nowTime;
    return this.sendMsg(cmd, dData, callback, ...args);
  },
  onReceivedServerMsg(cmd, data) {
    this.netIsAlive();
    // mbgGame.log("[src.netctrl.onReceivedServerMsg]", "cmd=" + cmd, "data=", data);
    const func = this[`handle_${cmd}`];
    if (!func) {
      mbgGame.error('[onReceivedServerMsg] no handle func for cmd:', cmd);
      return;
    }
    try {
      func.call(this, data);
    } catch (e) {
      mbgGame.error(`[onReceivedServerMsg ${cmd}]`, e.stack, data);
    }
  },
  autoSyncServerTime() {
    mbgGame.log('[autoSyncServerTime]');
    // 第一次对时延迟比较大，可能是登录逻辑影响，延迟2秒再对时
    timer.callOut(
      this,
      () => {
        this.syncServerTime();
      },
      {
        time: 2,
        flag: 'firstSuyncServerTime',
        forever: false,
      },
    );
    timer.removeCallOut(this, 'autoSyncServerTime');
    timer.repeat(this.syncServerTime.bind(this), {
      ownerID: this.m_TimerOwnerID,
      time: 20,
      forever: true,
      flag: 'autoSyncServerTime',
    });
  },
  syncServerTime() {
    // mbgGame.log("[syncServerTime]");
    // 1.计算当前网络延时 net_delay = 发包到收包的时间间隔的一半
    // 2. server_now_time = server_now_time + net_delay
    // 3. 时间差 offset_time = server_now_time - client_now_time
    // 4. 客户端获取服务器now时间 = client_now_time + offset_time 第一次同步前，offset_time = 0
    // 每30秒刷新一次
    // 单位都是秒
    const self = this;
    const iSendTime = moment().valueOf() * 0.001;
    this.sendMsg('player.synctime', {}, (data) => {
      // mbgGame.log("[player.synctime]", data);
      const iRecvTime = moment().valueOf() * 0.001;
      const netDelay = (iRecvTime - iSendTime) * 0.5;
      self.m_netDelayMS = Math.round(netDelay * 1000);
      if (self.m_netDelayMS >= 300) {
        mbgGame.player.sendLog(`[Net] delay:${self.m_netDelayMS}ms ${this.m_NetType} ${cc.sys.os}`);
      }
      let serverNowTime = data.data.now * 0.001;
      serverNowTime += netDelay;
      const clientNowTime = iRecvTime;
      const offsetTime = serverNowTime - clientNowTime;
      self.m_OffsetTime = offsetTime;
      // mbgGame.log("[synctime]", netDelay, offsetTime);
    });
  },
  // 服务器当前时间. Note：时间值是按服务器时钟的
  // 这个接口的作用在于，客户的时钟可能是被蓄意调过的，
  // 调用这个接口可避免因为客户端调整时钟后造成的时间计算错误。
  // 如果业务逻辑允许用不可靠的客户端时间，那么可以调用moment().valueOf()
  // 单位秒  有小数位，不能取整！
  getServerNowTime() {
    const iNowTime = moment().valueOf() * 0.001;
    // m_OffsetTime并不是网络延迟值！而是校准值
    // 网络差的情况下，这个值也可能等于0
    // m_OffsetTime单位 秒
    return iNowTime + (this.m_OffsetTime || 0);
  },
  handle_dinghao(data) {
    mbgGame.log('handle_dinghao1', JSON.stringify(data));
    if (mbgGame.managerUi) {
      mbgGame.managerUi.createBoxSure(mbgGame.getString('dinghao'), 'exit');
    } else if (mbgGame.loading) {
      mbgGame.loading.confirmMsg(mbgGame.getString('dinghao'), 'exit');
    }
  },
  handle_cleanDataAndExit() {
    // 清除玩家uuid,因为非法
    mbgGame.removeLocalData();
    // 退出游戏
    if (cc.sys.isNative) {
      if (mbgGame.isIOS()) {
        jsb.reflection.callStaticMethod('NativeOcClass', 'exitGame');
      }
      if (mbgGame.isAndroid()) {
        jsb.reflection.callStaticMethod(mbgGame.packageName, 'exitGame', '()V');
      }
    }
  },
  handle_batch(data) {
    const cmdlst = data.cmdlst;
    if (cmdlst && cmdlst.length > 0) {
      for (let i = 0; i < cmdlst.length; i++) {
        const [cmd, dData] = cmdlst[i];
        const func = this[`handle_${cmd}`];
        if (!func) {
          mbgGame.error('batch recv] no handle func for cmd:', cmd);
          continue;
        }
        func.call(this, dData);
      }
    }
  },
  handle_heartbeat() {
    // mbgGame.log("[handle_heartbeat]");
    mbgGame.lastHeartbeatTime = moment().unix();
    this.sendMsg('player.heartbeat', {});
  },
  handle_plot(data) {
    mbgGame.log('[plot]', data);
    mbgGame.player.setPlotData(data);
  },
  handle_flag(flag) {
    // mbgGame.log("[flag]", flag);
    mbgGame.player.setflag(flag);
    emitter.emit('setflag', flag);
  },
  handle_cIDing(dData) {
    mbgGame.player.cIDing = dData;
  },
  handle_timeVars(data) {
    mbgGame.timeVar = data;
    mbgGame.log('[timeVar]', data, mbgGame.timeVar);
    emitter.emit('timeVarUpdate', data);
  },
  handle_timeVar(data) {
    _.extend(mbgGame.timeVar, data);
    mbgGame.log('[timeVar]', data, mbgGame.timeVar);
    emitter.emit('timeVarUpdate', data);
  },
  handle_timeVarRemove(data) {
    data.forEach((x) => {
      delete mbgGame.timeVar[x];
    });
    mbgGame.log('[timeVarRemove]', data, mbgGame.timeVar);
  },
  handle_frdcode(data) {
    // mbgGame.log('data:',data.code);
  },
  handle_showteach(data) {
    mbgGame.log('handle_showteach', data);
    // 缓存teach信息
    let dData = mbgGame.player.getLocalItem('showteach');
    if (!dData) {
      dData = {};
    } else {
      dData = JSON.parse(dData);
    }
    dData[data.type] = 1;
    mbgGame.player.setLocalItem('showteach', JSON.stringify(dData));
    if (!mbgGame.warMgr.hasAnyWar()) {
      mbgGame.player.checkTeach();
    }
  },
  handle_syncok() {
    mbgGame._dataReady = true;
    if (mbgGame.warMgr) {
      mbgGame.warMgr.warEvt().handleCachedWarEvent();
    }
    // 只要收到syncok就可以切换成2
    mbgGame.enterGameType = 2;
    emitter.emit('updateAttr');
  },
  handle_setBSID(data) {
    mbgGame.BSID = data.BSID;
  },
  handle_attr(data) {
    mbgGame.log('[attr]', data);
    mbgGame.player.updateAttr(data);
  },
  handle_addSta(data) {
    // 每次自动加体力的时间戳
    // mbgGame.log("[handle_addSta]", data);
    const t = data.t; // unix
  },
  handle_scheme(data) {
    mbgGame.log('handle_scheme', data);
    mbgGame.player.onSchemeChanged(
      {
        code: 'ok',
      },
      data.worldIdx,
      data.schemeIdx,
      data.data,
    );
  },
  handle_wheel(data) {
    mbgGame.log('[wheelwar]', data);
    mbgGame.player.setWheelWarData(data);
    emitter.emit('onChangeScheme');
  },
  handle_storydata(data) {
    mbgGame.log('[storydata]', data);
    mbgGame.player.setStoryData(data);
  },
  handle_pvpdata(data) {
    mbgGame.log('[pvpdata]', data);
    mbgGame.player.setPVPData(data);
    emitter.emit('setPVPData');
  },
  handle_raiddata(data) {
    mbgGame.log('[raiddata]', data);
    mbgGame.player.setRaidData(data);
    emitter.emit('raiddata');
  },
  handle_battledata(data) {
    mbgGame.log('[battledata]', data);
    mbgGame.player.setBattleData(data);
    emitter.emit('refreshChestInfo');
    emitter.emit('refreshChestInfo2');
  },
  handle_pvpflag(data) {
    mbgGame.log('[pvpflag]', data.idx2flag);
    mbgGame.player.setPVPFlag(data.idx2flag);
    emitter.emit('zhengbaUpdateFlag');
  },
  handle_warresult(data) {
    mbgGame.log('[warresult]', data);
    if (mbgGame.warMgr) {
      mbgGame.warMgr.onWarResult(data);
    }
  },
  handle_pvpinvite(data) {
    const self = this;
    const boxConfirm = mbgGame.managerUi.createConfirmDialog(
      mbgGame.getString('push_pvp', {
        target: data.name,
      }),
      () => {
        self.sendMsg('arena.join', {
          warUUID: data.warUUID,
        });
      },
    );
    if (boxConfirm) {
      boxConfirm.setCancelCB(() => {
        self.sendMsg('arena.refuse', {
          warUUID: data.warUUID,
        });
      });
    }
  },
  // 全部世界数据
  handle_worlds(dWorldData) {
    mbgGame.log('[worlds data]', dWorldData);
    mbgGame.player.setWorldData(dWorldData);
    emitter.emit('worlddata', -1);
  },
  // 单个世界数据
  handle_world(dData) {
    mbgGame.log('[world data]', dData);
    mbgGame.player.updateWorldData(dData.worldIdx, dData.data);
    emitter.emit('worlddata', dData.worldIdx);
  },
  handle_item(dData) {
    mbgGame.log('[handle_item]', dData);
    mbgGame.player.setItemDataOne(dData);
    emitter.emit('itemChange', dData.sid);
  },
  handle_delItems(dData) {
    mbgGame.log('[handle_delItems]', dData);
    mbgGame.player.delItemsData(dData.sidList);
    emitter.emit('delItems', dData.sidList);
  },
  handle_items(dData) {
    mbgGame.log('[handle_items]', dData);
    mbgGame.player.setItemData(dData);
    emitter.emit('itemChange', dData.sid);
  },
  // 全部角色数据
  handle_charas(dCharaData) {
    mbgGame.log('[charas data]', dCharaData, JSON.stringify(dCharaData));
    mbgGame.player.updateCharaDatas(dCharaData);
  },
  // 单个角色数据
  handle_chara(dData) {
    mbgGame.log('[chara data]', dData);
    mbgGame.player.updateCharaData(dData.charaID, dData.data);
    emitter.emit('charaUpdated', dData.charaID);
  },
  handle_labdata(dData) {
    mbgGame.log('[lab data]', dData);
    mbgGame.player.updateLabData(dData);
    emitter.emit('labdata');
  },
  handle_message(data) {
    mbgGame.log('[handle_message]', data);
    const param = data.param;
    if (param && param.t === 1 && mbgGame.warMgr.hasAnyWar()) {
      // 延迟到结算界面结束再弹
      delete param.t;
      const msgList = mbgGame.getCache('message') || [];
      msgList.push(data);
      mbgGame.setCache('message', msgList);
      return;
    }
    if (!mbgGame.managerUi) return;
    // todo 需要弹出提示框，显示 data.msg
    switch (data.type) {
      case 'warning': {
        // 提示框，需要玩家点击确认后消失
        mbgGame.managerUi.createBoxSure(data.msg, data.param);
        break;
      }
      case 'notify': {
        // 半透明提示框, 玩家点击确认后消失 ／ 3秒后自动消失
        if (mbgGame.uiLayerTop) {
          mbgGame.uiLayerTop.pushNotify(data.msg, data.param);
          mbgGame.uiLayerTop.checkNotifyList();
        }
        break;
      }
      case 'unlock': {
        mbgGame.winUnlock = 1; // 标记，不要去掉
        mbgGame.resManager.loadPrefab('winUnlock', (prefab) => {
          const node = cc.instantiate(prefab);
          mbgGame.managerUi.addTinyWin(node, 'winUnlock', data, param);
        });
        break;
      }
      case 'dialog':
        mbgGame.managerUi.createConfirmDialog(mbgGame.getString(data.i18nKey, data));
        break;
      case 'channel':
        if (!data.msgs) return;
        for (let i = 0; i < data.msgs.length; i++) {
          mbgGame.player.cacheMsg(data.msgs[i]);
        }
        break;
      case 'newVer': {
        break;
      }
      case 'seamlessReconnect': {
        // 非战斗状态下自动重连服务器
        mbgGame.seamlessReconnect = true;
        mbgGame.safeReconnect();
        break;
      }
      case 'info': // 显示后消失
      default:
        mbgGame.managerUi.floatMessage(data.msg);
        break;
    }
  },
  handle_block(data) {
    mbgGame.log('账号被封停');
    this.getManagerUI().createBoxSure(data.msg);
  },
  handle_userInfo(data) {
    // mbgGame.log('[userinfo]', data);
    mbgGame.userInfo = data;
    emitter.emit('updateUserInfo');
  },
  handle_video(data) {
    // 服务器通知看广告
    mbgGame.advertisement.showRewardVideo(data);
  },
  handle_shopRefresh(data) {
    // 服务器主动要求客户度刷新商店
    emitter.emit('shopItemRefresh', data.itemInfo);
  },
  handle_outdate() {
    // 设置为不能热更新
    cc.sys.localStorage.setItem('outdate', '1');
  },
  handle_accountInfo(data) {
    // mbgGame.log("handle_accountInfo!!! ",data);
    if (data.status === 77) {
      // 切换帐号
      // 删本地数据
      mbgGame.removeLocalData();
      // 设置新的uuid
      mbgGame.setSaveUUID(data.uuid);
      mbgGame.restart();
    }
  },
  handle_we(data) {
    // mbgGame.log("[handle_war_event]", data.event, JSON.stringify(data));
    if (mbgGame.warMgr) {
      mbgGame.warMgr.warEvt().onWarEvent(data);
    } else {
      mbgGame.error('war_event no warMgr', data.event, JSON.stringify(data));
    }
  },
  handle_newMail(data) {
    // mbgGame.log('handle_newMail:', data);
    emitter.emit('newMailCome', data.count);
  },
  handle_control(data) {
    // 服务器控制客户端的行为
    if (data.isClientLog) {
      // 打开日志收集
      mbgGame.isClientLog = data.isClientLog;

      if (mbgGame.isIOS()) {
      } else {
        mbgGame.log = mbgGame.player.sendLog;
        console.warn = mbgGame.player.sendLog;
        console.error = mbgGame.player.sendLog;
        mbgGame.log = mbgGame.player.sendLog;
        mbgGame.error = mbgGame.player.sendLog;
        mbgGame.warn = mbgGame.player.sendLog;
        mbgGame.log = mbgGame.player.sendLog;
        mbgGame.error = mbgGame.player.sendLog;
        mbgGame.warn = mbgGame.player.sendLog;
      }
    }
  },
  handle_analytics(data) {},
  handle_award(data) {
    mbgGame.log('[award]', data);

    let singleItemData;
    let awardCount = 0;
    let itemCount = 0;
    for (const k in data) {
      if (k === 'items' && data[k] && data[k].length > 0) {
        itemCount += data[k].length;
      }
      if (k === 'dataList' && data[k] && data[k].length > 0) {
        singleItemData = data[k][0];
        itemCount += data[k].length;
      }
      if (['coins', 'mat', 'sta', 'diamonds', 'gem'].indexOf(k) !== -1 && data[k] > 0) {
        awardCount += 1;
      }
    }

    if (singleItemData && itemCount === 1 && awardCount < 1) {
      // 直接打开物品预览界面
      mbgGame.managerUi.openItemInfo(
        {
          itemData: singleItemData,
          style: 'award',
        },
        true,
      );
      return;
    }
    // 非开箱就是飘字
    if (!data.id) {
      let delay = 0;
      for (const k in data) {
        const num = data[k];
        if (num > 0 && ['coins', 'mat', 'sta', 'diamonds', 'gem'].indexOf(k) !== -1) {
          timer.callOut(
            this,
            () => {
              mbgGame.managerUi.floatUnitMessage(k, num);
            },
            {
              time: delay,
              flag: `floatUnitMessage${delay}`,
              forever: false,
            },
          );
          delay += 1;
        }
        if (k === 'items' || k === 'dataList') {
          const items = data.items || data.dataList;
          for (let i = 0; i < items.length; i++) {
            const itemData = items[i];
            const name = mbgGame.getString(`itemname${itemData.i}`);
            const itemName = mbgGame.getString(`iname${itemData.q}`, {
              name: `【<img src="star${itemData.s}" />${name}】`,
            });
            timer.callOut(
              this,
              () => {
                mbgGame.managerUi.floatMessage(`${itemName}`, mbgGame.preloadRes.itemsIcon);
              },
              {
                time: delay,
                flag: `floatUnitMessage${delay}`,
                forever: false,
              },
            );
            delay += 1;
          }
        }
      }
      return;
    }

    if (!data.delay) {
      mbgGame.managerUi.createGetAward(data);
    } else {
      timer.callOut(
        this,
        () => {
          mbgGame.managerUi.createGetAward(data);
        },
        {
          time: data.delay,
          flag: 'createGetAward',
          forever: false,
        },
      );
    }
  },
  handle_creplay(data) {
    mbgGame.log('creplay', data);
    mbgGame.warMgr.warEvt().onWarEvent({
      event: 'Reset',
      world: data.worldIdx,
      data: {
        init: data,
        replay: true,
      },
    });
  },
  handle_battleevt(data) {
    mbgGame.panelSquare && mbgGame.panelSquare.handleBattleEvt(data);
  },
  handle_paySuccess() {
    // mbgGame.log("[paySuccess]", data);
    mbgGame.IAP.payCheck();
  },
  handle_clanEvent(data) {
    let base = mbgGame.getCache('clan.base');
    if (!base) {
      base = {};
    }
    if (data.online) base.online = data.online;
    if (data.count) base.count = data.count;
    if (data.name) base.name = data.name;
    if (data.flag) base.flag = data.flag;
    if (data.op === 'join') {
      base.tScore = data.tScore || 0;
      base.dnd = data.dnd || 0;
    }
    mbgGame.setCache('clan.base', base);

    if (data.op === 'quit') {
      delete mbgGame.hasClan;
      mbgGame.removeCache('clan.base');
      mbgGame.removeCache('clan.clanEvents');
      return;
    }
    if (data.op === 'join') {
      mbgGame.hasClan = true;
      // 发送获取联盟信息
      const lastEventID = +data.maxID || 0;
      if (mbgGame._clanLastEventID == null || mbgGame._clanLastEventID < lastEventID) {
        // 有新事件
        mbgGame.removeCache('clan.clanEvents');
        mbgGame._clanLastEventID = lastEventID;
      }
      mbgGame.checkNetCache('clan.clanEvents', mbgGame.player.checkClanRedTip);
      emitter.emit('clanEventBase');
      return;
    }
    if (data.op === 'checkHelp') {
      // 刷新邮件
      mbgGame.netCtrl.sendMsg('player.mailCheck');
      return;
    }
    const events = mbgGame.getCache('clan.clanEvents');
    if (!events) return;
    if (data.add) {
      events[data.add.id] = data.add.data;
      if (mbgGame.sceneMenu.curPageIdx() !== mbgGame.PageClan) {
        mbgGame.sceneMenu.setRedtips(mbgGame.PageClan, true);
      }
    }
    if (data.modify) {
      events[data.modify.id] = data.modify.data;
    }
    if (data.del) {
      data.del.forEach((x) => {
        delete events[x];
      });
    }
    mbgGame.setCache('clan.clanEvents', events);
    emitter.emit('clanEventUpdate');
  },
  getManagerUI() {
    const managerUi = cc.find('Canvas/Managers').getComponent('ManagerUi');
    return managerUi;
  },
};

cc.GCLoginOK = function () {
  // gamecenter 登录成功,底层调用
  mbgGame.log('gamecenter login ok');
  if (!cc.sys.isNative) return;
  if (cc.sys.os !== cc.sys.OS_IOS) return;
  netCtrl.sendMsg('player.gamecenter', {
    gc_id: mbgGame.ios.getGCPlayerID(),
    gc_name: mbgGame.ios.getGCPlayerDisplayName(),
  });
};

cc.APNPushToken = function (s) {
  // mbgGame.log("token" + s);
  mbgGame.APN_token = s;
};

mbgGame.netCtrl = netCtrl;

module.exports = netCtrl;
