package com.antiaddiction.sdk.service;


import com.antiaddiction.sdk.AntiAddictionKit;

public enum ServerApi {
    AUTHORIZATIONS ( "/v1/fcm/authorizations"),
    PLAY_LOG ("/v1/fcm/set_play_log"),
    REAL_USER_INFO ("/v1/fcm/real_user_info"),
    CHECK_PAY ("/v1/fcm/check_pay"),
    SUBMIT_PAY ("/v1/fcm/submit_pay"),
    CONFIG("/v1/fcm/get_config"),
    SERVER_TIME("/v1/fcm/get_server_time");
    private String api;

    ServerApi(String api){
        this.api = api;
    }
    public String getApi(){
        return AntiAddictionKit.getFunctionConfig().getHost() + api;
    }
}
