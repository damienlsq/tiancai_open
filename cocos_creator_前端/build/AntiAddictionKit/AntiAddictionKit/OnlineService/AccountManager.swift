
import Foundation
import UIKit

/// 联网版用户相关服务
struct AccountManager {
    
    /// 当前登录的用户
    static var currentAccount: Account? = nil
    
    /// 获取用户类型
    /// - Returns: 用户类型
    static func getAccountType(id: String) -> AccountType {
        if let a = currentAccount, a.id == id {
            return a.type
        } else {
            return .unknown
        }
    }
    
    
    /// 游戏主动更新用户
    static func updateAccountType(type: Int) {
        
        guard let account = AccountManager.currentAccount, let token = account.token else {
            Logger.info("联网版当前无登录用户，无法更新用户类型")
            return
        }
        let newAccountType = AccountType.type(rawValue: type)
        account.type = newAccountType
        
        Networking.setUserInfo(token: token,
                               name: "",
                               identify: "",
                               accountType: newAccountType,
                               successHandler: { (updatedAccountType) in
                                //成功
                                account.type = updatedAccountType
                                AccountManager.currentAccount = account
        }) {
            //更新用户类型提交失败
            AccountManager.currentAccount = account
        }
        
        Router.closeAlertTip()
        Router.closeContainer()

        TimeManager.activate()
        
    }
    
    
    
}
