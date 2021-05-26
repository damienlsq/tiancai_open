
import UIKit

@objcMembers
public class Appearance: NSObject {
    
    static var `default` = Appearance()
    
    var titleTextColor: UIColor = RGBA(51, 51, 51, 1)
    var bodyTextColor: UIColor = RGBA(153, 153, 153, 1)
    var tipTextColor: UIColor = RGBA(245, 245, 245, 1)
    var placeholderColor: UIColor = RGBA(187, 187, 187, 1)
    var iconColor: UIColor = RGBA(205, 205, 205, 1)
    
    var whiteBackgroundColor: UIColor = RGBA(255, 255, 255, 1)
    var blackBackgroundColor: UIColor = RGBA(0, 0, 0, 1)
    var grayBackgroundColor: UIColor = RGBA(77, 77, 77, 1)
    
    var titleFontSize: CGFloat = 16
    var bodyFontSize: CGFloat = 14
    var tipFontSize: CGFloat = 12
    
    
    //外部禁用初始化方法
    internal override init() {
        super.init()
    }
    
}


