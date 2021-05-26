
import Foundation

extension String {
    
    //正则匹配并替换
    func regexReplace(pattern: String,
                      replacement: String,
                      options: NSRegularExpression.Options = []) -> String {
        do {
            let regex = try NSRegularExpression(pattern: pattern, options: options)
            return regex.stringByReplacingMatches(in: self, options: [], range: NSMakeRange(0, self.count), withTemplate: replacement)
        } catch {}
        return self
    }
}
