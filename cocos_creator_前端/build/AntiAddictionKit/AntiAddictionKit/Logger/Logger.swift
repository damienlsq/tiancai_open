
import Foundation

struct Logger {
    
    /// debug log
    static func debug(_ items: Any...) {
//        #if DEBUG
//        let s = items.reduce("") { result, next in
//            return result + String(describing: next)
//        }
//        Swift.print("[Debug] \(s)")
//        #endif
    }
    
    /// 业务流程 log
    static func info(_ items: Any...) {
        #if DEBUG
        let s = items.reduce("") { result, next in
            return result + String(describing: next)
        }
        Swift.print("[AntiAddictionKit] \(s)")
        #endif
    }
    
}


