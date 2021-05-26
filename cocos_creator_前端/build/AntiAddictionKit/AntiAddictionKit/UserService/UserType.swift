
import Foundation

enum UserType: Int, Codable {
    case unknown = 0 // 未知（未实名）
    case child = 1 // 0-7岁
    case junior = 2 // 8-15岁
    case senior = 3  // 16-17岁
    case adult = 4// 18岁+
    
    static func typeByAge(_ age: Int) -> UserType {
        switch age {
        case 0...7: return .child
        case 8...15: return .junior
        case 16...17: return .senior
        case 18...Int.max: return .adult
        default: return .unknown
        }
    }
    
    static func typeByRawValue(_ rawValue: Int) -> UserType {
        switch rawValue {
        case UserType.unknown.rawValue: return UserType.unknown
        case UserType.child.rawValue: return UserType.child
        case UserType.junior.rawValue: return UserType.junior
        case UserType.senior.rawValue: return UserType.senior
        case UserType.adult.rawValue: return UserType.adult
        default: return UserType.unknown
        }
    }
}

extension User {
    
    private static var privateShared: User? = nil
    
    static var shared: User? {
        get {
            return privateShared
        }
        set(new) {
            privateShared = new
        }
    }
    
}

extension User {
    
    /// 传入一个相同 id 的 user 以更新自身状态
    /// - Parameter new: new.id == self.id
    mutating func update(with new: User) {
        //如果id不同，无法更新
        if (new.id != self.id) {
            return
        }
        
        self.updateUserType(new.type)
    }
    
    mutating func updateUserType(_ type: UserType) {
        if (type == .unknown && self.type != .unknown && AntiAddictionKit.configuration.useSdkRealName) {
            return
        }
        
        if (type == self.type) {
            return
        }
        
        self.resetUserInfoButId()
        
        self.type = type
    }
    
    mutating func updateUserRealName(name: Data?, idCardNumber: Data?, phone: Data?) {
        self.realName = name
        self.idCardNumber = idCardNumber
        self.phone = phone
    }
     
    mutating func resetOnlineTime(_ time: Int) {
        self.totalOnlineTime = time
    }
    
    mutating func onlineTimeIncrease(_ addition: Int) {
        self.totalOnlineTime += addition
        
        UserService.store(self)
    }
    
    mutating func clearOnlineTime() {
        self.totalOnlineTime = 0
    }
    
    mutating func paymentIncrease(_ addition: Int) {
        self.totalPaymentAmount += addition
    }
    
    mutating func clearPaymentAmount() {
        self.totalPaymentAmount = 0
    }
    
    mutating func updateTimestamp() {
        self.timestamp = Date()
    }
    
    mutating private func resetUserInfoButId() {
        self.type = .unknown
        self.age = -1
        self.idCardNumber = nil
        self.realName = nil
        self.phone = nil
        self.totalOnlineTime = 0
        self.totalPaymentAmount = 0
        self.timestamp = Date()
    }
}


extension User {
    init() {
        self.id = ""
        self.type = .unknown

        self.age = -1

        self.idCardNumber = nil
        self.realName = nil
        self.phone = nil

        self.totalOnlineTime = 0
        self.totalPaymentAmount = 0

        self.timestamp = Date()
    }
    
    init(id: String, type: UserType = .unknown) {
        self.init()
        
        self.id = id
        self.type = type
    }
    
//    init(id: String, type: UserType, age: Int, idCardNumber: String, realName: String, phone: String, totalPlayDuration: Int, totalPaymentAmount: Int, timestamp: Date) {
//        self.init()
//
//        self.id = id
//        self.type = type
//
//        self.age = age
//
//        self.idCardNumber = idCardNumber
//        self.realName = realName
//        self.phone = phone
//
//        self.totalPlayDuration = 0
//        self.totalPaymentAmount = 0
//
//        self.timestamp = timestamp
//    }
}
