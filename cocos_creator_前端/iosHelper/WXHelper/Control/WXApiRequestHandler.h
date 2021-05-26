//
//  WXApiManager.h
//  SDKSample
//
//  Created by Jeason on 15/7/14.
//
//

#import <Foundation/Foundation.h>
#import "WXApiObject.h"

@interface WXApiRequestHandler : NSObject

+ (void)sendText:(NSString *)text
         InScene:(enum WXScene)scene;

+ (void)sendImageData:(NSData *)imageData
              TagName:(NSString *)tagName
           MessageExt:(NSString *)messageExt
               Action:(NSString *)action
           ThumbImage:(UIImage *)thumbImage
              InScene:(enum WXScene)scene;

+ (void)sendLinkURL:(NSString *)urlString
            TagName:(NSString *)tagName
              Title:(NSString *)title
        Description:(NSString *)description
         ThumbImage:(UIImage *)thumbImage
            InScene:(enum WXScene)scene;

+ (void)sendMusicURL:(NSString *)musicURL
             dataURL:(NSString *)dataURL
               Title:(NSString *)title
         Description:(NSString *)description
          ThumbImage:(UIImage *)thumbImage
             InScene:(enum WXScene)scene;

+ (void)sendVideoURL:(NSString *)videoURL
               Title:(NSString *)title
         Description:(NSString *)description
          ThumbImage:(UIImage *)thumbImage
             InScene:(enum WXScene)scene;

+ (void)sendEmotionData:(NSData *)emotionData
             ThumbImage:(UIImage *)thumbImage
                InScene:(enum WXScene)scene;

+ (void)sendFileData:(NSData *)fileData
       fileExtension:(NSString *)extension
               Title:(NSString *)title
         Description:(NSString *)description
          ThumbImage:(UIImage *)thumbImage
             InScene:(enum WXScene)scene;

+ (void)sendMiniProgramWebpageUrl:(NSString *)webpageUrl
                         userName:(NSString *)userName
                             path:(NSString *)path
                            title:(NSString *)title
                      Description:(NSString *)description
                       ThumbImage:(UIImage *)thumbImage
                      hdImageData:(NSData *)hdImageData
                  withShareTicket:(BOOL)withShareTicket
                  miniProgramType:(WXMiniProgramType)programType
                          InScene:(enum WXScene)scene;

+ (void)launchMiniProgramWithUserName:(NSString *)userName
                                 path:(NSString *)path
                                 type:(WXMiniProgramType)miniProgramType;

+ (void)sendAppContentData:(NSData *)data
                   ExtInfo:(NSString *)info
                    ExtURL:(NSString *)url
                     Title:(NSString *)title
               Description:(NSString *)description
                MessageExt:(NSString *)messageExt
             MessageAction:(NSString *)action
                ThumbImage:(UIImage *)thumbImage
                   InScene:(enum WXScene)scene;

+ (void)addCardsToCardPackage:(NSArray *)cardIds cardExts:(NSArray *)cardExts;

+ (void)sendAuthRequestScope:(NSString *)scope
                       State:(NSString *)state
                      OpenID:(NSString *)openID
            InViewController:(UIViewController *)viewController;

+ (void)chooseCard:(NSString *)appid
          cardSign:(NSString *)cardSign
          nonceStr:(NSString *)nonceStr
          signType:(NSString *)signType
         timestamp:(UInt32)timestamp;

+ (void)openUrl:(NSString *)url;

+ (void)chooseInvoice:(NSString *)appid
             cardSign:(NSString *)cardSign
             nonceStr:(NSString *)nonceStr
             signType:(NSString *)signType
            timestamp:(UInt32)timestamp;
@end
