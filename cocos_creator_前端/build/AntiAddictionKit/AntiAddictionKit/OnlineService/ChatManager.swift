
import Foundation

struct ChatManager {
    
    /// 联网版
    /// 检测是否可以聊天
    static func check() {
        
        // 非大陆用户，不开启防沉迷系统
        if !RegionDetector.isMainlandUser {
            AntiAddictionKit.sendCallback(result: .noChatLimit, message: "海外用户，不开启防沉迷系统")
            return
        }
        
        if let _ = AntiAddictionKit.configuration.host {
            guard let account = AccountManager.currentAccount, let _ = account.token else {
                AntiAddictionKit.sendCallback(result: .hasChatLimit, message: "当前无已登录用户，无法聊天")
                return
            }
            //检查是否实名
            if account.type == .unknown {
                
                //使用sdk实名
                if AntiAddictionKit.configuration.useSdkRealName {
                    Router.openRealNameController(backButtonEnabled: false, cancelled: {
                        AntiAddictionKit.sendCallback(result: .hasChatLimit, message: "用户取消实名，无法聊天")
                    }) {
                        AntiAddictionKit.sendCallback(result: .noChatLimit, message: "用户实名登记成功，可以聊天")
                    }
                } else {
                    //使用外部实名
                    AntiAddictionKit.sendCallback(result: .realNameRequest, message: "用户未实名登记无法聊天，请求实名登记")
                }
                
            } else {
                AntiAddictionKit.sendCallback(result: .noChatLimit, message: "用户已实名，可以聊天")
            }
            
        }
        
    }
    
}
