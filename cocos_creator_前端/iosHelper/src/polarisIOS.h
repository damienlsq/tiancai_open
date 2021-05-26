#ifndef polarisIOS_h
#define polarisIOS_h

#import <UserNotifications/UserNotifications.h>

@interface polarisIOS : NSObject

+ (void) setAPNToken: (NSString*) t;
+ (NSString *) getAPNToken;
+ (id)instance;
+ (BOOL)evalJSString:(NSString *)script;
+ (NSDictionary *)dictionaryWithJsonString:(NSString *)jsonString;
+ (NSString*)dictionaryToJson:(NSDictionary *)dic;
+ (void) askGEOLocation;
+ (void) setGEOLocation: (NSString*) t;
+ (NSString *)getGEOLocation;
+ (void)setStatusBar:(int)flag;
+ (void) IAPRequestProduct:(NSString *)ids;

+ (void) setOpenUrl: (NSString *)url;
+ (NSString *) getOpenUrl;
@end


#endif /* mbg_h */
