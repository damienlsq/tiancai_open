//
//  HCLocationManager.h
//  CoreLocation
//
//  Created by Jentle on 16/8/21.
//  Copyright © 2016年 Jentle. All rights reserved.
//

#import <UIKit/UIKit.h>
#import <CoreLocation/CoreLocation.h>

@protocol HCLocationManagerDelegate <NSObject>

@optional

- (void)loationMangerSuccessLocationWithCity:(NSString *)city;
- (void)loationMangerSuccessLocationWithLatitude:(CLLocationDegrees)latitude longitude:(CLLocationDegrees)longitude;
- (void)loationMangerFaildWithError:(NSError *)error;

@end

@interface HCLocationManager : NSObject

@property (weak, nonatomic)id<HCLocationManagerDelegate>delegate;

+ (HCLocationManager *)sharedManager;

- (void)startLocate;

@end
