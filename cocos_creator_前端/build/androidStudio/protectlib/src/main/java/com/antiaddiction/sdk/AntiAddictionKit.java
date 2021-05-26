package com.antiaddiction.sdk;

import android.app.Activity;
import android.util.Log;

import com.antiaddiction.sdk.utils.LogUtil;
import com.antiaddiction.sdk.utils.TimeUtil;

import org.json.JSONObject;

public class AntiAddictionKit {
    //用户类型
    public final static int USER_TYPE_UNKNOWN = 0;
    public final static int USER_TYPE_CHILD = 1; //8岁以下
    public final static int USER_TYPE_TEEN = 2; //8 - 15
    public final static int USER_TYPE_YOUNG = 3;//16 -17
    public final static int USER_TYPE_ADULT = 4;//18-18+
    //回调状态码
    public final static int CALLBACK_CODE_LOGIN_SUCCESS = 500;
    public final static int CALLBACK_CODE_SWITCH_ACCOUNT = 1000;
    public final static int CALLBACK_CODE_REAL_NAME_SUCCESS = 1010;
    public final static int CALLBACK_CODE_REAL_NAME_FAIL = 1015;
    public final static int CALLBACK_CODE_PAY_NO_LIMIT = 1020;
    public final static int CALLBACK_CODE_PAY_LIMIT = 1025;
    public final static int CALLBACK_CODE_TIME_LIMIT = 1030;
    public final static int CALLBACK_CODE_OPEN_REAL_NAME = 1060;
    public final static int CALLBACK_CODE_CHAT_NO_LIMIT = 1080;
    public final static int CALLBACK_CODE_CHAT_LIMIT = 1090;
    public final static int CALLBACK_CODE_USER_TYPE_CHANGED = 1500;
    public final static int CALLBACK_CODE_AAK_WINDOW_SHOWN = 2000;
    public final static int CALLBACK_CODE_AAK_WINDOW_DISMISS = 2500;


    //打开第三方实名提示
    public static final String TIP_OPEN_BY_ENTER_NO_LIMIT = "ENTER_NO_LIMIT";
    public static final String TIP_OPEN_BY_ENTER_LIMIT = "ENTER_LIMIT";
    public static final String TIP_OPEN_BY_TIME_LIMIT = "TIME_LIMIT";
    public static final String TIP_OPEN_BY_PAY_LIMIT = "PAY_LIMIT";
    public static final String TIP_OPEN_BY_CHAT_LIMIT = "CHAT_LIMIT";

    private static CommonConfig commonConfig = CommonConfig.getInstance();
    private static FunctionConfig functionConfig = FunctionConfig.getInstance();



    public static void init(Activity activity,AntiAddictionCallback protectCallBack){
        if (activity == null || protectCallBack == null) {
            LogUtil.logd(" init fail activity = null or callback null");
            return;
        }
        AntiAddictionCore.init(activity, protectCallBack);
        LogUtil.setIsDebug(true);
    }

    /**
     * 用户登录
     * @param userId 用户唯一标识
     */
    private static void setUser(String userId){
        setUser(userId, USER_TYPE_UNKNOWN);
    }

    /**
     * 用户登录
     * @param userId
     * @param userType
     */
    public static void login(String userId,int userType){
        setUser(userId, userType);
    }

    public static void updateUserType(int userType){
        if(userType < USER_TYPE_UNKNOWN){
            userType = USER_TYPE_UNKNOWN;
        }
        AntiAddictionCore.updateUserType(userType);
    }

    public static void logout(){
        AntiAddictionCore.logout();
    }

    /**
     * 用户登录,登出或更新实名状态
     * @param userId 用户唯一标识
     * @param userType 当由sdk设置用户实名信息时 设置USER_TYPE_UNKNOWN  当由游戏自己设置用户实名状态，设置为其他值
     */
    private static void setUser(String userId, int userType){
        if(userId != null && userId.length() > 0) {
            if(userType < USER_TYPE_UNKNOWN){
                LogUtil.logd("用户类型非法，自动设置为游客");
                userType = USER_TYPE_UNKNOWN;
            }
            AntiAddictionCore.setCurrentUser(userId, userType);
        }else{
            AntiAddictionCore.logout();
        }
    }

    /**
     * 游戏充值前调用，检查是否受限，如果不受限制，则通过回调通知游戏
     * @param num 金额 单位分
     */
    public static void checkPayLimit(int num){
        if(num < 0){
            LogUtil.logd("金额不能小于 0");
            return;
        }
        AntiAddictionCore.checkPayLimit(num);
    }

    /**
     * 充值成功后，游戏通知SDK，更新用户状态
     * @param num 金额，单位分
     */
    public static void paySuccess(int num){
        if(num < 0){
            LogUtil.logd("金额不能小于 0");
            return;
        }
        AntiAddictionCore.onPaySuccess(num);
    }

    public static void checkChatLimit(){
        AntiAddictionCore.checkChatLimit();
    }

    public static void onResume(){
        AntiAddictionCore.onResume();
    }

    public static void onStop(){
        AntiAddictionCore.onStop();
    }

    //获取常用配置
    public static CommonConfig getCommonConfig(){
        return commonConfig;
    }
    //获取功能配置
    public static FunctionConfig getFunctionConfig(){
        return functionConfig;
    }

    //设置功能配置
    public static void resetFunctionConfig(boolean useRealName, boolean usePayLimit, boolean useOnlineTimeLimit ){
        functionConfig.useSdkOnlineTimeLimit = useOnlineTimeLimit;
        functionConfig.useSdkPaymentLimit = usePayLimit;
        functionConfig.useSdkRealName = useRealName;
    }

    public static int getUserType(String userId){
        if(userId == null || userId.length() == 0){
            LogUtil.loge("getUserType invalid userId");
            return -1;
        }
        return AntiAddictionCore.getUserType(userId);
    }

    public static void openRealName(){
        AntiAddictionCore.openRealNameDialog();
    }

    public static int checkCurrentPayLimit(int num){
        return AntiAddictionCore.checkCurrentPayLimit(num);
    }

    public static String getSdkVersion(){
        return AntiAddictionCore.getSdkVersion();
    }

    /**
     * 通知游戏回调
     * @param protectCallBack 回调
     */
    public static void setProtectCallBack(AntiAddictionCallback protectCallBack){
        AntiAddictionCore.setAntiAddictionCallback(protectCallBack);
    }


    public  interface AntiAddictionCallback{
        void onAntiAddictionResult(int resultCode, String msg);
    }

    public static class FunctionConfig{
        private static final FunctionConfig INSTANCE = new FunctionConfig();
        private boolean useSdkRealName = true;
        private boolean useSdkPaymentLimit = true;
        private boolean useSdkOnlineTimeLimit = true;
        private boolean showSwitchAccountButton = true;
        private String server_host=null;
        private FunctionConfig(){}
        private static FunctionConfig getInstance(){
            return INSTANCE;
        }

        public  FunctionConfig useSdkRealName(boolean use){
            INSTANCE.useSdkRealName = use;
            return  INSTANCE;
        }

        public  FunctionConfig useSdkPaymentLimit(boolean use){
            INSTANCE.useSdkPaymentLimit = use;
            return INSTANCE;
        }

        public  FunctionConfig useSdkOnlineTimeLimit(boolean useSdkOnlineTimeLimit){
            INSTANCE.useSdkOnlineTimeLimit = useSdkOnlineTimeLimit;
            return INSTANCE;
        }

        public FunctionConfig showSwitchAccountButton(boolean showSwitchAccountButton){
            INSTANCE.showSwitchAccountButton = showSwitchAccountButton;
            return INSTANCE;
        }

        public FunctionConfig setHost(String host){
            if(host != null &&  !host.contains("http")){
                throw new RuntimeException("invalid host");
            }
            INSTANCE.server_host = host;
            return INSTANCE;
        }

        public  String getHost(){
            return INSTANCE.server_host;
        }

        public boolean getUseSdkOnlineTimeLimit(){
            return INSTANCE.useSdkOnlineTimeLimit;
        }
        public boolean getUseSdkPaymentLimit(){
            return INSTANCE.useSdkPaymentLimit;
        }

        public boolean getUseSdkRealName(){
            return INSTANCE.useSdkRealName;
        }

        public boolean getShowSwitchAccountButton(){
            return INSTANCE.showSwitchAccountButton;
        }

        public boolean getSupportSubmitToServer(){
            return INSTANCE.server_host != null;
        }
    }
   

    public static class CommonConfig {
        private static final CommonConfig INSTANCE = new AntiAddictionKit.CommonConfig();
        //游客每日游戏时长，单位秒
        private  int guestTime = 60 * 60;
        //宵禁起始时间 22点
        private  int nightStrictStart = 22 * 60 * 60;
        //宵禁终止时间 8点
        private  int nightStrictEnd = 8 * 60 * 60;
        //未成年人非节假日每日游戏时长
        private  int childCommonTime  = 90 * 60;
        //未成年人节假日每日游戏时长
        private  int childHolidayTime = 3 * 60 * 60;
        //未成年人每日充值限额,单位分 8-15
        private  int teenPayLimit = 50 *10 * 10;
        //未成年人每月充值限额，单位分 8-15
        private  int teenMonthPayLimit = 200 * 10 * 10;
        //未成年人每日充值限额 16-17,单位分
        private   int youngPayLimit = 100 *10 * 10;
        //未成年人每月充值限额16-17，单位分
        private   int youngMonthPayLimit = 400 * 10 * 10;

        //外观颜色设置
        private  String dialogBackground = "#ffffff";
        private  String dialogContentTextColor = "#999999";
        private  String dialogTitleTextColor = "#2b2b2b";
        private  String dialogButtonBackground = "#000000";
        private  String dialogButtonTextColor = "#ffffff";
        private  String dialogEditTextColor = "#000000";
        private  String popBackground = "#CC000000";
        private  String popTextColor = "#ffffff";
        private  String tipBackground = "#ffffff";
        private  String tipTextColor = "#000000";

        //安全设置
        //aes 密匙
        private String encodeString = "test";
        private String version = "0.0.1";
        private String unIdentifyFirstLogin ="您当前为游客账号，根据国家相关规定，游客账号享有#分钟#游戏体验时间。登记实名信息后可深度体验。";
        private String unIdentifyRemain = "您当前为游客账号，游戏体验时间还剩余#分钟#。登记实名信息后可深度体验。";
        private String unIdentifyLimit = "您的游戏体验时长已达#分钟#。登记实名信息后可深度体验。";
        private String identifyLimit = "您今日游戏时间已达#分钟#。根据国家相关规定，今日无法再进行游戏。请注意适当休息。";
        private String identifyRemain = "您今日游戏时间还剩余#分钟#，请注意适当休息。";
        private String nightStrictRemain = "距离健康保护时间还剩余#分钟#，请注意适当休息。";
        private String nightStrictLimit = "根据国家相关规定，每日 22 点 - 次日 8 点为健康保护时段，当前无法进入游戏。";

        private CommonConfig(){
        }
//
        private static CommonConfig getInstance(){
            return INSTANCE;
        }

        public CommonConfig gusterTime(int gusterTime) {
            INSTANCE.guestTime = gusterTime;
            return INSTANCE;
        }

        public CommonConfig nightStrictStart(int nightStrictStart) {
            INSTANCE.nightStrictStart = nightStrictStart;
            return INSTANCE;
        }

        public CommonConfig nightStrictEnd(int nightStrictEnd) {
            INSTANCE.nightStrictEnd = nightStrictEnd;
            return INSTANCE;
        }

        public CommonConfig childCommonTime(int childCommonTime) {
            INSTANCE.childCommonTime = childCommonTime;
            return INSTANCE;
        }

        public CommonConfig childHolidayTime(int childHolidayTime) {
            INSTANCE.childHolidayTime = childHolidayTime;
            return INSTANCE;
        }

        public CommonConfig teenPayLimit(int teenPayLimit) {
            INSTANCE.teenPayLimit = teenPayLimit;
            return INSTANCE;
        }

        public CommonConfig teenMonthPayLimit(int teenMonthPayLimit) {
            INSTANCE.teenMonthPayLimit = teenMonthPayLimit;
            return INSTANCE;
        }

        public CommonConfig youngPayLimit(int youngPayLimit){
            INSTANCE.youngPayLimit = youngPayLimit;
            return INSTANCE;
        }

        public CommonConfig youngMonthPayLimit(int youngMonthPayLimit){
            INSTANCE.youngMonthPayLimit = youngMonthPayLimit;
            return INSTANCE;
        }

        public CommonConfig dialogBackground(String color){
            INSTANCE.dialogBackground = color;
            return INSTANCE;
        }
        public CommonConfig dialogButtonBackground(String color){
            INSTANCE.dialogButtonBackground = color;
            return INSTANCE;
        }
        public CommonConfig dialogButtonTextColor(String color){
            INSTANCE.dialogButtonTextColor = color;
            return INSTANCE;
        }
        public CommonConfig dialogContentTextColor(String color){
            INSTANCE.dialogContentTextColor = color;
            return INSTANCE;
        }
        public CommonConfig dialogEditTextColor(String color){
            INSTANCE.dialogEditTextColor = color;
            return INSTANCE;
        }
        public CommonConfig dialogTitleTextColor(String color){
            INSTANCE.dialogTitleTextColor = color;
            return INSTANCE;
        }
        public CommonConfig popBackground(String color){
            INSTANCE.popBackground = color;
            return INSTANCE;
        }
        public CommonConfig popTextColor(String color){
            INSTANCE.popTextColor = color;
            return INSTANCE;
        }

        public CommonConfig encodeString(String key){
            INSTANCE.encodeString = key;
            return INSTANCE;
        }

        public CommonConfig tipBackground(String color){
            INSTANCE.tipBackground = color;
            return INSTANCE;
        }

        public CommonConfig tipTextColor(String color){
            INSTANCE.tipTextColor = color;
            return INSTANCE;
        }

        public int getGuestTime() {
            return  INSTANCE.guestTime;
        }

        public int getNightStrictStart() {
            return  INSTANCE.nightStrictStart;
        }

        public int getNightStrictEnd() {
            return  INSTANCE.nightStrictEnd;
        }

        public int getChildCommonTime() {
            return  INSTANCE.childCommonTime;
        }

        public int getChildHolidayTime() {
            return  INSTANCE.childHolidayTime;
        }

        public int getTeenPayLimit() {
            return  INSTANCE.teenPayLimit;
        }

        public int getTeenMonthPayLimit() {
            return  INSTANCE.teenMonthPayLimit;
        }

        public int getYoungPayLimit() {
            return  INSTANCE.youngPayLimit;
        }

        public int getYoungMonthPayLimit() {
            return  INSTANCE.youngMonthPayLimit;
        }

        public String getDialogBackground() {
            return  INSTANCE.dialogBackground;
        }

        public String getDialogContentTextColor() {
            return  INSTANCE.dialogContentTextColor;
        }

        public String getDialogTitleTextColor() {
            return  INSTANCE.dialogTitleTextColor;
        }

        public String getDialogButtonBackground() {
            return  INSTANCE.dialogButtonBackground;
        }

        public String getDialogButtonTextColor() {
            return  INSTANCE.dialogButtonTextColor;
        }

        public String getDialogEditTextColor() {
            return  INSTANCE.dialogEditTextColor;
        }

        public String getPopBackground() {
            return  INSTANCE.popBackground;
        }

        public String getPopTextColor(){
            return INSTANCE.popTextColor;
        }

        public String getTipBackground(){
            return INSTANCE.tipBackground;
        }

        public String getTipTextColor(){
            return INSTANCE.tipTextColor;
        }

        public String getEncodeString(){
            return INSTANCE.encodeString;
        }

        public String getUnIdentifyFirstLogin(){
            return INSTANCE.unIdentifyFirstLogin;
        }

        public String getUnIdentifyRemain(){
            return INSTANCE.unIdentifyRemain;
        }

        public void praseJson(JSONObject config) {
            if (config != null) {
                try {
                    //if (!config.getString("version").equals(INSTANCE.version)) {
                        INSTANCE.version = config.getString("version");
                        LogUtil.logd("update config version = " + INSTANCE.version);
                        JSONObject data = config.getJSONObject("config");
                        // INSTANCE.guestTime = data.optInt("guestTime", 60 * 60);
                        INSTANCE.childCommonTime = data.optInt("childCommonTime", 30 * 60);
                        INSTANCE.nightStrictStart = TimeUtil.getTimeByClock(data.optString("nightStrictStart", "22:00"));
                        INSTANCE.nightStrictEnd = TimeUtil.getTimeByClock(data.optString("nightStrictEnd", "08:00"));
                        INSTANCE.childHolidayTime = data.optInt("childHolidayTime", 3 * 60 * 60);
                        INSTANCE.teenMonthPayLimit = data.optInt("teenMonthPayLimit",200 * 10 * 10);
                        INSTANCE.teenPayLimit = data.optInt("teenPayLimit",50 *10 * 10);
                        INSTANCE.youngPayLimit = data.optInt("youngPayLimit",100 *10 * 10);
                        INSTANCE.youngMonthPayLimit = data.optInt("youngMonthPayLimit",400 * 10 * 10);
                        JSONObject description = data.getJSONObject("description");
                        INSTANCE.unIdentifyRemain = description.getString("unIdentifyRemain");
                        INSTANCE.unIdentifyFirstLogin = description.getString("unIdentifyFirstLogin");
                        INSTANCE.unIdentifyLimit = description.getString("unIdentifyLimit");
                        INSTANCE.identifyLimit = description.getString("identifyLimit");
                        INSTANCE.identifyRemain = description.getString("identifyRemain");
                        INSTANCE.nightStrictRemain = description.getString("nightStrictRemain");
                        INSTANCE.nightStrictLimit = description.getString("nightStrictLimit");
                  //  }
                } catch (Exception e) {
                    e.printStackTrace();
                }

            }
        }
    }

}
