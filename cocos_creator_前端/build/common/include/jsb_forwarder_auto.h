#ifndef jsb_forwarder_auto_h
#define jsb_forwarder_auto_h

#include "jsapi.h"
#include "jsfriendapi.h"
#include "cocos/scripting/js-bindings/manual/ScriptingCore.h"
#include "cocos/scripting/js-bindings/manual/jsb_module_register.hpp"
#include "cocos/scripting/js-bindings/manual/jsb_global.h"
#include "cocos/scripting/js-bindings/jswrapper/SeApi.h"


void  register_all_forwarder(JSContext* cx, JS::HandleObject obj);

#endif /* jsb_forwarder_auto_h */
