package com.antiaddiction.sdk;

import org.json.JSONObject;

public interface Callback {
   void onSuccess(JSONObject response);
   void onFail(String msg);
}
