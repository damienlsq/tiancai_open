
const co = require('co');

// /////////////////////////////
// /     聊天系统
// /////////////////////////////

const chatServer = mbgGame.common.db_mgr.CList.extend({

  FuncType: "chat",
  // SubType: "",

  onInit() {
    // 读入数据到内存
    const self = this;

    this.channelData = {

    };

    co(function* () {
      for (const k in mbgGame.config.defaultChatChannel) {
        self.SubType = k;
        self.channelData[k] = self.channelData[k] || {};
        self.channelData[k].list = yield self.lrange(0, -1);
        self.channelData[k].members = [];

        self.channelData[k].list = self.channelData[k].list.map((x) => {
          return JSON.parse(x);
        });
      }

      mbgGame.logger.info("[chat init]");
    }).catch((err, result) => {
      mbgGame.logger.info("chatServer onInit error ", err, result);
    });
  },

  clearChat() {
    for (const k in mbgGame.config.defaultChatChannel) {
      if (this.channelData[k] && this.channelData[k].list) {
        this.channelData[k].list = [];
      }
    }
    mbgGame.logger.info("[chat] clearChat");
  },
  removeChat(list, channel) {
    if (!_.isArray(list) || !channel) {
      return;
    }
    if (this.channelData[channel] && this.channelData[channel].list) {
      this.channelData[channel].list = _.filter(this.channelData[channel].list, (x) => {
        if (list.indexOf(x.id) !== -1) {
          return false;
        }
        return true;
      });
    }
    mbgGame.logger.info("[chat] removeChat:", list, channel);
  },

  debugMe() {
    console.log("[chat server]", this.channelData);
  },

  * changeChannel(netCtrl, changeChannel) {
    if (!changeChannel || netCtrl.nowChannel === changeChannel) {
      return false;
    }
    // 有效逻辑判断
    if (!this.channelData[changeChannel]) {
      return false;
    }
    const nPlayer = netCtrl.getCtrl();
    yield nPlayer.setInfo("channel", changeChannel);

    // 取消老频道
    this.unRegisterChannel(netCtrl);
    // 登记新的
    yield this.registerChannel(netCtrl);

    return true;
  },

  * registerChannel(netCtrl) {
    const nPlayer = netCtrl.getCtrl();
    let channel = nPlayer.getInfo("channel");
    if (!channel) {
      // 如果channel出错,设置一个默认的
      channel = "public";
      yield nPlayer.setInfo("channel", channel);
    }

    if (netCtrl.nowChannel === channel || !this.channelData[channel]) {
      return;
    }

    nPlayer.logInfo("[registerChannel] ", channel);

    netCtrl.nowChannel = channel;
    this.channelData[channel].members.push(netCtrl);
  },

  unRegisterChannel(netCtrl) {
    if (!netCtrl) {
      return;
    }
    const channel = netCtrl.nowChannel;
    if (!channel || !this.channelData[channel]) {
      return;
    }
    netCtrl.getCtrl().logInfo("[unRegisterChannel] ", channel);

    this.channelData[channel].members = _.without(this.channelData[channel].members, netCtrl);
    delete netCtrl.nowChannel;
  },

  sendChatOnline(chatData) {
    const channel = chatData.channel;
    const sendData = this.buildSendChatData(chatData);

    this.channelData[channel].list.push(chatData);
    if (this.channelData[channel].list.length > 10) {
      this.channelData[channel].list.shift();
    }

    this.channelData[channel].members.forEach((x) => {
      x.sendCmd("message", sendData);
    });
  },

  * addChat(netCtrl, msg) {
    const channel = netCtrl.nowChannel;
    if (!channel) {
      return;
    }
    const config = mbgGame.config.defaultChatChannel[channel];
    if (!config) {
      return;
    }
    if (!this.channelData[channel] || this.channelData[channel].members.length < 1) {
      return;
    }
    const nPlayer = netCtrl.getCtrl();
    const chatData = {
      uuid: nPlayer.getUUID(),
      t: moment().unix(),
      o: nPlayer.getInfo('nickname'),
      l: 0, // 赞
      u: 0, // 踩
      channel,
      msg,
    };

    chatData.id = yield mbgGame.serverCount.getID("chat");
    // redis广播出去,自己也会收到
    const chat_redis = mbgGame.common.db_mgr.getDB("redis-users");
    yield chat_redis.publish(`${mbgGame.ProjectName}:mbg_stat`, `chat ${JSON.stringify(chatData)}`);

    // 写到redis
    this.SubType = channel;
    yield this.lpush(JSON.stringify(chatData));
    yield this.ltrim(0, 1000); // 只保存10000条记录

    this.debugMe();
  },

  buildSendChatData(chatData) {
    const sendData = {
      id: chatData.id,
      type: "channel",
      channel: chatData.channel,
      t: chatData.t,
      msg: chatData.msg,
      like: chatData.l || 0,
      unlike: chatData.u || 0,
    };
    const config = mbgGame.config.defaultChatChannel[chatData.channel];
    if (config) {
      if (config.type !== 2 && chatData.o) { // 匿名
        sendData.who = chatData.o;
      }
    }
    return sendData;
  },

  getChat(channel, lastTime) {
    // 获取未收到的聊天记录
    const lastChats = [];

    if (!channel || !this.channelData[channel] || channel === 'system') {
      return lastChats;
    }

    for (let i = this.channelData[channel].list.length - 1; i >= 0; i--) {
      if (this.channelData[channel].list[i].t > lastTime) {
        const sendData = this.buildSendChatData(this.channelData[channel].list[i]);
        // 反向插在最前面
        lastChats.unshift(sendData);
        if (lastChats.length > 50) {
          break;
        }
      } else {
        break;
      }
    }

    // console.log("getChat1",lastChats);
    return lastChats;
  },

});

module.exports = {
  chatServer,
};