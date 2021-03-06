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
    // ????????????App??????????????? ??????app?????????????????????sendRsp??????
//    NSString *strTitle = [NSString stringWithFormat:@"????????????App????????????"];
//    NSString *strMsg = [NSString stringWithFormat:@"openID: %@", req.openID];
//    
}

- (void)managerDidRecvShowMessageReq:(ShowMessageFromWXReq *)req {
//    WXMediaMessage *msg = req.message;
//    
//    //??????????????????????????????
//    WXAppExtendObject *obj = msg.mediaObject;
//    
//    NSString *strTitle = [NSString stringWithFormat:@"????????????App????????????"];
//    NSString *strMsg = [NSString stringWithFormat:@"openID: %@, ?????????%@ \n?????????%@ \n???????????????%@ \n?????????:%lu bytes\n????????????:%@\n", req.openID, msg.title, msg.description, obj.extInfo, (unsigned long)msg.thumbData.length, msg.messageExt];
}

- (void)managerDidRecvLaunchFromWXReq:(LaunchFromWXReq *)req {
//    WXMediaMessage *msg = req.message;
    
    //???????????????App
//    NSString *strTitle = [NSString stringWithFormat:@"???????????????"];
//    NSString *strMsg = [NSString stringWithFormat:@"openID: %@, messageExt:%@", req.openID, msg.messageExt];
}

- (void)managerDidRecvMessageResponse:(SendMessageToWXResp *)response {
    // NSString *strTitle = [NSString stringWithFormat:@"????????????????????????"];
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
 ??????code ?????????????????????https://api.weixin.qq.com/sns/oauth2/access_token?appid=APPID&secret=SECRET&code=CODE&grant_type=authorization_code
 ?????????????????????????????????openid
 ??????????????????
 {
 "access_token":"ACCESS_TOKEN",
 "expires_in":7200,
 "refresh_token":"REFRESH_TOKEN",
 "openid":"OPENID",
 "scope":"SCOPE"
 }
 ??????
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
        // ????????????????????????
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
        // ????????????????????????
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
#pragma mark- ??????ID??????
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
    // iOS13 ????????? ??????????????? ???????????? ???????????????
    if (@available(iOS 13.0, *)) {
        // Sign In With Apple ??????
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

// ??????????????????????????????????????????????????????
- (void)didAppleIDBtnClicked{
    // ????????????ID
    [self authorizationAppleID: @"login" ];
}

#pragma mark- ????????????ID
static NSString* appleIDLoginStatus;
- (void)authorizationAppleID:(NSString *)status {
    if (@available(iOS 13.0, *)) {
        // ???????????????Apple ID??????????????????????????????????????????????????????
        ASAuthorizationAppleIDProvider *appleIDProvider = [[ASAuthorizationAppleIDProvider alloc] init];
        // ????????????AppleID ????????????
        ASAuthorizationAppleIDRequest *appleIDRequest = [appleIDProvider createRequest];
        // ??????????????????????????????????????????
        appleIDRequest.requestedScopes = @[];
        // ???ASAuthorizationAppleIDProvider????????????????????? ??????????????????????????????
        ASAuthorizationController *authorizationController = [[ASAuthorizationController alloc] initWithAuthorizationRequests:@[appleIDRequest]];
        // ??????????????????????????????????????????????????????????????????
        authorizationController.delegate = self;
        // ???????????? ???????????????????????????????????????????????? ???????????????????????????????????????
        authorizationController.presentationContextProvider = self;
        // ??????????????????????????????????????????
        [authorizationController performRequests];
        
        appleIDLoginStatus = status;
    } else {
        // ???????????????????????????
        NSLog(@"???????????????Apple??????");
    }
}

#pragma mark- ASAuthorizationControllerDelegate
// ????????????
- (void)authorizationController:(ASAuthorizationController *)controller didCompleteWithAuthorization:(ASAuthorization *)authorization API_AVAILABLE(ios(13.0)) {
    
    if ([authorization.credential isKindOfClass:[ASAuthorizationAppleIDCredential class]]) {
        
        ASAuthorizationAppleIDCredential * credential = authorization.credential;
        
        // ??????????????????????????????????????????????????????????????????????????? App ?????????????????????????????????????????????????????????????????????????????????????????????????????????
        NSString * userID = credential.user;
        
        // ?????????????????? ???????????????????????????????????????????????????
        NSString * familyName = credential.fullName.familyName;
        NSString * givenName = credential.fullName.givenName;
        NSString * email = credential.email;
        
        // ????????????????????????????????????
        NSString * authorizationCode = [[NSString alloc] initWithData:credential.authorizationCode encoding:NSUTF8StringEncoding];
        NSString * identityToken = [[NSString alloc] initWithData:credential.identityToken encoding:NSUTF8StringEncoding];
        
        // ?????????????????????????????????????????????????????????????????????????????????unsupported???unknown???likelyReal
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
        
        // ???????????????????????????????????????
        ASPasswordCredential * passwordCredential = authorization.credential;
        // ????????????????????????????????? ?????????????????????
        NSString * user = passwordCredential.user;
        // ???????????????????????????
        NSString * password = passwordCredential.password;
        
        NSLog(@"userID: %@", user);
        NSLog(@"password: %@", password);
        
    } else {
        
    }
    
    [self hideAppleIDLogin];
}

// ????????????
- (void)authorizationController:(ASAuthorizationController *)controller didCompleteWithError:(NSError *)error API_AVAILABLE(ios(13.0)) {
    
    NSString *errorMsg = nil;
    
    switch (error.code) {
        case ASAuthorizationErrorCanceled:
            errorMsg = @"???????????????????????????";
            break;
        case ASAuthorizationErrorFailed:
            errorMsg = @"??????????????????";
            break;
        case ASAuthorizationErrorInvalidResponse:
            errorMsg = @"????????????????????????";
            break;
        case ASAuthorizationErrorNotHandled:
            errorMsg = @"????????????????????????";
            break;
        case ASAuthorizationErrorUnknown:
            errorMsg = @"??????????????????????????????";
            break;
    }
    NSLog(@"%@", errorMsg);
}

#pragma mark- ASAuthorizationControllerPresentationContextProviding
- (ASPresentationAnchor)presentationAnchorForAuthorizationController:(ASAuthorizationController *)controller {
    return self.view.window;
}

#pragma mark- apple???????????? ????????????
- (void)handleSignInWithAppleStateChanged:(NSNotification *)notification
{
    NSLog(@"%@", notification.userInfo);
}

- (void)onAntiAddictionResult:(NSInteger)code :(NSString *)message {
    if (@available(iOS 10.0, *)) {
        [[UINotificationFeedbackGenerator new] notificationOccurred:UINotificationFeedbackTypeSuccess];
    }
    NSLog(@"[?????????] ??????: %ld %@", code, message);
    //self.callbackLabel.text = [NSString stringWithFormat:@"[AAKit Callback]\n%@", message];
    NSString *strMsg = [NSString stringWithFormat:@"cc.antiAddictionResult(%ld,\"%@\")", code, message];
    [polarisIOS evalJSString:strMsg];
}
@end
