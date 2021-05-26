#include "jsb_forwarder_binding.hpp"

#include "cocos2d.h"
#include "scripting/js-bindings/manual/jsb_classtype.hpp"
#include "forwardctrl.h"

#include <stdio.h>
#include <functional>

static se::Object* __jsb_ns_ForwardCtrl_proto = nullptr;
static se::Class* __jsb_ns_ForwardCtrl_class = nullptr;

USING_NS_CC;

static bool js_ForwardCtrl_finalize(se::State& s)
{
    return true;
}
SE_BIND_FINALIZE_FUNC(js_ForwardCtrl_finalize)


static bool js_ForwardCtrl_constructor(se::State& s)
{
    forwarder::ForwardCtrl* cobj = forwarder::ForwardCtrl::getInstance();
    s.thisObject()->setPrivateData(cobj);
    return true;
}
SE_BIND_CTOR(js_ForwardCtrl_constructor, __jsb_ns_ForwardCtrl_class, js_ForwardCtrl_finalize)


static bool js_ForwardCtrl_version(se::State& s)
{
    forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
    int version = ctrl->version();
    s.rval().setInt32(version);
    return true;
}
SE_BIND_FUNC(js_ForwardCtrl_version)


static bool js_ForwardCtrl_release(se::State& s)
{
    forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
    ctrl->release();
    return true;
}
SE_BIND_FUNC(js_ForwardCtrl_release)


static bool js_ForwardCtrl_setDebug(se::State& s)
{
    const auto& args = s.args();
    int argc = (int)args.size();
    if (argc > 0)
    {
        forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
        ctrl->setDebug(args[0].toBoolean());
        return true;
    }
    
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", argc, 1);
    return false;
}
SE_BIND_FUNC(js_ForwardCtrl_setDebug)


static bool js_ForwardCtrl_setupLogger(se::State& s)
{
    const auto& args = s.args();
    int argc = (int)args.size();
    if (argc > 0)
    {
        forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
        ctrl->setupLogger(args[0].toString().c_str());
        return true;
    }
    
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", argc, 1);
    return false;
}
SE_BIND_FUNC(js_ForwardCtrl_setupLogger)


static bool js_ForwardCtrl_setLogLevel(se::State& s)
{
    const auto& args = s.args();
    int argc = (int)args.size();
    if (argc > 0)
    {
        forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
        ctrl->setLogLevel(static_cast<spdlog::level::level_enum>(args[0].toInt32()));
        return true;
    }
    
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", argc, 1);
    return false;
}
SE_BIND_FUNC(js_ForwardCtrl_setLogLevel)



static bool js_ForwardCtrl_setProtocolRule(se::State& s)
{
    const auto& args = s.args();
    int argc = (int)args.size();
    if (argc >= 3)
    {
        forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
        forwarder::UniqID serverId = args[0].toInt32();
        forwarder::ForwardServer* server = ctrl->getServerByID(serverId);
        if (server) {
            int protocolId = args[1].toInt32();
            std::string sRule = args[2].toString();
            forwarder::HandleRule rule = forwarder::HandleRule::Unknown;
            if (strcmp(sRule.c_str(), "SysCmd") == 0) {
                rule = forwarder::HandleRule::SysCmd;
            } else if (strcmp(sRule.c_str(), "Forward") == 0) {
                rule = forwarder::HandleRule::Forward;
            } else if (strcmp(sRule.c_str(), "Process") == 0) {
                rule = forwarder::HandleRule::Process;
            }
            server->setRule(static_cast<forwarder::Protocol>(protocolId), rule);
        }
        return true;
    }
    
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", argc, 1);
    return false;
}
SE_BIND_FUNC(js_ForwardCtrl_setProtocolRule)


static bool js_ForwardCtrl_createServer(se::State& s)
{
    const auto& args = s.args();
    int argc = (int)args.size();
    if (argc > 0)
    {
        forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
        std::string data = args[0].toString();
        rapidjson::Document config;
        config.Parse(data.c_str());
        int serverId = ctrl->createServer(config);
        s.rval().setInt32(serverId);
        return true;
    }
    
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", argc, 1);
    return false;
}
SE_BIND_FUNC(js_ForwardCtrl_createServer)


static bool js_ForwardCtrl_removeServer(se::State& s)
{
    const auto& args = s.args();
    int argc = (int)args.size();
    if (argc > 0)
    {
        forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
        int ret = static_cast<int>(ctrl->removeServerByID(args[0].toInt32()));
        s.rval().setInt32(ret);
        return true;
    }
    
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", argc, 1);
    return false;
}
SE_BIND_FUNC(js_ForwardCtrl_removeServer)


static bool js_ForwardCtrl_isConnected(se::State& s)
{
    const auto& args = s.args();
    int argc = (int)args.size();
    if (argc > 0)
    {
        bool connected = false;
        forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
        forwarder::ForwardServer* server = ctrl->getServerByID(args[0].toInt32());
        if(server) {
            connected = server->isConnected();
        }
        s.rval().setBoolean(connected);
        return true;
    }
    
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", argc, 1);
    return false;
}
SE_BIND_FUNC(js_ForwardCtrl_isConnected)


static bool js_ForwardCtrl_disconnect(se::State& s)
{
    const auto& args = s.args();
    int argc = (int)args.size();
    if (argc > 0)
    {
        forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
        forwarder::ForwardServer* server = ctrl->getServerByID(args[0].toInt32());
        if(server) {
             server->doDisconnect();
        }
        return true;
    }
    
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", argc, 1);
    return false;
}
SE_BIND_FUNC(js_ForwardCtrl_disconnect)


static bool js_ForwardCtrl_reconnect(se::State& s)
{
    const auto& args = s.args();
    int argc = (int)args.size();
    if (argc > 0)
    {
        forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
        forwarder::ForwardServer* server = ctrl->getServerByID(args[0].toInt32());
        if(server) {
            server->doReconnect();
        }
        return true;
    }
    
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", argc, 1);
    return false;
}
SE_BIND_FUNC(js_ForwardCtrl_reconnect)


static bool js_ForwardCtrl_pollOnce(se::State& s)
{
    const auto& args = s.args();
    int argc = (int)args.size();
    if (argc > 0)
    {
        forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
        ctrl->pollOnceByServerID(args[0].toInt32());
        return true;
    }
    
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", argc, 1);
    return false;
}
SE_BIND_FUNC(js_ForwardCtrl_pollOnce)


static bool js_ForwardCtrl_getCurEvent(se::State& s)
{
    forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
    forwarder::Event event = ctrl->getCurEvent();
    s.rval().setInt32(static_cast<int>(event));
    return true;
}
SE_BIND_FUNC(js_ForwardCtrl_getCurEvent)


static bool js_ForwardCtrl_sendText(se::State& s)
{
    const auto& args = s.args();
    int argc = (int)args.size();
    if (argc >= 3)
    {
        forwarder::UniqID serverId = args[0].toInt32();
        forwarder::UniqID clientId = args[1].toInt32();
        std::string data = args[2].toString();
        forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
        int ret = static_cast<int>(ctrl->sendText(serverId, clientId, data.c_str()));
        s.rval().setInt32(ret);
        return true;
    }
    
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", argc, 1);
    return false;
}
SE_BIND_FUNC(js_ForwardCtrl_sendText)


static bool js_ForwardCtrl_sendBinary(se::State& s)
{
    const auto& args = s.args();
    int argc = (int)args.size();
    if (argc >= 3)
    {
        forwarder::UniqID serverId = args[0].toInt32();
        forwarder::UniqID clientId = args[1].toInt32();
        int len;
        void * data;
        //JSB_get_arraybufferview_dataptr(cx, args[2], &len, &data);
        //forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
        //int ret = static_cast<int>(ctrl->sendText(serverId, clientId, data.c_str()));
        //s.rval().setInt32(ret);
        return true;
    }
    
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", argc, 1);
    return false;
}
SE_BIND_FUNC(js_ForwardCtrl_sendBinary)


static bool js_ForwardCtrl_forwardText(se::State& s)
{
    const auto& args = s.args();
    int argc = (int)args.size();
    if (argc >= 9)
    {
        forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
        forwarder::UniqID serverId = args[0].toInt32();
        forwarder::UniqID clientId = args[1].toInt32();
        std::string data = args[2].toString();
        forwarder::UniqID forwardServerId = args[3].toInt32();
        forwarder::UniqID forwardClientId = args[4].toInt32();
        bool isBroadcast = args[5].toBoolean();
        bool isForceRaw = args[6].toBoolean();
        bool isBatchMode = args[7].toBoolean();
        bool isUnreliable = args[8].toBoolean();
        size_t sendFlags = 0;
        if(isBroadcast) {
            sendFlags |= SendFlag_Broadcast;
        }
        if(isForceRaw) {
            sendFlags |= SendFlag_ForceRaw;
        }
        if(isBatchMode) {
            sendFlags |= SendFlag_BatchMode;
        }
        if(isUnreliable) {
            sendFlags |= SendFlag_Unreliable;
        } else {
            sendFlags |= SendFlag_Reliable;
        }
        
        int ret = static_cast<int>(ctrl->forwardText(serverId, clientId, data.c_str(), forwardServerId, forwardClientId, sendFlags));
        s.rval().setInt32(ret);
        return true;
    }
    
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", argc, 1);
    return false;
}
SE_BIND_FUNC(js_ForwardCtrl_forwardText)


static bool js_ForwardCtrl_getCurProcessServerID(se::State& s)
{
    forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
    auto server = ctrl->getCurProcessServer();
    forwarder::UniqID serverId = 0;
    if(server) {
        serverId = server->id;
    }
    s.rval().setInt32(serverId);
    return true;
}
SE_BIND_FUNC(js_ForwardCtrl_getCurProcessServerID)


static bool js_ForwardCtrl_getCurProcessClientID(se::State& s)
{
    forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
    auto client = ctrl->getCurProcessClient();
    forwarder::UniqID clientId = 0;
    if(client) {
        clientId = client->id;
    }
    s.rval().setInt32(clientId);
    return true;
}
SE_BIND_FUNC(js_ForwardCtrl_getCurProcessClientID)


static bool js_ForwardCtrl_getCurProcessPacket(se::State& s)
{
    forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
    const char* data = (char*)(ctrl->getCurProcessData());
    size_t len = ctrl->getCurProcessDataLength();
    std::string sData(data, len);
    //printf("data:[[%s]]\n", sData.c_str());
    //se::Object* obj = se::Object::createUint8TypedArray((uint8_t*)data, len);
    //s.rval().setObject(obj);
    s.rval().setString(sData);
    return true;
}
SE_BIND_FUNC(js_ForwardCtrl_getCurProcessPacket)


static bool js_ForwardCtrl_getCurHeaderHostID(se::State& s)
{
    forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
    uint8_t hostID = 0;
    forwarder::ForwardHeader* header = ctrl->getCurProcessHeader();
    if (header && header->isFlagOn(forwarder::HeaderFlag::HostID)) {
        hostID = header->getHostID();
    }
    s.rval().setInt8(hostID);
    return true;
}
SE_BIND_FUNC(js_ForwardCtrl_getCurHeaderHostID)


static bool js_ForwardCtrl_getCurHeaderClientID(se::State& s)
{
    forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
    uint32_t clientID = 0;
    forwarder::ForwardHeader* header = ctrl->getCurProcessHeader();
    if (header && header->isFlagOn(forwarder::HeaderFlag::ClientID)) {
        clientID = header->getClientID();
    }
    s.rval().setInt32(clientID);
    return true;
}
SE_BIND_FUNC(js_ForwardCtrl_getCurHeaderClientID)


static bool js_ForwardCtrl_getCurHeaderIP(se::State& s)
{
    forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
    uint32_t ip = 0;
    forwarder::ForwardHeader* header = ctrl->getCurProcessHeader();
    if (header && header->isFlagOn(forwarder::HeaderFlag::IP)) {
        ip = header->getIP();
    }
    s.rval().setInt32(ip);
    return true;
}
SE_BIND_FUNC(js_ForwardCtrl_getCurHeaderIP)


static bool js_ForwardCtrl_setTimeout(se::State& s)
{
    const auto& args = s.args();
    int argc = (int)args.size();
    if (argc >= 4)
    {
        forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
        forwarder::UniqID serverId = args[0].toInt32();
        auto server = ctrl->getServerByID(serverId);
        if(!server || !server->isClientMode || server->netType != forwarder::NetType::ENet) {
            return true;
        }
        auto client = server->getClient(server->clientID);
        if(!client) {
            return true;
        }
        int timeoutLimit = args[1].toInt32();
        int timeoutmin = args[2].toInt32();
        int timeoutMax = args[3].toInt32();
        forwarder::ForwardClientENet* clientENet = dynamic_cast<forwarder::ForwardClientENet*>(client);
        clientENet->setPeerTimeout(timeoutLimit, timeoutmin, timeoutMax);
        return true;
    }
    
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", argc, 1);
    return false;
}
SE_BIND_FUNC(js_ForwardCtrl_setTimeout)


static bool js_ForwardCtrl_setPingInterval(se::State& s)
{
    const auto& args = s.args();
    int argc = (int)args.size();
    if (argc >= 2)
    {
        forwarder::ForwardCtrl* ctrl = (forwarder::ForwardCtrl*)s.nativeThisObject();
        forwarder::UniqID serverId = args[0].toInt32();
        auto server = ctrl->getServerByID(serverId);
        if(!server || !server->isClientMode || server->netType != forwarder::NetType::ENet) {
            return true;
        }
        auto client = server->getClient(server->clientID);
        if(!client) {
            return true;
        }
        int interval = args[1].toInt32();
        forwarder::ForwardClientENet* clientENet = dynamic_cast<forwarder::ForwardClientENet*>(client);
        clientENet->setPing(interval);
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", argc, 1);
    return false;
}
SE_BIND_FUNC(js_ForwardCtrl_setPingInterval)

static bool js_ForwardCtrl_base64Decode(se::State& s)
{
    const auto& args = s.args();
    int argc = (int)args.size();
    if (argc >= 1)
    {
        size_t len;
        forwarder::Base64Codec& codec = forwarder::Base64Codec::get();
        std::string strdata = args[0].toString();
        const char* data = strdata.c_str();
        len = strdata.length();
        if (len > 0) {
            size_t bufferLen = codec.calculateDataLength(data, len);
            uint8_t* buffer = new uint8_t[bufferLen + 1];
            memset(buffer, 0, bufferLen + 1);
            size_t newStrLen = 0;
            codec.toByteArray(data, len, buffer, &newStrLen);
            std::string result((char*)buffer);
            delete[] buffer;
            s.rval().setString(result);
        }
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", argc, 1);
    return false;
}
SE_BIND_FUNC(js_ForwardCtrl_base64Decode)


static bool js_ForwardCtrl_base64Encode(se::State& s)
{
    const auto& args = s.args();
    int argc = (int)args.size();
    if (argc >= 1)
    {
        size_t len;
        forwarder::Base64Codec& codec = forwarder::Base64Codec::get();
        std::string strdata = args[0].toString();
        len = strdata.length();
        if (len > 0) {
            const char* data = strdata.c_str();
            size_t len = strdata.length();
            std::string str = codec.fromByteArray((uint8_t*)data, len);
            s.rval().setString(str);
        }
        return true;
    }
    SE_REPORT_ERROR("wrong number of arguments: %d, was expecting %d", argc, 1);
    return false;
}
SE_BIND_FUNC(js_ForwardCtrl_base64Encode)

/*
static bool js_ForwardCtrl_static_func(se::State& s)
{
    ns::ForwardCtrl::static_func();
    return true;
}
SE_BIND_FUNC(js_ForwardCtrl_static_func)
*/

bool js_register_forwarder(se::Object* global)
{
    // 保证namespace对象存在
    se::Value nsVal;
    if (!global->getProperty("forwarder", &nsVal))
    {
        // 不存在则创建一个JS对象，相当于 var ns = {};
        se::HandleObject jsobj(se::Object::createPlainObject());
        nsVal.setObject(jsobj);
        
        // 将ns对象挂载到global对象中，名称为ns
        global->setProperty("forwarder", nsVal);
    }
    se::Object* ns = nsVal.toObject();
    
    // 创建一个Class对象，开发者无需考虑Class对象的释放，其交由ScriptEngine内部自动处理
    auto cls = se::Class::create("ForwardCtrl", ns, nullptr, _SE(js_ForwardCtrl_constructor)); // 如果无构造函数，最后一个参数可传入nullptr，则这个类在JS中无法被new ForwardCtrl()出来
    
    // 为这个Class对象定义成员函数、属性、静态函数、析构函数
    cls->defineFunction("version", _SE(js_ForwardCtrl_version));
    cls->defineFunction("release", _SE(js_ForwardCtrl_release));
    cls->defineFunction("setDebug", _SE(js_ForwardCtrl_setDebug));
    cls->defineFunction("setupLogger", _SE(js_ForwardCtrl_setupLogger));
    cls->defineFunction("setLogLevel", _SE(js_ForwardCtrl_setLogLevel));
    cls->defineFunction("setProtocolRule", _SE(js_ForwardCtrl_setProtocolRule));
    cls->defineFunction("createServer", _SE(js_ForwardCtrl_createServer));
    cls->defineFunction("removeServer", _SE(js_ForwardCtrl_removeServer));
    cls->defineFunction("isConnected", _SE( js_ForwardCtrl_isConnected));
    cls->defineFunction("disconnect", _SE(js_ForwardCtrl_disconnect));
    cls->defineFunction("reconnect", _SE(js_ForwardCtrl_reconnect));
    cls->defineFunction("pollOnce", _SE(js_ForwardCtrl_pollOnce));
    cls->defineFunction("getCurEvent", _SE(js_ForwardCtrl_getCurEvent));
    cls->defineFunction("sendText", _SE(js_ForwardCtrl_sendText));
    cls->defineFunction("sendBinary", _SE(js_ForwardCtrl_sendBinary));
    cls->defineFunction("forwardText", _SE(js_ForwardCtrl_forwardText));
    cls->defineFunction("getCurProcessServerID", _SE(js_ForwardCtrl_getCurProcessServerID));
    cls->defineFunction("getCurProcessClientID", _SE(js_ForwardCtrl_getCurProcessClientID));
    cls->defineFunction("getCurProcessPacket", _SE(js_ForwardCtrl_getCurProcessPacket));
    cls->defineFunction("getCurHeaderHostID", _SE(js_ForwardCtrl_getCurHeaderHostID));
    cls->defineFunction("getCurHeaderClientID", _SE(js_ForwardCtrl_getCurHeaderClientID));
    cls->defineFunction("getCurHeaderIP", _SE(js_ForwardCtrl_getCurHeaderIP));
    cls->defineFunction("setTimeout", _SE(js_ForwardCtrl_setTimeout));
    cls->defineFunction("setPingInterval", _SE(js_ForwardCtrl_setPingInterval));
    cls->defineFunction("base64Decode", _SE(js_ForwardCtrl_base64Decode));
    cls->defineFunction("base64Encode", _SE(js_ForwardCtrl_base64Encode));
    

    cls->defineFinalizeFunction(_SE(js_ForwardCtrl_finalize));
    
    // 注册类型到JS VirtualMachine的操作
    cls->install();
    
    // JSBClassType为Cocos引擎绑定层封装的类型注册的辅助函数，此函数不属于ScriptEngine这层
    JSBClassType::registerClass<forwarder::ForwardCtrl>(cls);
    
    // 保存注册的结果，便于其他地方使用，比如类继承
    __jsb_ns_ForwardCtrl_proto = cls->getProto();
    __jsb_ns_ForwardCtrl_class = cls;
    
    // 为每个此Class实例化出来的对象附加一个属性
    //  __jsb_ns_ForwardCtrl_proto->setProperty("yyy", se::Value("helloyyy"));
    
    // 注册静态成员变量和静态成员函数
    /*
    se::Value ctorVal;
    if (ns->getProperty("ForwardCtrl", &ctorVal) && ctorVal.isObject())
    {
        ctorVal.toObject()->setProperty("static_val", se::Value(200));
        ctorVal.toObject()->defineFunction("static_func", _SE(js_ForwardCtrl_static_func));
    }*/
    
    // 清空异常
    se::ScriptEngine::getInstance()->clearException();
    return true;
}
