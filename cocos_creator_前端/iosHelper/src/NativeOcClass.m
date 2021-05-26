#import "GameCenterManager.h"
#import "NativeOcClass.h"
#import <UIKit/UIKit.h>
#import <Foundation/Foundation.h>
#import "KeychainItemWrapper.h"
#import "RootViewController.h"
#import "polarisIOS.h"
#import <sys/utsname.h>

//微信
#import "WXApiRequestHandler.h"
#import "WXApiManager.h"
#import "Constant.h"

#import "AntiAddictionKit/AntiAddictionKit-Swift.h"

@implementation NativeOcClass

+(NSString *) getChannelID{
    return [[[NSBundle mainBundle] infoDictionary] objectForKey:@"CHANNEL_ID"];
}

+(NSString *) getSourceID{
    return [[[NSBundle mainBundle] infoDictionary] objectForKey:@"SOURCE_ID"];
}

+(NSString *) getBundleId{
    return [[[NSBundle mainBundle] infoDictionary] objectForKey:@"CFBundleIdentifier"];
}

//登录gamecenter
+(BOOL) GameCenterLogin{
    //game center登陆
    [[GameCenterManager sharedGameCenterManager] authenticateLocalPlayer];
    return true;
}

//获取playerid
+(NSString *) getGameCenterPlayerID{
    return [GKLocalPlayer localPlayer].playerID;
}

//获取player display name
+(NSString *) getGameCenterPlayerDisplayName{
    return [GKLocalPlayer localPlayer].displayName;
}

+(BOOL) addGameCenterScore:(int)score andInt:	(NSString *)leaderBoard_id{
    //NSLog(@"callNative string is %@ and int value is %ld",leaderBoard_id,scoreInt);
    [[GameCenterManager sharedGameCenterManager] reportScore:score forCategory:leaderBoard_id];
    return true;
}

+(BOOL) addGameCenterArchivement:(int)percent andInt:(NSString *)archivement_id{
    //NSLog(@"callNative string is %@ and int value is %ld",archivement_id,scoreInt);
    if (percent >= 100){
        [[GameCenterManager sharedGameCenterManager] reportAchievementIdentifier:archivement_id percentComplete:percent withBanner:YES];
    }
    else
    {
        [[GameCenterManager sharedGameCenterManager] reportAchievementIdentifier:archivement_id percentComplete:percent];
    }
    return true;
}

+(NSString *)getCoreVersion{
    return [[[NSBundle mainBundle] infoDictionary] objectForKey:@"CFBundleShortVersionString"];
}

//检查是否支持推送
+(BOOL)checkCanNotification{
    return [[UIApplication sharedApplication] isRegisteredForRemoteNotifications];
}

+(BOOL)localNotify:(int)t andInt:(NSString *)title andContent:(NSString *)subTitle andContent:(NSString *)mes andContent:(NSString *)requestId {
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    UNMutableNotificationContent *content = [UNMutableNotificationContent new];
    content.title = title;
    content.subtitle = subTitle;
    content.body  = mes;
    content.badge = @([[UIApplication sharedApplication] applicationIconBadgeNumber] +1);
    content.categoryIdentifier = @"categoryIdentifier";
    
//        需要解锁显示，红色文字。点击不会进app。
//        UNNotificationActionOptionAuthenticationRequired = (1 << 0),
//
//        黑色文字。点击不会进app。
//        UNNotificationActionOptionDestructive = (1 << 1),
//
//        黑色文字。点击会进app。
//        UNNotificationActionOptionForeground = (1 << 2),
    
    UNNotificationAction *action = [UNNotificationAction actionWithIdentifier:@"enterApp"
                                                                        title:@"进入应用"
                                                                      options:UNNotificationActionOptionForeground];
    UNNotificationAction *clearAction = [UNNotificationAction actionWithIdentifier:@"destructive"
                                                                             title:@"忽略2"
                                                                           options:UNNotificationActionOptionDestructive];
    UNNotificationCategory *category = [UNNotificationCategory categoryWithIdentifier:@"categoryIdentifier"
                                                                              actions:@[action,clearAction]
                                                                    intentIdentifiers:@[requestId]
                                                                              options:UNNotificationCategoryOptionNone];
    
    [center setNotificationCategories:[NSSet setWithObject:category]];
    
    UNTimeIntervalNotificationTrigger *timeTrigger = [UNTimeIntervalNotificationTrigger triggerWithTimeInterval:t repeats:NO];
    UNNotificationRequest *request = [UNNotificationRequest requestWithIdentifier:requestId content:content trigger:timeTrigger];
    [center addNotificationRequest:request withCompletionHandler:^(NSError * _Nullable error) { }];
    return true;
}

+(void)removeNotify:requestId{
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    if ([requestId isEqualToString:@""]) {
        [center removeAllDeliveredNotifications];
    }else {
        [center removePendingNotificationRequestsWithIdentifiers:@[requestId]];
    }
}

+(BOOL)localPush:(int)t andInt:(NSString *)mes{
    
    if (![self checkCanNotification])
        return false;
    
    // 获得 UIApplication
    UIApplication *app = [UIApplication sharedApplication];
    //获取本地推送数组
    NSArray *localArray = [app scheduledLocalNotifications];
    if (localArray) {
        for (UILocalNotification *noti in localArray) {
            if ([noti.alertBody isEqualToString:mes]) {
                [app cancelLocalNotification:noti];
            }
        }
    }
    
    if (t <= 0)
        return true;
    
    UILocalNotification *notification = [[UILocalNotification alloc] init];
    if (notification != nil) {
        // 设置推送时间（timeInt秒后）
        notification.fireDate = [NSDate dateWithTimeIntervalSinceNow:t];
        // 设置时区（此为默认时区）
        notification.timeZone = [NSTimeZone defaultTimeZone];
        // 设置重复间隔（默认0，不重复推送）
        notification.repeatInterval = 0;
        // 推送声音（系统默认）
        notification.soundName = UILocalNotificationDefaultSoundName;
        // 推送内容 mes
        notification.alertBody = mes;
        //显示在icon上的数字
        notification.applicationIconBadgeNumber += 1;
        /*
        //设置userinfo 方便在之后需要撤销的时候使用
        NSDictionary *info = [NSDictionary dictionaryWithObject:mes forKey:@"mes"];
        notification.userInfo = info;
        */
        NSLog(@"add push Notification string is %@ and time value is %d",mes,t);
        //添加推送到UIApplication
        UIApplication *app = [UIApplication sharedApplication];
        [app scheduleLocalNotification:notification];
    }
    return true;
}

+(NSString *) getOpenUrl{
    return [polarisIOS getOpenUrl];
}

+(NSString *) getSaveItem: (NSString *)key{
    KeychainItemWrapper *keychainItem = [[KeychainItemWrapper alloc]
                                         initWithIdentifier:key
                                         accessGroup:nil];
    NSString *str = [keychainItem objectForKey:(id)kSecValueData];
    [keychainItem release];
    return str;
}

+(BOOL) setSaveItem:(NSString *)key andContent: (NSString *)value{
    KeychainItemWrapper *keychainItem = [[KeychainItemWrapper alloc]
                                         initWithIdentifier:key
                                         accessGroup:nil];
    [keychainItem setObject:value forKey:(id)kSecValueData];
    [keychainItem release];
    return true;
}

+(BOOL) exitGame{
    exit(0);
    return true;
}

+ (void) login: (NSString*) str{
}
+ (void) logout: (NSString*) str{
}

+(BOOL) advInit:(NSString *)type{
    if ([type isEqualToString:@"vungle"]){
        [[UIApplication sharedApplication].keyWindow.rootViewController initVungleAdv];
        return true;
    }
    /*
    if ([type isEqualToString:@"fyber"]){
        [[UIApplication sharedApplication].keyWindow.rootViewController initFyberAdv];
        return true;
    }
    */
    return false;
}

+(BOOL) advReady:(NSString *)type andContent: (NSString *)placementId{
    if ([type isEqualToString:@"vungle"]){
        return [[UIApplication sharedApplication].keyWindow.rootViewController vungleAdvReady:placementId];
    }
    /*
    if ([type isEqualToString:@"fyber"]){
        return [[UIApplication sharedApplication].keyWindow.rootViewController fyberAdvReady];
    }
     */
}

+(BOOL) advShow:(NSString *)type andContent: (NSString *)placementId{
    if ([type isEqualToString:@"vungle"]){
        [[UIApplication sharedApplication].keyWindow.rootViewController showVungleAdv:placementId];
    }
    /*
    if ([type isEqualToString:@"fyber"]){
        [[UIApplication sharedApplication].keyWindow.rootViewController showFyberAdv];
    }
     */
    return true;
}

+(BOOL) showAppleIDLogin:(NSString *)info {
    [[UIApplication sharedApplication].keyWindow.rootViewController showAppleIDLogin: info];
    return true;
}

+(BOOL) hideAppleIDLogin {
    [[UIApplication sharedApplication].keyWindow.rootViewController hideAppleIDLogin];
    return true;
}

+(BOOL) authAppleID: (NSString *)info {
    [[UIApplication sharedApplication].keyWindow.rootViewController authorizationAppleID: info];
    return true;
}

+(BOOL) iapQuery:(NSString *)ids {
    [polarisIOS IAPRequestProduct:ids];
    return true;
}

+(BOOL) pay:(NSString *)id {
    [polarisIOS IAPBuy:id];
    return true;
}

+ (NSString *) getPushToken{
    return [polarisIOS getAPNToken];
}

+ (void) logger: (NSString *)msg{
    return NSLog(@"[POLARIS] [logger] %@",msg);
}

+ (BOOL) setStatusBar:(int) flag {
    [polarisIOS setStatusBar:flag];
    return true;
}

+ (NSString *) getDeviceID {
    // todo
    return @"";
}

+ (NSString *) getPhoneBrand {
    return @"Apple";
}

+ (NSString *) getPhoneModel {
    struct utsname systemInfo;
    uname(&systemInfo);
    NSString*model = [NSString stringWithCString: systemInfo.machine encoding:NSASCIIStringEncoding];
    return model;
}

#pragma mark - Locations
+ (BOOL) askGeo{
    [polarisIOS askGEOLocation];
    return true;
}
    
+ (NSString *) getGeo{
    return [polarisIOS getGEOLocation];
}

#pragma mark - wechat
//微信接口
+(BOOL) isWXAppInstalled{
    return [WXApi isWXAppInstalled];
}

+(BOOL) wxAuth:(NSString *)state{
    
    [WXApiManager sharedManager].delegate = [UIApplication sharedApplication].keyWindow.rootViewController;
    
    [WXApiRequestHandler sendAuthRequestScope: kAuthScope
                                        State: state
                                       OpenID: [[[NSBundle mainBundle] infoDictionary] objectForKey:@"WXAPPID"]
                             InViewController:[UIApplication sharedApplication].keyWindow.rootViewController];
    return true;
}

+ (void) sendShare:(NSString *)shareApp
                andContent: (NSString *)type
                andContent: (NSString *)url
                andContent: (NSString *)thumbUrl
                andContent: (NSString *)imageUrl
                andContent: (NSString *)title
                andContent: (NSString *)desc
                andContent: (NSString *)tag
                andContent: (NSString *)action
                andContent: (NSString *)extra
                andContent: (NSString *)scene
                andInt: (int)compressRatio
{
    UIImage *thumbImage;
    NSData *thumbData;
    if ([thumbUrl isEqualToString:@""]) {
        thumbImage = nil;
        thumbData = nil;
    } else {
        thumbImage = [UIImage imageNamed:thumbUrl];
        thumbData = [NSData dataWithContentsOfFile:imageUrl];
    }
    if ([shareApp isEqualToString:@"wx"]) {
        int sceneId = 0;
        if ([scene isEqualToString:@"timeLine"]) {
            sceneId = 1;
        } else if ([scene isEqualToString:@"favorite"]) {
            sceneId = 2;
        }
        if ([type isEqualToString:@"text"]) {
            [WXApiRequestHandler sendText:desc
            InScene:sceneId];
        } else if ([type isEqualToString:@"link"]) {
            [WXApiRequestHandler sendLinkURL:url
                TagName:tag
                  Title:title
            Description:desc
             ThumbImage:thumbImage
                InScene:sceneId];
        } else if ([type isEqualToString:@"image"]) {
            UIImage *image;
            NSData *imageData;
            if ([imageUrl isEqualToString:@""]) {
                image = nil;
                imageData = nil;
            } else {
                image = [UIImage imageNamed:imageUrl];
                imageData = [NSData dataWithContentsOfFile:imageUrl];
                // UIImageJPEGRepresentation(image, compressRatio / 10);
            }
            [WXApiRequestHandler sendImageData:imageData
               TagName:tag
            MessageExt:desc
                Action:action
            ThumbImage:thumbImage
               InScene:sceneId];
        } else if ([type isEqualToString:@"miniProgram"]) {
            NSArray *keys = [extra componentsSeparatedByString:@","];
            [WXApiRequestHandler sendMiniProgramWebpageUrl:(NSString *)@"htts://wanga.me"
                   userName:[keys objectAtIndex:0]
                       path:[keys objectAtIndex:1]
                      title:title
                Description:desc
                 ThumbImage:thumbImage
                hdImageData:thumbData
            withShareTicket:TRUE
            miniProgramType:0
                    InScene:sceneId];
        }
    }
}

+(BOOL) antiAddictionSetup:(NSString *)info {
    NSLog(@"[防沉迷] antiAddictionSetup");
    AntiAddictionKit.configuration.showSwitchAccountButton = NO;
    
    [AntiAddictionKit init:[UIApplication sharedApplication].keyWindow.rootViewController];
    [AntiAddictionKit setHost:info];
    return 1;
}

+(void) antiAddictionLogin:(NSString *)userid
                            andInt: (int)type {
    int aat = (int)[AntiAddictionKit getUserType:userid];
    NSLog(@"[防沉迷] login:%@, %d, %d", userid, type, aat);
    if (aat == -1) {
        aat = type;
    }
    [AntiAddictionKit login:userid :aat];
}

+(int) antiAddictionPayCheck:(int) price {
    NSLog(@"[防沉迷] payCheck: %d", price);
    [AntiAddictionKit checkPayLimit:price];
    return 1;
}

+(void) antiAddictionPayLog:(int) price {
    NSLog(@"[防沉迷] paySuccess: %d", price);
    [AntiAddictionKit paySuccess:price];
}

+(void) antiAddictionLogout {
  [AntiAddictionKit logout];
}

+(int) antiAddictionGetUserType:(NSString *)userid {
    int aat = (int)[AntiAddictionKit getUserType:userid];
    NSLog(@"[防沉迷] antiAddictionGetUserType: %d", aat);
    return aat;
}

+(void) antiAddictionUpdateUserType:(int) type {
    [AntiAddictionKit updateUserType:type];
}

+(void) antiAddictionOpenRealName {
    [AntiAddictionKit openRealName];
}

@end

