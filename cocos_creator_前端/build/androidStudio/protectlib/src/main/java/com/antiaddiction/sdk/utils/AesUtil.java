package com.antiaddiction.sdk.utils;

import android.util.Base64;
import android.util.Log;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.NoSuchProviderException;
import java.security.Provider;
import java.security.SecureRandom;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;

public class AesUtil {

    public static String getEncrptStr(String origin,String pass) throws Exception {
        Key key = createAESKey(pass);
        return new String(encrypt(key,origin));
    }

    public static String getDecryptStr(String content,String pass) throws Exception {
        Key key = createAESKey(pass);
       return new String(decrypt(content.getBytes(),key));
    }

    private static Key createAESKey(String origin) {
            byte[] passwordBytes = origin.getBytes(StandardCharsets.US_ASCII);
            return new SecretKeySpec(
                    InsecureSHA1PRNGKeyDerivator.deriveInsecureKey(
                            passwordBytes, 32),
                    "AES");

    }

    private static byte[] encrypt(Key key, String content) throws Exception {
        // 创建密码器
        Cipher cipher = Cipher.getInstance("AES");
        // 初始化加密器
        cipher.init(Cipher.ENCRYPT_MODE, key,new IvParameterSpec(new byte[cipher.getBlockSize()]));
        // 加密
        return Base64.encode(cipher.doFinal(content.getBytes(StandardCharsets.UTF_8)),Base64.DEFAULT);
    }

    private static byte[] decrypt(byte[] content, Key key) throws Exception {
        // 创建密码器
        Cipher cipher = Cipher.getInstance("AES");
        // 初始化解密器
        cipher.init(Cipher.DECRYPT_MODE, key,new IvParameterSpec(new byte[cipher.getBlockSize()]));
        // 解密
        return cipher.doFinal(Base64.decode(content,Base64.DEFAULT));
    }


}
