package com.antiaddiction.sdk.dao;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

public class ConfigDao {
    private static String CONFIG_KEY = "config_key";
    private static String CONFIG_STORE = "config_store";
    public static void saveConfig(Context context, JSONObject data){
        if(null == context || data == null || data.length() == 0){
            return;
        }
        SharedPreferences sharedPreferences = context.getSharedPreferences(CONFIG_STORE,Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = sharedPreferences.edit();
        editor.putString(CONFIG_KEY,data.toString());
        editor.apply();
    }

    public static JSONObject getConfig(Context context){
        if(null == context){
            return null;
        }
        SharedPreferences sharedPreferences = context.getSharedPreferences(CONFIG_STORE,Context.MODE_PRIVATE);
        String data = sharedPreferences.getString(CONFIG_KEY,null);
        if(data != null){
            try {
                return new JSONObject(data);
            }catch (Exception e){
                return null;
            }
        }
        return null;
    }
}
