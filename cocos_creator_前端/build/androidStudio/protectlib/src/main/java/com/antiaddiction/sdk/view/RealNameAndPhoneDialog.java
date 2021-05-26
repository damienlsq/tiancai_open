package com.antiaddiction.sdk.view;

import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.text.Editable;
import android.text.InputType;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.util.TypedValue;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.PopupWindow;
import android.widget.TextView;
import android.widget.Toast;

import com.antiaddiction.sdk.AntiAddictionCore;
import com.antiaddiction.sdk.AntiAddictionPlatform;
import com.antiaddiction.sdk.AntiAddictionKit;
import com.antiaddiction.sdk.Callback;
import com.antiaddiction.sdk.OnResultListener;
import com.antiaddiction.sdk.net.NetUtil;
import com.antiaddiction.sdk.service.UserService;
import com.antiaddiction.sdk.utils.LogUtil;
import com.antiaddiction.sdk.utils.Res;
import com.antiaddiction.sdk.utils.RexCheckUtil;
import com.antiaddiction.sdk.utils.UnitUtils;

import org.json.JSONException;
import org.json.JSONObject;

import java.lang.ref.WeakReference;
import java.util.regex.Pattern;

public class RealNameAndPhoneDialog extends BaseDialog {
    private PopupWindow popupWindow;
    private LinearLayout ll_container;
    private TextView tv_title;
    private ImageView bt_close;
    private ImageView bt_back;
    private EditText et_name;
    private EditText et_identify;
    private EditText et_phone;
    private Button bt_sumbit;
    private TextView tv_tip;
    //点击返回键返回上一个页面
    private BackPressListener backPressListener;
    private int strict = 2; //1 强制实名 2非强制实名 3强制实名无关闭 4通过openRealName接口调用
    public static boolean Real_Showing = false;
    private OnResultListener onResultListener;
    private static WeakReference<RealNameAndPhoneDialog> realNameAndPhoneDialogWeakReference;

    private RealNameAndPhoneDialog(Context context, OnResultListener onResultListener) {
        super(context);
        this.onResultListener = onResultListener;
        setOnShowListener(new OnShowListener() {
            @Override
            public void onShow(DialogInterface dialog) {
                AntiAddictionPlatform.dismissCountTimePopSimple();
            }
        });

        setCancelable(false);
    }

    private RealNameAndPhoneDialog(Context context, int strict, OnResultListener onResultListener) {
        this(context, onResultListener);
        this.strict = strict;
    }

    private RealNameAndPhoneDialog(Context context, int strict, OnResultListener onResultListener,
            BackPressListener backPressListener) {
        this(context, onResultListener);
        this.strict = strict;
        this.backPressListener = backPressListener;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        //getWindow().setWindowAnimations(Res.style(getContext(),"dialogWindowAnim"));
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        setContentView(Res.layout(getContext(), "dialog_real_name"));

        ll_container = (LinearLayout) findViewById("ll_real_container");
        tv_title = (TextView) findViewById("tv_real_title");
        bt_back = (ImageView) findViewById("iv_auth_back");
        bt_close = (ImageView) findViewById("iv_auth_close");
        tv_tip = (TextView) findViewById("tv_real_tip");

        if (backPressListener == null) {
            bt_back.setVisibility(View.GONE);
        } else {
            bt_back.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    backPressListener.onBack();
                    dismiss();
                }
            });
        }

        if (strict == 3 || backPressListener != null) {
            bt_close.setVisibility(View.GONE);
        } else {
            bt_close.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if (strict == 1) {
                        AlertDialog.Builder builder = new AlertDialog.Builder(getContext());
                        builder.setMessage("确定退出登录？");
                        builder.setPositiveButton("确定", new OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialog, int which) {
                                if (onResultListener != null) {
                                    onResultListener.onResult(AntiAddictionKit.CALLBACK_CODE_REAL_NAME_FAIL, "");
                                }
                                dismiss();
                            }
                        });
                        builder.setNegativeButton("取消", new OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialog, int which) {
                            }
                        });
                        builder.create().show();
                    } else {
                        if (onResultListener != null) {
                            onResultListener.onResult(AntiAddictionKit.CALLBACK_CODE_REAL_NAME_FAIL, "");
                        }
                        dismiss();
                    }

                }
            });
        }

        et_name = (EditText) findViewById("et_name");
        /* et_name.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {
        
            }
        
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                String name = et_name.getText().toString();
                String reg = "[^\u4e00-\u9fa5·]";
                String valid = Pattern.compile(reg).matcher(name).replaceAll("").trim();
                if (!TextUtils.equals(name, valid)) {
                    et_name.setText(valid);
                    LogUtil.logd("valid = " + valid);
                    if(valid.length() > 0) {
                        et_name.setSelection(valid.length());
                    }
                }
            }
        
            @Override
            public void afterTextChanged(Editable s) {
        
            }
        });*/

        et_identify = (EditText) findViewById("et_identify");
        // et_phone = (EditText) findViewById("et_phone");
        // et_phone.setInputType(InputType.TYPE_CLASS_NUMBER);
        // et_phone.setMaxLines(1);

        bt_sumbit = (Button) findViewById("bt_submit");
        bt_sumbit.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String name = et_name.getText().toString().trim();
                String identify = et_identify.getText().toString().trim();
                String phone = "123456789";
                String valid = Pattern.compile("[^\u4e00-\u9fa5·]").matcher(name).replaceAll("").trim();
                if (valid.length() < 2 || valid.length() != name.length()) {
                    Toast.makeText(getContext(), "请输入有效姓名信息！", Toast.LENGTH_SHORT).show();
                    return;
                }
                /*
                if (!RexCheckUtil.checkPhone(phone)) {
                    Toast.makeText(getContext(), "请输入有效手机信息！", Toast.LENGTH_SHORT).show();
                    return;
                }
                */
                if (!RexCheckUtil.checkIdentify(identify) && !RexCheckUtil.checkShareCode(identify)) {
                    Toast.makeText(getContext(), "请输入有效身份证信息！", Toast.LENGTH_SHORT).show();
                    return;
                }
                onSubmit(name, phone, identify);
            }
        });

        final View tip = findViewById("ll_auth_tip");
        tip.setClickable(true);
        tip.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                InputMethodManager imm = (InputMethodManager) getContext()
                        .getSystemService(Context.INPUT_METHOD_SERVICE);
                if (imm != null) {
                    View view = getWindow() == null ? null : getWindow().getDecorView();
                    if (view != null) {
                        imm.hideSoftInputFromWindow(view.getWindowToken(), 0);
                    }
                }
                int orientation = getContext().getResources().getConfiguration().orientation;
                if (null == popupWindow) {
                    popupWindow = new PopupWindow();
                    TextView textView = new TextView(getContext());
                    // int padding = UnitUtils.dpToPx(getContext(), 10);
                    int width = UnitUtils.dpToPx(getContext(), 415);
                    int height = UnitUtils.dpToPx(getContext(), 75);
                    if (orientation == Configuration.ORIENTATION_PORTRAIT) {
                        width = UnitUtils.dpToPx(getContext(), 250);
                        height = UnitUtils.dpToPx(getContext(), 122);
                    }
                    BubbleLayout bubbleLayout = new BubbleLayout(getContext());
                    textView.setText("根据国家相关要求，所有游戏用户须如实登记本人有效实名信息。如使用其他身份证件，可联系客服协助登记。");
                    textView.setTextColor(Color.parseColor(AntiAddictionKit.getCommonConfig().getTipTextColor()));
                    textView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
                    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                        textView.setLineSpacing(UnitUtils.dpToPx(getContext(), 3), 1);
                    }
                    textView.setOnClickListener(new View.OnClickListener() {
                        @Override
                        public void onClick(View v) {
                            popupWindow.dismiss();
                        }
                    });
                    ViewGroup.LayoutParams layoutParams = new ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT, height);
                    textView.setLayoutParams(layoutParams);
                    bubbleLayout.setLayoutParams(layoutParams);
                    bubbleLayout.addView(textView);
                    bubbleLayout.setLookLength(UnitUtils.dpToPx(getContext(), 10));
                    bubbleLayout.setLookWidth(UnitUtils.dpToPx(getContext(), 10));
                    bubbleLayout
                            .setBubbleColor(Color.parseColor(AntiAddictionKit.getCommonConfig().getTipBackground()));
                    if (orientation == Configuration.ORIENTATION_PORTRAIT) {
                        bubbleLayout.setLookPosition(width / 2);
                        bubbleLayout.setLook(BubbleLayout.Look.TOP);
                    } else {
                        bubbleLayout.setLook(BubbleLayout.Look.LEFT);
                        bubbleLayout.setLookPosition(UnitUtils.dpToPx(getContext(), 15));
                    }
                    popupWindow.setWidth(width);
                    popupWindow.setHeight(height);
                    popupWindow.setContentView(bubbleLayout);
                    popupWindow.setOutsideTouchable(true);
                }

                if (popupWindow.isShowing()) {
                    popupWindow.dismiss();
                } else {
                    if (orientation == Configuration.ORIENTATION_LANDSCAPE) {
                        popupWindow.showAsDropDown(tip, UnitUtils.dpToPx(getContext(), 20),
                                UnitUtils.dpToPx(getContext(), -32));
                    } else {
                        popupWindow.showAsDropDown(tip, UnitUtils.dpToPx(getContext(), 20), -5);
                    }
                }
            }
        });
        resetDialogStyle();

    }

    private void resetDialogStyle() {
        GradientDrawable gradientDrawable = new GradientDrawable();
        gradientDrawable.setCornerRadius(UnitUtils.dpToPx(getContext(), 8));
        gradientDrawable.setColor(Color.parseColor(AntiAddictionKit.getCommonConfig().getDialogBackground()));
        ll_container.setBackground(gradientDrawable);

        tv_title.setTextColor(Color.parseColor(AntiAddictionKit.getCommonConfig().getDialogTitleTextColor()));
        et_name.setTextColor(Color.parseColor(AntiAddictionKit.getCommonConfig().getDialogEditTextColor()));
        et_identify.setTextColor(Color.parseColor(AntiAddictionKit.getCommonConfig().getDialogEditTextColor()));
        // et_phone.setTextColor(Color.parseColor(AntiAddictionKit.getCommonConfig().getDialogEditTextColor()));

        GradientDrawable buttonDrawable = new GradientDrawable();
        buttonDrawable.setCornerRadius(UnitUtils.dpToPx(getContext(), 17));
        buttonDrawable.setColor(Color.parseColor(AntiAddictionKit.getCommonConfig().getDialogButtonBackground()));
        bt_sumbit.setBackground(buttonDrawable);
        bt_sumbit.setTextColor(Color.parseColor(AntiAddictionKit.getCommonConfig().getDialogButtonTextColor()));

        tv_tip.setTextColor(Color.parseColor(AntiAddictionKit.getCommonConfig().getDialogContentTextColor()));
    }

    public static void openRealNameAndPhoneDialog(final int strict) {
        AntiAddictionPlatform.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                RealNameAndPhoneDialog realNameAndPhoneDialog = new RealNameAndPhoneDialog(
                        AntiAddictionPlatform.getActivity(), strict, new OnResultListener() {
                            @Override
                            public void onResult(int type, String msg) {
                                if (type == AntiAddictionKit.CALLBACK_CODE_REAL_NAME_SUCCESS) {
                                    //  AntiAddictionCore.getCallBack().onResult(type,"");
                                    AntiAddictionCore.getCallBack()
                                            .onResult(AntiAddictionKit.CALLBACK_CODE_USER_TYPE_CHANGED, "");
                                }
                                AntiAddictionCore.getCallBack()
                                        .onResult(AntiAddictionKit.CALLBACK_CODE_AAK_WINDOW_DISMISS, "");
                            }
                        });
                saveDialogReference(realNameAndPhoneDialog);
                realNameAndPhoneDialog.show();
            }
        });
    }

    public static void openRealNameAndPhoneDialog(final int strict, final OnResultListener onResultListener) {
        AntiAddictionPlatform.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                RealNameAndPhoneDialog realNameAndPhoneDialog = new RealNameAndPhoneDialog(
                        AntiAddictionPlatform.getActivity(), strict, onResultListener);
                saveDialogReference(realNameAndPhoneDialog);
                realNameAndPhoneDialog.show();
            }
        });
    }

    static void openRealNameAndPhoneDialog(final OnResultListener onResultListener, final int strict,
            final BackPressListener backPressListener) {
        AntiAddictionPlatform.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                RealNameAndPhoneDialog realNameAndPhoneDialog = new RealNameAndPhoneDialog(
                        AntiAddictionPlatform.getActivity(), strict, onResultListener, backPressListener);
                saveDialogReference(realNameAndPhoneDialog);
                realNameAndPhoneDialog.show();
            }
        });
    }

    private void onSubmit(String name, String phone, String identify) {
        if (AntiAddictionKit.getFunctionConfig().getSupportSubmitToServer()) {
            UserService.submitUserInfo(AntiAddictionCore.getCurrentUser().getUserId(), name, identify, phone,
                    new Callback() {
                        @Override
                        public void onSuccess(JSONObject response) {
                            try {
                                int type = response.getInt("accountType");
                                int age = response.optInt("age", 0);
                                if (type == 0) {
                                    type = UserService.getUserTypeByAge(age);
                                }
                                AntiAddictionCore.resetUserInfo("", "" + type, "");
                                if (onResultListener != null) {
                                    onResultListener.onResult(AntiAddictionKit.CALLBACK_CODE_REAL_NAME_SUCCESS, "");
                                }
                                dismiss();
                            } catch (JSONException e) {
                                e.printStackTrace();
                                onFail("");
                            }
                        }

                        @Override
                        public void onFail(final String msg) {
                            //                    if (onResultListener != null) {
                            //                        onResultListener.onResult(AntiAddictionKit.CALLBACK_CODE_REAL_NAME_FAIL, "");
                            //                    }
                            // dismiss();
                            AntiAddictionPlatform.getActivity().runOnUiThread(new Runnable() {
                                @Override
                                public void run() {
                                    String message = "";
                                    try {
                                        JSONObject object = new JSONObject(msg);
                                        message = object.getString("error_description");
                                    } catch (JSONException e) {
                                        e.printStackTrace();
                                    }
                                    Toast.makeText(getContext(), "实名失败！" + message, Toast.LENGTH_SHORT).show();
                                }
                            });
                        }
                    });
        } else {
            Toast.makeText(getContext(), "信息提交成功！", Toast.LENGTH_SHORT).show();
            //次序很重要
            AntiAddictionCore.resetUserInfo(name, identify, phone);
            if (onResultListener != null) {
                onResultListener.onResult(AntiAddictionKit.CALLBACK_CODE_REAL_NAME_SUCCESS, "");
            }
            dismiss();
        }

    }

    private static void saveDialogReference(RealNameAndPhoneDialog realNameAndPhoneDialog) {
        if (realNameAndPhoneDialogWeakReference != null) {
            RealNameAndPhoneDialog dialog = realNameAndPhoneDialogWeakReference.get();
            if (dialog != null && dialog.isShowing()) {
                dialog.dismiss();
            }
            realNameAndPhoneDialogWeakReference.clear();
        }
        realNameAndPhoneDialogWeakReference = new WeakReference<>(realNameAndPhoneDialog);
    }

    public static void setDialogForceShow() {
        if (realNameAndPhoneDialogWeakReference != null) {
            RealNameAndPhoneDialog dialog = realNameAndPhoneDialogWeakReference.get();
            if (dialog != null && dialog.isShowing()) {
                if (null != dialog.bt_back && null != dialog.bt_close) {
                    dialog.bt_back.setVisibility(View.INVISIBLE);
                    dialog.bt_close.setVisibility(View.INVISIBLE);
                    dialog.bt_close.setClickable(false);
                    dialog.bt_back.setClickable(false);
                }
            }
        }
    }

    public interface BackPressListener {
        void onBack();
    }

}
