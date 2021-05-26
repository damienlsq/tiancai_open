
import Foundation

// 网络版 付费管理
struct PaymentManager {
    
    static func check(amount: Int) {
        
        // 非大陆用户，不开启防沉迷系统
        if !RegionDetector.isMainlandUser {
            AntiAddictionKit.sendCallback(result: .noPayLimit, message: "无支付限制")
            return
        }
        
        //如果未开启 付费限制，直接发送无限制回调
        if AntiAddictionKit.configuration.useSdkPaymentLimit == false {
            AntiAddictionKit.sendCallback(result: .noPayLimit, message: "无支付限制")
            return
        }
        
        if let account = AccountManager.currentAccount, let token = account.token {
            Networking.checkPayment(token: token, amount: amount) { (allow, title, description) in
                if allow {
                    AntiAddictionKit.sendCallback(result: .noPayLimit, message: "无支付限制")
                    return
                } else {
                    if account.type == AccountType.unknown {
                        Router.openRealNameController(backButtonEnabled: false, forceOpen: true, cancelled: {
                            //用户取消实名登记
                            AntiAddictionKit.sendCallback(result: .hasPayLimit, message: "用户取消实名登记，无法支付")
                        }) {
                            //用户实名登记成功，重新查询支付限制
                            self.check(amount: amount)
                        }
                        
                    } else {
                        let alertData = AlertData(type: .payLimitAlert, title: title, body: description)
                        Router.openAlertController(alertData)
                    }
                }
            }
        } else {
            AntiAddictionKit.sendCallback(result: .noPayLimit, message: "无支付限制")
        }
        
    }
    
    static func submit(amount: Int) {
        if let account = AccountManager.currentAccount, let token = account.token {
            Networking.setPayment(token: token, amount: amount)
        }
        Logger.debug("联网版无token，无法提交付费金额。")
    }
    
}

extension PaymentManager {
    
    /// 查询能否购买道具，直接返回支付限制相关的回调类型 raw value, 特殊情况使用。
    /// - Parameter price: 道具价格
    public static func checkCurrentPayLimit(_ amount: Int) -> Int {
        
        // 非大陆用户，不开启防沉迷系统
        if !RegionDetector.isMainlandUser {
            return AntiAddictionResult.noPayLimit.intValue()
        }
        
        //如果未开启 付费限制，直接发送无限制回调
        if AntiAddictionKit.configuration.useSdkPaymentLimit == false {
            return AntiAddictionResult.noPayLimit.intValue()
        }
        
        if let account = AccountManager.currentAccount, let token = account.token {
            
            var limitIntValue: Int = AntiAddictionResult.noPayLimit.intValue()
            
            Networking.checkPayment(token: token, amount: amount) { (allow, title, description) in
                if allow {
                    limitIntValue = AntiAddictionResult.noPayLimit.intValue()
                } else {
                    if account.type == AccountType.unknown {
                        Router.openRealNameController(backButtonEnabled: false, forceOpen: true, cancelled: {
                            
                            limitIntValue = AntiAddictionResult.hasPayLimit.intValue()
                            
                        }) {
                            //用户实名登记成功，重新查询支付限制
                            self.check(amount: amount)
                        }
                        
                    } else {
                        limitIntValue = AntiAddictionResult.hasPayLimit.intValue()
                        let alertData = AlertData(type: .payLimitAlert, title: title, body: description)
                        Router.openAlertController(alertData)
                    }
                }
            }
            
            return limitIntValue
            
        } else {
            return AntiAddictionResult.hasPayLimit.intValue()
        }
        
    }

    
}
