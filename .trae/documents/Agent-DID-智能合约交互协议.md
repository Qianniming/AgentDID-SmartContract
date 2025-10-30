# Agent DID 智能合约交互协议

**文档信息**
- **作者**: Qianniming
- **版本**: 1.0.0
- **日期**: 2025年10月30日
- **许可证**: Apache License 2.0

## 1. 协议概述

### 1.1 协议目标
本协议定义了Agent DID智能合约的标准交互接口，为AI Agent开发者和第三方应用提供统一的身份管理和认证标准。

### 1.2 核心功能
- **去中心化身份管理**：基于以太坊的DID标准实现
- **安全认证机制**：双层密钥体系（基础密码+临时授权密钥）
- **权限控制**：多角色权限管理
- **异常处理**：防暴力破解和安全保护

### 1.3 适用对象
- AI Agent开发者
- 第三方应用开发者
- DID身份验证服务提供商
- 区块链集成开发者

## 2. 合约基本信息

### 2.1 合约地址格式
```
合约地址: 0x{40位十六进制地址}
网络: 以太坊主网/测试网
Solidity版本: ^0.8.19
```

### 2.2 DID标识格式
```
DID格式: did:ethr:{chainId}:{contractAddress}
示例: did:ethr:1:0x1234567890123456789012345678901234567890
```

## 3. 角色权限体系

| 角色 | 身份验证方式 | 权限范围 | 典型用例 |
|------|-------------|----------|----------|
| Owner | msg.sender验证 | 全部管理权限 | 合约部署者、Agent所有者 |
| Agent | 基础密码验证 | 授权密钥管理、DID查询 | AI Agent实例 |
| 第三方应用 | 授权密钥验证 | 身份验证、DID查询 | 应用服务、API调用方 |
| 公开访问 | 无需验证 | DID文档只读查询 | 公开信息查询 |

## 4. 接口规范

### 4.1 DID文档管理接口

#### 4.1.1 查询完整DID文档
```solidity
function getDIDDocument() external view returns (string[] memory fields, string[] memory values)
```

**接口说明**：获取Agent的完整DID文档信息

**权限要求**：公开访问

**请求参数**：无

**返回值**：
```json
{
  "fields": ["agentName", "functionType", "version", "serviceUrl", "description", "did"],
  "values": ["MyAgent", "ChatBot", "1.0.0", "https://api.example.com", "智能客服Agent", "did:ethr:1:0x..."]
}
```

**调用示例**：
```javascript
const contract = new ethers.Contract(contractAddress, abi, provider);
const [fields, values] = await contract.getDIDDocument();
const didDoc = {};
fields.forEach((field, index) => {
  didDoc[field] = values[index];
});
```

#### 4.1.2 查询单个DID字段
```solidity
function getDIDDocField(string memory fieldName) external view returns (string memory)
```

**接口说明**：查询DID文档中的特定字段

**权限要求**：公开访问

**请求参数**：
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| fieldName | string | 是 | 字段名称，支持：agentName, functionType, version, serviceUrl, description, did |

**返回值**：字段对应的值（string类型）

**调用示例**：
```javascript
const agentName = await contract.getDIDDocField("agentName");
const serviceUrl = await contract.getDIDDocField("serviceUrl");
```

#### 4.1.3 更新单个DID字段（Owner专用）
```solidity
function updateDIDDocField(string memory fieldName, string memory newValue) external onlyOwner validField(fieldName)
```

**接口说明**：更新DID文档中的单个字段

**权限要求**：仅Owner

**请求参数**：
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| fieldName | string | 是 | 字段名称 |
| newValue | string | 是 | 新的字段值 |

**事件触发**：
```solidity
event DIDDocumentUpdated(string indexed fieldName, string newValue);
```

**调用示例**：
```javascript
const tx = await contract.connect(ownerSigner).updateDIDDocField("serviceUrl", "https://new-api.example.com");
await tx.wait();
```

#### 4.1.4 批量更新DID文档（Owner专用）
```solidity
function updateDIDDocument(string[] memory fields, string[] memory values) external onlyOwner
```

**接口说明**：批量更新DID文档的多个字段

**权限要求**：仅Owner

**请求参数**：
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| fields | string[] | 是 | 字段名称数组 |
| values | string[] | 是 | 字段值数组，需与fields数组长度一致 |

**约束条件**：
- fields和values数组长度必须一致
- 数组长度不能超过maxBatchSize（默认50）
- 所有字段名必须在白名单中

**事件触发**：
```solidity
event DIDDocumentBatchUpdated(string[] fields, string[] values);
```

### 4.2 授权密钥管理接口

#### 4.2.1 请求授权密钥（Agent专用）
```solidity
function requestAuthKey(string memory agentPassword) external whenNotPaused returns (bool)
```

**接口说明**：Agent使用基础密码生成临时授权密钥

**权限要求**：需要正确的Agent基础密码

**请求参数**：
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| agentPassword | string | 是 | Agent基础密码（明文） |

**返回值**：bool - 是否成功生成授权密钥

**安全机制**：
- 密码错误超过5次将锁定1小时
- 生成新密钥时自动失效旧密钥
- 密钥包含时间戳和随机数确保唯一性

**事件触发**：
```solidity
event AuthKeyGenerated(address indexed agent, uint256 generateTime);
```

**错误处理**：
| 错误类型 | 错误码 | 说明 |
|----------|--------|------|
| InvalidAgentPassword | - | 密码错误 |
| AgentPasswordLockedError | - | 密码锁定中 |
| TooManyAgentPasswordErrors | - | 错误次数过多 |
| ContractPausedError | - | 合约已暂停 |

**调用示例**：
```javascript
try {
  const tx = await contract.connect(agentSigner).requestAuthKey("your_agent_password");
  const receipt = await tx.wait();
  console.log("授权密钥生成成功");
} catch (error) {
  if (error.message.includes("InvalidAgentPassword")) {
    console.log("密码错误，请重试");
  } else if (error.message.includes("AgentPasswordLockedError")) {
    console.log("密码错误次数过多，已锁定1小时");
  }
}
```

#### 4.2.2 验证Agent身份（第三方应用专用）
```solidity
function verifyAgentAuth(string memory authKey) external whenNotPaused returns (bool)
```

**接口说明**：第三方应用使用授权密钥验证Agent身份

**权限要求**：无需特殊权限

**请求参数**：
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| authKey | string | 是 | Agent提供的授权密钥 |

**返回值**：bool - 验证是否成功

**验证逻辑**：
1. 检查授权密钥状态（必须为VALID）
2. 检查授权密钥是否过期
3. 验证密钥哈希匹配
4. 验证成功后标记为已使用

**事件触发**：
```solidity
event AuthKeyVerified(address indexed verifier, address indexed agent, bool success);
```

**调用示例**：
```javascript
const isValid = await contract.connect(thirdPartySigner).verifyAgentAuth(authKeyFromAgent);
if (isValid) {
  console.log("Agent身份验证成功");
  // 执行业务逻辑
} else {
  console.log("Agent身份验证失败");
}
```

#### 4.2.3 失效授权密钥（Agent专用）
```solidity
function invalidateAuthKey(string memory agentPassword) external whenNotPaused returns (bool)
```

**接口说明**：Agent主动失效当前授权密钥

**权限要求**：需要正确的Agent基础密码

**请求参数**：
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| agentPassword | string | 是 | Agent基础密码（明文） |

**返回值**：bool - 是否成功失效

**事件触发**：
```solidity
event AuthKeyInvalidated(address indexed agent, uint256 invalidateTime);
```

### 4.3 密码管理接口

#### 4.3.1 检查密码（调试用）
```solidity
function checkPassword(string memory password) external returns (bool isValid, bool shouldLock)
```

**接口说明**：检查密码正确性并返回锁定状态

**权限要求**：无特殊权限

**请求参数**：
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| password | string | 是 | 要检查的密码 |

**返回值**：
- isValid: 密码是否正确
- shouldLock: 是否应该锁定

#### 4.3.2 更新Agent密码（Owner专用）
```solidity
function updateAgentPassword(string memory oldPassword, string memory newPassword) external onlyOwner validAgentPassword(oldPassword)
```

**接口说明**：使用旧密码更新Agent基础密码

**权限要求**：仅Owner + 正确的旧密码

**请求参数**：
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| oldPassword | string | 是 | 当前密码 |
| newPassword | string | 是 | 新密码 |

**副作用**：
- 所有现有授权密钥失效
- 重置密码错误计数

**事件触发**：
```solidity
event AgentPasswordUpdated(address indexed owner, uint256 updateTime);
```

#### 4.3.3 重置Agent密码（Owner专用）
```solidity
function resetAgentPassword(string memory newPassword) external onlyOwner
```

**接口说明**：忘记旧密码时直接重置

**权限要求**：仅Owner

**请求参数**：
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| newPassword | string | 是 | 新密码 |

### 4.4 状态查询接口

#### 4.4.1 获取授权密钥状态
```solidity
function getAuthKeyStatus() external view returns (AuthKeyStatus status, uint256 generateTime, bool isExpired)
```

**接口说明**：查询当前授权密钥的状态信息

**权限要求**：公开访问

**返回值**：
- status: 密钥状态（0=VALID, 1=USED, 2=EXPIRED, 3=INVALIDATED）
- generateTime: 生成时间戳
- isExpired: 是否已过期

#### 4.4.2 获取密码锁定信息
```solidity
function getPasswordLockInfo() external view returns (bool isLocked, uint256 errorCount, uint256 lockedUntil)
```

**接口说明**：查询调用者的密码锁定状态

**权限要求**：公开访问

**返回值**：
- isLocked: 是否被锁定
- errorCount: 错误次数
- lockedUntil: 锁定截止时间

#### 4.4.3 获取允许的字段列表
```solidity
function getAllowedFields() external view returns (string[] memory)
```

**接口说明**：获取DID文档允许的字段白名单

**权限要求**：公开访问

**返回值**：允许的字段名称数组

### 4.5 权限管理接口（Owner专用）

#### 4.5.1 转移所有权
```solidity
function transferOwnership(address newOwner) external onlyOwner
```

**接口说明**：发起所有权转移

**权限要求**：仅Owner

**请求参数**：
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| newOwner | address | 是 | 新所有者地址 |

#### 4.5.2 接受所有权
```solidity
function acceptOwnership() external
```

**接口说明**：新所有者确认接受所有权

**权限要求**：必须是pendingOwner

**时间限制**：72小时内确认

#### 4.5.3 紧急暂停
```solidity
function emergencyPause() external onlyOwner
```

**接口说明**：紧急暂停合约关键功能

#### 4.5.4 恢复运行
```solidity
function emergencyUnpause() external onlyOwner
```

**接口说明**：恢复合约正常运行

## 5. 错误处理机制

### 5.1 标准错误类型

| 错误名称 | 触发条件 | 处理建议 |
|----------|----------|----------|
| OnlyOwner | 非Owner调用Owner专用函数 | 检查调用者权限 |
| ContractPausedError | 合约暂停期间调用受限函数 | 等待合约恢复 |
| InvalidAgentPassword | Agent密码错误 | 检查密码正确性 |
| AgentPasswordLockedError | 密码错误次数过多被锁定 | 等待锁定期结束 |
| TooManyAgentPasswordErrors | 达到最大错误次数 | 等待1小时后重试 |
| InvalidAuthKey | 授权密钥无效 | 重新生成授权密钥 |
| AuthKeyExpired | 授权密钥已过期 | 重新生成授权密钥 |
| AuthKeyAlreadyUsed | 授权密钥已被使用 | 重新生成授权密钥 |
| InvalidFieldName | DID字段名不在白名单中 | 使用允许的字段名 |
| ArrayLengthMismatch | 数组长度不匹配 | 检查输入参数 |

### 5.2 错误处理最佳实践

```javascript
// 错误处理示例
async function handleContractCall(contractFunction, ...args) {
  try {
    const result = await contractFunction(...args);
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error.message || error.toString();
    
    if (errorMessage.includes("InvalidAgentPassword")) {
      return { success: false, error: "INVALID_PASSWORD", message: "密码错误，请重试" };
    } else if (errorMessage.includes("AgentPasswordLockedError")) {
      return { success: false, error: "PASSWORD_LOCKED", message: "密码错误次数过多，已锁定1小时" };
    } else if (errorMessage.includes("AuthKeyExpired")) {
      return { success: false, error: "AUTH_KEY_EXPIRED", message: "授权密钥已过期，请重新生成" };
    } else if (errorMessage.includes("ContractPausedError")) {
      return { success: false, error: "CONTRACT_PAUSED", message: "合约已暂停，请稍后重试" };
    } else {
      return { success: false, error: "UNKNOWN_ERROR", message: "未知错误：" + errorMessage };
    }
  }
}
```

## 6. 安全要求和最佳实践

### 6.1 密码安全
- **明文传输**：Agent基础密码以明文形式传入合约，合约内部计算Keccak256哈希存储
- **密码强度**：建议使用至少32位随机字符串作为Agent基础密码
- **密码轮换**：定期更新Agent基础密码，特别是在怀疑泄露时
- **存储安全**：客户端不应明文存储Agent基础密码

### 6.2 授权密钥管理
- **一次性使用**：每个授权密钥验证后立即失效，不可重复使用
- **时效性**：授权密钥默认24小时有效期，建议根据业务需求调整
- **传输安全**：授权密钥在传输过程中建议使用HTTPS等加密通道
- **最小权限**：第三方应用仅获取必要的验证权限

### 6.3 防攻击机制
- **防暴力破解**：密码错误5次后锁定1小时
- **防重放攻击**：授权密钥包含时间戳和随机数
- **权限隔离**：严格的角色权限控制
- **应急响应**：Owner可紧急暂停合约

### 6.4 Gas优化建议
- **批量操作**：使用updateDIDDocument进行批量更新
- **状态查询**：优先使用view函数减少gas消耗
- **事件监听**：通过事件获取状态变更，避免频繁查询

## 7. 集成示例

### 7.1 Agent端集成示例

```javascript
class AgentDIDClient {
  constructor(contractAddress, privateKey, provider) {
    this.contract = new ethers.Contract(contractAddress, ABI, provider);
    this.signer = new ethers.Wallet(privateKey, provider);
    this.contractWithSigner = this.contract.connect(this.signer);
  }

  // 生成授权密钥
  async generateAuthKey(agentPassword) {
    try {
      const tx = await this.contractWithSigner.requestAuthKey(agentPassword);
      await tx.wait();
      return { success: true, message: "授权密钥生成成功" };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 失效授权密钥
  async invalidateAuthKey(agentPassword) {
    try {
      const tx = await this.contractWithSigner.invalidateAuthKey(agentPassword);
      await tx.wait();
      return { success: true, message: "授权密钥已失效" };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 获取DID文档
  async getDIDDocument() {
    try {
      const [fields, values] = await this.contract.getDIDDocument();
      const didDoc = {};
      fields.forEach((field, index) => {
        didDoc[field] = values[index];
      });
      return { success: true, data: didDoc };
    } catch (error) {
      return this.handleError(error);
    }
  }

  handleError(error) {
    // 错误处理逻辑（参考5.2节）
  }
}
```

### 7.2 第三方应用集成示例

```javascript
class ThirdPartyDIDVerifier {
  constructor(contractAddress, provider) {
    this.contract = new ethers.Contract(contractAddress, ABI, provider);
  }

  // 验证Agent身份
  async verifyAgent(authKey) {
    try {
      const isValid = await this.contract.verifyAgentAuth(authKey);
      if (isValid) {
        // 获取Agent信息
        const didDoc = await this.getAgentInfo();
        return {
          success: true,
          verified: true,
          agentInfo: didDoc.data
        };
      } else {
        return {
          success: true,
          verified: false,
          message: "身份验证失败"
        };
      }
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 获取Agent信息
  async getAgentInfo() {
    try {
      const [fields, values] = await this.contract.getDIDDocument();
      const agentInfo = {};
      fields.forEach((field, index) => {
        agentInfo[field] = values[index];
      });
      return { success: true, data: agentInfo };
    } catch (error) {
      return this.handleError(error);
    }
  }

  handleError(error) {
    // 错误处理逻辑
  }
}
```

### 7.3 完整交互流程示例

```javascript
// 1. Agent生成授权密钥
const agent = new AgentDIDClient(contractAddress, agentPrivateKey, provider);
const authResult = await agent.generateAuthKey("your_agent_password");

if (authResult.success) {
  // 2. Agent将授权密钥提供给第三方应用
  const authKey = "generated_auth_key"; // 实际应用中需要从合约事件或其他方式获取
  
  // 3. 第三方应用验证Agent身份
  const verifier = new ThirdPartyDIDVerifier(contractAddress, provider);
  const verifyResult = await verifier.verifyAgent(authKey);
  
  if (verifyResult.verified) {
    console.log("Agent验证成功:", verifyResult.agentInfo);
    // 执行业务逻辑
  } else {
    console.log("Agent验证失败");
  }
}
```

## 8. 测试用例和验证方法

### 8.1 基础功能测试

```javascript
describe("Agent DID Contract Tests", function() {
  
  it("应该能够查询DID文档", async function() {
    const [fields, values] = await contract.getDIDDocument();
    expect(fields.length).to.be.greaterThan(0);
    expect(values.length).to.equal(fields.length);
  });

  it("应该能够生成授权密钥", async function() {
    const tx = await contract.connect(agentSigner).requestAuthKey("correct_password");
    await expect(tx).to.emit(contract, "AuthKeyGenerated");
  });

  it("应该能够验证授权密钥", async function() {
    // 先生成授权密钥
    await contract.connect(agentSigner).requestAuthKey("correct_password");
    
    // 然后验证（需要实际的授权密钥值）
    const isValid = await contract.connect(thirdPartySigner).verifyAgentAuth("auth_key");
    expect(isValid).to.be.true;
  });
});
```

### 8.2 安全性测试

```javascript
describe("Security Tests", function() {
  
  it("应该拒绝错误的密码", async function() {
    await expect(
      contract.connect(agentSigner).requestAuthKey("wrong_password")
    ).to.be.revertedWithCustomError(contract, "InvalidAgentPassword");
  });

  it("应该在5次错误后锁定", async function() {
    // 连续5次错误密码
    for (let i = 0; i < 5; i++) {
      try {
        await contract.connect(agentSigner).requestAuthKey("wrong_password");
      } catch (error) {
        // 预期的错误
      }
    }
    
    // 第6次应该被锁定
    await expect(
      contract.connect(agentSigner).requestAuthKey("wrong_password")
    ).to.be.revertedWithCustomError(contract, "TooManyAgentPasswordErrors");
  });

  it("应该拒绝非Owner的管理操作", async function() {
    await expect(
      contract.connect(nonOwnerSigner).updateDIDDocField("agentName", "NewName")
    ).to.be.revertedWithCustomError(contract, "OnlyOwner");
  });
});
```

### 8.3 边界条件测试

```javascript
describe("Edge Cases Tests", function() {
  
  it("应该处理空字符串输入", async function() {
    await expect(
      contract.connect(ownerSigner).updateDIDDocField("agentName", "")
    ).to.not.be.reverted;
  });

  it("应该拒绝无效的字段名", async function() {
    await expect(
      contract.connect(ownerSigner).updateDIDDocField("invalidField", "value")
    ).to.be.revertedWithCustomError(contract, "InvalidFieldName");
  });

  it("应该处理数组长度不匹配", async function() {
    await expect(
      contract.connect(ownerSigner).updateDIDDocument(["field1"], ["value1", "value2"])
    ).to.be.revertedWithCustomError(contract, "ArrayLengthMismatch");
  });
});
```

## 9. 版本兼容性

### 9.1 当前版本
- 协议版本：1.0.0
- 合约版本：Solidity ^0.8.19
- 支持网络：以太坊主网、Sepolia测试网

### 9.2 向后兼容性
- 接口签名保持稳定
- 事件格式不变
- 错误类型向后兼容

### 9.3 升级策略
- 通过代理合约实现升级
- 保持存储布局兼容
- 提供迁移工具

## 10. 常见问题解答

### Q1: 如何获取授权密钥的实际值？
A: 授权密钥在合约内部生成，需要通过监听AuthKeyGenerated事件或调用专门的查询接口获取。

### Q2: 授权密钥可以重复使用吗？
A: 不可以。每个授权密钥验证后立即标记为已使用，需要重新生成。

### Q3: 如何处理密码锁定？
A: 等待1小时锁定期结束，或联系Owner重置密码。

### Q4: 合约暂停期间哪些功能可用？
A: 只有查询功能（view函数）可用，所有状态修改功能都会被暂停。

### Q5: 如何监听合约事件？
A: 使用Web3.js或ethers.js的事件监听功能：
```javascript
contract.on("AuthKeyGenerated", (agent, generateTime) => {
  console.log("授权密钥已生成:", agent, generateTime);
});
```

---

**协议版本**: 1.0.0  
**最后更新**: 2024年  
**维护团队**: Agent DID Team