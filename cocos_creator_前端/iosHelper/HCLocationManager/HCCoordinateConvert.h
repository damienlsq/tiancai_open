//
//  HCCoordinateConvert.h
//  HelperCar
//
//  Created by Jentle on 16/8/23.
//  Copyright © 2016年 allydata. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreLocation/CoreLocation.h>

@interface HCCoordinateConvert : NSObject

/**
 *  地球坐标转换为火星坐标
 *
 *  @param location 地球坐标
 *
 *  @return 返回转换后的火星坐标
 */
+ (CLLocation *)transformToMars:(CLLocation *)location;

@end
