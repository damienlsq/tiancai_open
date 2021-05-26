const assert = require('assert');

function forwarderSendCmd(fwd, serverId, clientId, cmd, dData) {
    if (dData._cmd && dData._cmd !== cmd) {
        mbgGame.logError("forwarderSendCmd, dData['_cmd'] && dData['_cmd'] != cmd");
        return 0;
    }
    dData._cmd = cmd;
    const sData = JSON.stringify(dData);
    assert(serverId);
    fwd.sendText(serverId, clientId, sData);
    return sData.length;
}


// GS->FS专用
// 把后2个参数封装起来，经过backward这个特殊协议，在FS的backward处理函数里解包，并发送给C
function SendResponse(dHeader, cmd, dPacketData) {
    const sid = dHeader.meta.sid || 0;
    const cid = dHeader.meta.cid;
    if (cid > 0) {
        mbgGame.fwd.forwardText(mbgGame.FS2GSServerId, 0, JSON.stringify(dPacketData), sid, cid, false);
    } else {
        mbgGame.logError(`[cmdfunc.SendResponse] forwarder error, no cid, cmd: ${cmd} ${dHeader}`);
    }
}

/*
TODO: C和FS之间验证session(token)，GS则不做这个事情
function generateSessionID() {
    var secret = "tellnobody"; //秘钥
    //用当前时间+随机数组合，生成原始id串（基本保证唯一性）
    var sessionID = (new Date()).getTime() + Math.random().toString();
    //用秘钥计算出sid的签名，再与sid组合，增加sid长度，防止暴力扫描sid
    sessionID = sessionID + '.' + CryptoJS.createHmac('sha1', secret).update(sessionID).digest('base64').replace(/[\/\+=]/g, '');
    return sessionID;
}*/


function handleCmd(dHeader, dData, cmdFuncDict, defaultCmdFuncDict) {
    const cmd = dData._cmd;
    if (!cmd) {
        mbgGame.logError(`cmd not defined: ${JSON.stringify(dHeader)}, ${JSON.stringify(dData)}`);
        return null;
    }
    let func = null;
    if (cmdFuncDict) {
        func = cmdFuncDict[cmd];
        if (!func) {
            mbgGame.logError(`cmdFuncDict has no: ${cmd}`);
        }
    }
    if (!func) {
        func = defaultCmdFuncDict && defaultCmdFuncDict[cmd];
        if (!func) {
            mbgGame.logError(`defaultCmdFuncDict has no:${cmd}`);
            return null;
        }
    }
    return func(dHeader, dData);
}

module.exports = {
    forwarderSendCmd,
    handleCmd,
    SendResponse,
};