/*
 * 各种驻留在GS内存的、临时性的数据，都需要由CCache管理。
 * 类似一个简化的KV数据库。
 * 尽可能把临时数据放在CCache里。
 */
const Heap = require('collections/heap');
const timer = require('./timer');


class CCache {
    constructor() {
        this.data = {};
        // min heap
        this.expireHeap = new Heap([], null, (obj1, obj2) => {
            return obj2.t > obj1.t;
        });
    }
    // timestamp must be moment().valueOf()
    set(k, v, timestamp) {
        this.data[k] = v;
        if (timestamp) {
            this.expireHeap.push({
                k,
                t: timestamp,
            });
        } else {
            this.deleteExpire(k);
        }
        this.updateCheckTimer();
    }
    has(k) {
        return this.data[k] != null;
    }
    get(k) {
        return this.data[k];
    }
    del(k) {
        delete this.data[k];
        this.deleteExpire(k);
        this.updateCheckTimer();
    }
    deleteExpire(k) {
        const objs = this.expireHeap.filter((obj) => {
            return obj.k === k;
        });
        if (!objs || objs.length === 0) {
            return;
        }
        this.expireHeap.deleteEach(objs);
    }
    removeCheckTimer() {
        if (this.m_checkTimerID) {
            timer.removeTimer(this.m_checkTimerID);
            delete this.m_checkTimerID;
            delete this.m_nextCheckObj;
        }
    }
    updateCheckTimer() {
        this.removeCheckTimer();
        const obj = this.expireHeap.peek();
        if (!obj || obj === this.m_nextCheckObj) {
            return;
        }
        const now = moment().valueOf();
        const lefttime = obj.t - now;
        mbgGame.logger.info("Cache, next check", obj.k, obj.t, lefttime, now, this.expireHeap.length);
        this.m_nextCheckObj = obj;
        this.m_checkTimerID = timer.setOnceTimer(lefttime + 5, this.onCheck.bind(this));
    }
    onCheck() {
        this.removeCheckTimer();
        let obj = this.expireHeap.peek();
        if (!obj) {
            return;
        }
        const now = moment().valueOf();
        let lefttime = obj.t - now;
        mbgGame.logger.info("Cache, do check", obj.k, obj.t, lefttime, now);
        while (lefttime <= 0) {
            const k = obj.k;
            mbgGame.logger.info("Cache, del", k);
            delete this.data[k];
            this.expireHeap.pop();
            obj = this.expireHeap.peek();
            if (!obj) {
                break;
            }
            lefttime = obj.t - now;
        }
        this.updateCheckTimer();
    }
}

// 单例
const Cache = new CCache();


module.exports = Cache;