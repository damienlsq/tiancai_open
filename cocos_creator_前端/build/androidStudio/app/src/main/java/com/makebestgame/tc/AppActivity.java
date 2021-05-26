/****************************************************************************
Copyright (c) 2008-2010 Ricardo Quesada
Copyright (c) 2010-2012 cocos2d-x.org
Copyright (c) 2011      Zynga Inc.
Copyright (c) 2013-2014 Chukong Technologies Inc.
 
http://www.cocos2d-x.org

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
****************************************************************************/
package yourgamepackagename;

import org.cocos2dx.lib.Cocos2dxActivity;
import org.cocos2dx.lib.Cocos2dxGLSurfaceView;
import org.cocos2dx.lib.Cocos2dxJavascriptJavaBridge;

import android.util.Log;
import java.util.UUID;
import android.content.Context;
import android.app.Activity;
import android.content.Intent;
import android.content.res.Configuration;
import android.os.Bundle;
import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.provider.Settings.Secure;

// 心动防沉迷sdk start
import com.antiaddiction.sdk.AntiAddictionKit;
import com.antiaddiction.sdk.AntiAddictionPlatform;
// 心动防沉迷sdk end

public class AppActivity extends Cocos2dxActivity {
  private static final String TAG = "[MBG js]";
  private static Activity mactivity;
  private static AppActivity app;

  private static String locationGEO = "";

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    mactivity = this;
    app = this;
    super.onCreate(savedInstanceState);

    // Workaround in
    // https://stackoverflow.com/questions/16283079/re-launch-of-activity-on-home-button-but-only-the-first-time/16447508
    if (!isTaskRoot()) {
      // Android launched another instance of the root activity into an existing task
      // so just quietly finish and go away, dropping the user back into the activity
      // at the top of the stack (ie: the last state of this task)
      // Don't need to finish it again since it's finished in super.onCreate .
      return;
    }
    // DO OTHER INITIALIZATION BELOW
    ChannelHelper.init(mactivity, app, getContext());
  }

  @Override
  public Cocos2dxGLSurfaceView onCreateView() {
    Cocos2dxGLSurfaceView glSurfaceView = new Cocos2dxGLSurfaceView(this);
    // TestCpp should create stencil buffer
    glSurfaceView.setEGLConfigChooser(5, 6, 5, 0, 16, 8);
    return glSurfaceView;
  }

  @Override
  protected void onStart() {
    super.onStart();
    ChannelHelper.onStart();
  }

  @Override
  protected void onRestart() {
    super.onRestart();
    ChannelHelper.onRestart();
  }

  @Override
  protected void onStop() {
    super.onStop();
    ChannelHelper.onStop();
    AntiAddictionKit.onStop();
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    ChannelHelper.onNewIntent(intent);
  }

  @Override
  protected void onActivityResult(int requestCode, int resultCode, Intent data) {
    super.onActivityResult(requestCode, resultCode, data);
    ChannelHelper.onActivityResult(requestCode, resultCode, data);
  }

  @Override
  protected void onResume() {
    super.onResume();
    ChannelHelper.onResume();
    AntiAddictionKit.onResume();
  }

  @Override
  protected void onPause() {
    super.onPause();
    ChannelHelper.onPause();
  }

  @Override
  protected void onDestroy() {
    super.onDestroy();
    ChannelHelper.onDestroy();
  }

  public static void startLevel(String level) {
    ChannelHelper.startLevel(level);
  }

  public static void failLevel(String level) {
    ChannelHelper.failLevel(level);
  }

  public static void finishLevel(String level) {
    ChannelHelper.finishLevel(level);
  }

  public static void logPlayerLevel(int lvl) {
    ChannelHelper.logPlayerLevel(lvl);
  }

  public static void logBuy(String name, int price) {
    ChannelHelper.logBuy(name, price);
  }

  public static void logPay(int value, int price) {
    ChannelHelper.logPay(price, value);
  }

  public static void logEvent(String event) {
    ChannelHelper.logEvent(event);
  }

  public static void logLogin(String uid) {
    ChannelHelper.logLogin(uid);
  }

  // 推送用的token
  public static String getDeviceToken() {
    return ChannelHelper.getDeviceToken();
  }

  public static void askGEO() {
    // getFineLocation();
    // System.out.println("cocos2d-x askGEO " + locationGEO);
  }

  public static String getGEO() {
    // getLocation();
    // System.out.println("cocos2d-x locationGEO " + locationGEO);
    return locationGEO;
  }

  /*
   * 获取当前程序的版本号
   */
  public static String getCoreVersion() {
    String pkName = mactivity.getPackageName();
    String versionname = "";
    try {
      versionname = mactivity.getPackageManager().getPackageInfo(pkName, 0).versionName;

    } catch (Exception e) {
      // TODO Auto-generated catch block
      e.printStackTrace();
    }
    return versionname;
  }

  public static String getChannel() {
    return BuildConfig.CHANNEL_ID;
  }

  public static String getDeviceId() {
    String android_id = Secure.getString(getContext().getContentResolver(), Secure.ANDROID_ID);
    return android_id;
  }

  public static String phoneType() {
    // 手机厂商,手机型号,系统版本号
    return android.os.Build.BRAND + "," + android.os.Build.MODEL + "," + android.os.Build.VERSION.RELEASE;
  }

  public static void exitGame() {
    ChannelHelper.exitGame();
  }

  public static void IAPRequestProduct(String ids) {
    ChannelHelper.IAPRequestProduct(ids);
  }

  public static void pay(String str) {
    ChannelHelper.pay(str);
  }

  public static void login(String str) {
    ChannelHelper.login(str);
  }

  private static boolean isWXAppInstalled() {
    return ChannelHelper.isWXAppInstalled();
  }

  // 微信登录
  private static void sendWeChatAuthRequest(String state) {
    ChannelHelper.sendWeChatAuthRequest(state);
  }

  private static void debugAndroid(String mes) {
    Log.i(TAG, mes);
  }

  private static void addLocalNotification(String mes, int tt) {

  }

  public static void iapConsume(String str) {
    ChannelHelper.iapConsume(str);
  }

  public static void evalJS(final String s) {
    app.runOnGLThread(new Runnable() {

      @Override
      public void run() {
        Log.i(TAG, "script:" + s);
        Cocos2dxJavascriptJavaBridge.evalString(s);
      }
    });
  }

  public static AntiAddictionKit.AntiAddictionCallback protectCallBack;

  public static int antiAddictionSetup(String info) {
    Log.i(TAG, "[防沉迷] antiAddictionSetup");
    /*
    AntiAddictionKit.getCommonConfig().gusterTime(5 * 60).childCommonTime(20 * 60).youngMonthPayLimit(200 * 100)
        .teenMonthPayLimit(150 * 100);
    */
    AntiAddictionKit.getFunctionConfig().useSdkRealName(true).showSwitchAccountButton(false)
        .useSdkOnlineTimeLimit(true);

    protectCallBack = new AntiAddictionKit.AntiAddictionCallback() {
      @Override
      public void onAntiAddictionResult(int resultCode, String msg) {
        switch (resultCode) {
          case AntiAddictionKit.CALLBACK_CODE_SWITCH_ACCOUNT:
            Log.i(TAG, "logout success");
            break;
          case AntiAddictionKit.CALLBACK_CODE_PAY_NO_LIMIT:
            Log.i(TAG, " pay no limit");
            // AntiAddictionKit.paySuccess(payNum);
            break;
          case AntiAddictionKit.CALLBACK_CODE_PAY_LIMIT:
            Log.i(TAG, "pay limit");
            break;
          case AntiAddictionKit.CALLBACK_CODE_REAL_NAME_SUCCESS:
            Log.i(TAG, "realName success");
            break;
          case AntiAddictionKit.CALLBACK_CODE_REAL_NAME_FAIL:
            Log.i(TAG, "realName fail");
            break;
          case AntiAddictionKit.CALLBACK_CODE_TIME_LIMIT:
            Log.i(TAG, "time limit ");
            break;
          case AntiAddictionKit.CALLBACK_CODE_OPEN_REAL_NAME:
            Log.i(TAG, "open realName");
            //假设通过第三方实名成功
            AntiAddictionKit.updateUserType(AntiAddictionKit.USER_TYPE_CHILD);
            if (msg.equals(AntiAddictionKit.TIP_OPEN_BY_PAY_LIMIT)) {
              //  AntiAddictionKit.checkPayLimit(payNum);
            }
            //注意：如果这个过程中游戏处在付费流程中，此时应该再调用一次CheckPayLimit();
            break;
          case AntiAddictionKit.CALLBACK_CODE_CHAT_LIMIT:
            Log.i(TAG, "chat limit");
            break;
          case AntiAddictionKit.CALLBACK_CODE_CHAT_NO_LIMIT:
            Log.i(TAG, "chat no limit");
            break;
          case AntiAddictionKit.CALLBACK_CODE_AAK_WINDOW_DISMISS:
            Log.i(TAG, "AAK WINDOW DISMISS");
            break;
          case AntiAddictionKit.CALLBACK_CODE_AAK_WINDOW_SHOWN:
            Log.i(TAG, "AAK WINDOW SHOW");
            break;
          case AntiAddictionKit.CALLBACK_CODE_USER_TYPE_CHANGED:
            Log.i(TAG, "USER TYPE CHANGE");
        }
        evalJS("cc.antiAddictionResult(" + resultCode + ",\"" + msg + "\")");
      }
    };
    AntiAddictionKit.init(mactivity, protectCallBack);
    AntiAddictionKit.getFunctionConfig().setHost(info);
    return 1;
  }

  public static void antiAddictionLogin(String userid, int type) {
    Log.i(TAG, "[防沉迷] login:" + userid + "," + type);
    AntiAddictionKit.login(userid, type);
  }

  public static int antiAddictionPayCheck(int price) {
    Log.i(TAG, "[防沉迷] payCheck:" + price);
    AntiAddictionKit.checkPayLimit(price);
    return 1;
  }

  public static void antiAddictionPayLog(int price) {
    Log.i(TAG, "[防沉迷] paySuccess:" + price);
    AntiAddictionKit.paySuccess(price);
  }

  public static void antiAddictionLogout() {
    AntiAddictionKit.logout();
  }

  public static int antiAddictionGetUserType(String userid) {
    int aat = AntiAddictionKit.getUserType(userid);
    Log.i(TAG, "[防沉迷] antiAddictionGetUserType:" + aat);
    return aat;
  }

  public static void antiAddictionUpdateUserType(int type) {
    AntiAddictionKit.updateUserType(type);
  }

  public static void antiAddictionOpenRealName() {
    AntiAddictionKit.openRealName();
  }

}
