package com.antiaddiction.sdk.net;

import android.os.Handler;
import android.os.Looper;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

public class Async {

    private static final int POOL_THREADS = 5;
    private static final long KEEP_ALIVE_TIME = 5 * 60 * 1000;
    private static volatile ExecutorService mPool;
    private static volatile ExecutorService mQueue;
    private static volatile Handler mHandler;

    private static ExecutorService getPool() {
        if (mPool == null) {
            synchronized (Async.class) {
                if (mPool == null) {
                    mPool = new ThreadPoolExecutor(POOL_THREADS,
                            POOL_THREADS,
                            KEEP_ALIVE_TIME,
                            TimeUnit.MILLISECONDS,
                            new LinkedBlockingQueue<Runnable>());
                }
            }
        }
        return mPool;
    }

    private static ExecutorService getQueue() {
        if (mQueue == null) {
            synchronized (Async.class) {
                if (mQueue == null) {
                    mQueue = new ThreadPoolExecutor(1,
                            1,
                            KEEP_ALIVE_TIME,
                            TimeUnit.MILLISECONDS,
                            new LinkedBlockingQueue<Runnable>());
                }
            }
        }
        return mQueue;
    }

    private static Handler getHandler() {
        if (mHandler == null) {
            synchronized (Async.class) {
                if (mHandler == null) {
                    mHandler = new Handler(Looper.getMainLooper());
                }
            }
        }
        return mHandler;
    }

    public static void runOnPool(Runnable runnable) {
        getPool().execute(runnable);
    }

    public static void runOnQueue(Runnable runnable) {
        getQueue().execute(runnable);
    }

    public static void runOnUIThread(Runnable runnable) {
        getHandler().post(runnable);
    }
}
