/****************************************************************************
 Copyright (c) 2010-2013 cocos2d-x.org
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

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
#import "AppController.h"
#import "cocos2d.h"
#import "AppDelegate.h"
#import "RootViewController.h"
#import "platform/ios/CCEAGLView-ios.h"

#import "polarisIOS.h"
//微信
#import "WXApiManager.h"
#import "Constant.h"
//#import <FBSDKCoreKit/FBSDKCoreKit.h>

// #import "cocos-analytics/CAAgent.h"

using namespace cocos2d;

@implementation AppController

Application* app = nullptr;
@synthesize window;

#pragma mark -
#pragma mark Application lifecycle

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {

    // Add the view controller's view to the window and display.
    float scale = [[UIScreen mainScreen] scale];
    CGRect bounds = [[UIScreen mainScreen] bounds];
    window = [[UIWindow alloc] initWithFrame: bounds];
    
    // cocos2d application instance
    app = new AppDelegate(bounds.size.width * scale, bounds.size.height * scale);
    app->setMultitouch(true);
    
    // Use RootViewController to manage CCEAGLView
    _viewController = [[RootViewController alloc]init];
#ifdef NSFoundationVersionNumber_iOS_7_0
    _viewController.automaticallyAdjustsScrollViewInsets = NO;
    _viewController.extendedLayoutIncludesOpaqueBars = NO;
    _viewController.edgesForExtendedLayout = UIRectEdgeAll;
#else
    _viewController.wantsFullScreenLayout = YES;
#endif
    // Set RootViewController to window
    if ( [[UIDevice currentDevice].systemVersion floatValue] < 6.0)
    {
        // warning: addSubView doesn't work on iOS6
        [window addSubview: _viewController.view];
    }
    else
    {
        // use this method on ios6
        [window setRootViewController:_viewController];
    }
    
    [window makeKeyAndVisible];

    //run the cocos2d-x game scene
    app->start();

    [[UIApplication sharedApplication] setIdleTimerDisabled: YES];
    
    if (@available(iOS 10.0, *)) {
        UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
        center.delegate = self;
        [center requestAuthorizationWithOptions:(UNAuthorizationOptionAlert|UNAuthorizationOptionSound|UNAuthorizationOptionBadge)
                              completionHandler:^(BOOL granted, NSError * _Nullable error) {
                                  if (!error) {
                                      NSLog(@"succeeded!");
                                      [[UIApplication sharedApplication] registerForRemoteNotifications];
                                  }
                              }];
    } else {
        if ([application respondsToSelector:@selector(registerUserNotificationSettings:)]) {
            // iOS 8
            UIUserNotificationSettings* settings = [UIUserNotificationSettings settingsForTypes:UIUserNotificationTypeAlert | UIUserNotificationTypeBadge | UIUserNotificationTypeSound categories:nil];
            [[UIApplication sharedApplication] registerUserNotificationSettings:settings];
        }
    }

    // 向微信注册
    [WXApi registerApp:[[[NSBundle mainBundle] infoDictionary] objectForKey:@"WXAPPID"]
     universalLink:[[[NSBundle mainBundle] infoDictionary] objectForKey:@"UNIVERSALLINK"]];
    
    //[[FBSDKApplicationDelegate sharedInstance] application:application
    //                         didFinishLaunchingWithOptions:launchOptions];
    
    if ([[[[NSBundle mainBundle] infoDictionary] objectForKey:@"VUNGLE_ID"] length] > 0) {
        [[UIApplication sharedApplication].keyWindow.rootViewController initVungleAdv];
    }
    
    NSURL *url = [launchOptions valueForKey:UIApplicationLaunchOptionsURLKey];
    if (url) {
        [polarisIOS setOpenUrl:[NSString stringWithFormat:@"%@",url]];
    }
    
    return YES;
}

/*  IOS 13 openUrl不生效，未解决这个问题
- (UISceneConfiguration *)application:(UIApplication *)application configurationForConnectingSceneSession:(UISceneSession *)connectingSceneSession options:(UISceneConnectionOptions *)options {
    // Called when a new scene session is being created.
    // Use this method to select a configuration to create the new scene with.
    return [[UISceneConfiguration alloc] initWithName:@"Default Configuration" sessionRole:connectingSceneSession.role];
}

- (void)application:(UIApplication *)application didDiscardSceneSessions:(NSSet<UISceneSession *> *)sceneSessions {
    // Called when the user discards a scene session.
    // If any sessions were discarded while the application was not running, this will be called shortly after application:didFinishLaunchingWithOptions.
    // Use this method to release any resources that were specific to the discarded scenes, as they will not return.
}
 */

- (void)statusBarOrientationChanged:(NSNotification *)notification {
    CGRect bounds = [UIScreen mainScreen].bounds;
    float scale = [[UIScreen mainScreen] scale];
    float width = bounds.size.width * scale;
    float height = bounds.size.height * scale;
    Application::getInstance()->updateViewSize(width, height);
}

- (void)applicationWillResignActive:(UIApplication *)application {
    /*
     Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
     Use this method to pause ongoing tasks, disable timers, and throttle down OpenGL ES frame rates. Games should use this method to pause the game.
     */
   app->onPause();
}

- (void)applicationDidBecomeActive:(UIApplication *)application {
   /*
     Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
     */
  app->onResume();
}

- (void)applicationDidEnterBackground:(UIApplication *)application {
    /*
    Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
    If your application supports background execution, called instead of applicationWillTerminate: when the user quits.
    */
}

- (void)applicationWillEnterForeground:(UIApplication *)application {
    /*
     Called as part of  transition from the background to the inactive state: here you can undo many of the changes made on entering the background.
     */
    // 直接打开app时，图标上的数字清零
    application.applicationIconBadgeNumber = 0;
}

- (void)applicationWillTerminate:(UIApplication *)application
{
    delete app;
    app = nil;
}

#pragma mark -
#pragma mark Memory management

- (void)applicationDidReceiveMemoryWarning:(UIApplication *)application {
    /*
     Free up as much memory as possible by purging cached data objects that can be recreated (or reloaded from disk) later.
     */
}


- (BOOL)application:(UIApplication *)application handleOpenURL:(NSURL *)url {
    [polarisIOS setOpenUrl:[NSString stringWithFormat:@"%@",url]];
    return  [WXApi handleOpenURL:url delegate:[WXApiManager sharedManager]];
}

- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url sourceApplication:(NSString *)sourceApplication annotation:(id)annotation {
    [polarisIOS setOpenUrl:[NSString stringWithFormat:@"%@",url]];
    return [WXApi handleOpenURL:url delegate:[WXApiManager sharedManager]];
}

- (BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary<NSString *,id> *)options
{
    [polarisIOS setOpenUrl:[NSString stringWithFormat:@"%@",url]];
    return [WXApi handleOpenURL:url delegate:[WXApiManager sharedManager]];
}

-(BOOL)application:(UIApplication *)application continueUserActivity:(NSUserActivity *)userActivity restorationHandler:(void (^)(NSArray * _Nullable))restorationHandler{
 
    NSLog(@"userActivity : %@",userActivity.webpageURL.description);
    NSString *jsStr = [NSString stringWithFormat:@"polaris.appOnStart(\"%@\")", userActivity.webpageURL.description];
    [polarisIOS evalJSString:jsStr];
    
    return [WXApi handleOpenUniversalLink:userActivity delegate:[WXApiManager sharedManager]];
}

#pragma mark -
#pragma mark 推送相关

// 老版本
//local notification
- (BOOL)checkNotificationType:(UIUserNotificationType)type
{
    UIUserNotificationSettings *currentSettings = [[UIApplication sharedApplication] currentUserNotificationSettings];
    
    return (currentSettings.types & type);
}

//程序运行时接收到本地推送消息，不做任何操作
- (void)application:(UIApplication *)application didReceiveLocalNotification:(UILocalNotification *)notification{
    /*
     UIAlertView *alert = [[UIAlertView alloc] initWithTitle:@"标题" message:notification.alertBody delegate:nil cancelButtonTitle:@"确定" otherButtonTitles:nil];
     [alert show];
     */
    //NSLog(@"notification: %@",notification.alertBody);
    application.applicationIconBadgeNumber = 0;
}
// 老a版本

//将要推送
- (void)userNotificationCenter:(UNUserNotificationCenter *)center willPresentNotification:(UNNotification *)notification withCompletionHandler:(void (^)(UNNotificationPresentationOptions))completionHandler{
    NSLog(@"----------willPresentNotification");
}
//已经完成推送
- (void)userNotificationCenter:(UNUserNotificationCenter *)center didReceiveNotificationResponse:(UNNotificationResponse *)response withCompletionHandler:(void (^)(void))completionHandler{
    NSLog(@"============didReceiveNotificationResponse");
    NSString *categoryID = response.notification.request.content.categoryIdentifier;
    if ([categoryID isEqualToString:@"categoryIdentifier"]) {
        if ([response.actionIdentifier isEqualToString:@"enterApp"]) {
            if (@available(iOS 10.0, *)) {
                
            } else {
                // Fallback on earlier versions
            }
        }else{
            NSLog(@"No======");
        }
    }
    completionHandler();
}

//for APN
- (void)application:(UIApplication *)application didRegisterUserNotificationSettings:(UIUserNotificationSettings *)notificationSettings
{
    //register to receive notifications
    //NSLog(@"APN registerForRemoteNotifications");
    [application registerForRemoteNotifications];
}

//For interactive notification only
- (void)application:(UIApplication *)application handleActionWithIdentifier:(NSString *)identifier forRemoteNotification:(NSDictionary *)userInfo completionHandler:(void(^)())completionHandler
{
    //handle the actions
    //NSLog(@"APN handleActionWithIdentifier %@",identifier);
    if ([identifier isEqualToString:@"declineAction"]){
    }
    else if ([identifier isEqualToString:@"answerAction"]){
    }
}

- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken{
    // NSLog(@"APN ---Token--%@", deviceToken);
    NSUInteger dataLength = deviceToken.length;
    if (dataLength == 0) {
      return;
    }
    const unsigned char *dataBuffer = (const unsigned char *)deviceToken.bytes;
    NSMutableString *hexString  = [NSMutableString stringWithCapacity:(dataLength * 2)];
    for (int i = 0; i < dataLength; ++i) {
      [hexString appendFormat:@"%02x", dataBuffer[i]];
    }
    [polarisIOS setAPNToken:hexString];
}

- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo{
    
    //NSLog(@"APN userInfo == %@",userInfo);
    // NSString *message = [[userInfo objectForKey:@"aps"]objectForKey:@"alert"];
    //NSLog(@"APN message == %@",message);
    
}

- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error{
    
    NSLog(@"APN Regist fail%@",error);
}
@end

