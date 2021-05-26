
import Foundation

/// AAKit 功能配置
@objcMembers
@objc(Configuration)
public final class Configuration: NSObject {
    
    /// 联网服务器地址，默认值为 nil，仅通过 `setHost()`来设置
    internal var host: String? = nil
    
    /// AAKit 实名登记开关，默认值为 true
    public var useSdkRealName: Bool = true
    
    /// AAKit 在线时长限制开关，默认值为 true
    public var useSdkOnlineTimeLimit: Bool = true
    
    /// AAKit 支付限制开关，默认值为 true
    public var useSdkPaymentLimit: Bool = true
    
    /// AAKit 切换账号按钮是否显示
    public var showSwitchAccountButton: Bool = true
    
    /// 未成年人非节假日每日总时长 单位秒
    public var minorCommonDayTotalTime: Int = 90 * 60
    
    /// 未成年人节假日每日总时长 单位秒
    public var minorHolidayTotalTime: Int = 180 * 60
    
    /// 游客每日总时长（无节假日区分）单位秒
    public var guestTotalTime: Int = 60 * 60
    
    /// 第一次提醒剩余游戏时间时的剩余时长 单位秒
    public var firstAlertTipRemainTime: Int = 15 * 60
    
    /// 展示倒计时浮窗时的剩余时长 单位秒
    public var countdownAlertTipRemainTime: Int = 60
    
    /// 宵禁开始时间（整数，小时，24小时进制，默认22）
    public var curfewHourStart: Int = 22 {
        didSet {
            nightStrictStart = "\(curfewHourStart):00"
        }
    }
    
    /// 宵禁结束时间（整数，小时，24小时进制，默认8）
    public var curfewHourEnd: Int = 8 {
        didSet {
            nightStrictEnd = DateHelper.formatCurfewHourToHHmm(curfewHourEnd)
        }
    }
    
    /// 宵禁开始时间（字符串，格式为`小时:分钟`，24小时进制，默认`22:00`）方便配置具体到分钟
    public var nightStrictStart: String = "22:00"
    
    /// 宵禁结束时间（整数，格式为`小时:分钟`，24小时进制，默认8）方便配置具体到分钟
    public var nightStrictEnd: String = "8:00"
    
    /// 8-15岁单笔付费额度限制，单位分（默认5000分）
    public var singlePaymentAmountLimitJunior: Int = 50 * 100
    
    /// 8-15岁每月总付费额度限制，单位分（默认20000分）
    public var mouthTotalPaymentAmountLimitJunior: Int = 200 * 100
    
    /// 16-17岁单笔付费额度限制，单位分（默认10000分）
    public var singlePaymentAmountLimitSenior: Int = 100 * 100
    
    /// 16-17岁每月总付费额度限制，单位分（默认40000分）
    public var mouthTotalPaymentAmountLimitSenior: Int = 400 * 100
    
    //外部禁用初始化方法
    internal override init() {
        super.init()
    }
    
}

