// Copyright 2018-2019 Twitter, Inc.
// Licensed under the MoPub SDK License Agreement
// http://www.mopub.com/legal/sdk-license-agreement/

package com.antiaddiction.sdk.net;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;

public class Streams {

    private static final String ERR_MSG_STREAM_NULL = "Stream must not be null.";

    public static void copy(InputStream inputStream,
                            OutputStream outputStream) throws IOException {

        byte[] buffer = new byte[16384];
        int length;

        while ((length = inputStream.read(buffer)) != -1) {
            outputStream.write(buffer, 0, length);
        }
    }

    public static String read(InputStream inputStream) throws IOException {

        BufferedInputStream bufferedInputStream = null;
        InputStreamReader reader = null;
        try {
            bufferedInputStream = new BufferedInputStream(inputStream);
            reader = new InputStreamReader(bufferedInputStream);
            StringBuilder stringBuilder = new StringBuilder();

            final int bufferSize = 1024 * 2;
            char[] buffer = new char[bufferSize];
            int n;
            while ((n = reader.read(buffer)) != -1) {
                stringBuilder.append(buffer, 0, n);
            }
            return stringBuilder.toString();
        } finally {
           if(bufferedInputStream != null){
               bufferedInputStream.close();
           }
            if(reader != null){
                reader.close();
            }
        }
    }

}
