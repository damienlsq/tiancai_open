//
//  mbg.m
//  dtree
//
//  Created by LiuDamien on 16/4/11.
//
//  为了解决GameKit里面包含了scriptingscore，导致不能直接在GameCenterManager.m里面使用evalString，弄了一个类来实现这个功能，以后可以扩展使用，此文件有待完善
#include "cocos/platform/CCApplication.h"
#include "cocos/base/CCScheduler.h"
// for cocosjs
// #import "ScriptingCore.h"

// creator
#include "cocos/scripting/js-bindings/jswrapper/SeApi.h"

#import "polarisIOS.h"
//#import "HCLocationManager.h"
#import "IAPHelper.h"
#import "IAPShare.h"
#import "KeychainItemWrapper.h"
#import "AppController.h"


@implementation polarisIOS

static NSString* token;
static NSString* location;
static polarisIOS *instance = nil;

+ (id)instance
{
    if (instance == nil) {
        instance = [[polarisIOS alloc] init];
    }
    return instance;
}

+ (BOOL)evalJSString:(NSString *) script{
    /*
    // for cocojs
    const char* ss = [script UTF8String];
    ScriptingCore::getInstance()->evalString(ss);
    */
    // for creator
    std::string ss = [script UTF8String]; cocos2d::Application::getInstance()->getScheduler()->performFunctionInCocosThread([=](){
       se::ScriptEngine::getInstance()->evalString(ss.c_str(), ss.size());
    });
    return true;
}

+ (void) setAPNToken: (NSString*) t{
    token = [[NSString alloc]initWithFormat:@"%@",t];
}

+ (void)setStatusBar:(int)flag{
    [[UIApplication sharedApplication].keyWindow.rootViewController setAppearance:flag];
}

+ (NSString *)getAPNToken{
    return token;
}
    
+ (void) askGEOLocation{
    /*
    HCLocationManager *locationManager = [HCLocationManager sharedManager];
    [locationManager startLocate];
    // NSLog(@"startLocate");
     */
}
 
+ (void) setGEOLocation: (NSString*) t{
    /*
    location = [[NSString alloc]initWithFormat:@"%@",t];
    // NSLog(@"setGEOLocation %@",location);
     */
}
    
+ (NSString *)getGEOLocation{
    return location;
}
/*!
 * @brief 把格式化的JSON格式的字符串转换成字典
 * @param jsonString JSON格式的字符串
 * @return 返回字典
 */
+ (NSDictionary *)dictionaryWithJsonString:(NSString *)jsonString {
    if (jsonString == nil) {
        return nil;
    }
    
    NSData *jsonData = [jsonString dataUsingEncoding:NSUTF8StringEncoding];
    NSError *err = nil;
    NSDictionary *dic = [NSJSONSerialization JSONObjectWithData:jsonData
                                                        options:NSJSONReadingMutableContainers
                                                        error:&err];
    if(err) {
        NSLog(@"json解析失败：%@",err);
        return nil;
    }
    return dic;
}
    
//词典转换为字符串
+ (NSString*)dictionaryToJson:(NSDictionary *)dic
{
    NSError *parseError = nil;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:dic options:NSJSONWritingPrettyPrinted error:&parseError];
    
    return [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    
}

+ (void) IAPRequestProduct:(NSString *)ids {
    NSLog(@"[IAP] IAPRequestProduct %@", ids);
    if(![IAPShare sharedHelper].iap) {
        [IAPShare sharedHelper].iap = [[IAPHelper alloc] initWithProductIdentifiers:[NSSet setWithArray:[ids componentsSeparatedByString:@","]]];
    }   
    
    [IAPShare sharedHelper].iap.production = YES;
    
    [[IAPShare sharedHelper].iap requestProductsWithCompletion:^(SKProductsRequest* request,SKProductsResponse* response)
     {
         if(response != nullptr ) {
             NSString* str = @"cc.IAPRequestProduct('{";
             for (SKProduct *product in [IAPShare sharedHelper].iap.products) {
                 // NSLog(@"[IAP] Product: %@, %@",product.localizedTitle,[[IAPShare sharedHelper].iap getLocalePrice:product]);
                 str = [str stringByAppendingFormat:@"\"%@\":{ \"name\": \"%@\", \"price\": \"%@\"},",product.productIdentifier,
                        product.localizedTitle,
                        [[IAPShare sharedHelper].iap getLocalePrice:product]];
             }
             // 懒得处理最后一个逗号了，直接加一个没用的key
             str = [str stringByAppendingFormat:@"\"_COUNT\" : 1 }\')"];
             // NSLog(@"[IAP] return:%@",str);
             [polarisIOS evalJSString:str];
        }
     }];
}

+ (void) IAPBuy:(NSString *)id {
    NSLog(@"[IAP] IAPBuy %@", id);
    
    for (SKProduct *product in [IAPShare sharedHelper].iap.products) {
        NSLog(@"[IAP] IAPBuy check %@ === %@", product.productIdentifier, id);
        if ([product.productIdentifier isEqualToString:id]) {
            [[IAPShare sharedHelper].iap buyProduct:product
                                       onCompletion:^(SKPaymentTransaction* trans){
                                           if(trans.error)
                                           {
                                               NSLog(@"[IAP] Fail %@",[trans.error localizedDescription]);
                                               [polarisIOS evalJSString:@"cc.IAPOnFail(2)"];
                                           }
                                           else if(trans.transactionState == SKPaymentTransactionStatePurchased) {
                                               NSData *receiptData = [NSData dataWithContentsOfURL:[[NSBundle mainBundle] appStoreReceiptURL]];
                                               NSLog(@"[IAP] Pruchases transactionReceipt: %@",[receiptData base64EncodedStringWithOptions:NSDataBase64EncodingEndLineWithLineFeed]);
                                               NSString *strMsg = [NSString stringWithFormat:@"cc.IAPOnSuccess(\"%@\")",[receiptData base64EncodedStringWithOptions:NSDataBase64EncodingEndLineWithLineFeed]];
                                               [polarisIOS evalJSString:strMsg];
                                           }
                                           else if(trans.transactionState == SKPaymentTransactionStateFailed) {
                                               NSLog(@"[IAP] Fail");
                                               [polarisIOS evalJSString:@"cc.IAPOnFail(1)"];
                                           }
                                       }];//end of buy product
        }
    }
}

NSString *openUrl = @"NONE";
+ (void) setOpenUrl: (NSString *)url{
    openUrl = url;
}

+ (NSString *) getOpenUrl{
    return openUrl;
}
@end
