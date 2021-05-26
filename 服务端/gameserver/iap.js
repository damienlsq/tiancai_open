/**
 * Created by damien on 15/7/7.
 */
const cmdfunc = require('./cmdfunc');
const inAppPurchase = require('in-app-purchase');
const co = require('co');
const Cache = require('./cache');
const wechat = require('./wechat');
const httppost = require('co-request').post;

let bill_table = ''; // 保存单据的表名
let pay_uuid = ''; // 玩家的充值记录

let bundleID = null;

function iosPay(dHeader, dData) {

}

// 支付宝或微信的preorder
function preorder(dHeader, dData) {

}

function payCheck(dHeader, dData) {

}

// 微信支付
function wx_preorder(dHeader, msg) {

}


// 米大师支付 -- 微信小游戏
function midasPay(dHeader, dData) {

}

module.exports = {
  init,
  C2GS_CMD_FUNC: {
    iosPay,
    preorder,
    payCheck,
    wx_preorder,
    alipayv2_preorder,
    midasPay,
  },
};
