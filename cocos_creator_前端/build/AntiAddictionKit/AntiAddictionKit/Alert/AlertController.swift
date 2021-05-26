
import UIKit

class AlertController: BaseController {
    
    // MARK: - Public
    convenience init(_ alertData: AlertData) {
        self.init()
        
        self.alertData = alertData
    }
    
    private var alertData: AlertData = AlertData()
    
    private init() {
        super.init(nibName: nil, bundle: nil)
    }
    
    // MARK: - Private
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private lazy var versionLabel: UILabel = {
        let label = UILabel()
        label.backgroundColor = .clear
        label.textColor = .lightGray
        label.font = UIFont.systemFont(ofSize: 11)
        label.textAlignment = .center
        label.isUserInteractionEnabled = true
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(self.showVersion))
        tapGesture.numberOfTapsRequired = 5
        tapGesture.numberOfTouchesRequired = 1
        label.addGestureRecognizer(tapGesture)
        label.text = ""
        return label
    }()
    
    @objc private func showVersion() {
        var version: String = "unknown"
        if let bundle = Bundle(identifier: "ios.aakit.AntiAddictionKit"), let v = bundle.infoDictionary?["CFBundleShortVersionString" as String] as? String {
            version = v
        }
        DispatchQueue.main.async {
            UIView.animate(withDuration: 0.35) {
                self.versionLabel.text = version
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now()+10) {
            UIView.animate(withDuration: 0.35) {
                self.versionLabel.text = ""
            }
        }
    }
    
    private lazy var textView: UITextView = {
        let tv = UITextView()
        tv.isEditable = false
        tv.isSelectable = false
        tv.showsVerticalScrollIndicator = true
        tv.showsHorizontalScrollIndicator = false
        tv.backgroundColor = RGBA(250, 250, 250, 1)
        tv.clipsToBounds = true
        tv.layer.cornerRadius = 4
        tv.textContainerInset = UIEdgeInsets(top: 8, left: 8, bottom: 8, right: 8)
        tv.textContainer.lineFragmentPadding = 0
        tv.keyboardType = .default
        return tv
    }()
    
    private lazy var switchButton: UIButton = {
        let b = UIButton(type: .system)
        b.isHidden = false
        b.backgroundColor = .clear
        b.setAttributedTitle(underlineText("切换账号"), for: .normal)
        b.addTarget(self, action: #selector(switchButtonTapped), for: .touchUpInside)
        return b
    }()
    
    private lazy var authButton: UIButton = {
        let b = UIButton(type: .system)
        b.isHidden = true
        b.backgroundColor = Appearance.default.blackBackgroundColor
        b.setTitle("去实名", for: .normal)
        b.setTitleColor(Appearance.default.whiteBackgroundColor, for: .normal)
        b.titleLabel?.font = UIFont.systemFont(ofSize: Appearance.default.bodyFontSize)
        b.clipsToBounds = true
        b.layer.cornerRadius = 16
        b.addTarget(self, action: #selector(authButtonTapped), for: .touchUpInside)
        return b
    }()
    
    private lazy var quitGameButton: UIButton = {
        let b = UIButton(type: .system)
        b.backgroundColor = Appearance.default.whiteBackgroundColor
        b.setTitle("退出游戏", for: .normal)
        b.setTitleColor(Appearance.default.titleTextColor, for: .normal)
        b.titleLabel?.font = UIFont.systemFont(ofSize: Appearance.default.bodyFontSize)
        b.clipsToBounds = true
        b.layer.cornerRadius = 16
        b.layer.borderColor = Appearance.default.blackBackgroundColor.cgColor
        b.layer.borderWidth = 1
        b.addTarget(self, action: #selector(quitButtonTapped), for: .touchUpInside)
        return b
    }()
    
    private lazy var backGameButton: UIButton = {
        let b = UIButton(type: .system)
        b.backgroundColor = Appearance.default.whiteBackgroundColor
        b.setTitle("继续游戏", for: .normal)
        b.setTitleColor(Appearance.default.titleTextColor, for: .normal)
        b.titleLabel?.font = UIFont.systemFont(ofSize: Appearance.default.bodyFontSize)
        b.clipsToBounds = true
        b.layer.cornerRadius = 16
        b.layer.borderColor = Appearance.default.blackBackgroundColor.cgColor
        b.layer.borderWidth = 1
        b.addTarget(self, action: #selector(backGameButtonTapped), for: .touchUpInside)
        return b
    }()
    
    override var shouldAutorotate: Bool {
        return false
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        
        TimeService.stop()
        TimeManager.inactivate()

        
        self.title = alertData.title
        
        view.addSubview(textView)
        view.addSubview(switchButton)
        view.addSubview(authButton)
        view.addSubview(quitGameButton)
        view.addSubview(backGameButton)
        view.addSubview(versionLabel)
        
        setupUI()
    }
    
    private func setupUI() {
        title = alertData.title
        textView.attributedText = alertBody(alertData.body)
        
        if (alertData.type == .timeLimitAlert) {
            backGameButton.setTitle("进入游戏", for: .normal)
        } else if (alertData.type == .payLimitAlert) {
            backGameButton.setTitle("返回游戏", for: .normal)
        }
        
        //判断用户类型 已实名即隐藏实名按钮
        if let _ = AntiAddictionKit.configuration.host {
            // 联网版
            if let account = AccountManager.currentAccount, account.type == .unknown {
                authButton.isHidden = false
                textView.addBottomConstraint(toView: view, constant: -106)
            } else {
                authButton.isHidden = true
                textView.addBottomConstraint(toView: view, constant: -64)
            }
        } else {
            //单机版
            if let usr = User.shared, usr.type == .unknown {
                authButton.isHidden = false
                textView.addBottomConstraint(toView: view, constant: -106)
            } else {
                authButton.isHidden = true
                textView.addBottomConstraint(toView: view, constant: -64)
            }
        }
        
        switch alertData.type {
        case .timeLimitAlert:
            // 在线时间
            backGameButton.isHidden = (alertData.remainTime <= 0)
            quitGameButton.isHidden = (alertData.remainTime > 0)
            
            switchButton.isHidden = !AntiAddictionKit.configuration.showSwitchAccountButton
        case .payLimitAlert:
            // 显示退出按钮
            backGameButton.isHidden = false
            quitGameButton.isHidden = true
            switchButton.isHidden = true
        }
        
        versionLabel.addLeftConstraint(toView: view)
        versionLabel.addTopConstraint(toView: view)
        versionLabel.addWidthAndHeightConstraint(width: 60, height: 50)
        
        textView.addTopConstraint(toView: view, constant: 48)
        textView.addLeftConstraint(toView: view, constant: 12)
        textView.addRightConstraint(toView: view, constant: -12)
        
        switchButton.addWidthAndHeightConstraint(width: 54, height: 20)
        switchButton.addCenterXConstraint(toView: view)
        switchButton.addBottomConstraint(toView: textView, constant: -6)
        
        authButton.addWidthAndHeightConstraint(width: 150, height: 32)
        authButton.addCenterXConstraint(toView: view)
        authButton.addBottomConstraint(toView: view, constant: -58)
        
        quitGameButton.addWidthAndHeightConstraint(width: 150, height: 32)
        quitGameButton.addCenterXConstraint(toView: view)
        quitGameButton.addBottomConstraint(toView: view, constant: -16)
        
        backGameButton.addWidthAndHeightConstraint(width: 150, height: 32)
        backGameButton.addCenterXConstraint(toView: view)
        backGameButton.addBottomConstraint(toView: view, constant: -16)
    }
    
    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
    }

}


extension AlertController {
    
    @objc func switchButtonTapped() {
        Logger.info("用户点击切换账号")
        
        if AntiAddictionKit.isServerEnabled {
            LoginManager.logout()
        } else {
            UserService.logout()
        }
        
        AntiAddictionKit.sendCallback(result: .logout, message: "用户切换账号！")
    }
    
    @objc func authButtonTapped() {
        if (AntiAddictionKit.configuration.useSdkRealName) {
            let realnameController = RealNameController(backButtonEnabled: true, cancelled: nil, succeed: nil)
            navigationController?.pushViewController(realnameController, animated: true)
        } else {
            Router.closeContainer()
            AntiAddictionKit.sendCallback(result: .realNameRequest, message: "用户请求实名登记！")
        }
    }
    
    @objc func quitButtonTapped() {
        
        func suicide(_ window: UIWindow) {
            UIView.animate(withDuration: 0.3, animations: {
                window.alpha = 0
            }) { (_) in
                exit(0)
            }
        }
        
        if #available(iOS 13.0, *) {
            if let appDelegate = UIApplication.shared.delegate, let window = appDelegate.window as? UIWindow {
                suicide(window)
                return
            }
            if let window = UIApplication.shared.windows.first {
                suicide(window)
                return
            }
        } else {
            if let keyWindow = UIApplication.shared.keyWindow {
                suicide(keyWindow)
                return
            }
        }
        
        // 找不到 window 直接执行
        exit(0)
    }
    
    @objc func backGameButtonTapped() {
        Router.closeContainer()
        
        switch alertData.type {
        case .payLimitAlert:
            //如果是支付弹窗，返回游戏时给游戏发送有支付限制的通知
            AntiAddictionKit.sendCallback(result: .hasPayLimit, message: "防沉迷限制，无法支付！")
        case .timeLimitAlert:
            // TIPS: 当时间提示页面显示`进入游戏`按钮时，只会在游客登录时，所以直接显示用户登录成功
            // TODO: `进入游戏`按钮逻辑太粗暴，可以优化
            AntiAddictionKit.sendCallback(result: .loginSuccess, message: "用户登录成功")
        }
        
        TimeService.start()
        TimeManager.activate()
    }
    
}


extension AlertController {
    
    private func alertBody(_ text: String) -> NSAttributedString {
        let attrStr = NSMutableAttributedString(string: text)
        let pStyle = NSMutableParagraphStyle()
        pStyle.lineSpacing = 6
        pStyle.alignment = .left
        attrStr.addAttribute(NSAttributedString.Key.paragraphStyle, value: pStyle, range: text.fullRange())
        attrStr.addAttribute(NSAttributedString.Key.font, value: UIFont.systemFont(ofSize: Appearance.default.bodyFontSize), range: text.fullRange())
        attrStr.addAttribute(NSAttributedString.Key.foregroundColor, value: Appearance.default.bodyTextColor, range: text.fullRange())
        return attrStr
    }
    
    private func underlineText(_ text: String) -> NSAttributedString {
        let attrStr = NSMutableAttributedString(string: text)
        attrStr.addAttribute(NSAttributedString.Key.font, value: UIFont.systemFont(ofSize: Appearance.default.tipFontSize), range: text.fullRange())
        attrStr.addAttribute(NSAttributedString.Key.foregroundColor, value: Appearance.default.titleTextColor, range: text.fullRange())
        attrStr.addAttribute(NSAttributedString.Key.underlineStyle, value: NSUnderlineStyle.single.rawValue, range: text.fullRange())
        return attrStr
    }
}
