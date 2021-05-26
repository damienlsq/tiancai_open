
import Foundation

struct TimeManager {
    
    static var currentRemainTime: Int = Int.max
    
    static var lastLocalTimestamp: Int = Int(Date().timeIntervalSince1970)
    static var lastServerTimestamp: Int = Int(Date().timeIntervalSince1970)
    
    /// 方便 setPlayLog时的传参
    static var isFirstLaunch: Bool = true
    
    /// 启动时长统计服务
    static func activate(isLogin: Bool = false) {
        
        // 非大陆用户，不开启防沉迷系统
        if !RegionDetector.isMainlandUser {
            return
        }
        
        if AntiAddictionKit.configuration.useSdkOnlineTimeLimit == false {
            Logger.debug("联网版未开启防沉迷时长统计")
            return
        }
        
        guard let account = AccountManager.currentAccount, let _ = account.token else {
            Logger.debug("联网版无用户 token，无法启动防沉迷时长统计")
            return
        }
        
        if Router.isContainerPresented || Container.shared().isBeingPresented {
            Logger.debug("防沉迷页面正在展示，无需统计")
            return
        }
        
        if account.type == .adult {
            Logger.debug("联网版成年用户，无需统计时长")
            return
        }
        
        Logger.debug("联网版防沉迷时长统计开始")
        
        
        //常规计时 定时器
        commonTimer.start(fireOnceWhenStart: isLogin)
        
        //倒计时计时器
        countdownTimer?.start()
        fiftyMinutesCountdownTimer?.start()
    }
    
    /// 暂停时长统计服务
    static func inactivate() {
        commonTimer.suspend()
        countdownTimer?.suspend()
        fiftyMinutesCountdownTimer?.suspend()
    }
    
    private static let commonTimerInterval: Int = 120
    
    // 常规计时 定时器
    static var commonTimer = SwiftTimer(interval: .seconds(commonTimerInterval), repeats: true, queue: .global()) { (aTimer) in
        
        guard let account = AccountManager.currentAccount, let token = account.token else {
            Logger.debug("当前无登录用户，timer 停止")
            aTimer.suspend()
            return
        }
        
        if account.type == .adult {
            Logger.debug("成年用户，无需统计时长，timer 停止")
            aTimer.suspend()
            return
        }
        
        if isFirstLaunch {
            lastLocalTimestamp = Int(Date().timeIntervalSince1970)
            lastServerTimestamp = Networking.getServerTime()
        }
        
        let newLocalTimestamp = lastLocalTimestamp + (isFirstLaunch ? 0 : commonTimerInterval)
        let newServerTimestamp = lastServerTimestamp + (isFirstLaunch ? 0 : commonTimerInterval)
        
        Networking.setPlayLog(token: token,
                              serverTime: (lastServerTimestamp, newServerTimestamp),
                              localTime: (lastLocalTimestamp, newLocalTimestamp),
                              successHandler: { (restrictType, remainTime, title, description) in
                                
                                //更新剩余时间
                                TimeManager.currentRemainTime = remainTime
                                
                                //更新时间戳
                                lastLocalTimestamp = newLocalTimestamp
                                lastServerTimestamp = newServerTimestamp
                                
                                if account.type == .unknown {
                                    //游客
                                    //没时间了
                                    if remainTime <= 0 {
                                        Logger.debug("游客用户，没时间了，弹窗")
                                        Router.closeAlertTip()
                                        AntiAddictionKit.sendCallback(result: .noRemainTime, message: "游客用户游戏时长限制")
                                        Router.openAlertController(AlertData(type: .timeLimitAlert,
                                                  title: title,
                                                  body: Notice.guestLimit.content,
                                                  remainTime: 0),forceOpen: true)
                                        return
                                    }
                                    // 游客剩余时长1分钟倒计时浮窗
                                    if remainTime <= countdownBeginSeconds {
                                        DispatchQueue.main.async {
                                            NotificationCenter.default.post(name: .startSixtySecondsCountdownNotification, object: nil, userInfo: ["isCurfew": false])
                                        }
                                        return
                                    }
                                    // 游客15分钟弹窗
                                    let firstAlertTipRemainTime = AntiAddictionKit.configuration.firstAlertTipRemainTime
                                    if remainTime > firstAlertTipRemainTime && remainTime < firstAlertTipRemainTime + commonTimerInterval {
                                        DispatchQueue.main.async {
                                            NotificationCenter.default.post(name: .startFiftyMinutesCountdownNotification, object: nil, userInfo: ["isCurfew": false, "countdownBeginTime": remainTime])
                                        }
                                        return
                                    }
                                    if remainTime == AntiAddictionKit.configuration.firstAlertTipRemainTime {
                                        Logger.debug("游客15分钟提示")
                                        Router.openAlertTip(.lessThan15Minutes(.guest, isCurfew: false))
                                        return
                                    }
                                }
                                    
                                else if account.type == .adult {
                                    //成年人
                                    Logger.debug("成年用户，无需统计时长，timer 停止")
                                    aTimer.suspend()
                                    return
                                }
                                else {
                                    //剩下即未成年人
                                    if restrictType == 1 {
                                        // 宵禁
                                        // 没时间了
                                        if remainTime <= 0 {
                                            Logger.debug("当前为未成年人宵禁时间，弹窗")
                                            AntiAddictionKit.sendCallback(result: .noRemainTime, message: "未成年人宵禁时间")
                                            Router.closeAlertTip()
                                            Router.openAlertController(AlertData(type: .timeLimitAlert,
                                                                                 title: title,
                                                                                 body: Notice.nightStrictLimit.content,
                                                                                 remainTime: 0))
                                            
                                            return
                                        }
                                         //未成年人距离宵禁倒计时
                                        if remainTime <= countdownBeginSeconds {
                                            DispatchQueue.main.async {
                                                NotificationCenter.default.post(name: .startSixtySecondsCountdownNotification, object: nil, userInfo: ["isCurfew": true])
                                            }
                                            return
                                        }
                                        
                                        //未成年人距离宵禁15分钟浮窗提醒
                                        let firstAlertTipRemainTime = AntiAddictionKit.configuration.firstAlertTipRemainTime
                                        if remainTime > firstAlertTipRemainTime && remainTime < firstAlertTipRemainTime + commonTimerInterval {
                                            DispatchQueue.main.async {
                                                NotificationCenter.default.post(name: .startFiftyMinutesCountdownNotification, object: nil, userInfo: ["isCurfew": true, "countdownBeginTime": remainTime])
                                            }
                                            return
                                        }
                                        if remainTime == AntiAddictionKit.configuration.firstAlertTipRemainTime {
                                            Logger.debug("未成年人距离宵禁15分钟浮窗提醒")
                                            Router.openAlertTip(.lessThan15Minutes(.minor, isCurfew: true))
                                            return
                                        }
                                        
                                    }
                                        
                                    else {
                                        // 非宵禁
                                        // 没时间了
                                        if remainTime <= 0 {
                                            Logger.debug("未成年人每日游戏时间耗尽，弹窗")
                                            AntiAddictionKit.sendCallback(result: .noRemainTime, message: "未成年人每日游戏时长限制")
                                            Router.closeAlertTip()
                                            Router.openAlertController(AlertData(type: .timeLimitAlert,
                                                                                 title: title,
                                                                                 body: Notice.childLimit(isHoliday: DateHelper.isHoliday(Date())).content,
                                                                                 remainTime: 0))
                                            
                                            return
                                        }
                                        // 未成年人游戏剩余时长倒计时启动
                                        if remainTime <= countdownBeginSeconds {
                                            DispatchQueue.main.async {
                                                NotificationCenter.default.post(name: .startSixtySecondsCountdownNotification, object: nil, userInfo: ["isCurfew": false])
                                            }
                                            return
                                        }
                                        
                                        // 未成年人游戏剩余时长15分钟浮窗提醒
                                        let firstAlertTipRemainTime = AntiAddictionKit.configuration.firstAlertTipRemainTime
                                        if remainTime > firstAlertTipRemainTime && remainTime < firstAlertTipRemainTime + commonTimerInterval {
                                            DispatchQueue.main.async {
                                                NotificationCenter.default.post(name: .startFiftyMinutesCountdownNotification, object: nil, userInfo: ["isCurfew": false, "countdownBeginTime": remainTime])
                                            }
                                            return
                                        }
                                        if remainTime == AntiAddictionKit.configuration.firstAlertTipRemainTime {
                                            Logger.debug("未成年人每日游戏时间剩余15分钟提示")
                                            Router.openAlertTip(.lessThan15Minutes(.minor, isCurfew: false))
                                            return
                                        }
                                        
                                    }
                                }
        },failureHandler: {
            //上传服务器失败，也要更新时间戳，以保留本地已统计的时间
            lastLocalTimestamp = newLocalTimestamp
            lastServerTimestamp = newServerTimestamp
        })
        
        
        isFirstLaunch = false
        
        
        #if DEBUG // 给demo发送时间
        postOnlineTimeNotification()
        #endif
        
    }

    // 启动倒计时的时间 (默认2m30s)
    private static var countdownInterval: Int = 1
    private static var countdownBeginSeconds: Int = AntiAddictionKit.configuration.countdownAlertTipRemainTime + commonTimerInterval
    private static var countdownTimer: SwiftCountDownTimer? = nil
    private static var fiftyMinutesCountdownTimer: SwiftCountDownTimer? = nil
    
    // 倒计时浮窗
    static func startCountdown(isCurfew: Bool) {
        //停止主要Timer
        commonTimer.suspend()
        
        //设置并执行倒计时Timer任务
        countdownTimer = SwiftCountDownTimer(interval: .seconds(countdownInterval), times: TimeManager.currentRemainTime, queue: .global()) { (cTimer, costTimes, leftTimes) in
            
            Logger.debug("准备60s浮窗的倒计时任务 执行一次")
            
            //减少时间
            TimeManager.currentRemainTime -= 1
            
            #if DEBUG // 给demo发送时间
            postOnlineTimeNotification()
            #endif
            
            /// 方便结束的那一次同步标记
            var isTimeSynchronized: Bool = false
            
            if leftTimes > 0 && leftTimes <= 60 {
                guard let account = AccountManager.currentAccount, let token = account.token else { return }
                if leftTimes == 60 {
                    let newServerTimestamp = lastServerTimestamp + costTimes
                    let newLocalTimestamp = lastLocalTimestamp + costTimes
                    Networking.setPlayLog(token: token,
                                          serverTime: (lastServerTimestamp, newServerTimestamp),
                                          localTime: (lastLocalTimestamp, newLocalTimestamp), successHandler: {
                                            (_, _, _, _) in
                                            //更新时间戳
                                            lastLocalTimestamp = newLocalTimestamp
                                            lastServerTimestamp = newServerTimestamp
                    }, failureHandler: {
                        //更新时间戳
                        lastLocalTimestamp = newLocalTimestamp
                        lastServerTimestamp = newServerTimestamp
                    })
                    
                    isTimeSynchronized = true
                }
                
                if account.type == .unknown {
                    Logger.debug("游客倒计时提示")
                    Router.openAlertTip(.lessThan60seconds(.guest, leftTimes))
                    return
                }
                else if account.type == .adult {
                    countdownTimer?.suspend()
                } else {
                    Logger.debug("未成年倒计时提示")
                    Router.openAlertTip(.lessThan60seconds(.minor, leftTimes, isCurfew: isCurfew))
                    return
                }
                
            }
            
            if leftTimes == 0 {
                guard let account = AccountManager.currentAccount, let token = account.token else { return }
                let LastSyncInterval: Int = isTimeSynchronized ? 60 : costTimes
                let newServerTimestamp = lastServerTimestamp + LastSyncInterval
                let newLocalTimestamp = lastLocalTimestamp + LastSyncInterval
                Networking.setPlayLog(token: token,
                                      serverTime: (lastServerTimestamp, newServerTimestamp),
                                      localTime: (lastLocalTimestamp, newLocalTimestamp), successHandler: {
                                        (_, _, _, _) in
                                        //更新时间戳
                                        lastLocalTimestamp = newLocalTimestamp
                                        lastServerTimestamp = newServerTimestamp
                }, failureHandler: {
                    //更新时间戳
                    lastLocalTimestamp = newLocalTimestamp
                    lastServerTimestamp = newServerTimestamp
                })
                
                if account.type == .unknown {
                    Logger.debug("游客时间结束弹窗")
                    AntiAddictionKit.sendCallback(result: .noRemainTime, message: "游客每日游戏时长限制")
                    Router.closeAlertTip()
                    Router.openAlertController(AlertData(type: .timeLimitAlert,
                              title: Notice.title,
                              body: Notice.guestLimit.content,
                              remainTime: 0),
                    forceOpen: true)
                    return
                }
                else if account.type == .adult {
                    countdownTimer?.suspend()
                } else {
                    Logger.debug("未成年结束弹窗")
                    AntiAddictionKit.sendCallback(result: .noRemainTime, message: "未成年每日游戏时长限制")
                    Router.closeAlertTip()
                    let body: String = isCurfew ? Notice.nightStrictLimit.content : Notice.childLimit(isHoliday: DateHelper.isHoliday(Date())).content
                    Router.openAlertController(AlertData(type: .timeLimitAlert,
                                                         title: Notice.title,
                                                         body: body,
                                                         remainTime: 0),
                    forceOpen: true)
                    return
                }
                
            }
            
            
        }
        
        //开始执行
        countdownTimer?.start()
    }

    // 15分钟倒计时浮窗，在大于15分钟的时候开始倒计时，等于15分钟时显示一次
    static func startFiftyMinutesCountdown(isCurfew: Bool, countdownBeginTime: Int) {
        assert(countdownBeginTime >= AntiAddictionKit.configuration.firstAlertTipRemainTime, "开始倒计时的时间必须大于等于需要首次展示浮窗的时间")
        Logger.debug("开始15分钟提示的倒计时")
        fiftyMinutesCountdownTimer = SwiftCountDownTimer(interval: .seconds(countdownInterval), times: countdownBeginTime, queue: .global()) { (fTimer, costTimes, leftTimes) in
            if leftTimes == AntiAddictionKit.configuration.firstAlertTipRemainTime {
                
                guard let account = AccountManager.currentAccount else {
                    fTimer.suspend()
                    return
                }
                
                if account.type == .unknown {
                    Logger.debug("游客15分钟提示")
                    Router.openAlertTip(.lessThan15Minutes(.guest))
                    fTimer.suspend()
                    return
                }
                else if account.type == .adult {
                    fTimer.suspend()
                    return
                } else {
                    Logger.debug("未成年15分钟提示")
                    Router.openAlertTip(.lessThan15Minutes(.minor, isCurfew: isCurfew))
                    fTimer.suspend()
                    return
                }
                
            }
        }
        
        fiftyMinutesCountdownTimer?.start()
    }
}

