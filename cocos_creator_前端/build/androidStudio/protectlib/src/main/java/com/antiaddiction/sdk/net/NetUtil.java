package com.antiaddiction.sdk.net;


import com.antiaddiction.sdk.utils.LogUtil;

import java.io.IOException;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Iterator;
import java.util.Map;

public class NetUtil {

    private static final int MAX_RETRY_TIMES = 3;

    private static final int CONNECTION_TIMEOUT = 3000;
    private static final int READ_TIMEOUT = 3000;

    private static HttpURLConnection createHttpURLConnection(String urlStr) throws IOException {
        URL url = new URL(urlStr);
        HttpURLConnection urlConnection = (HttpURLConnection) url.openConnection();
       // urlConnection.addRequestProperty("User-Agent", getUA());
        urlConnection.setConnectTimeout(CONNECTION_TIMEOUT);
        urlConnection.setReadTimeout(READ_TIMEOUT);
        urlConnection.setUseCaches(false);
        return urlConnection;
    }

    protected static boolean getSync(String urlStr, NetCallback netCallback) {
        HttpURLConnection urlConnection = null;
        try {
            urlConnection = createHttpURLConnection(urlStr);
            urlConnection.setRequestMethod("GET");
            int responseCode = urlConnection.getResponseCode();
            if (responseCode >= HttpURLConnection.HTTP_OK && responseCode < HttpURLConnection.HTTP_BAD_REQUEST) {
                String response = Streams.read(urlConnection.getInputStream());
                LogUtil.logd("Get:" + urlStr + " Code:" + responseCode + " Response:" + response);
                netCallback.onSuccess(response);
                return true;
            } else {
                String errResponse = Streams.read(urlConnection.getErrorStream());
                LogUtil.loge("Get:" + urlStr + " Error Code:" + responseCode + " Response:" + errResponse);
                netCallback.onFail(responseCode,errResponse);
                return false;
            }
        } catch (IOException e) {
            LogUtil.loge(" getSync error = " + e.getMessage());
            netCallback.onFail(-1,"error = " + e.getMessage());
            return false;
        }

    }

    public static boolean postSync(String urlStr, String body, NetCallback callback){
        return postSyncWithHead(urlStr,body,null,callback);
    }

    public static boolean postSyncWithHead(String urlStr, String body, Map<String,String> head, NetCallback callback)  {
        OutputStream outputStream = null;
        try {
            HttpURLConnection urlConnection = createHttpURLConnection(urlStr);
            if(head != null){
                for (String key : head.keySet()) {
                    urlConnection.setRequestProperty(key, head.get(key));
                }
            }
          //  urlConnection.setRequestProperty("Content-Type", "application/json");
            urlConnection.setRequestMethod("POST");
            outputStream = urlConnection.getOutputStream();
            if (body != null) {
                outputStream.write(body.getBytes());
                outputStream.flush();
            }

            int responseCode = urlConnection.getResponseCode();
            if (responseCode >= HttpURLConnection.HTTP_OK && responseCode < HttpURLConnection.HTTP_BAD_REQUEST) {
                String response = Streams.read(urlConnection.getInputStream());
                LogUtil.logd("Post:" + urlStr + " Body: " + body + " Code:" + responseCode + " Response:" + response);
                callback.onSuccess(response);
                return true;
            } else {
                String errResponse = Streams.read(urlConnection.getErrorStream());
                LogUtil.loge("Post:" + urlStr + " Body: " + body + " Error Code:" + responseCode + " Response:" + errResponse);
                callback.onFail(responseCode,errResponse);
                return false;
            }
        }catch (IOException e){
            callback.onFail(-1,"error = " + e.getMessage());
            return false;
        }
        finally {
           if(outputStream != null){
               try {
                   outputStream.close();
               } catch (IOException e) {
                   e.printStackTrace();
               }
           }
        }
    }
    public static boolean getSyncWithRetry(String urlStr, final NetCallback netCallback){
        NetCallback callback = new NetCallback() {
            @Override
            public void onSuccess(String response) {
                netCallback.onSuccess(response);
            }

            @Override
            public void onFail(int code, String message) {

            }
        };
        int retryTimes = 0;
        while (retryTimes < MAX_RETRY_TIMES) {
            retryTimes++;
            try {
            if (getSync(urlStr,callback)){
                return true;
            } } catch (Exception e) {
                LogUtil.loge("Post:" + urlStr + " Retry:" + retryTimes + " Error:" + e.getMessage());
                if (retryTimes == MAX_RETRY_TIMES) {
                    netCallback.onFail(0,e.getMessage());
                    return false;
                }
            }
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
        netCallback.onFail(0,"");
        return false;
    }
    public static boolean postSyncWithRetry(String urlStr, String body, final NetCallback netCallback)  {
        NetCallback callback = new NetCallback() {
            @Override
            public void onSuccess(String response) {
                netCallback.onSuccess(response);
            }

            @Override
            public void onFail(int code, String message) {

            }
        };
        int retryTimes = 0;
        while (retryTimes < MAX_RETRY_TIMES) {
            retryTimes++;
            try {
                if(postSync(urlStr, body, callback)){
                    return true;
                }
            } catch (Exception e) {
                LogUtil.loge("Post:" + urlStr + " Retry:" + retryTimes + " Error:" + e.getMessage());
                if (retryTimes == MAX_RETRY_TIMES) {
                    netCallback.onFail(0,e.getMessage());
                    return false;
                }
            }
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
        netCallback.onFail(0,"");
        return false;
    }
    public static interface NetCallback{
        void onSuccess(String response);
        void onFail(int code, String message) ;
    }
}
