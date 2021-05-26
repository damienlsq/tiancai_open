package com.antiaddiction.sdk.service;

import android.content.Context;
import android.content.SharedPreferences;

import com.antiaddiction.sdk.AntiAddictionKit;
import com.antiaddiction.sdk.AntiAddictionPlatform;
import com.antiaddiction.sdk.Callback;
import com.antiaddiction.sdk.dao.UserDao;
import com.antiaddiction.sdk.entity.User;
import com.antiaddiction.sdk.net.HttpUtil;
import com.antiaddiction.sdk.net.NetUtil;
import com.antiaddiction.sdk.utils.AesUtil;
import com.antiaddiction.sdk.utils.LogUtil;
import com.antiaddiction.sdk.utils.RexCheckUtil;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

public class UserService {

    private static final String IDENTIFY_DEFAULT = "110111";
    private static final String IDENTIFY_END = "1111";
    //根据日期重置用户相关信息
    public static User resetUserState(User user){
        if(user.getAccountType() == AntiAddictionKit.USER_TYPE_ADULT){
            return user;
        }
        long saveTimeStamp = user.getSaveTimeStamp();
        int onlineTime = user.getOnlineTime();
        int payMonthNum = user.getPayMonthNum();
        String birthday = user.getBirthday();
        int accountType = user.getAccountType();
        SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyyMMdd");
        Date date1 = new Date();
        String time1 = simpleDateFormat.format(date1);
        String time2 = simpleDateFormat.format(new Date(saveTimeStamp));
        if(!time1.equals(time2)) {
            if(user.getAccountType() != AntiAddictionKit.USER_TYPE_UNKNOWN) {
                onlineTime = 0;
            }
            saveTimeStamp = date1.getTime();
            if (!time1.substring(4, 6).equals(time2.substring(4, 6))) {
                payMonthNum = 0;
            }
            try {
                if (birthday != null && birthday.length() > 4) {
                    Date date = simpleDateFormat.parse(birthday);
                    if (null != date) {
                        int age = RexCheckUtil.getAgeByDate(date);
                       accountType = getUserTypeByAge(age);
                    }
                }
                user.setSaveTimeStamp(saveTimeStamp);
                user.setOnlineTime(onlineTime);
                user.setPayMonthNum(payMonthNum);
                user.setAccountType(accountType);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        return user;
    }

    public static int getUserTypeByAge(int age){
        int accountType = AntiAddictionKit.USER_TYPE_UNKNOWN;
        if(age == 0){
            accountType = AntiAddictionKit.USER_TYPE_UNKNOWN;
        } else if (age < 8) {
            accountType = AntiAddictionKit.USER_TYPE_CHILD;
        } else if (age < 16) {
            accountType = AntiAddictionKit.USER_TYPE_TEEN;
        } else if (age < 18) {
            accountType = AntiAddictionKit.USER_TYPE_YOUNG;
        } else {
            accountType = AntiAddictionKit.USER_TYPE_ADULT;
        }
        return accountType;
    }

    private static JSONArray getAllUserInfo(){
        JSONArray jsonArray = new JSONArray();
        Context context = AntiAddictionPlatform.getActivity();
        File prefsDir = new File(context.getApplicationInfo().dataDir,"shared_prefs");
        if(prefsDir.exists() && prefsDir.isDirectory()){
            String[] fileNames = prefsDir.list();
            if(fileNames != null){
                LogUtil.logd("all preference list = " + fileNames);
            for(String fileName:fileNames) {
                if(fileName.contains("USER_INFO")) {
                    String preffile = fileName.substring(0, fileName.length() - 4);
                    LogUtil.logd("perffile = " + preffile);
                    SharedPreferences sharedPreferences = context.getSharedPreferences(preffile, Context.MODE_PRIVATE);
                    Map<String, ?> map = sharedPreferences.getAll();
                    String data = (String) map.values().toArray()[0];
                    JSONObject jsonObject = new JSONObject();
                    try {
                        jsonObject = new JSONObject(data);
                        String userId = jsonObject.getString("userId");
                        String phone = jsonObject.getString("phone");
                        String identify = jsonObject.getString("identify");
                        int accountType = jsonObject.getInt("accountType");
                        String passwd = AntiAddictionKit.getCommonConfig().getEncodeString().length() > 0 ? AntiAddictionKit.getCommonConfig().getEncodeString() : "test";
                        try {
                            jsonObject.put("phone", AesUtil.getDecryptStr(phone, passwd));
                            jsonObject.put("identify", AesUtil.getDecryptStr(identify, passwd));
                        } catch (Exception e) {
                            String birthday = jsonObject.getString("birthday");
                            if(birthday.length() > 4){
                                //由于之前加密编码异常，会出现无法正常解密，所以特殊处理
                                jsonObject.put("phone","");
                                jsonObject.put("identify",IDENTIFY_DEFAULT + birthday + IDENTIFY_END);
                            }
                        }
                        jsonObject.put("accountType",accountType);
                        jsonObject.put("userId",userId);
                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                    jsonArray.put(jsonObject);
                    LogUtil.logd("get data = " + data);
                }
            }

            }
        }
        return jsonArray;
    }

    private static void clearLocaleUserInfo(){
        Context context = AntiAddictionPlatform.getActivity();
        File prefsDir = new File(context.getApplicationInfo().dataDir,"shared_prefs");
        if(prefsDir.exists() && prefsDir.isDirectory()) {
            String[] fileNames = prefsDir.list();
            for(String fileName:fileNames){
                File file = new File(context.getApplicationInfo().dataDir+File.separator
                        +"shared_prefs"+File.separator + fileName);
                file.delete();
            }
        }
    }
    public static void getUserInfo(String token, int userType, final Callback callback){
        LogUtil.logd("getUserInfo invoke");
        if(token == null || token.length() == 0){
            return ;
        }
        JSONArray jsonArray = getAllUserInfo();
        String params = null;
        try {
            params = "token=" + URLEncoder.encode(token, "UTF-8") +"&accountType="+userType+ (jsonArray.length() > 0 ?  ("&local_user_info="+jsonArray) : "");
        } catch (UnsupportedEncodingException e) {
            e.printStackTrace();
        }
        HttpUtil.postAsyncWithRetry(ServerApi.AUTHORIZATIONS.getApi(), params, new NetUtil.NetCallback() {
            @Override
            public void onSuccess(String response) {
                LogUtil.logd("getUserInfo invoke success = " + response);
                try {
                    JSONObject result = new JSONObject(response);
                    if(result.getInt("code") == 200){
                        callback.onSuccess(result.getJSONObject("data"));
                        clearLocaleUserInfo();
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                    callback.onFail("");
                }
            }

            @Override
            public void onFail(int code, String message) {
                LogUtil.logd("getUserInfo fail code = " + code + " msg = " + message);
                callback.onFail(message);
            }
        });
    }

    public static void submitUserInfo(String token, String name, String identify, String phone, final Callback callback){
        LogUtil.logd("submitUserInfo");
        Map<String,String> head = new HashMap<>();
        head.put("Authorization","Bearer " + token);
        int accountType = RexCheckUtil.checkShareCode(identify) ? 4 :0;
        String params = "name="+name+"&identify="+identify+"&phone="+phone+"&accountType=" + accountType;
        HttpUtil.postAsyncWithHead(ServerApi.REAL_USER_INFO.getApi(), params, head, new NetUtil.NetCallback() {
            @Override
            public void onSuccess(String response) {
                LogUtil.logd("submitUserInfo success = " + response);
                try {
                    JSONObject result = new JSONObject(response);
                    if(result.getInt("code") == 200){
                        callback.onSuccess(result.getJSONObject("data"));
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                    callback.onFail("");
                }
            }

            @Override
            public void onFail(int code, String message) {
                LogUtil.logd("submitUserInfo  code = " + code + " msg = " + message);
                callback.onFail(message);
            }
        });
    }

    public static void submitUserType(String token, int userType, final Callback callback){
        LogUtil.logd("submitUserInfo");
        Map<String,String> head = new HashMap<>();
        head.put("Authorization","Bearer " + token);
        String params = "name="+""+"&identify="+""+"&phone="+""+"&accountType="+userType;
        HttpUtil.postAsyncWithHead(ServerApi.REAL_USER_INFO.getApi(), params, head, new NetUtil.NetCallback() {
            @Override
            public void onSuccess(String response) {
                LogUtil.logd("submitUserInfo success = " + response);
                try {
                    JSONObject result = new JSONObject(response);
//                    if(result.getInt("code") == 200){
//                        callback.onSuccess(result.getJSONObject("data"));
//                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                    if(callback != null){
                        callback.onFail("");
                    }
                }
            }

            @Override
            public void onFail(int code, String message) {
                LogUtil.logd("submitUserInfo  code = " + code + " msg = " + message);
                if(callback != null) {
                    callback.onFail(message);
                }
            }
        });
    }

}
