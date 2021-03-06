
import UIKit

enum RealNameFailedToastError: String {
    case unknownError                  = ""
    
    case localMissingUser              = "1"
    case localInvalidIDCard            = "2"
    
    case serverMissingUserToken        = "11"
    case serverIDCardRealNameFailed    = "12"
    case serverPromoCodeRealNameFailed = "13"
}

class RealNameController: BaseController {
    
    // MARK: - Public
    public convenience init(backButtonEnabled flag: Bool, userOpen: Bool = false,  cancelled: (() -> Void)? = nil, succeed: (() -> Void)? = nil) {
        self.init()
        self.backButtonEnabled = flag
        
        self.userOpen = userOpen
        
        self.realnameCancelledClosure = cancelled
        self.realnameSucceedClosure = succeed
    }
    
    private var backButtonEnabled: Bool = false
    
    private var userOpen: Bool = false
    
    private var realnameCancelledClosure: (() -> Void)?
    private var realnameSucceedClosure: (() -> Void)?
    
    private init() {
        super.init(nibName: nil, bundle: nil)
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    // MARK: - Private
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private lazy var backButton: UIButton = {
        let b = UIButton(type: .system)
        b.backgroundColor = .clear
        b.tintColor = Appearance.default.iconColor
        b.setImage(UIImage(bundleNamed: "btn_back")?.withRenderingMode(.alwaysTemplate), for: .normal)
        b.addTarget(self, action: #selector(backButtonTapped), for: .touchUpInside)
        return b
    }()
    
    private lazy var closeButton: UIButton = {
        let b = UIButton(type: .system)
        b.backgroundColor = .clear
        b.tintColor = Appearance.default.iconColor
        b.setImage(UIImage(bundleNamed: "btn_close")?.withRenderingMode(.alwaysTemplate), for: .normal)
        b.addTarget(self, action: #selector(closeButtonTapped), for: .touchUpInside)
        return b
    }()
    
    private lazy var submitButton: UIButton = {
        let b = UIButton(type: .system)
        b.backgroundColor = Appearance.default.blackBackgroundColor
        b.setTitle("??????", for: .normal)
        b.setTitleColor(Appearance.default.whiteBackgroundColor, for: .normal)
        b.titleLabel?.font = UIFont.systemFont(ofSize: Appearance.default.bodyFontSize)
        b.clipsToBounds = true
        b.layer.cornerRadius = 16
        b.addTarget(self, action: #selector(submitButtonTapped), for: .touchUpInside)
        return b
    }()
    
    private lazy var tipButton: UIButton = {
        let b = UIButton(type: .system)
        b.backgroundColor = .clear
        b.setTitle("??????????????????", for: .normal)
        b.tintColor = Appearance.default.iconColor
        b.setImage(UIImage(bundleNamed: "btn_auth_tip")?.withRenderingMode(.alwaysTemplate), for: .normal)
        b.titleEdgeInsets = edgeInsets(0, 5, 0, 0)
        b.setTitleColor(Appearance.default.placeholderColor, for: .normal)
        b.titleLabel?.font = UIFont.systemFont(ofSize: Appearance.default.tipFontSize)
        b.addTarget(self, action: #selector(tipButtonTapped), for: .touchUpInside)
        return b
    }()
    
    private lazy var nameTextField: AATextField = {
        let tf = AATextField()
        tf.attributedPlaceholder = self.attributedPlaceholder("????????????")
        tf.keyboardType = .default
        tf.clearButtonMode = .whileEditing
        tf.borderStyle = .none;
        tf.font = UIFont.systemFont(ofSize: Appearance.default.bodyFontSize)
        tf.textColor = Appearance.default.titleTextColor
        tf.delegate = self
        return tf
    }()
    
    private lazy var idCardTextField: AATextField = {
        let tf = AATextField()
        tf.attributedPlaceholder = self.attributedPlaceholder("?????????")
        tf.keyboardType = .asciiCapable
        tf.clearButtonMode = .whileEditing
        tf.borderStyle = .none;
        tf.font = UIFont.systemFont(ofSize: Appearance.default.bodyFontSize)
        tf.textColor = Appearance.default.titleTextColor
        tf.delegate = self
        return tf
    }()
    
    private lazy var phoneTextField: AATextField = {
        let tf = AATextField()
        tf.attributedPlaceholder = self.attributedPlaceholder("?????????")
        tf.keyboardType = .numberPad
        tf.clearButtonMode = .whileEditing
        tf.borderStyle = .none;
        tf.font = UIFont.systemFont(ofSize: Appearance.default.bodyFontSize)
        tf.textColor = Appearance.default.titleTextColor
        tf.delegate = self
        return tf
    }()
    
    private lazy var tipButtonPositionXConstraint: NSLayoutConstraint? = nil
    
    override var shouldAutorotate: Bool {
        return false
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        
        TimeService.stop()
        TimeManager.inactivate()
        
        title = "??????????????????"
        
        view.addSubview(backButton)
        view.addSubview(closeButton)
        view.addSubview(submitButton)
        view.addSubview(tipButton)
        view.addSubview(nameTextField)
        view.addSubview(idCardTextField)
        // view.addSubview(phoneTextField)
        
        updateSubviewLayout()
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        
        NotificationCenter.default.addObserver(self, selector: #selector(self.nameTextFieldContentChange), name: UITextField.textDidChangeNotification, object: self.nameTextField)
        NotificationCenter.default.addObserver(self, selector: #selector(self.idCardTextFieldContentChange), name: UITextField.textDidChangeNotification, object: self.idCardTextField)
        // NotificationCenter.default.addObserver(self, selector: #selector(self.phoneTextFieldContentChange), name: UITextField.textDidChangeNotification, object: self.phoneTextField)
    }
    
    @objc func nameTextFieldContentChange() {
        // ???????????????????????????`??`
        if nameTextField.markedTextRange == nil  {
            let cursorPostion = nameTextField.offset(from: nameTextField.endOfDocument,
                                                        to: nameTextField.selectedTextRange!.end)
            guard let text = nameTextField.text else { return }
            nameTextField.text = text.regexReplace(pattern: "[^\\u4E00-\\u9FA5??]", replacement: "")
            let targetPostion = nameTextField.position(from: nameTextField.endOfDocument,
                                                   offset: cursorPostion)!
            nameTextField.selectedTextRange = nameTextField.textRange(from: targetPostion,
                                                              to: targetPostion)
        }
    }
    
    @objc func idCardTextFieldContentChange() {
        // ?????????????????? `0123456789a-zA-z`
        if idCardTextField.markedTextRange == nil  {
            let cursorPostion = idCardTextField.offset(from: idCardTextField.endOfDocument,
                                                        to: idCardTextField.selectedTextRange!.end)
            guard let text = idCardTextField.text else { return }
            idCardTextField.text = text.regexReplace(pattern: "[^0123456789a-zA-Z]", replacement: "")
            let targetPostion = idCardTextField.position(from: idCardTextField.endOfDocument,
                                                   offset: cursorPostion)!
            idCardTextField.selectedTextRange = idCardTextField.textRange(from: targetPostion,
                                                              to: targetPostion)
        }
    }
    
    @objc func phoneTextFieldContentChange(notification: Notification) {
        // ?????????????????? `0123456789`
        if phoneTextField.markedTextRange == nil  {
            let cursorPostion = phoneTextField.offset(from: phoneTextField.endOfDocument,
                                                        to: phoneTextField.selectedTextRange!.end)
            guard let text = phoneTextField.text else { return }
            phoneTextField.text = text.regexReplace(pattern: "[^0123456789]", replacement: "")
            let targetPostion = phoneTextField.position(from: phoneTextField.endOfDocument,
                                                   offset: cursorPostion)!
            phoneTextField.selectedTextRange = phoneTextField.textRange(from: targetPostion,
                                                              to: targetPostion)
        }
    }
    
    private func updateSubviewLayout() {
        
        backButton.isHidden = !self.backButtonEnabled
        closeButton.isHidden = (self.realnameCancelledClosure == nil)
        
        backButton.addLeftConstraint(toView: view)
        backButton.addTopConstraint(toView: view)
        backButton.addWidthAndHeightConstraint(width: 30, height: 30)
        
        closeButton.addRightConstraint(toView: view)
        closeButton.addTopConstraint(toView: view)
        closeButton.addWidthAndHeightConstraint(width: 30, height: 30)
        
        submitButton.addBottomConstraint(toView: view, constant: -54)
        submitButton.addCenterXConstraint(toView: view)
        submitButton.addWidthAndHeightConstraint(width: 210, height: 32)
        
        tipButton.addBottomConstraint(toView: view, constant: -10)
        tipButton.addWidthAndHeightConstraint(width: 100, height: 18)
        tipButtonPositionXConstraint = tipButton.addLeftConstraint(toView: view, constant: isLandscape() ? 10 : (95))
        
        /*
        phoneTextField.addCenterXConstraint(toView: view)
        phoneTextField.addBottomConstraint(toView: view, constant: -110)
        phoneTextField.addWidthAndHeightConstraint(width: 225, height: 32)
        */
        
        idCardTextField.addCenterXConstraint(toView: view)
        idCardTextField.addBottomConstraint(toView: view, constant: -150)
        idCardTextField.addWidthAndHeightConstraint(width: 225, height: 32)

        nameTextField.addCenterXConstraint(toView: view)
        nameTextField.addBottomConstraint(toView: view, constant: -190)
        nameTextField.addWidthAndHeightConstraint(width: 225, height: 32)
    }
    
    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        if let c = tipButtonPositionXConstraint {
            c.constant = isLandscape() ? 10 : (95)
        }
        
        super.traitCollectionDidChange(previousTraitCollection)
    }
    
}

extension RealNameController {
    private func attributedPlaceholder(_ placeholder: String) -> NSAttributedString {
        let attrStr = NSMutableAttributedString(string: placeholder)
        attrStr.addAttribute(NSAttributedString.Key.font, value: UIFont.systemFont(ofSize: Appearance.default.bodyFontSize), range: placeholder.fullRange())
        attrStr.addAttribute(NSAttributedString.Key.foregroundColor, value: Appearance.default.placeholderColor, range: placeholder.fullRange())
        return attrStr
    }
}


extension RealNameController {
    
    @objc func tipButtonTapped() {
        AuthTip.show(to: self.tipButton)
    }
    
    @objc func backButtonTapped() {
        AuthTip.hide()
        navigationController?.popViewController(animated: true)
    }
    
    @objc func closeButtonTapped() {
        AuthTip.hide()
        
        Router.closeContainer()
        
        AntiAddictionKit.sendCallback(result: .realNameAuthFailed, message: "???????????????????????????")
        
        realnameCancelledClosure?()
        
        TimeService.start()
        TimeManager.activate()
    }
    
    
    @objc func submitButtonTapped() {
        AuthTip.hide()
        
        let name = nameTextField.text ?? ""
        let idCard = idCardTextField.text ?? ""
        let phone = phoneTextField.text ?? "1234567890"
        
        if (name.isValidRealName() == false) {
            makeToast("?????????????????????")
            return
        }
        
        let isRealIDCardNumber = idCard.isValidIDCardNumber()
        let isGeneratedCode = AAKitIDNumberGenerator.isValid(with: idCard)
        if (isRealIDCardNumber == false && isGeneratedCode == false) {
            makeToast("???????????????????????????")
            return
        }
        /*
        if (phone.isValidPhoneNumber() == false) {
            makeToast("????????????????????????")
            return
        }
        */
        
        
        
        view.makeToastActivity(.center)
        
        //?????????
        if let _ = AntiAddictionKit.configuration.host {
            // ????????????????????????
            if let account = AccountManager.currentAccount, let token = account.token {
                // ????????? ??????????????????????????????????????????
                if isGeneratedCode {
                    account.type = .adult
                    AccountManager.currentAccount = account
                    Networking.setUserInfo(token: token, name: name, identify: "", phone: phone, accountType: .adult, successHandler: { (newType) in
                        account.type = .adult
                        AccountManager.currentAccount = account
                        self.authSucceed()
                    }) {
                        self.authFailed(.serverPromoCodeRealNameFailed)
                    }
                    return
                } else {
                    // ?????????
                    Networking.setUserInfo(token: token, name: name, identify: idCard, phone: phone, accountType: account.type, successHandler: { (newType) in
                        account.type = newType
                        AccountManager.currentAccount = account
                        self.authSucceed()
                    }) {
                        self.authFailed(.serverIDCardRealNameFailed)
                    }
                    return
                }
            } else {
                self.authFailed(.serverMissingUserToken)
                return
            }
        }

        // ?????????
        // ????????????????????????
        if User.shared != nil {
            //?????????????????????????????????
            if isGeneratedCode {
                //?????????????????????,???????????????????????????
                //?????????
                User.shared!.updateUserType(.adult)
                UserService.saveCurrentUserInfo()
                authSucceed()
                return
            } else {
                //???????????????????????????????????????
                if let yearStr = idCard.yyyyMMdd() {
                    let age = DateHelper.getAge(yearStr)
                    
                    if age < 0 {
                        authFailed(.localInvalidIDCard)
                        return
                    }
                    //????????????
                    let type = UserType.typeByAge(age)
                    
                    User.shared!.updateUserType(type)
                    User.shared!.updateUserRealName(name: name.encrypt(),
                                                    idCardNumber: idCard.encrypt(),
                                                    phone: phone.encrypt())
                    UserService.saveCurrentUserInfo()
                    authSucceed()
                    return
                } else {
                    //????????????????????????
                    authFailed(.localInvalidIDCard)
                    return
                }
            }
            
        } else {
            authFailed(.localMissingUser)
            return
        }
        
    }
    
    /// ??????????????????
    private func authSucceed() {
        DispatchQueue.main.asyncAfter(deadline: 0.3) {
            self.view.hideToastActivity()
            self.makeToast("??????????????????")
            
            Router.closeAlertTip()
            Router.closeContainer()
            
            AntiAddictionKit.sendCallback(result: .realNameAuthSucceed, message: "???????????????????????????")
            
            if self.userOpen {
                AntiAddictionKit.sendCallback(result: .gameResume, message: "????????????????????????")
            }
            
            self.realnameSucceedClosure?()
            
            TimeService.start()
            
            if self.backButtonEnabled {
                TimeManager.activate(isLogin: true)
            } else {
                TimeManager.activate()
            }
        }
    }
    
    /// ??????????????????
    private func authFailed(_ error: RealNameFailedToastError = .unknownError) {
        self.view.hideToastActivity()
        makeToast("??????????????????" + error.rawValue)
    }
    
    
    private func makeToast(_ message: String) {
        view.makeToast(message, duration: 1.0, position: .center)
    }
}

extension RealNameController: UITextFieldDelegate {
    
    func textFieldDidBeginEditing(_ textField: UITextField) {
        animateContent(-90)
    }
    
    func textField(_ textField: UITextField, shouldChangeCharactersIn range: NSRange, replacementString string: String) -> Bool {
        //???????????????????????????
        let validString = string.components(separatedBy: .whitespacesAndNewlines).joined()
        return validString == string
    }
    
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        if (textField == nameTextField) {
            idCardTextField.becomeFirstResponder()
        } else if (textField == idCardTextField) {
            phoneTextField.becomeFirstResponder()
        } else if (textField == phoneTextField) {
            textField.resignFirstResponder()
        }
        return true
    }
    
    func textFieldDidEndEditing(_ textField: UITextField) {
        animateContent(.zero)
    }
    
    func animateContent(_ offsetY: CGFloat) {
        //????????????tipView
        AuthTip.hide()
        
        guard let navigatorView = navigationController?.view else { return }
        guard let containerView = navigatorView.superview else { return }
        UIView.animate(withDuration: 0.28, delay: 0, options: .curveEaseOut, animations: {
            for c in containerView.constraints {
                if (c.firstAttribute == c.secondAttribute && c.firstAttribute == .centerY) {
                    c.constant = offsetY;
                }
            }
            containerView.layoutIfNeeded()
        }) { (_) in
            
        }
    }
}
