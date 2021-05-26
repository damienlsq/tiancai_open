package yourgamepackagename;

import yourgamepackagename.AppActivity;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.PowerManager;
import android.util.DisplayMetrics;
import android.view.KeyEvent;
import android.view.View;
import android.widget.ImageView;
import android.widget.ImageView.ScaleType;
import android.widget.LinearLayout;

public class Splash extends Activity {
    private LinearLayout mainLayout = null;
    private ImageView iv = null;

    public static Splash instance = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // TODO Auto-generated method stub
        super.onCreate(savedInstanceState);

        Splash.instance = this;

        mainLayout = new LinearLayout(this);
        mainLayout.setLayoutParams(new LinearLayout.LayoutParams(-1, -1));
        mainLayout.setBackgroundColor(Color.rgb(255, 255, 255));
        /* iv初始化 */
        iv = new ImageView(this);
        iv.setLayoutParams(new LinearLayout.LayoutParams(-1, -1));
        iv.setScaleType(ImageView.ScaleType.CENTER);// 居中显示

        int resId = this.getResources().getIdentifier("splash", "drawable", getPackageName());
        iv.setImageResource(resId);

        mainLayout.addView(iv);// 添加iv
        setContentView(mainLayout);// 显示manLayout

        Runnable runnable = new Runnable() {
            @Override
            public void run() {
                Intent appActivity = new Intent(Splash.instance, AppActivity.class);
                startActivity(appActivity);
                finish();
            }
        };

        Handler handler = new Handler();
        handler.postDelayed(runnable, 1000); // 每隔1s执行
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // 按下键盘上返回按钮
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            return true;
        } else {
            return super.onKeyDown(keyCode, event);
        }
    }

}