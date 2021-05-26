package com.seraph.sdk;


import com.antiaddiction.sdk.utils.AesUtil;

import org.junit.Test;


/**
 * Example local unit test, which will execute on the development machine (host).
 *
 * @see <a href="http://d.android.com/tools/testing">Testing documentation</a>
 */
public class ExampleUnitTest {
    @Test
    public void addition_isCorrect() {
        try {
            String pass = AesUtil.getEncrptStr("origin","pass");
           System.out.print(" get pass  = " + pass);
            String origin = AesUtil.getDecryptStr(pass,"pass");
            System.out.print("get origin = " + origin);
        } catch (Exception e) {
            e.printStackTrace();
            System.out.print(" aes error = " + e.getMessage());
        }
    }
}