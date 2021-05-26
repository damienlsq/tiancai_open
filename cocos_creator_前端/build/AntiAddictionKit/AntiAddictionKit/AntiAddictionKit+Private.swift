
import UIKit


/// 回传给游戏的信息编码
enum AntiAddictionResult: Int {
    case loginSuccess = 500 //用户登录成功
    case logout = 1000 //用户切换账号
    
    case noPayLimit = 1020 // 无付费限制
    case hasPayLimit  = 1025 //有付费限制，无法付费
    
    case realNameRequest = 1060 //请求外部实名登记
    
    case realNameAuthSucceed = 1010 //实名成功
    case realNameAuthFailed = 1015 //实名失败
    
    
    case noRemainTime = 1030 //无剩余游戏时长
    
    case noChatLimit = 1080 //用户已实名，可聊天
    case hasChatLimit = 1090 //用户未实名，无法聊天
    
    case gamePause = 2000 //sdk页面打开，游戏暂停
    case gameResume = 2500 //sdk页面关闭，游戏恢复
    
    
    func intValue() -> Int {
        return self.rawValue
    }
}

/// Private Methods
extension AntiAddictionKit {
    
    /// 接收 SDK 回调的对象
    static var sharedDelegate: AntiAddictionCallback?
    
    /// 服务器是否开启，通过Host是否设置来判断
    static var isServerEnabled: Bool {
        return (AntiAddictionKit.configuration.host != nil)
    }
    
    class func isKitInstalled() -> Bool {
        if (AntiAddictionKit.sharedDelegate == nil) {
            Logger.info("请先初始化 AAKit！")
            return false
        }
        return true
    }
    
    class func sendCallback(result: AntiAddictionResult, message: String?) {
        DispatchQueue.main.async {
            AntiAddictionKit.sharedDelegate?.onAntiAddictionResult(result.intValue(), message ?? "")
        }
    }
    
    class func addNotificationListener() {
        
        // MARK: - App 生命周期
        
        NotificationCenter.default.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: nil) { (notification) in
            Logger.info("游戏开始活跃")
            guard let _ = AntiAddictionKit.sharedDelegate else { return }
            TimeService.start()
            TimeManager.activate()
        }
        NotificationCenter.default.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: nil) { (notification) in
            Logger.info("游戏开始不活跃")
            AlertTip.userTappedToDismiss = false
            guard let _ = AntiAddictionKit.sharedDelegate else { return }
            TimeService.stop()
            TimeManager.inactivate()
        }
        NotificationCenter.default.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: nil) { (notification) in
            Logger.info("游戏进入后台")
            AlertTip.userTappedToDismiss = false
            guard let _ = AntiAddictionKit.sharedDelegate else { return }
            TimeService.stop()
            TimeManager.inactivate()
        }
        NotificationCenter.default.addObserver(forName: UIApplication.willTerminateNotification, object: nil, queue: nil) { (notification) in
            Logger.info("游戏即将关闭")
            AlertTip.userTappedToDismiss = false
            guard let _ = AntiAddictionKit.sharedDelegate else { return }
            TimeService.stop()
            TimeManager.inactivate()
        }
        
        // MARK: - 时长统计 主Timer通知倒计时timer启动 避免Timer Block 内容相互嵌套 导致线程任务互相等待造成阻塞。
        
        NotificationCenter.default.addObserver(forName: .startFiftyMinutesCountdownNotification, object: nil, queue: nil) { (notification) in
            if let userInfo = notification.userInfo, let isCurfew = userInfo["isCurfew"] as? Bool, let countdownBeginTime = userInfo["countdownBeginTime"] as? Int {
                Logger.debug("开始15分钟浮窗的倒计时")
                TimeManager.startFiftyMinutesCountdown(isCurfew: isCurfew, countdownBeginTime: countdownBeginTime)
            }
        }
        NotificationCenter.default.addObserver(forName: .startSixtySecondsCountdownNotification, object: nil, queue: nil) { (notification) in
            if let userInfo = notification.userInfo, let isCurfew = userInfo["isCurfew"] as? Bool {
                Logger.debug("开始1分钟浮窗的倒计时")
                TimeManager.startCountdown(isCurfew: isCurfew)
            }
            
        }

    }
    
}

extension Notification.Name {
    static let startSixtySecondsCountdownNotification: NSNotification.Name = NSNotification.Name("startSixtySecondsCountdownNotification")
    static let startFiftyMinutesCountdownNotification: NSNotification.Name = NSNotification.Name("startFiftyMinutesCountdownNotification")
}
