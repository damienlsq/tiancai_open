
import Foundation

final class UserService {
    
    /// 游戏主动登录用户
    /// - Parameter user: user 实例
    class func login(_ user: User) {
        sdkLogin(user)
    }
    
    /// 游戏主动退出用户
    class func logout() {
        sdkLogout()
    }
    
    /// 游戏主动更新用户
    class func updateUserType(_ type: UserType) {
        guard let _ = User.shared else { return }
        
        Router.closeAlertTip()
        Router.closeContainer()
        
        User.shared!.updateUserType(type)
        
        TimeService.start()
    }
    
    
    /// 获取用户类型
    /// - Parameter userId: 用户 id
    class func getUserType(_ userId: String) -> Int {
        guard let user = UserService.fetch(userId) else {
            return -1
        }
        
        return user.type.rawValue
    }
    
}

extension UserService {
    
    /// SDK 登出用户
    class func sdkLogout() {
        //停止计时器相关（同时会保存当前用户信息）
        TimeService.stop()
        
        //关掉所有页面
        Router.closeContainer()
        Router.closeAlertTip()
        
        // 清除当前用户信息
        User.shared = nil
        
        // 清除用户主动点击关闭浮窗后记录的浮窗显示逻辑
        AlertTip.userTappedToDismiss = false
    }
    
    private class func sdkLogin(_ user: User) {
        
        // 先清除所有弹窗，清除当前用户信息
        sdkLogout()
        
        // 尝试从硬盘中取出用户
        var isFirstLogin = false
        var theUser: User = user
        if var storedUser = UserService.fetch(theUser.id) {
            isFirstLogin = false
            storedUser.updateUserType(theUser.type)
            theUser = storedUser
        } else {
            isFirstLogin = true
        }
        
        // 更新当前用户
        User.shared = theUser
        
        // 非大陆用户，不开启防沉迷系统
        if !RegionDetector.isMainlandUser {
            Logger.info("非大陆地区不开启防沉迷")
            AntiAddictionKit.sendCallback(result: .loginSuccess, message: "用户登录成功")
            return
        }
        
        // 如果在线时长控制未开启，则直接登录成功
        if !AntiAddictionKit.configuration.useSdkOnlineTimeLimit {
            AntiAddictionKit.sendCallback(result: .loginSuccess, message: "用户登录成功")
            return
        }
        
        //如果最后一次存储的日期 与 现在不是同一天，则清空在线时长
        if DateHelper.isSameDay(theUser.timestamp, Date()) == false {
            // 如果不是游客，才清空，游客同一设备时长固定，不刷新
            if theUser.type != .unknown {
                theUser.clearOnlineTime()
            }
        }
        
        //如果最后一次存储的日期 与 现在不是同一月，则清空支付金额
        if DateHelper.isSameMonth(theUser.timestamp, Date()) == false {
            theUser.clearPaymentAmount()
        }
        
        //用户时长限制类型 游客 未成年人 成年人
        let limitLevel = TimeLimitLevel.limitLevelForUser(theUser)
        
        //成年人 直接登录成功
        if limitLevel == .unlimited  {
            AntiAddictionKit.sendCallback(result: .loginSuccess, message: "用户登录成功")
            return
        }
        
        //如果是游客，弹出时间提示，游客不区分节假日
        if limitLevel == .guest {
            let guestTotalTime: Int = AntiAddictionKit.configuration.guestTotalTime
            let remainSeconds: Int = guestTotalTime - theUser.totalOnlineTime
            
            assert(guestTotalTime >= 0, "游客设定总时长不能为负数！！！")
            assert(remainSeconds >= 0, "用户剩余时间不能为负数！！！")
            
            var content: AlertType.TimeLimitAlertContent
            
            if (remainSeconds <= 0) {
                //没有时间
                User.shared!.resetOnlineTime(guestTotalTime)
                let minutes = guestTotalTime / kSecondsPerMinute
                content = AlertType.TimeLimitAlertContent.guestGameOver(minutes: minutes)
            } else {
                let minutes = Int(ceilf(Float(remainSeconds) / Float(kSecondsPerMinute)))
                content = AlertType.TimeLimitAlertContent.guestLogin(minutes: minutes, isFirstLogin: isFirstLogin)
            }

            Router.openAlertController(AlertData(type: .timeLimitAlert,
                                                 title: content.title,
                                                 body: content.body,
                                                 remainTime: remainSeconds))
            
            return
        }
        
        //未成年人
        if limitLevel == .minor {
            
            //如果是宵禁，无法进入游戏，给游戏发送无游戏时间通知
            if DateHelper.isCurfew(Date()) {
                //宵禁无法进入
                AntiAddictionKit.sendCallback(result: .noRemainTime, message: "宵禁时间，无法进入游戏！")
                
                let content = AlertType.TimeLimitAlertContent.minorGameOver(isCurfew: true)
                Router.openAlertController(AlertData(type: .timeLimitAlert,
                                                     title: content.title,
                                                     body: content.body,
                                                     remainTime: 0))
                
                return
            }
            
            //登录时如果没有剩余时长则弹窗
            let isHoliday = DateHelper.isHoliday(Date())
            let minorTotalTime: Int = isHoliday ? AntiAddictionKit.configuration.minorHolidayTotalTime : AntiAddictionKit.configuration.minorCommonDayTotalTime
            let remainSeconds: Int = minorTotalTime - theUser.totalOnlineTime
            
            assert(minorTotalTime >= 0, "未成年人设定总时长不能为负数！！！")
            assert(remainSeconds >= 0, "用户剩余时间不能为负数！！！")
            
            if remainSeconds <= 0 {
                let minutes: Int = minorTotalTime / kSecondsPerMinute
                let content = AlertType.TimeLimitAlertContent.minorGameOver(minutes: minutes, isCurfew: false)
                Router.openAlertController(AlertData(type: .timeLimitAlert,
                                                     title: content.title,
                                                     body: content.body,
                                                     remainTime: 0))
                
                return
            }
            
            //如果有剩余时间，未成年人登录时不弹窗，直接登录开始计时
            AntiAddictionKit.sendCallback(result: .loginSuccess, message: "用户登录成功")
            TimeService.start()
            return
        }
        
    }
}

extension UserService {
    
    class func fetch(_ uid: String) -> User? {
        let key = Key<User>(uid)
        return Defaults.shared.get(for: key)
    }
    
    class func store(_ user: User) {
        var aUser = user
        aUser.timestamp = Date()
        let key = Key<User>(aUser.id)
        Defaults.shared.set(aUser, for: key)
    }
    
    class func delete(_ user: User) {
        let key = Key<User>(user.id)
        Defaults.shared.clear(key)
    }
    
    class func delete(_ id: String) {
        let key = Key<User>(id)
        Defaults.shared.clear(key)
    }
    
}

extension UserService {
    class func saveCurrentUserInfo() {
        guard let user = User.shared else { return }
        self.store(user)
    }
}
