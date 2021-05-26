#ifndef jsb_forwarder_binding_hpp
#define jsb_forwarder_binding_hpp


#include "base/ccConfig.h"

#include "cocos/scripting/js-bindings/jswrapper/SeApi.h"

namespace se {
    class Object;
    class Class;
}

bool js_register_forwarder(se::Object* obj);



#endif
