//
//  GameCenterManager.m
//
//  Copyright 2011 Hicaduda. All rights reserved.
//
/*
 
 hicaduda.com || http://github.com/sgonzalez/GameCenterManager
 
 Permission is hereby granted, free of charge, to any person
 obtaining a copy of this software and associated documentation
 files (the "Software"), to deal in the Software without
 restriction, including without limitation the rights to use,
 copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software in binary form, and to permit persons to whom the
 Software is furnished to do so, subject to the following
 conditions:
 
 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.
 
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 OTHER DEALINGS IN THE SOFTWARE.
 
 */

#import "polarisIOS.h"
#import "GameCenterManager.h"

@implementation GameCenterManager
@synthesize gcSuccess;

static GameCenterManager *sharedGameCenterManager = nil;
+ (GameCenterManager *) sharedGameCenterManager {
    @synchronized(self)
    {
        if (!sharedGameCenterManager) {
            sharedGameCenterManager = [[GameCenterManager alloc] init];
        }
    }
    return sharedGameCenterManager;
}

#pragma mark GameCenterViewController
- (void)showLeaderboardsFromViewController:(UIViewController *)viewController {

    GKGameCenterViewController *leaderboardViewController = [[GKGameCenterViewController alloc] init];
    if (leaderboardViewController != nil) {
        leaderboardViewController.viewState = GKGameCenterViewControllerStateLeaderboards;
        leaderboardViewController.gameCenterDelegate = self;
        [viewController presentViewController:leaderboardViewController animated:YES completion:nil];
    }
//    [leaderboardViewController release];
}

- (void)gameCenterViewControllerDidFinish:(GKGameCenterViewController *)gameCenterViewController {
    [gameCenterViewController dismissModalViewControllerAnimated:YES];
}
#pragma mark -

- (void)authenticateLocalPlayer {
    
    [GKLocalPlayer localPlayer].authenticateHandler = ^(UIViewController *viewController, NSError *error){
        
        if( viewController != nil )
        {//如果需要强制使用gamecenter，那么这里弹出登录窗口
            NSLog(@"GameCenter Need to login");
            //[rootController presentViewController:ui animated:YES completion:nil];
        }
        else if([GKLocalPlayer localPlayer].isAuthenticated)
        {
            gcSuccess = YES;
            NSLog(@"GameCenter Authenticated");
            // [polarisIOS evalJSString:@"cc.GameCenterLoginOK()"];
        }
        else if (error == nil) {
            // Insert code here to handle a successful authentication.
            gcSuccess = YES;
            NSLog(@"Authenticating local user ok!");
           // [polarisIOS evalJSString:@"cc.GameCenterLoginOK()"];
        }
        else
        {
            NSLog(@"GameCenter Failed");
        }
    };
    /*
    NSLog(@"Authenticating local user...");
    if (![GKLocalPlayer localPlayer].authenticated) {
        [[GKLocalPlayer localPlayer] authenticateHandler];
    } else {
        gcSuccess = YES;
        NSLog(@"Already authenticated!");
    }
     */
    /*
    [[GKLocalPlayer localPlayer] authenticateWithCompletionHandler:^(NSError *error) {
        if (error == nil) {
            // Insert code here to handle a successful authentication.
            gcSuccess = YES;
        }
        else
        {
            // Your application can process the error parameter to report the error to the player.
     
        }
    }];
*/
}

- (void)reportScore:(int64_t)score forCategory:(NSString*)category {
    if (!gcSuccess) return;
    
    GKScore *scoreReporter = [[[GKScore alloc] initWithCategory:category] autorelease];
    scoreReporter.value = score;
    
    [scoreReporter reportScoreWithCompletionHandler:^(NSError *error) {
        if (error != nil) {
            // handle the reporting error
            /*UIAlertView *alert = [[UIAlertView alloc] initWithTitle:@"Error" message:@"Could not submit score with Game Center." delegate:nil cancelButtonTitle:@"Try Later" otherButtonTitles:nil];
             [alert show];
             [alert release];*/
        }
    }];
}

- (void)reportAchievementIdentifier:(NSString*)identifier percentComplete:(float)percent {
    [self reportAchievementIdentifier:identifier percentComplete:percent withBanner:NO];
}

- (void)reportAchievementIdentifier:(NSString*)identifier percentComplete:(float)percent withBanner:(BOOL)banner {
    if (!gcSuccess) return;
    
    GKAchievement *achievement = [[[GKAchievement alloc] initWithIdentifier: identifier] autorelease];
    if (achievement) {
        achievement.percentComplete = percent;
        
        [achievement setShowsCompletionBanner:banner];
        
        [achievement reportAchievementWithCompletionHandler:^(NSError *error)
         {
             if (error != nil) {
                 // Retain the achievement object and try again later (not shown).
                 /*UIAlertView *alert = [[UIAlertView alloc] initWithTitle:@"Error" message:@"Could not submit achievement with Game Center." delegate:nil cancelButtonTitle:@"Try Later" otherButtonTitles:nil];
                  [alert show];
                  [alert release];*/
             }
         }];
    }
}

@end
