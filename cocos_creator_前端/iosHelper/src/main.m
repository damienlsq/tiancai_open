#import <UIKit/UIKit.h>

int main(int argc, char * argv[]) {
    NSString * appDelegateClassName;
    @autoreleasepool {
        // Setup code that might create autoreleased objects goes here.
        appDelegateClassName = @"AppController";
    }
    return UIApplicationMain(argc, argv, nil, appDelegateClassName);
}
