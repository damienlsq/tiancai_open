/****************************************************************************
 Copyright (c) 2010-2011 cocos2d-x.org
 Copyright (c) 2010      Ricardo Quesada
 
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
#import <AuthenticationServices/AuthenticationServices.h>

#import "RootViewController.h"
#import "cocos2d.h"

#include "platform/CCApplication.h"
#include "platform/ios/CCEAGLView-ios.h"

#import "polarisIOS.h"
#import "WXApiManager.h"
#import <VungleSDK/VungleSDK.h>
#import "AntiAddictionKit/AntiAddictionKit-Swift.h"

/*
// #import "FyberSDK.h"
@interface RootViewController ()<WXApiManagerDelegate,VungleSDKDelegate,FYBRewardedVideoControllerDelegate,FYBVirtualCurrencyClientDelegate
>
*/
@interface RootViewController ()<WXApiManagerDelegate,VungleSDKDelegate,ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding, AntiAddictionCallback>

// @property(nonatomic, assign) BOOL didReceiveFyberOffers;

@end

@implementation RootViewController

/*
 // The designated initializer.  Override if you create the controller programmatically and want to perform customization that is not appropriate for viewDidLoad.
- (id)initWithNibName:(NSString *)nibNameOrNil bundle:(NSBundle *)nibBundleOrNil {
    if ((self = [super initWithNibName:nibNameOrNil bundle:nibBundleOrNil])) {
        // Custom initialization
    }
    return self;
}
*/

// Implement loadView to create a view hierarchy programmatically, without using a nib.
- (void)loadView {
    // Set EAGLView as view of RootViewController
    self.view = (__bridge CCEAGLView *)cocos2d::Application::getInstance()->getView();
}

// Implement viewDidLoad to do additional setup after loading the view, typically from a nib.
- (void)viewDidLoad {
    [super viewDidLoad];
    [WXApiManager sharedManager].delegate = self;
}

- (void)viewWillAppear:(BOOL)animated {
    [super viewWillAppear:animated];
}

- (void)viewDidDisappear:(BOOL)animated {
    [super viewDidDisappear:animated];
}

// For ios6, use supportedInterfaceOrientations & shouldAutorotate instead
#ifdef __IPHONE_6_0
- (NSUInteger) supportedInterfaceOrientations{
    return UIInterfaceOrientationMaskAllButUpsideDown;
}
#endif

- (BOOL) shouldAutorotate {
    return YES;
}

- (void)didRotateFromInterfaceOrientation:(UIInterfaceOrientation)fromInterfaceOrientation {
    [super didRotateFromInterfaceOrientation:fromInterfaceOrientation];
}

- (void)didReceiveMemoryWarning {
    // Releases the view if it doesn't have a superview.
    [super didReceiveMemoryWarning];

    // Release any cached data, images, etc that aren't in use.
}

int statusBarFlag = 0;
- (BOOL)prefersStatusBarHidden {
    if (statusBarFlag == 0) {
        return YES;
    } else {
        return NO;
    }
}

- (UIStatusBarStyle)preferredStatusBarStyle {
    if (statusBarFlag == 3) {
        return UIStatusBarStyleDarkContent;
    } else if (statusBarFlag == 2) {
        return UIStatusBarStyleLightContent;
    } else {
        return UIStatusBarStyleDefault;
    }
}

- (void)setAppearance:(int)flag {
    statusBarFlag = flag;
    [self setNeedsStatusBarAppearanceUpdate];
}

- (void)dealloc {
    [super dealloc];
    [[VungleSDK sharedSDK] setDelegate:nil];
    [[NSNotificationCenter defaultCenter] removeObserver:self name:ASAuthorizationAppleIDProviderCredentialRevokedNotification object:nil];
}


#pragma mark - WXApiManagerDelegate
- (void)managerDidRecvGetMessageReq:(GetMessageFromWXReq *)req {
    // 微信请求App提供内容， 需要app提供内容后使用sendRsp返回
//    NSString *strTitle = [NSString stringWithFormat:@"微信请求App提供内容"];
//    NSString *strMsg = [NSString stringWithFormat:@"openID: %@", req.openID];
//    
}

- (void)managerDidRecvShowMessageReq:(ShowMessageFromWXReq *)req {
//    WXMediaMessage *msg = req.message;
//    
//    //显示微信传过来的内容
//    WXAppExtendObject *obj = msg.mediaObject;
//    
//    NSString *strTitle = [NSString stringWithFormat:@"微信请求App显示内容"];
//    NSString *strMsg = [NSString stringWithFormat:@"openID: %@, 标题：%@ \n内容：%@ \n附带信息：%@ \n缩略图:%lu bytes\n附加消息:%@\n", req.openID, msg.title, msg.description, obj.extInfo, (unsigned long)msg.thumbData.length, msg.messageExt];
}

- (void)managerDidRecvLaunchFromWXReq:(LaunchFromWXReq *)req {
//    WXMediaMessage *msg = req.message;
    
    //从微信启动App
//    NSString *strTitle = [NSString stringWithFormat:@"从微信启动"];
//    NSString *strMsg = [NSString stringWithFormat:@"openID: %@, messageExt:%@", req.openID, msg.messageExt];
}

- (void)managerDidRecvMessageResponse:(SendMessageToWXResp *)response {
    // NSString *strTitle = [NSString stringWithFormat:@"发送媒体消息结果"];
    // NSString *strMsg = [NSString stringWithFormat:@"errcode:%d", response.errCode];
    NSString *strMsg = [NSString stringWithFormat:@"nativeHelper.wxShareRet(%d,\"%@\")",
                        response.errCode, response.errStr];
    [polarisIOS evalJSString:strMsg];
}

- (void)managerDidRecvAddCardResponse:(AddCardToWXCardPackageResp *)response {
//    NSMutableString* cardStr = [[[NSMutableString alloc] init] autorelease];
//    for (WXCardItem* cardItem in response.cardAry) {
//        [cardStr appendString:[NSString stringWithFormat:@"cardid:%@ cardext:%@ cardstate:%u\n",cardItem.cardId,cardItem.extMsg,(unsigned int)cardItem.cardState]];
//    }
}

- (void)managerDidRecvAuthResponse:(SendAuthResp *)response {
    NSString *strMsg = [NSString stringWithFormat:@"cc.authWeChatReq(\"%@\",\"%@\",%d)",
                        response.code, response.state, response.errCode];
    // NSLog(@"%@",strMsg);
    [polarisIOS evalJSString:strMsg];
}

/*
 获取code 后，服务端发送https://api.weixin.qq.com/sns/oauth2/access_token?appid=APPID&secret=SECRET&code=CODE&grant_type=authorization_code
 认证，就可以获得用户的openid
 正确的返回：
 {
 "access_token":"ACCESS_TOKEN",
 "expires_in":7200,
 "refresh_token":"REFRESH_TOKEN",
 "openid":"OPENID",
 "scope":"SCOPE"
 }
 如：
 https://api.weixin.qq.com/sns/oauth2/access_token?appid=wxcea8ef8330261900&secret=553cdc410175695ca6eacd7c0ba5805d&code=011b96c0212a11222b0ac698d6f8ca0-&grant_type=authorization_code
 */

#pragma mark - VungleSDK Delegate
static NSString* ready_placementId;

- (void)vungleAdPlayabilityUpdate:(BOOL)isAdPlayable placementID:(nullable NSString *)placementID {
    // NSLog(@"-->> Delegate Callback: vungleAdPlayabilityUpdate %@",placementID);
    if (isAdPlayable) {
        ready_placementId = placementID;
        // NSLog(@"[vungle] An ad is available for playback");
    } else {
        // NSLog(@"[vungle] No ads currently available for playback %@", placementID);
    }
}
- (void)vungleWillCloseAdWithViewInfo:(VungleViewInfo *)info placementID:(NSString *)placementID {
    if (info) {
        if (info.completedView) {
            NSString *strMsg = [NSString stringWithFormat:@"cc.advViewSuccess(0)"];
            [polarisIOS evalJSString:strMsg];
        } else {
            NSString *strMsg = [NSString stringWithFormat:@"cc.advViewSuccess(1)"];
            [polarisIOS evalJSString:strMsg];
        }
    }
}
- (void)showVungleAdv: (NSString *)placementId{
    // Play a Vungle ad (with default options)
    VungleSDK *sdk = [VungleSDK sharedSDK];
    NSError *error;
    NSString* placementID;
    if (placementId == NULL || placementId == nil || placementId.length == 0) {
        // 采用已经下载好的
        placementID = ready_placementId;
    } else {
        placementID = placementId;
    }
    // NSLog(@"[vungle] playing ad: %@", placementID);
    [sdk playAd:self options:nil placementID:placementID error:&error];
    if (error) {
        NSLog(@"[vungle] Error encountered playing ad: %@", error);
    }
}
- (BOOL)vungleAdvReady: (NSString *) placementId {
    NSString* placementID;
    VungleSDK *sdk = [VungleSDK sharedSDK];
    if (placementId == NULL || placementId == nil || placementId.length == 0) {
        // 采用已经下载好的
        placementID = ready_placementId;
    } else {
        placementID = placementId;
    }
    if (placementID == NULL || placementID == nil || placementID.length == 0) {
        return false;
    }
    // NSLog(@"[vungle] isReady ad: %@", placementID);
    return [sdk isAdCachedForPlacementID:placementID];
}
- (void)initVungleAdv
{
    NSError* error;
    NSString* appID = [[[NSBundle mainBundle] infoDictionary] objectForKey:@"VUNGLE_ID"];
    VungleSDK *sdk = [VungleSDK sharedSDK];
    
    //Set VungleSDK Delegate
    [sdk setDelegate:self];
    [sdk setLoggingEnabled:YES];
    // start vungle publisher library
    [sdk startWithAppId:appID error:&error];
}

#pragma fyber
/*
- (void)requestFyberVideo
{
    // NSLog(@"[fyber] Requesting Rewarded Video");
    
    // Get the Rewarded Video Controller
    FYBRewardedVideoController *rewardedVideoController = [FyberSDK rewardedVideoController];
    
    // Set the delegate of the controller in order to be notified of the controller's state changes
    rewardedVideoController.delegate = self;
    
    // Enable or disable a "toast" message shown to the user after the video is fully watched
    rewardedVideoController.shouldShowToastOnCompletion = NO;
    
    // Set the controller's virtualCurrencyClientDelegate to request virtual currency automatically requested after the user engagement
    rewardedVideoController.virtualCurrencyClientDelegate = self;
    
    // Request a Rewarded Video
    FYBRequestParameters *parameters = [[FYBRequestParameters alloc] init];
    
    // Add an optional Placement ID, Currency ID or Custom Parameters to your request
    // parameters.placementId = @"PLACEMENT_ID";
    // parameters.currencyId = @"CURRENCY_ID";
    // [parameters addCustomParameterWithKey:@"param1Key" value:@"param1Value"];
    
    [rewardedVideoController requestVideoWithParameters:parameters];
}

- (void)initFyberAdv
{
    NSLog(@"[fyber] initFyberAdv");
    FYBSDKOptions *options = [FYBSDKOptions optionsWithAppId:[[[NSBundle mainBundle] infoDictionary] objectForKey:@"FYBER_APPID"]
                                               securityToken:[[[NSBundle mainBundle] infoDictionary] objectForKey:@"FYBER_TOKEN"]];
    [FyberSDK startWithOptions:options];
    self.didReceiveFyberOffers = NO;
    [self requestFyberVideo];
}

- (void)showFyberAdv
{
    // Play the received rewarded video
    [[FyberSDK rewardedVideoController] presentRewardedVideoFromViewController:self];
}

- (BOOL)fyberAdvReady{
    if (!self.didReceiveFyberOffers) {
        [self requestFyberVideo];
    }
    return self.didReceiveFyberOffers;
}

#pragma mark FYBRewardedVideoControllerDelegate - Request Video

- (void)rewardedVideoControllerDidReceiveVideo:(FYBRewardedVideoController *)rewardedVideoController
{
    NSLog(@"[fyber] Did receive offer");
    self.didReceiveFyberOffers = YES;
}

- (void)rewardedVideoController:(FYBRewardedVideoController *)rewardedVideoController didFailToReceiveVideoWithError:(NSError *)error
{
    NSLog(@"[fyber] Did not receive any offer");
    self.didReceiveFyberOffers = NO;
}


#pragma mark FYBRewardedVideoControllerDelegate - Show Video

- (void)rewardedVideoControllerDidStartVideo:(FYBRewardedVideoController *)rewardedVideoController
{
    NSLog(@"[fyber] video Started");
}

- (void)rewardedVideoController:(FYBRewardedVideoController *)rewardedVideoController didDismissVideoWithReason:(FYBRewardedVideoControllerDismissReason)reason
{
    NSLog(@"[fyber] video dismiss");
    self.didReceiveFyberOffers = NO;
    [self requestFyberVideo];
}

- (void)rewardedVideoController:(FYBRewardedVideoController *)rewardedVideoController didFailToStartVideoWithError:(NSError *)error
{
    NSLog(@"[fyber] video fail");
    self.didReceiveFyberOffers = NO;
}

#pragma mark - FYBVirtualCurrencyClientDelegate

- (void)virtualCurrencyClient:(FYBVirtualCurrencyClient *)client didReceiveResponse:(FYBVirtualCurrencyResponse *)response
{
    NSLog(@"[fyber] Received %@ %@", @(response.deltaOfCoins), response.currencyName);
    NSString *strMsg = [NSString stringWithFormat:@"cc.advViewSuccess(1)"];
    [polarisIOS evalJSString:strMsg];
}

- (void)virtualCurrencyClient:(FYBVirtualCurrencyClient *)client didFailWithError:(NSError *)error
{
    NSLog(@"[fyber] Failed to receive virtual currency %@", error);
    NSString *strMsg = [NSString stringWithFormat:@"cc.advViewSuccess(0)"];
    [polarisIOS evalJSString:strMsg];
}
*/
#pragma mark- 苹果ID登陆
- (void)showAppleIDLogin:(NSString *)info {
    NSArray *keys = [info componentsSeparatedByString:@","];
    int x=[[keys objectAtIndex:0] intValue];
    int y=[[keys objectAtIndex:1] intValue];
    int cornerRadius = 0;
        
    if ([[keys objectAtIndex:4] length]) {
        NSArray *arr = [[keys objectAtIndex:4] componentsSeparatedByString:@"|"];
        x = self.view.bounds.size.width/2 + [[arr objectAtIndex:0] intValue];
        y = self.view.bounds.size.height/2 + [[arr objectAtIndex:1] intValue];
    }
    if ([[keys objectAtIndex:5] length]) {
        cornerRadius = [[keys objectAtIndex:5] intValue];
    }
    // iOS13 才支持 系统提供的 登录按钮 要做下判断
    if (@available(iOS 13.0, *)) {
        // Sign In With Apple 按钮
        ASAuthorizationAppleIDButton *appleIDBtn = [ASAuthorizationAppleIDButton buttonWithType:ASAuthorizationAppleIDButtonTypeDefault style:ASAuthorizationAppleIDButtonStyleWhite];
        //appleIDBtn.frame = CGRectMake([[keys objectAtIndex:0] intValue], [[keys objectAtIndex:1] intValue], [[keys objectAtIndex:2] intValue], [[keys objectAtIndex:3] intValue]);
        appleIDBtn.frame = CGRectMake(x, y,  [[keys objectAtIndex:2] intValue], [[keys objectAtIndex:3] intValue]);
        appleIDBtn.cornerRadius = 0;
        appleIDBtn.tag = 77;
        [appleIDBtn addTarget:self action:@selector(didAppleIDBtnClicked) forControlEvents:UIControlEventTouchUpInside];
        [self.view addSubview:appleIDBtn];
    }
}

- (void)hideAppleIDLogin{
    for (UIView *subView in self.view.subviews)
    {
        if (subView.tag == 77)
        {
            [subView removeFromSuperview];
        }
    }
}

// 使用系统提供的按钮调用处理授权的方法
- (void)didAppleIDBtnClicked{
    // 授权苹果ID
    [self authorizationAppleID: @"login" ];
}

#pragma mark- 授权苹果ID
static NSString* appleIDLoginStatus;
- (void)authorizationAppleID:(NSString *)status {
    if (@available(iOS 13.0, *)) {
        // 基于用户的Apple ID授权用户，生成用户授权请求的一种机制
        ASAuthorizationAppleIDProvider *appleIDProvider = [[ASAuthorizationAppleIDProvider alloc] init];
        // 创建新的AppleID 授权请求
        ASAuthorizationAppleIDRequest *appleIDRequest = [appleIDProvider createRequest];
        // 在用户授权期间请求的联系信息
        appleIDRequest.requestedScopes = @[];
        // 由ASAuthorizationAppleIDProvider创建的授权请求 管理授权请求的控制器
        ASAuthorizationController *authorizationController = [[ASAuthorizationController alloc] initWithAuthorizationRequests:@[appleIDRequest]];
        // 设置授权控制器通知授权请求的成功与失败的代理
        authorizationController.delegate = self;
        // 设置提供 展示上下文的代理，在这个上下文中 系统可以展示授权界面给用户
        authorizationController.presentationContextProvider = self;
        // 在控制器初始化期间启动授权流
        [authorizationController performRequests];
        
        appleIDLoginStatus = status;
    } else {
        // 处理不支持系统版本
        NSLog(@"系统不支持Apple登录");
    }
}

#pragma mark- ASAuthorizationControllerDelegate
// 授权成功
- (void)authorizationController:(ASAuthorizationController *)controller didCompleteWithAuthorization:(ASAuthorization *)authorization API_AVAILABLE(ios(13.0)) {
    
    if ([authorization.credential isKindOfClass:[ASAuthorizationAppleIDCredential class]]) {
        
        ASAuthorizationAppleIDCredential * credential = authorization.credential;
        
        // 苹果用户唯一标识符，该值在同一个开发者账号下的所有 App 下是一样的，开发者可以用该唯一标识符与自己后台系统的账号体系绑定起来。
        NSString * userID = credential.user;
        
        // 苹果用户信息 如果授权过，可能无法再次获取该信息
        NSString * familyName = credential.fullName.familyName;
        NSString * givenName = credential.fullName.givenName;
        NSString * email = credential.email;
        
        // 服务器验证需要使用的参数
        NSString * authorizationCode = [[NSString alloc] initWithData:credential.authorizationCode encoding:NSUTF8StringEncoding];
        NSString * identityToken = [[NSString alloc] initWithData:credential.identityToken encoding:NSUTF8StringEncoding];
        
        // 用于判断当前登录的苹果账号是否是一个真实用户，取值有：unsupported、unknown、likelyReal
        ASUserDetectionStatus realUserStatus = credential.realUserStatus;
        
        NSLog(@"userID: %@", userID);
        NSLog(@"familyName: %@", familyName);
        NSLog(@"givenName: %@", givenName);
        NSLog(@"email: %@", email);
        NSLog(@"authorizationCode: %@", authorizationCode);
        NSLog(@"identityToken: %@", identityToken);
        NSLog(@"realUserStatus: %@", @(realUserStatus));
        
        NSString *strMsg = [NSString stringWithFormat:@"nativeHelper.AppleIDLogin(\"%@\",\"%@\",\"%@\",\"%@\",\"%@\",\"%@\",\"%@\",\"%@\")", userID, familyName, givenName, email, authorizationCode, identityToken, @(realUserStatus), appleIDLoginStatus];
        [polarisIOS evalJSString:strMsg];
    }
    else if ([authorization.credential isKindOfClass:[ASPasswordCredential class]]) {
        
        // 用户登录使用现有的密码凭证
        ASPasswordCredential * passwordCredential = authorization.credential;
        // 密码凭证对象的用户标识 用户的唯一标识
        NSString * user = passwordCredential.user;
        // 密码凭证对象的密码
        NSString * password = passwordCredential.password;
        
        NSLog(@"userID: %@", user);
        NSLog(@"password: %@", password);
        
    } else {
        
    }
    
    [self hideAppleIDLogin];
}

// 授权失败
- (void)authorizationController:(ASAuthorizationController *)controller didCompleteWithError:(NSError *)error API_AVAILABLE(ios(13.0)) {
    
    NSString *errorMsg = nil;
    
    switch (error.code) {
        case ASAuthorizationErrorCanceled:
            errorMsg = @"用户取消了授权请求";
            break;
        case ASAuthorizationErrorFailed:
            errorMsg = @"授权请求失败";
            break;
        case ASAuthorizationErrorInvalidResponse:
            errorMsg = @"授权请求响应无效";
            break;
        case ASAuthorizationErrorNotHandled:
            errorMsg = @"未能处理授权请求";
            break;
        case ASAuthorizationErrorUnknown:
            errorMsg = @"授权请求失败未知原因";
            break;
    }
    NSLog(@"%@", errorMsg);
}

#pragma mark- ASAuthorizationControllerPresentationContextProviding
- (ASPresentationAnchor)presentationAnchorForAuthorizationController:(ASAuthorizationController *)controller {
    return self.view.window;
}

#pragma mark- apple授权状态 更改通知
- (void)handleSignInWithAppleStateChanged:(NSNotification *)notification
{
    NSLog(@"%@", notification.userInfo);
}

- (void)onAntiAddictionResult:(NSInteger)code :(NSString *)message {
    if (@available(iOS 10.0, *)) {
        [[UINotificationFeedbackGenerator new] notificationOccurred:UINotificationFeedbackTypeSuccess];
    }
    NSLog(@"[防沉迷] 返回: %ld %@", code, message);
    //self.callbackLabel.text = [NSString stringWithFormat:@"[AAKit Callback]\n%@", message];
    NSString *strMsg = [NSString stringWithFormat:@"cc.antiAddictionResult(%ld,\"%@\")", code, message];
    [polarisIOS evalJSString:strMsg];
}
@end
