
import Foundation

internal let testToken = "ses0wchv9t66Nk0EO2/bb7YIYhTSui+NMBdWFeMQVLTGF7kUK67BmB+Z9o/gcI6ZxbJxjdlTq5WCkrqOybpxGPn8+cngA0TTHoNYmBlRiRemgwpb+b0gujP+qfnSKzguQGxSA/lPKRkp9PXXhS8vKJWb51StYiSN3Q91xTtFHmcx/dMoBf8SUrTyJeADi9/BxhlqCivZJeZAlcNM3/IYqBSym7XvprNOnrCrnc/3hmM+C+GQQUEBwfJxq314ufzMRrtFa5t2NKZMpbc5IYmR7Pn8NBrx1vpAm0ZFLIGzjYM+cm9+zrRXk9i6d+JnfZcBkZ9Ck7/H3iHbIpf/feAlfw=="

/// AAKit 回调协议，回调接收方需遵循此协议。
@objc
public protocol AntiAddictionCallback: class {
    
    /// AAKit 回调方法
    /// - Parameters:
    ///   - code: 回调状态码
    ///   - message: 回调信息
    @objc func onAntiAddictionResult(_ code: Int, _ message: String)
}

@objcMembers
@objc(AntiAddictionKit)
public final class AntiAddictionKit: NSObject {
    
    // MARK: - Public
    
    /// AAKit 配置
    public static var configuration: Configuration = Configuration()
    
    /// AAKit 配置方法
    /// - Parameters:
    ///   - useSdkRealName: 实名登记开关，默认值为 true
    ///   - useSdkPaymentLimit: 支付限制开关，默认值为 true
    ///   - useSdkOnlineTimeLimit: 在线时长限制开关，默认值为 true
    public class func setFunctionConfig(_ useSdkRealName: Bool = true, _ useSdkPaymentLimit: Bool = true, _ useSdkOnlineTimeLimit: Bool = true) {
        configuration.useSdkOnlineTimeLimit = useSdkOnlineTimeLimit
        configuration.useSdkRealName = useSdkRealName
        configuration.useSdkPaymentLimit = useSdkPaymentLimit
    }
    
    
    /// 设置服务器地址，如果地址正确，则计时、实名、付费通过服务器统计；如果地址设置有误，则防沉迷都会失效。不设置，则默认开启本地防沉迷机制。
    /// - Parameter host: 服务器根地址，例如 `https://gameapi.com`
    public class func setHost(_ host: String) {
        AntiAddictionKit.configuration.host = host
        
        Logger.info("服务器Host已设置: \(host)")
    }
    
    /// AAKit 初始化方法
    /// - Parameter delegate: 接受回调的对象
    public class func `init`(_ delegate: AntiAddictionCallback) {
        
        if (AntiAddictionKit.sharedDelegate != nil) {
            Logger.info("请勿重复初始化！")
        } else {
            
            /// 只会在游戏安装后首次初始化时检测一次用户地区，之后按第一次检测的值判定用户地区，除非删包
            if !RegionDetector.isDetected {
                RegionDetector.detect()
            }
            
            AntiAddictionKit.sharedDelegate = delegate
            AntiAddictionKit.addNotificationListener()
            
            // 如果Host已设置，则获取服务端配置
            /*
            if isServerEnabled {
                Networking.getSdkConfig()
            }
            */
            
            Logger.info("初始化成功！")
        }
        
        // 如果非大陆用户，关闭所有防沉迷措施
        if !RegionDetector.isMainlandUser {
            AntiAddictionKit.configuration.useSdkPaymentLimit = false
            AntiAddictionKit.configuration.useSdkOnlineTimeLimit = false
            AntiAddictionKit.configuration.useSdkRealName = false
        }
    }
    
    /// 登录用户
    /// - Parameters:
    ///   - userId: 用户 id，不能为空
    ///   - userType: 用户类型
    public class func login(_ userId: String, _ userType: Int) {
        if !self.isKitInstalled() { return }
        
        // 如果Host已设置，则使用在线方式获取token
        if isServerEnabled {
            LoginManager.login(user: userId, type: userType)
        } else {
            let user = User(id: userId, type: UserType.typeByRawValue(userType))
            UserService.login(user)
        }
        
    }
    
    /// 更新当前用户信息
    /// - Parameters:
    ///   - userType: 用户类型
    public class func updateUserType( _ userType: Int) {
        if !self.isKitInstalled() { return }
        
        if isServerEnabled {
            AccountManager.updateAccountType(type: userType)
        } else {
            UserService.updateUserType(UserType.typeByRawValue(userType))
        }
    }
    
    /// 退出用户登录
    public class func logout() {
        if !self.isKitInstalled() { return }
        
        if isServerEnabled {
            LoginManager.logout()
        } else {
            UserService.logout()
        }
    }
    
    
    /// 获取用户类型
    /// - Parameter userId: 用户 id
    public class func getUserType(_ userId: String) -> Int {
        if !self.isKitInstalled() { return -1 }
        
        if isServerEnabled {
            return AccountManager.getAccountType(id: userId).rawValue
        } else {
            return UserService.getUserType(userId)
        }
    }
    
    /// 查询能否支付，直接返回支付限制相关回调类型 raw value，特殊情况使用
    /// - Parameter amount: 支付金额，单位分
    public class func checkCurrentPayLimit(_ amount: Int) -> Int {
        if isServerEnabled {
            return PaymentManager.checkCurrentPayLimit(amount)
        } else {
            return PayService.checkCurrentPayLimit(amount)
        }
    }
    
    /// 查询能否支付
    /// - Parameter amount: 支付金额，单位分
    public class func checkPayLimit(_ amount: Int) {
        if !self.isKitInstalled() { return }
        
        if isServerEnabled {
            PaymentManager.check(amount: amount)
        } else {
            PayService.canPurchase(amount)
        }
    }
    
    /// 设置已支付金额
    /// - Parameter amount: 支付金额，单位分
    public class func paySuccess(_ amount: Int) {
        if !self.isKitInstalled() { return }
        
        if isServerEnabled {
            PaymentManager.submit(amount: amount)
        } else {
            PayService.didPurchase(amount)
        }
    }
    
    /// 查询当前用户能否聊天
    public class func checkChatLimit() {
        if !self.isKitInstalled() { return }
        
        if isServerEnabled {
            ChatManager.check()
        } else {
            ChatService.checkChatLimit()
        }
    }
    
    /// 打开实名窗口，实名结果通过回调接受
    public class func openRealName() {
        if !self.isKitInstalled() { return }
        
        RealNameService.openRealname()
    }
    
    // Warning: - DEBUG 模式
    /// 生成身份证兑换码（有效期从生成起6个小时整以内）
    #if DEBUG
    public class func generateIDCode() -> String {
        return AAKitIDNumberGenerator.generate()
    }
    #endif
    
    
    // MARK: - Private
    
    //禁用初始化方法
    @available(*, unavailable)
    private override init() {
        fatalError("Class `AntiAddictionKit` init method is unavailable!")
    }
    
}
