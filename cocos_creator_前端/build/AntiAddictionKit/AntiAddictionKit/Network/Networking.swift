
import Foundation

/// 联网版 API Manager
struct Networking {
    
    
    // MARK: - Debug messages
    private static let networkRequestError: String = "网络请求失败"
    private static let dataFormatError: String = "接口数据解析失败"
    private static let networkRequestSuccess: String = "网络服务请求成功"
    
    // MARK: - API URLs
    private static var baseUrl: String = AntiAddictionKit.configuration.host ?? ""
    
    private static let configUrl = "/v1/fcm/get_config" // GET
    private static let tokenUrl = "/v1/fcm/authorizations" // POST
    private static let serverTimeUrl = "/v1/fcm/get_server_time" // GET
    private static let setPlayLogUrl = "/v1/fcm/set_play_log" // POST
    private static let setUserInfoUrl = "/v1/fcm/real_user_info" // POST
    private static let checkPaymentUrl = "/v1/fcm/check_pay" // POST
    private static let setPaymentUrl = "/v1/fcm/submit_pay" // POST
    
    /// 字典数组Array<Dictionary>序列化成JSON字符串
    private static func dictionaryArrayToJSONString(_ array: [[String: Any]]?) -> String {
        var jsonString: String = ""
        if let tryArray = array {
//            do {
//                try tryArray.forEach({ (userInfo) in
//                    let jsonData = try JSONSerialization.data(withJSONObject: userInfo, options: [])
//                    jsonString.append(String(data: jsonData, encoding: .utf8) ?? "")
//                })
//            } catch {}
            do {
                let jsonData = try JSONSerialization.data(withJSONObject: tryArray, options: [])
                jsonString = String(data: jsonData, encoding: .utf8) ?? ""
            }
            catch { jsonString = "[]" }
        } else {
            jsonString = "[]"
        }
        return jsonString
    }
    
    /// 字典Dictionary序列化成JSON字符串
    private static func dictionaryToJSONString(_ dictionary: [String: Any]?) -> String {
        var jsonString: String = ""
        if let tryDictionary = dictionary {
            do {
                let jsonData = try JSONSerialization.data(withJSONObject: tryDictionary, options: [])
                jsonString = String(data: jsonData, encoding: .utf8) ?? ""
            } catch {}
        }
        return jsonString
    }
    
    /// 获取防沉迷相关配置
    static func getSdkConfig() {
        let r = Just.get(baseUrl+configUrl)
        guard let data = r.content, let httpCode = r.statusCode, httpCode == Int(200) else {
            Logger.debug(baseUrl+configUrl+networkRequestError)
            return
        }
        do {
            let json = try JSON(data: data)
            // 防沉迷配置
            if let code = json["code"].int, code == Int(200),
                let nightStrictStart = json["data", "config", "nightStrictStart"].string,
                let nightStrictEnd = json["data", "config", "nightStrictEnd"].string,
                let childCommonTime = json["data", "config", "childCommonTime"].int,
                let childHolidayTime = json["data", "config", "childHolidayTime"].int {
                AntiAddictionKit.configuration.nightStrictStart = nightStrictStart
                AntiAddictionKit.configuration.nightStrictEnd = nightStrictEnd
                AntiAddictionKit.configuration.minorCommonDayTotalTime = childCommonTime
                AntiAddictionKit.configuration.minorHolidayTotalTime = childHolidayTime
                Logger.debug(baseUrl+configUrl+networkRequestSuccess)
                return
            }
            
            //获取文案
            if let code = json["code"].int, code == Int(200),
                let guestFirstLogin = json["data", "description", "unIdentifyFirstLogin"].string,
                let guestRemain = json["data", "description", "unIdentifyRemain"].string,
                let guestLimit = json["data", "description", "unIdentifyLimit"].string,
                let childRemain = json["data", "description", "identifyRemain"].string,
                let childLimit = json["data", "description", "identifyLimit"].string,
                let nightStrictRemain = json["data", "description", "nightStrictRemain"].string,
                let nightStrictLimit = json["data", "description", "nightStrictLimit"].string {
                NoticeTemplate.guestFirstLogin = guestFirstLogin
                NoticeTemplate.guestRemain = guestRemain
                NoticeTemplate.guestLimit = guestLimit
                NoticeTemplate.childRemain = childRemain
                NoticeTemplate.childLimit = childLimit
                NoticeTemplate.nightStrictRemain = nightStrictRemain
                NoticeTemplate.nightStrictLimit = nightStrictLimit
                return
            }
            
        } catch {}
        
        Logger.debug(baseUrl+configUrl+dataFormatError)
    }
    
    /// 获取服务器用户 token
    static func authorize(token: String,
                          accountType: Int = 0,
                          allLocalUserInfo: [[String: Any]] = [],
                          suceessHandler: ((_ accessToken: String, _ accountType: AccountType) -> Void)? = nil,
                          failureHandler: (() -> Void)? = nil) {
        let form: [String: Any] = ["token": token,
                                   "accountType": accountType,
                                   "local_user_info": dictionaryArrayToJSONString(allLocalUserInfo)]
        let r = Just.post(baseUrl+tokenUrl, data: form)
        
        guard let data = r.content, let httpCode = r.statusCode, httpCode == Int(200) else {
            
            Logger.debug(baseUrl+tokenUrl+networkRequestError)
            failureHandler?()
            return
        }
        do {
            let json = try JSON(data: data)
            if let code = json["code"].int, code == Int(200),
                let token = json["data", "access_token"].string,
                let type = json["data", "accountType"].int {
                
                Logger.debug(baseUrl+tokenUrl+networkRequestSuccess)
                suceessHandler?(token, AccountType.type(rawValue: type))
                return
            }
        } catch {}
        
        Logger.debug(baseUrl+tokenUrl+dataFormatError)
        failureHandler?()
        return
    }
    
    /// 获取服务器时间戳
    static func getServerTime() -> Int {
        let timestamp: Int = lround(Date().timeIntervalSince1970)
        
        let r = Just.get(baseUrl+serverTimeUrl)
        
        guard let data = r.content, let httpCode = r.statusCode, httpCode == Int(200) else {
            Logger.debug(baseUrl+serverTimeUrl+networkRequestError)
            return timestamp
        }
        do {
            let json = try JSON(data: data)
            if let ts = json["timestamp"].int {
                Logger.debug(baseUrl+serverTimeUrl+networkRequestSuccess)
                return ts
            }
        } catch {}
        
        Logger.debug(baseUrl+serverTimeUrl+dataFormatError)
        return timestamp
    }
    
    /// 上传游戏时间
    static func setPlayLog(token: String,
                           serverTime: (Int, Int),
                           localTime: (Int, Int),
                           successHandler: ((_ restrictType: Int, _ remainTime: Int, _ title: String, _ description: String) -> Void)? = nil,
                           failureHandler: (() -> Void)? = nil) {
        let playLogs: [String: Any] = ["server_times": [[serverTime.0, serverTime.1]],
                                       "local_times": [[localTime.0, localTime.1]]]
        let formData: [String: Any] = ["play_logs": dictionaryToJSONString(playLogs)]
        let header: [String: String] = ["Authorization": "Bearer \(token)"]
        let r = Just.post(baseUrl+setPlayLogUrl, data: formData, headers: header)
        
        guard let data = r.content, let httpCode = r.statusCode, httpCode == Int(200) else {
            Logger.debug(baseUrl+setPlayLogUrl+networkRequestError)
            failureHandler?()
            return
        }
        do {
            let json = try JSON(data: data)
            if let code = json["code"].int, code == Int(200),
                let restrictType = json["restrictType"].int,
                let remainTime = json["remainTime"].int,
                let title = json["title"].string,
                let description = json["description"].string {
                
                Logger.debug(baseUrl+setPlayLogUrl+networkRequestSuccess)
                successHandler?(restrictType, remainTime, title, description)
                return
            }
        } catch {}
        
        Logger.debug(baseUrl+setPlayLogUrl+dataFormatError)
        failureHandler?()
        return
    }
    
    
    /// 提交实名信息
    static func setUserInfo(token: String,
                            name: String,
                            identify: String,
                            phone: String = "",
                            accountType: AccountType,
                            successHandler: ((_ accountType: AccountType) -> Void)? = nil,
                            failureHandler: (() -> Void)? = nil) {
        let userInfo: [String: Any] = ["name": name,
                                       "identify": identify,
                                       "phone": phone,
                                       "accountType": accountType.rawValue]
        let header: [String: String] = ["Authorization": "Bearer \(token)"]
        let r = Just.post(baseUrl+setUserInfoUrl, data: userInfo, headers: header)
        
        guard let data = r.content, let httpCode = r.statusCode, httpCode == Int(200) else {
            Logger.debug(baseUrl+setUserInfoUrl+networkRequestError)
            failureHandler?()
            return
        }
        do {
            let json = try JSON(data: data)
            if let code = json["code"].int, code == Int(200),
                let type = json["data", "accountType"].int {
                Logger.debug(baseUrl+setUserInfoUrl+networkRequestSuccess)
                successHandler?(AccountType.type(rawValue: type))
                return
            }
        } catch {}
        
        Logger.debug(baseUrl+setUserInfoUrl+dataFormatError)
        failureHandler?()
        return
    }
    
    /// 检查付费限制
    static func checkPayment(token: String,
                             amount: Int,
                             completionHandler: ((_ allow: Bool, _ title: String , _ description: String) -> Void)? = nil) {
        
        var allow: Bool = true
        var title: String = "健康消费提示"
        var description: String = "请适度娱乐，理性消费。"
        
        defer {
           completionHandler?(allow, title, description)
        }
        
        let formData: [String: Any] = ["amount": amount]
        let header: [String: String] = ["Authorization": "Bearer \(token)"]
        let r = Just.post(baseUrl+checkPaymentUrl, data: formData, headers: header)
        
        guard let data = r.content, let httpCode = r.statusCode, httpCode == Int(200) else {
            Logger.debug(baseUrl+checkPaymentUrl+networkRequestError)
            return
        }
        do {
            let json = try JSON(data: data)
            if let code = json["code"].int, code == Int(200),
                let check = json["check"].int,
                let t = json["title"].string,
                let d = json["description"].string {
                
                allow = (check != 0) // check=0不能付费 1可以付费
                title = t
                description = d
                
                Logger.debug(baseUrl+checkPaymentUrl+networkRequestSuccess)
                return
            }
        } catch {}
        
        Logger.debug(baseUrl+checkPaymentUrl+dataFormatError)
        return
    }
    
    /// 提交已付费金额
    static func setPayment(token: String, amount: Int) {
        let formData: [String: Any] = ["amount": amount]
        let header: [String: String] = ["Authorization": "Bearer \(token)"]
        let r = Just.post(baseUrl+setPaymentUrl, data: formData, headers: header)
        
        guard let data = r.content, let httpCode = r.statusCode, httpCode == Int(200) else {
            Logger.debug("联网版付费金额保存失败")
            Logger.debug(baseUrl+setPaymentUrl+networkRequestError)
            return
        }
        do {
            let json = try JSON(data: data)
            if let code = json["code"].int, code == Int(200) {
                //提交成功
                Logger.debug(baseUrl+setPaymentUrl+networkRequestSuccess)
                Logger.debug("联网版付费金额保存成功")
                return
            }
        } catch {}
        
        Logger.debug("联网版付费金额保存失败")
        Logger.debug(baseUrl+setPaymentUrl+dataFormatError)
        return
    }
    
}
