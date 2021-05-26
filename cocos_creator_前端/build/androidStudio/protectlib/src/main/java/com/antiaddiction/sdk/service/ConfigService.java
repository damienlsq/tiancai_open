package com.antiaddiction.sdk.service;

import com.antiaddiction.sdk.AntiAddictionKit;
import com.antiaddiction.sdk.AntiAddictionPlatform;
import com.antiaddiction.sdk.dao.ConfigDao;
import com.antiaddiction.sdk.net.HttpUtil;
import com.antiaddiction.sdk.net.NetUtil;
import com.antiaddiction.sdk.utils.LogUtil;

import org.json.JSONObject;

public class ConfigService {
    public static void getConfigFromServer(){
        LogUtil.logd("getConfigFromServer invoke");
        HttpUtil.getAsync(ServerApi.CONFIG.getApi(), new NetUtil.NetCallback() {
            @Override
            public void onSuccess(String response) {
                    LogUtil.logd("getConfigFromServer response = " + response);
                try {
                    JSONObject result = new JSONObject(response);
                    if (result.getInt("code") == 200) {
                        JSONObject data = result.getJSONObject("data");
                        AntiAddictionKit.getCommonConfig().praseJson(data);
                        ConfigDao.saveConfig(AntiAddictionPlatform.getActivity(), data);
                    }

                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            @Override
            public void onFail(int code, String message) {
                    LogUtil.logd("getConfigFromServer fail code = " + code + " msg = " + message);

            }
        });
    }
}
