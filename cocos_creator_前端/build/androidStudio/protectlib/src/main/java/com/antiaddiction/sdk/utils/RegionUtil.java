package com.antiaddiction.sdk.utils;

import android.content.Context;
import android.telephony.TelephonyManager;


import com.antiaddiction.sdk.Callback;


import java.util.Locale;

public class RegionUtil {
    public static void isMonthLand(final Context context, final Callback callback){
       boolean inChina = isMonthLandByLocal(getProvidersInfo(context));
       if(inChina){
           callback.onSuccess(null);
       }else{
           callback.onFail("");
       }
    }
    private static boolean isMonthLandByLocal(int provider){
        boolean country =  Locale.getDefault().getCountry().toLowerCase().contains("cn");
        LogUtil.logd(" provider = " + provider + " country = " + country);
        return country || provider == 1;
    }
    //获取手机服务商信息
    private static  int getProvidersInfo(Context context) {
        TelephonyManager telephonyManager = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
        int info = 0;
        if(telephonyManager != null) {
            String NetworkOperator = telephonyManager.getNetworkOperator();
            //IMSI号前面3位460是国家，紧接着后面2位00 02是中国移动，01是中国联通，03是中国电信。
            LogUtil.logd("NetworkOperator=" + NetworkOperator);
//            if (NetworkOperator.equals("46000") || NetworkOperator.equals("46002")) {
//                providersName = "中国移动";//中国移动
//            } else if (NetworkOperator.equals("46001")) {
//                providersName = "中国联通";//中国联通
//            } else if (NetworkOperator.equals("46003")) {
//                providersName = "中国电信";//中国电信
//            }
            if(NetworkOperator != null && NetworkOperator.startsWith("460")){
                info = 1;
            }
            return info;
        }
        return 0;

    }

}
