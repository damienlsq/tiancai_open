
import UIKit

class BaseController: UIViewController {
    
    public override var title: String? {
        didSet {
            DispatchQueue.main.async {
                self.titleLabel.text = self.title
            }
        }
    }
    
    private lazy var titleLabel: UILabel = {
        let label = UILabel()
        label.backgroundColor = .clear
        label.textAlignment = .center
        label.font = UIFont.systemFont(ofSize: Appearance.default.titleFontSize)
        label.textColor = Appearance.default.titleTextColor
        return label
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        
        navigationController?.navigationBar.isHidden = true
        
        view.backgroundColor = Appearance.default.whiteBackgroundColor

        view.addSubview(titleLabel)
        titleLabel.addCenterXConstraint(toView: view)
        titleLabel.addTopConstraint(toView: view, constant: 14)
        titleLabel.addWidthConstraint(constant: 120)
        titleLabel.addHeightConstraint(constant: 22)
    }
}
