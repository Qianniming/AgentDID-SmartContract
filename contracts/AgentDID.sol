// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AgentDID
 * @dev Agent DID智能合约，实现AI Agent的身份管理和DID（去中心化身份）功能
 * @author Agent DID Team
 */
contract AgentDID {
    // ============ 枚举类型定义 ============
    
    enum AuthKeyStatus {
        VALID,      // 有效
        USED,       // 已使用
        EXPIRED,    // 已过期
        INVALIDATED // 已失效
    }
    
    // ============ 结构体定义 ============
    
    struct AuthKeyInfo {
        bytes32 hash;                        // 密钥哈希
        uint256 generateTime;                // 生成时间戳
        AuthKeyStatus status;                // 密钥状态
    }
    
    // ============ 状态变量 ============
    
    // 基础权限控制
    address public owner;                    // 合约所有者
    bytes32 private agentPasswordHash;       // Agent基础密码哈希
    
    // DID文档存储
    mapping(string => string) public didDocFields;  // DID文档字段映射
    string[] public allowedFields;           // 允许的字段白名单
    
    // 授权密钥管理
    AuthKeyInfo public authKeyInfo;          // 当前授权密钥信息
    
    // 系统配置参数
    uint256 public authKeyExpiryTime;        // 密钥有效期（秒）
    bool public isPaused;                    // 合约暂停状态
    uint256 public maxBatchSize;             // 批量操作上限
    
    // 所有权转移
    address public pendingOwner;             // 待确认的新所有者
    uint256 public transferInitiatedTime;    // 转移发起时间
    uint256 public constant TRANSFER_TIMEOUT = 72 hours; // 转移确认超时时间
    
    // 异常与边界处理
    mapping(address => uint256) public passwordErrorCount;       // 每个地址的密码错误次数计数
    mapping(address => uint256) public passwordLockedUntil;      // 每个地址的密码锁定截止时间
    uint256 public constant MAX_PASSWORD_ERRORS = 5; // 最大密码错误次数
    uint256 public constant LOCK_DURATION = 3600; // 锁定时长（1小时）
    
    // ============ 事件定义 ============
    
    event DIDDocumentUpdated(string indexed fieldName, string newValue);
    event DIDDocumentBatchUpdated(string[] fields, string[] values);
    event AuthKeyGenerated(address indexed agent, uint256 generateTime);
    event AuthKeyVerified(address indexed verifier, address indexed agent, bool success);
    event AuthKeyInvalidated(address indexed agent, uint256 invalidateTime);
    event AgentPasswordUpdated(address indexed owner, uint256 updateTime);
    event AgentPasswordReset(address indexed owner, uint256 resetTime);
    event OwnershipTransferInitiated(address indexed previousOwner, address indexed newOwner, uint256 initiateTime);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ContractPaused(address indexed owner, uint256 pauseTime);
    event ContractUnpaused(address indexed owner, uint256 unpauseTime);
    event AuthKeyExpiryUpdated(uint256 oldExpiry, uint256 newExpiry);
    event AgentPasswordErrorOccurred(address indexed caller, uint256 errorCount);
    event AgentPasswordLocked(address indexed caller, uint256 lockedUntil);
    event UnauthorizedAccess(address indexed caller, string functionName);
    
    // ============ 错误定义 ============
    
    error OnlyOwner();
    error ContractPausedError();
    error InvalidAgentPassword();
    error InvalidAuthKey();
    error AuthKeyExpired();
    error AuthKeyAlreadyUsed();
    error InvalidFieldName();
    error OwnershipTransferNotInitiated();
    error OwnershipTransferExpired();
    error NotPendingOwner();
    error ArrayLengthMismatch();
    error AgentPasswordLockedError();
    error TooManyAgentPasswordErrors();
    error InvalidAuthKeyStatus();
    
    // ============ 修饰符定义 ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) {
            emit UnauthorizedAccess(msg.sender, "onlyOwner");
            revert OnlyOwner();
        }
        _;
    }
    
    modifier whenNotPaused() {
        if (isPaused) revert ContractPausedError();
        _;
    }
    
    modifier validField(string memory fieldName) {
        bool isValid = false;
        for (uint i = 0; i < allowedFields.length; i++) {
            if (keccak256(bytes(allowedFields[i])) == keccak256(bytes(fieldName))) {
                isValid = true;
                break;
            }
        }
        if (!isValid) revert InvalidFieldName();
        _;
    }
    
    modifier validAgentPassword(string memory password) {
        // 使用内部函数处理密码验证
        _handlePasswordValidationInternal(password);
        _;
    }
    
    function _handlePasswordValidationInternal(string memory password) internal {
        // 首先检查是否被锁定
        bool isLocked = _checkPasswordLock();
        if (isLocked) {
            revert AgentPasswordLockedError();
        }
        
        // 检查密码是否正确
        bool isPasswordCorrect = keccak256(abi.encodePacked(password)) == agentPasswordHash;
        
        if (isPasswordCorrect) {
            // 密码正确，重置错误计数
            _resetPasswordErrorCount();
            return;
        }
        
        // 密码错误，直接抛出错误（不在这里处理错误计数）
        revert InvalidAgentPassword();
    }
    

    
    /**
     * @dev 调试函数：获取当前错误计数
     */
    function getDebugErrorCount() external view returns (uint256) {
        return passwordErrorCount[msg.sender];
    }
    
    /**
     * @dev 调试函数：获取密码验证的详细状态
     */
    function getPasswordValidationDebugInfo() external view returns (
        bool isLocked,
        uint256 currentTimestamp,
        uint256 lockedUntil,
        uint256 errorCount,
        bool lockCheck
    ) {
        isLocked = block.timestamp < passwordLockedUntil[msg.sender];
        currentTimestamp = block.timestamp;
        lockedUntil = passwordLockedUntil[msg.sender];
        errorCount = passwordErrorCount[msg.sender];
        lockCheck = _checkPasswordLock();
    }
    
    /**
     * @dev 测试函数：直接调用密码验证逻辑
     */
    function testPasswordValidation(string memory password) external {
        _handlePasswordValidationInternal(password);
    }
    
    // ============ 构造函数 ============
    
    constructor(
        string memory _agentName,
        string memory _functionType,
        string memory _version,
        string memory _initialAgentPassword
    ) {
        owner = msg.sender;
        
        // 计算初始Agent密码的Keccak256哈希并存储
        agentPasswordHash = keccak256(abi.encodePacked(_initialAgentPassword));
        
        // 初始化DID文档字段
        didDocFields["agentName"] = _agentName;
        didDocFields["functionType"] = _functionType;
        didDocFields["version"] = _version;
        
        // 生成DID标识 (did:ethr:{chainId}:{contractAddress})
        string memory chainId = _uint2str(block.chainid);
        string memory contractAddr = _addressToString(address(this));
        didDocFields["did"] = string(abi.encodePacked("did:ethr:", chainId, ":", contractAddr));
        
        // 初始化字段白名单
        allowedFields = ["agentName", "functionType", "version", "serviceUrl", "description", "did"];
        
        // 初始化系统参数
        authKeyExpiryTime = 86400; // 24小时
        isPaused = false;
        maxBatchSize = 50;
        
        // 初始化授权密钥为空状态
        authKeyInfo = AuthKeyInfo({
            hash: bytes32(0),
            generateTime: 0,
            status: AuthKeyStatus.INVALIDATED
        });
        
        // 映射的默认值为0，无需初始化
    }
    
    // ============ 模块一：DID文档管理 ============
    
    /**
     * @dev 更新单个DID文档字段
     * @param fieldName 字段名称
     * @param newValue 新值
     */
    function updateDIDDocField(string memory fieldName, string memory newValue) 
        external 
        onlyOwner 
        validField(fieldName) 
    {
        didDocFields[fieldName] = newValue;
        emit DIDDocumentUpdated(fieldName, newValue);
    }
    
    /**
     * @dev 全量更新DID文档
     * @param fields 字段名称数组
     * @param values 字段值数组
     */
    function updateDIDDocument(string[] memory fields, string[] memory values) 
        external 
        onlyOwner 
    {
        if (fields.length != values.length) revert ArrayLengthMismatch();
        if (fields.length > maxBatchSize) revert ArrayLengthMismatch();
        
        // 验证所有字段都在白名单中
        for (uint i = 0; i < fields.length; i++) {
            bool isValid = false;
            for (uint j = 0; j < allowedFields.length; j++) {
                if (keccak256(bytes(allowedFields[j])) == keccak256(bytes(fields[i]))) {
                    isValid = true;
                    break;
                }
            }
            if (!isValid) revert InvalidFieldName();
        }
        
        // 更新字段
        for (uint i = 0; i < fields.length; i++) {
            didDocFields[fields[i]] = values[i];
        }
        
        emit DIDDocumentBatchUpdated(fields, values);
    }
    
    /**
     * @dev 查询完整DID文档
     * @return fields 字段名称数组
     * @return values 字段值数组
     */
    function getDIDDocument() 
        external 
        view 
        returns (string[] memory fields, string[] memory values) 
    {
        fields = new string[](allowedFields.length);
        values = new string[](allowedFields.length);
        
        for (uint i = 0; i < allowedFields.length; i++) {
            fields[i] = allowedFields[i];
            values[i] = didDocFields[allowedFields[i]];
        }
    }
    
    /**
     * @dev 查询单个DID字段
     * @param fieldName 字段名称
     * @return 字段值
     */
    function getDIDDocField(string memory fieldName) 
        external 
        view 
        returns (string memory) 
    {
        return didDocFields[fieldName];
    }
    
    // ============ 模块二：授权密钥管理 ============
    
    /**
     * @dev Agent使用基础密码生成临时授权密钥
     * @param agentPassword Agent基础密码
     * @return 是否成功
     */
    function requestAuthKey(string memory agentPassword) 
        external 
        whenNotPaused 
        returns (bool) 
    {
        // 首先检查是否被锁定
        if (_checkPasswordLock()) {
            revert AgentPasswordLockedError();
        }
        
        // 检查密码是否正确
        bool isPasswordCorrect = keccak256(abi.encodePacked(agentPassword)) == agentPasswordHash;
        
        if (!isPasswordCorrect) {
            // 密码错误，处理错误计数
            uint256 currentErrorCount = passwordErrorCount[msg.sender];
            passwordErrorCount[msg.sender] = currentErrorCount + 1;
            emit AgentPasswordErrorOccurred(msg.sender, passwordErrorCount[msg.sender]);
            
            // 检查是否达到锁定条件
            if (passwordErrorCount[msg.sender] >= MAX_PASSWORD_ERRORS) {
                passwordLockedUntil[msg.sender] = block.timestamp + LOCK_DURATION;
                emit AgentPasswordLocked(msg.sender, passwordLockedUntil[msg.sender]);
                revert TooManyAgentPasswordErrors();
            } else {
                revert InvalidAgentPassword();
            }
        }
        
        // 密码正确，重置错误计数
        _resetPasswordErrorCount();
        
        // 生成新的授权密钥哈希
        bytes32 newAuthKeyHash = keccak256(abi.encodePacked(
            agentPassword,
            block.timestamp,
            block.prevrandao,
            msg.sender
        ));
        
        // 更新授权密钥信息
        authKeyInfo = AuthKeyInfo({
            hash: newAuthKeyHash,
            generateTime: block.timestamp,
            status: AuthKeyStatus.VALID
        });
        
        emit AuthKeyGenerated(msg.sender, block.timestamp);
        return true;
    }
    
    /**
     * @dev 第三方使用授权密钥验证Agent身份
     * @param authKey 授权密钥
     * @return 验证是否成功
     */
    function verifyAgentAuth(string memory authKey) 
        external 
        whenNotPaused 
        returns (bool) 
    {
        bytes32 authKeyHash = keccak256(abi.encodePacked(authKey));
        
        // 检查授权密钥状态
        if (!_validateKeyStatus()) {
            emit AuthKeyVerified(msg.sender, owner, false);
            return false;
        }
        
        // 验证授权密钥哈希
        if (authKeyInfo.hash != authKeyHash) {
            emit AuthKeyVerified(msg.sender, owner, false);
            return false;
        }
        
        // 验证成功，标记为已使用
        authKeyInfo.status = AuthKeyStatus.USED;
        
        emit AuthKeyVerified(msg.sender, owner, true);
        return true;
    }
    
    /**
     * @dev Agent主动失效授权密钥
     * @param agentPassword Agent基础密码
     * @return 是否成功
     */
    function invalidateAuthKey(string memory agentPassword) 
        external 
        whenNotPaused 
        returns (bool) 
    {
        // 首先检查是否被锁定
        if (_checkPasswordLock()) {
            revert AgentPasswordLockedError();
        }
        
        // 检查密码是否正确
        bool isPasswordCorrect = keccak256(abi.encodePacked(agentPassword)) == agentPasswordHash;
        
        if (!isPasswordCorrect) {
            // 密码错误，处理错误计数
            uint256 currentErrorCount = passwordErrorCount[msg.sender];
            passwordErrorCount[msg.sender] = currentErrorCount + 1;
            emit AgentPasswordErrorOccurred(msg.sender, passwordErrorCount[msg.sender]);
            
            // 检查是否达到锁定条件
            if (passwordErrorCount[msg.sender] >= MAX_PASSWORD_ERRORS) {
                passwordLockedUntil[msg.sender] = block.timestamp + LOCK_DURATION;
                emit AgentPasswordLocked(msg.sender, passwordLockedUntil[msg.sender]);
                revert TooManyAgentPasswordErrors();
            } else {
                revert InvalidAgentPassword();
            }
        }
        
        // 密码正确，重置错误计数
        _resetPasswordErrorCount();
        
        authKeyInfo.status = AuthKeyStatus.INVALIDATED;
        emit AuthKeyInvalidated(msg.sender, block.timestamp);
        return true;
    }
    
    // ============ 模块三：Agent密码管理 ============
    
    /**
     * @dev 检查密码并更新错误计数（不会回滚状态变化）
     * @param password 要检查的密码
     * @return isValid 密码是否正确
     * @return shouldLock 是否应该锁定
     */
    function checkPassword(string memory password) 
        external 
        returns (bool isValid, bool shouldLock) 
    {
        // 检查是否被锁定
        if (_checkPasswordLock()) {
            revert AgentPasswordLockedError();
        }
        
        // 检查密码是否正确
        isValid = keccak256(abi.encodePacked(password)) == agentPasswordHash;
        
        if (!isValid) {
            // 密码错误，增加错误计数
            passwordErrorCount[msg.sender]++;
            uint256 currentErrorCount = passwordErrorCount[msg.sender];
            emit AgentPasswordErrorOccurred(msg.sender, currentErrorCount);
            
            // 检查是否达到锁定条件
            if (currentErrorCount >= MAX_PASSWORD_ERRORS) {
                passwordLockedUntil[msg.sender] = block.timestamp + LOCK_DURATION;
                emit AgentPasswordLocked(msg.sender, passwordLockedUntil[msg.sender]);
                shouldLock = true;
            } else {
                shouldLock = false;
            }
        } else {
            // 密码正确，重置错误计数
            _resetPasswordErrorCount();
            shouldLock = false;
        }
        
        return (isValid, shouldLock);
    }
    
    /**
     * @dev 修改Agent基础密码（需旧密码）
     * @param oldPassword 旧密码
     * @param newPassword 新密码
     */
    function updateAgentPassword(string memory oldPassword, string memory newPassword) 
        external 
        onlyOwner 
        validAgentPassword(oldPassword)
    {
        // 密码验证已通过修饰符完成
        
        // 更新密码哈希
        agentPasswordHash = keccak256(abi.encodePacked(newPassword));
        
        // 失效所有授权密钥
        authKeyInfo.status = AuthKeyStatus.INVALIDATED;
        
        // 重置密码错误计数（重置所有地址的计数）
        // 注意：这里我们只能重置owner的计数，因为映射无法批量重置
        
        emit AgentPasswordUpdated(msg.sender, block.timestamp);
    }
    
    /**
     * @dev 重置Agent基础密码（忘记旧密码）
     * @param newPassword 新密码
     */
    function resetAgentPassword(string memory newPassword) 
        external 
        onlyOwner 
    {
        // 直接重置密码哈希
        agentPasswordHash = keccak256(abi.encodePacked(newPassword));
        
        // 失效所有授权密钥
        authKeyInfo.status = AuthKeyStatus.INVALIDATED;
        
        // 重置密码错误计数（重置所有地址的计数）
        // 注意：这里我们只能重置owner的计数，因为映射无法批量重置
        
        emit AgentPasswordReset(msg.sender, block.timestamp);
    }
    
    // ============ 模块四：权限与应急处理 ============
    
    /**
     * @dev 发起所有权转移
     * @param newOwner 新所有者地址
     */
    function transferOwnership(address newOwner) 
        external 
        onlyOwner 
    {
        require(newOwner != address(0), "New owner cannot be zero address");
        require(newOwner != owner, "New owner cannot be current owner");
        
        pendingOwner = newOwner;
        transferInitiatedTime = block.timestamp;
        
        emit OwnershipTransferInitiated(owner, newOwner, block.timestamp);
    }
    
    /**
     * @dev 确认接受所有权
     */
    function acceptOwnership() external {
        if (pendingOwner == address(0)) revert OwnershipTransferNotInitiated();
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        if (block.timestamp > transferInitiatedTime + TRANSFER_TIMEOUT) {
            revert OwnershipTransferExpired();
        }
        
        address previousOwner = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        transferInitiatedTime = 0;
        
        emit OwnershipTransferred(previousOwner, owner);
    }
    
    /**
     * @dev 紧急暂停合约
     */
    function emergencyPause() external onlyOwner {
        isPaused = true;
        emit ContractPaused(msg.sender, block.timestamp);
    }
    
    /**
     * @dev 恢复合约运行
     */
    function emergencyUnpause() external onlyOwner {
        isPaused = false;
        emit ContractUnpaused(msg.sender, block.timestamp);
    }
    
    /**
     * @dev 修改密钥有效期
     * @param newExpiryTime 新的有效期（秒）
     */
    function updateAuthKeyExpiry(uint256 newExpiryTime) external onlyOwner {
        uint256 oldExpiry = authKeyExpiryTime;
        authKeyExpiryTime = newExpiryTime;
        emit AuthKeyExpiryUpdated(oldExpiry, newExpiryTime);
    }
    
    // ============ 模块五：异常与边界处理内部函数 ============
    
    /**
     * @dev 检查Agent基础密码锁定状态
     * @return 是否被锁定
     */
    function _checkPasswordLock() internal view returns (bool) {
        return block.timestamp < passwordLockedUntil[msg.sender];
    }
    
    /**
     * @dev 公共函数用于测试密码锁定状态
     * @return 是否被锁定
     */
    function checkPasswordLockStatus() external view returns (bool) {
        return _checkPasswordLock();
    }
    

    
    /**
     * @dev 处理Agent基础密码错误计数和锁定（已废弃，逻辑移至_validateAgentPassword）
     */
    function _handlePasswordError() internal {
        // 此函数已废弃，逻辑已移至 _validateAgentPassword 函数
    }
    
    /**
     * @dev 验证授权密钥状态是否有效
     * @return 是否有效
     */
    function _validateKeyStatus() internal view returns (bool) {
        // 检查授权密钥状态
        if (authKeyInfo.status != AuthKeyStatus.VALID) {
            return false;
        }
        
        // 检查授权密钥是否过期
        if (block.timestamp > authKeyInfo.generateTime + authKeyExpiryTime) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev 重置密码错误计数
     */
    function _resetPasswordErrorCount() internal {
        if (passwordErrorCount[msg.sender] > 0) {
            passwordErrorCount[msg.sender] = 0;
        }
    }
    
    // ============ 工具函数 ============
    
    /**
     * @dev 将uint256转换为字符串
     * @param _i 要转换的数字
     * @return _uintAsString 转换后的字符串
     */
    function _uint2str(uint256 _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
    
    /**
     * @dev 将地址转换为字符串
     * @param _addr 要转换的地址
     * @return 转换后的字符串
     */
    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2+i*2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3+i*2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
    
    // ============ 查询函数 ============
    
    /**
     * @dev 获取当前授权密钥状态
     * @return status 密钥状态
     * @return generateTime 生成时间
     * @return isExpired 是否过期
     */
    function getAuthKeyStatus() 
        external 
        view 
        returns (AuthKeyStatus status, uint256 generateTime, bool isExpired) 
    {
        status = authKeyInfo.status;
        generateTime = authKeyInfo.generateTime;
        isExpired = block.timestamp > authKeyInfo.generateTime + authKeyExpiryTime;
    }
    
    /**
     * @dev 获取密码锁定信息
     * @return isLocked 是否被锁定
     * @return errorCount 错误次数
     * @return lockedUntil 锁定截止时间
     */
    function getPasswordLockInfo() 
        external 
        view 
        returns (bool isLocked, uint256 errorCount, uint256 lockedUntil) 
    {
        isLocked = block.timestamp < passwordLockedUntil[msg.sender];
        errorCount = passwordErrorCount[msg.sender];
        lockedUntil = passwordLockedUntil[msg.sender];
    }
    
    /**
     * @dev 获取允许的字段列表
     * @return 允许的字段数组
     */
    function getAllowedFields() external view returns (string[] memory) {
        return allowedFields;
    }
}