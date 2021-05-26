package com.antiaddiction.sdk.dao;

import android.content.Context;
import android.content.SharedPreferences;

public class RegionDao {
    private static final String RegionKey = "region_key";
    private static final String RegionStore = "region_store";

    public static int getLocalRegion(Context context){
        SharedPreferences sharedPreferences = context.getSharedPreferences(RegionStore,Context.MODE_PRIVATE);
         return sharedPreferences.getInt(RegionKey,-1);
    }

    public static void setLocalRegion(Context context,int region){
        SharedPreferences sharedPreferences = context.getSharedPreferences(RegionStore,Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = sharedPreferences.edit();
        editor.putInt(RegionKey,region);
        editor.apply();
    }
}
