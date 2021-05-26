(function (global) {
  /*----------------------------------------------

     private:

  ------------------------------------------------*/
  var EvtQueue = {
    /*
    event: [ [obj, callback, option],  ]
    option: {
        times: null / number   可触发次数
     },
    */
  };

  var getQueue = function (event) {
    if (!EvtQueue[event]) {
      EvtQueue[event] = [];
    }
    return EvtQueue[event];
  };

  var getIdx = function (obj, event) {
    var idx = -1;
    var i;
    var queue = getQueue(event);
    for (i = 0; i < queue.length; i++) {
      var _obj = queue[i][0];
      if (_obj === obj) {
        idx = i;
        break;
      }
    }
    return idx;
  };

  /*----------------------------------------------

     public:

  ------------------------------------------------*/
  var on = function (obj, event, cb, option) {
    if (!obj || !event || !cb) {
      cc.warn("[emitter.on] wrong param:", obj, event, cb);
      return false;
    }
    var queue = getQueue(event);
    var idx = getIdx(obj, event);
    if (idx !== -1) {
      cc.warn("[emitter] event registered:", event);
      return false;
    }
    var item = [obj, cb];
    if (option) {
      item.push(option);
    }
    queue.push(item);
    if (!obj._events) obj._events = [];
    obj._events.push(event);
    return true;
  };

  var once = function (obj, event, cb) {
    return on(obj, event, cb, { times: 1 });
  };

  var off = function (obj, event) {
    if (!event) {
      if (obj._events) {
        // 如果没有event,直接清理所有obj的登记 todo
        var events = obj._events.slice();
        for (var i = 0; i < events.length; i++) {
          var e = events[i];
          off(obj, e);
        }
        obj._events = [];
      }
      return;
    }
    var idx = getIdx(obj, event);
    if (idx === -1) {
      return false;
    }
    var queue = getQueue(event);
    queue.splice(idx, 1);
    if (obj._events) {
      var idx = obj._events.indexOf(event);
      if (idx !== -1) {
        obj._events.splice(idx, 1);
      }
    }
    return true;
  };

  var emit = function (event) {
    var i;
    if (typeof (event) !== "string") {
      return -1;
    }
    var queue = getQueue(event);
    var expiredItems = [/* item */];
    var targetItems = [/* item */];
    for (i = 0; i < queue.length; i++) {
      var item = queue[i];
      var obj = item[0];
      var option = item[2];
      if (!obj || !obj.isValid) {
        expiredItems.push(item);
        continue;
      }
      if (option && option.times > 0) {
        option.times -= 1;
        if (option.times <= 0) {
          expiredItems.push(item);
        }
      }
      // 先缓存起来，再一起调用，防止cb函数调用了off函数，导致queue被修改, 这个for循环因而出bug
      targetItems.push(item);
    }
    if (expiredItems.length > 0) {
      // 把过期的item从queue中删掉
      for (i = 0; i < expiredItems.length; i++) {
        var item = expiredItems[i];
        var obj = item[0];
        if (obj._events) {
          var idx = obj._events.indexOf(event);
          if (idx !== -1) {
            obj._events.splice(idx, 1);
          }
        }
        queue.splice(queue.indexOf(item), 1);
      }
    }
    for (i = 0; i < targetItems.length; i++) {
      var obj = targetItems[i][0];
      var cb = targetItems[i][1];
      try {
        var args = [].slice.call(arguments);
        args.shift();
        try {
          cb.apply(obj, args);
        } catch (e) {
          mbgGame.error('[emitter]', e.stack);
        }
      } catch (e) {
        mbgGame.error("[emitter] err:", e);
      }
    }
    return targetItems.length;
  };

  var emitter = {};
  /*
  Desc:
  on(cc.Node/cc.Component, eventName, callback);

  Example:
      on(obj, "npcTalk", (data) => { mbgGame.log(`npc ${data.npcID} talked`); });

  Return:
      true: success
      false: fail

  Note:
      执行callback时会用第一个参数作为this去调用，所以callback非特殊情况不用bind
  */
  emitter.on = on;

  /*
  Desc:
  once(cc.Node/cc.Component, eventName, callback);

  Return:
      true: success
      false: fail

  Note:
      will be remove after triggered
  */
  emitter.once = once;

  /*
  Desc:
  off(cc.Node/cc.Component, eventName);

  Example:
      off(obj, "npcTalk");

  Return:
      true: success
      false: fail
  */
  emitter.off = off;

  /*
  Desc:
  emit(eventName, eventData);

  Example:
      emit("npcTalk", { npcID: 999 });

  Return:
       -1: invalid event
        0: no handler found
        n: the number of this event handlers
  */
  emitter.emit = emit;


  if (typeof exports !== 'undefined') {
    module.exports = emitter;
  } else {
    global.emitter = emitter;
  }
})(this);