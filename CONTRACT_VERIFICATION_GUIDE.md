# AgentDID 合约验证指南

## 📋 概述

本指南将帮助您在 Sepolia Etherscan 上验证已部署的 AgentDID 智能合约源代码。

## 🔑 前置条件

### 1. 获取 Etherscan API Key

1. 访问 [Etherscan.io](https://etherscan.io/)
2. 注册账户并登录
3. 进入 [API Keys 页面](https://etherscan.io/myapikey)
4. 创建新的 API Key
5. 复制生成的 API Key

### 2. 更新环境配置

编辑 `.env` 文件，将您的真实 API Key 替换占位符：

```bash
# Etherscan API Key (用于合约验证)
ETHERSCAN_API_KEY=你的真实API密钥
```

## 🚀 验证步骤

### 已部署合约信息

- **合约地址**: `0x8E2e0E6c73157CA291fA978102b4db80381C916C`
- **网络**: Sepolia 测试网
- **构造函数参数**:
  - agentName: "AI Assistant Agent"
  - functionType: "General Purpose AI"
  - version: "1.0.0"
  - initialAgentPassword: "SecurePassword123!"

### 执行验证命令

```bash
npx hardhat verify --network sepolia 0x8E2e0E6c73157CA291fA978102b4db80381C916C "AI Assistant Agent" "General Purpose AI" "1.0.0" "SecurePassword123!"
```

### 或者使用 NPM 脚本

```bash
npm run verify:sepolia
```

## ✅ 验证成功后

验证成功后，您将看到类似以下的输出：

```
Successfully submitted source code for contract
contracts/AgentDID.sol:AgentDID at 0x8E2e0E6c73157CA291fA978102b4db80381C916C
for verification on the block explorer. Waiting for verification result...

Successfully verified contract AgentDID on Etherscan.
https://sepolia.etherscan.io/address/0x8E2e0E6c73157CA291fA978102b4db80381C916C#code
```

## 🌐 查看验证结果

验证成功后，您可以在以下链接查看合约源代码：

**Etherscan 验证页面**: https://sepolia.etherscan.io/address/0x8E2e0E6c73157CA291fA978102b4db80381C916C#code

在该页面您可以：
- 查看完整的合约源代码
- 查看编译器设置和版本
- 查看构造函数参数
- 与合约进行交互（读取/写入函数）

## 🔧 常见问题解决

### 1. API Key 错误
```
Error: Invalid API Key
```
**解决方案**: 确保您的 Etherscan API Key 是有效的，并且已正确配置在 `.env` 文件中。

### 2. 构造函数参数不匹配
```
Error: Constructor arguments mismatch
```
**解决方案**: 确保验证命令中的构造函数参数与部署时使用的参数完全一致。

### 3. 合约已验证
```
Error: Contract source code already verified
```
**解决方案**: 合约已经验证过了，您可以直接在 Etherscan 上查看源代码。

### 4. 网络连接问题
```
Error: Network request failed
```
**解决方案**: 检查网络连接，确保可以访问 Etherscan API。

## 📝 验证命令详解

```bash
npx hardhat verify \
  --network sepolia \                                    # 指定网络
  0x8E2e0E6c73157CA291fA978102b4db80381C916C \           # 合约地址
  "AI Assistant Agent" \                                 # 构造函数参数1: agentName
  "General Purpose AI" \                                 # 构造函数参数2: functionType
  "1.0.0" \                                             # 构造函数参数3: version
  "SecurePassword123!"                                   # 构造函数参数4: initialAgentPassword
```

## 🎯 验证的好处

1. **透明度**: 其他人可以查看和审计您的合约代码
2. **可信度**: 验证的合约更容易获得用户信任
3. **交互性**: 在 Etherscan 上直接与合约交互
4. **调试**: 更容易调试和分析合约行为

## 🔒 安全提醒

- 验证过程会公开您的合约源代码
- 确保代码中没有包含敏感信息
- API Key 应该保密，不要提交到版本控制系统

---

**注意**: 本指南基于当前部署的合约地址 `0x8E2e0E6c73157CA291fA978102b4db80381C916C`。如果您重新部署了合约，请相应更新合约地址。