
import Foundation

struct NoticeTemplate {
    
    static var guestFirstLogin = "您当前未提交实名信息，根据国家相关规定，享有#分钟#游戏体验时间。登记实名信息后可深度体验。"
    
    static var guestRemain = "您的游戏体验时间还剩余#分钟#，登记实名信息后可深度体验。"
    
    static var guestLimit = "您的游戏体验时长已达#分钟#。登记实名信息后可深度体验。"
    
    static var childRemain = "您今日游戏时间还剩余#分钟#，请注意适当休息。"
    
    static var childLimit = "您今日游戏时间已达#分钟#。根据国家相关规定，今日无法再进行游戏。请注意适当休息。"
    
    static var nightStrictRemain = "距离健康保护时间还剩余#分钟#，请注意适当休息。"
    
    static var nightStrictLimit = "根据国家相关规定，每日 22 点 - 次日 8 点为健康保护时段，当前无法进入游戏。"
    
    
    static var formattedCurfewDescription: String {
        
        return "根据国家相关规定，每日 22 点 - 次日 8 点为健康保护时段，当前无法进入游戏。"
    }
    
    static func formattedDescription(_ description: String, with remainTime: Int) -> String {
        
        return description
    }
    
}

enum Notice {
    case guestFirstLogin
    case guestRemain(remainTime: Int)
    case guestLimit
    case childRemain(remainTime: Int)
    case childLimit(isHoliday: Bool)
    case nightStrictRemain(remainTime: Int)
    case nightStrictLimit
    
    static var title: String {
        return "健康游戏提示"
    }
    
    var content: String {
        switch self {
        case .guestFirstLogin:
            return NoticeTemplate.guestFirstLogin.formattedNotice(with: AntiAddictionKit.configuration.guestTotalTime)
        case .guestRemain(let remainTime):
            return NoticeTemplate.guestRemain.formattedNotice(with: remainTime)
        case .guestLimit:
            return NoticeTemplate.guestLimit.formattedNotice(with: AntiAddictionKit.configuration.guestTotalTime)
        case .childRemain(let remainTime):
            return NoticeTemplate.childRemain.formattedNotice(with: remainTime)
        case .childLimit(let isHoliday):
            if isHoliday {
                return NoticeTemplate.childLimit.formattedNotice(with: AntiAddictionKit.configuration.minorHolidayTotalTime)
            } else {
                return NoticeTemplate.childLimit.formattedNotice(with: AntiAddictionKit.configuration.minorCommonDayTotalTime)
            }
        case .nightStrictRemain(let remainTime):
            return NoticeTemplate.nightStrictRemain.formattedNotice(with: remainTime)
        case .nightStrictLimit:
            return NoticeTemplate.nightStrictLimit.formattedCurfewNotice()
        }
    }
    
}

extension String {
    fileprivate func formattedNotice(with seconds: Int) -> String {
        let minute: Int = Int(ceilf(Float(seconds)/Float(60)))
        let minuteString = " \(minute) 分钟"
        return self.replacingOccurrences(of: "#分钟#", with: minuteString)
    }
    
    fileprivate func formattedCurfewNotice() -> String {
        let curfewStart = AntiAddictionKit.configuration.nightStrictStart
        let curfewEnd = AntiAddictionKit.configuration.nightStrictEnd
        return "根据国家相关规定，每日 \(curfewStart) - 次日 \(curfewEnd) 为健康保护时段，当前无法进入游戏。"
    }
}


