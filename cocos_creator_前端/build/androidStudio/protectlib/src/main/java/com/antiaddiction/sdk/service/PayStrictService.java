package com.antiaddiction.sdk.service;

import android.util.Log;

import com.antiaddiction.sdk.AntiAddictionKit;
import com.antiaddiction.sdk.Callback;
import com.antiaddiction.sdk.entity.User;
import com.antiaddiction.sdk.net.HttpUtil;
import com.antiaddiction.sdk.net.NetUtil;
import com.antiaddiction.sdk.utils.LogUtil;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.HashMap;
import java.util.Map;

public class PayStrictService {

    public static void checkPayLimit(int num,User user,Callback callback){
        if(AntiAddictionKit.getFunctionConfig().getSupportSubmitToServer()){
            checkPayLimitByServer(num,user,callback);
        }else{
            callback.onSuccess(checkPayLimitByLocale(num,user));
        }
    }
    //兼容老接口同步获取付费限制
    public static JSONObject checkPayLimitSync(int num,User user){
        return checkPayLimitByLocale(num,user);
    }

    private static JSONObject checkPayLimitByLocale(int num, User user){
        int strictType = 0; // 1限制 2提示
        String title = "健康消费提示";
        String desc = "";
        if(user == null){
            return null;
        }
        if(user.getAccountType() == AntiAddictionKit.USER_TYPE_CHILD){
            strictType = 1;
            desc = "根据国家相关规定，当前您无法使用充值相关功能。";
        }else if(user.getAccountType() == AntiAddictionKit.USER_TYPE_TEEN){
            if(num > AntiAddictionKit.getCommonConfig().getTeenPayLimit()){
                strictType = 1;
                desc = "根据国家相关规定，您本次付费金额超过规定上限，无法购买。请适度娱乐，理性消费。";
            }else{
                if((user.getPayMonthNum()  + num) > AntiAddictionKit.getCommonConfig().getTeenMonthPayLimit()){
                    strictType = 1;
                    desc = "根据国家相关规定，您当月的剩余可用充值额度不足，无法购买此商品。请适度娱乐，理性消费。";
                }
//                else {
//                    if (num + user.getPayMonthNum() > AntiAddictionKit.getCommonConfig().getTeenMonthPayLimit()) {
//                        strictType = 1;
//                        desc = "根据国家相关规定，您当月的剩余可用充值额度不足，无法购买此商品。请适度娱乐，理性消费";
//                    }
//                }
            }
        }else if(user.getAccountType() == AntiAddictionKit.USER_TYPE_YOUNG){
            if(num > AntiAddictionKit.getCommonConfig().getYoungPayLimit()){
                strictType = 1;
                desc = "根据国家相关规定，您本次付费金额超过规定上限，无法购买。请适度娱乐，理性消费。";
            }else{
                if((user.getPayMonthNum() + num) > AntiAddictionKit.getCommonConfig().getYoungMonthPayLimit()){
                    strictType = 1;
                    desc = "根据国家相关规定，您当月的剩余可用充值额度不足，无法购买此商品。请适度娱乐，理性消费。";
                }
//                else {
//                    if (num + user.getPayMonthNum() > AntiAddictionKit.getCommonConfig().getYoungMonthPayLimit()) {
//                        strictType = 1;
//                        desc = "根据国家相关规定，您当月的剩余可用充值额度不足，无法购买此商品。请适度娱乐，理性消费";
//                    }
//                }
            }
        }
        JSONObject response = new JSONObject();
        try {
            response.put("strictType",strictType);
            response.put("title",title);
            response.put("desc",desc);
        } catch (JSONException e) {
            return null;
        }
       return response;
    }

    private static void checkPayLimitByServer(int num, User user, final Callback callback){
        String params = "amount="+num;
        Map<String,String> head = new HashMap<>();
        try {
            head.put("Authorization","Bearer " + URLEncoder.encode(user.getUserId(), "UTF-8"));
        } catch (UnsupportedEncodingException e) {
            e.printStackTrace();
        }
        HttpUtil.postAsyncWithHead(ServerApi.CHECK_PAY.getApi(), params, head,new NetUtil.NetCallback() {
            @Override
            public void onSuccess(String response) {
                try {
                    JSONObject jsonObject = new JSONObject();
                    JSONObject result = new JSONObject(response);
                    if(result.getInt("code") == 200){
                        String title="",description="";
                        int strictType = 0;
                        int check = result.getInt("check");
                        if(check == 0){
                            strictType = 1;
                            title = result.getString("title");
                            description = result.getString("description");
                        }
                        jsonObject.put("strictType",strictType);
                        jsonObject.put("title",title);
                        jsonObject.put("desc",description);
                        callback.onSuccess(jsonObject);
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                    callback.onFail("");
                }
            }

            @Override
            public void onFail(int code, String message) {
                callback.onFail(message);
            }
        });
    }

    public static void submitPaySuccess(String  token,int num){
        LogUtil.logd("submitPaySuccess invoke");
        Map<String,String> head = new HashMap<>();
        try {
            head.put("Authorization","Bearer " + URLEncoder.encode(token, "UTF-8"));
        } catch (UnsupportedEncodingException e) {
            e.printStackTrace();
        }
        String params = "amount="+num;
        HttpUtil.postAsyncWithHead(ServerApi.SUBMIT_PAY.getApi(), params,head, new NetUtil.NetCallback() {
            @Override
            public void onSuccess(String response) {
                LogUtil.logd("submitPaySuccess response = " + response);
            }

            @Override
            public void onFail(int code, String message) {
                LogUtil.logd("submitPaySuccess fail = " + message);
            }
        });

    }
}
