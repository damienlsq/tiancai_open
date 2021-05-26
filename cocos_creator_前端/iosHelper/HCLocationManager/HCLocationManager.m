//
//  HCLocationManager.m
//  CoreLocation
//
//  Created by Jentle on 16/8/21.
//  Copyright © 2016年 Jentle. All rights reserved.
//

#import "HCLocationManager.h"
#import <CoreLocation/CoreLocation.h>
#import "HCCoordinateConvert.h"
#import "polarisIOS.h"

@interface HCLocationManager()<CLLocationManagerDelegate>

@property (strong, nonatomic) CLLocationManager *locationManager;

@end

@implementation HCLocationManager

+ (HCLocationManager *)sharedManager{
    static HCLocationManager *sharedManagerInstance = nil;
    static dispatch_once_t predicate;
    dispatch_once(&predicate, ^{
        sharedManagerInstance = [[self alloc] init];
    });
    return sharedManagerInstance;
}

- (CLLocationManager *)locationManager{
    if (!_locationManager) {
        _locationManager = [[CLLocationManager alloc] init];
        _locationManager.delegate = self;
        _locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters;
        _locationManager.distanceFilter = kCLLocationAccuracyHundredMeters;
        [_locationManager requestWhenInUseAuthorization];
    }
    return _locationManager;
}

- (void)startLocate{
    if([CLLocationManager locationServicesEnabled]) {

        [self.locationManager startUpdatingLocation];
    }
    [_locationManager startUpdatingLocation];
}

-(void)locationManager:(CLLocationManager *)manager didUpdateLocations:(NSArray *)locations{
    CLLocation *currentLocation = [locations lastObject];
    //国内经纬度转换为火星坐标
    currentLocation = [HCCoordinateConvert transformToMars:currentLocation];
    [_locationManager stopUpdatingLocation];
    //获取经纬度
    CLLocationDegrees aLatitude = currentLocation.coordinate.latitude;
    CLLocationDegrees aLongitude = currentLocation.coordinate.longitude;
    //NSLog(@"latitude = %f , longitude = %f",aLatitude,aLongitude);
    if ([_delegate respondsToSelector:@selector(loationMangerSuccessLocationWithLatitude: longitude:)]) {
        [_delegate loationMangerSuccessLocationWithLatitude:aLatitude longitude:aLongitude];
    }
    [polarisIOS setGEOLocation:[NSString stringWithFormat:@"%f,%f",aLongitude,aLatitude]];
    /*
    //反地理编码
    CLGeocoder *geocoder = [[CLGeocoder alloc] init];
    [geocoder reverseGeocodeLocation:currentLocation completionHandler:^(NSArray *placemarks, NSError *error) {
        if (placemarks.count > 0) {
            CLPlacemark *placemark = [placemarks lastObject];
            NSString *city = placemark.locality;
            if (!city) {
                city = placemark.administrativeArea;
            }
            if ([city containsString:@"市辖区"] || [city containsString:@"市"]) {
                city = [city stringByReplacingOccurrencesOfString:@"市辖区" withString:@""];
                city = [city stringByReplacingOccurrencesOfString:@"市" withString:@""];
            }
            NSLog(@"city = %@",city);
            if ([_delegate respondsToSelector:@selector(loationMangerSuccessLocationWithCity:)]) {
                [_delegate loationMangerSuccessLocationWithCity:city];
            }
        }
    }];
     */
}

- (void)locationManager:(CLLocationManager *)manager didChangeAuthorizationStatus:(CLAuthorizationStatus)status{
    switch (status) {
        case kCLAuthorizationStatusNotDetermined:
        {
            break;
        }
        case kCLAuthorizationStatusDenied:
        {
            if([CLLocationManager locationServicesEnabled])
            {
                // 定位服务授权被拒绝，是否前往设置开启？
                NSLog(@"定位服务授权被拒绝");
                [polarisIOS setGEOLocation:[NSString stringWithFormat:@"deny"]];
            }
            else
            {
                
            }
            break;
        }
        case kCLAuthorizationStatusRestricted:
        {
            break;
        }
        case kCLAuthorizationStatusAuthorizedAlways:
        {

            break;
        }
        case kCLAuthorizationStatusAuthorizedWhenInUse:
        {
            break;
        }
        default:
            break;
    }
}

- (void)locationManager:(CLLocationManager *)manager didFailWithError:(NSError *)error{
    if ([_delegate respondsToSelector:@selector(loationMangerFaildWithError:)]) {
        [_delegate loationMangerFaildWithError:error];
    }
}


@end
