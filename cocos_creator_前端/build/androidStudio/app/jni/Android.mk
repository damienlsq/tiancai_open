LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)
LOCAL_MODULE := cocos2djs_shared
LOCAL_MODULE_FILENAME := libcocos2djs

ifeq ($(USE_ARM_MODE),1)
LOCAL_ARM_MODE := arm
endif

LOCAL_SRC_FILES := main.cpp \
../../../jsb-link/frameworks/runtime-src/Classes/AppDelegate.cpp \
../../../jsb-link/frameworks/runtime-src/Classes/jsb_module_register.cpp

LOCAL_SRC_FILES += $(MY_CPP_SRC_LIST:$(LOCAL_PATH)/%=%)

LOCAL_C_INCLUDES := $(LOCAL_PATH)/../../../common/Classes/

LOCAL_STATIC_LIBRARIES := cocos2dx_static

include $(BUILD_SHARED_LIBRARY)


$(call import-module, cocos)
