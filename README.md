# 🤖 AgentDID Smart Contract

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-FFDB1C.svg)](https://hardhat.org/)
[![Solidity](https://img.shields.io/badge/Solidity-%5E0.8.19-363636)](https://soliditylang.org/)

一个基于以太坊区块链的去中心化身份（DID）智能合约，专为 AI 代理设计。

## 📋 项目概述

AgentDID 是一个创新的智能合约系统，为 AI 代理提供去中心化身份管理解决方案。通过区块链技术确保身份的不可篡改性和透明性。

## ✨ 核心功能

- 🆔 **AI 代理身份管理** - 创建和管理 AI 代理的唯一身份标识
- 📄 **DID 文档存储** - 安全存储和更新代理的身份文档
- 🔐 **授权密钥管理** - 灵活的密钥授权和撤销机制
- 📦 **批量操作支持** - 高效的批量身份操作
- ⏸️ **可暂停功能** - 紧急情况下的安全暂停机制
- 🔒 **访问控制** - 基于角色的权限管理

## 🌐 已部署合约

### Sepolia 测试网
- **合约地址**: [`0x8E2e0E6c73157CA291fA978102b4db80381C916C`](https://sepolia.etherscan.io/address/0x8E2e0E6c73157CA291fA978102b4db80381C916C)
- **网络**: Sepolia Testnet
- **状态**: ✅ 已验证
- **部署时间**: 2024年

### 合约信息
- **Agent Name**: AI Assistant Agent
- **Function Type**: General Purpose AI
- **Version**: 1.0.0
- **Owner**: 部署账户地址

## 项目概述

- **核心目标**：为AI Agent提供去中心化的身份管理和安全的授权机制
- **技术标准**：遵循DID标准(did:ethr格式)，采用Keccak256哈希算法确保安全性
- **部署环境**：以太坊主网/测试网，使用Solidity 0.8.19+版本开发

## 功能模块

### 五大核心模块

1. **模块一：基础身份与DID文档管理**
   - 合约部署初始化
   - DID文档字段更新
   - 公开查询功能

2. **模块二：授权密钥全生命周期管理**
   - 密钥生成与验证
   - 密钥失效处理
   - 自动过期机制

3. **模块三：Agent密码管理**
   - 密码修改（需旧密码）
   - 密码重置（忘记旧密码）
   - 哈希验证机制

4. **模块四：权限与应急处理**
   - 所有权转移
   - 紧急暂停/恢复
   - 参数配置管理

5. **模块五：异常与边界处理**
   - 权限拦截
   - 防暴力破解
   - 失效密钥处理

## 项目结构

```
SmartContract/
├── contracts/
│   └── AgentDID.sol          # 主智能合约
├── scripts/
│   └── deploy.js             # 部署脚本
├── test/
│   └── AgentDID.test.js      # 测试文件
├── hardhat.config.js         # Hardhat配置
├── package.json              # 项目依赖
└── README.md                 # 项目说明
```

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm 或 yarn
- Git

### 安装依赖

```bash
npm install
```

### 编译合约

```bash
npm run compile
```

### 运行测试

```bash
npm test
```

### 部署合约

```bash
# 部署到本地网络
npm run deploy:localhost

# 部署到其他网络
npm run deploy
```

### 启动本地节点

```bash
npm run node
```

## 测试覆盖

项目包含完整的测试套件，覆盖所有16个业务场景：

### 模块一：基础身份与DID文档管理
- ✅ 场景1：合约部署初始化
- ✅ 场景2：Owner更新DID文档单个字段
- ✅ 场景3：第三方查询DID文档

### 模块二：授权密钥全生命周期管理
- ✅ 场景4：Agent生成授权密钥
- ✅ 场景5：第三方验证有效授权密钥
- ✅ 场景6：Agent主动失效授权密钥
- ✅ 场景7：授权密钥自动过期

### 模块三：Agent密码管理
- ✅ 场景9：Owner修改Agent密码（提供旧密码）
- ✅ 场景10：Owner重置Agent密码（忘记旧密码）

### 模块四：权限与应急处理
- ✅ 场景11：Owner发起所有权转移
- ✅ 场景12：新Owner确认所有权转移
- ✅ 场景13：Owner紧急暂停和恢复合约

### 模块五：异常与边界处理
- ✅ 场景14：非Owner尝试修改权限/数据
- ✅ 场景15：Agent多次输入错误密码
- ✅ 场景16：第三方验证无效/过期密钥

## 安全特性

- **密码安全**：Agent基础密码和授权密钥均采用Keccak256哈希存储
- **密钥概念分离**：Agent基础密码用于身份认证，授权密钥用于临时验证
- **授权密钥唯一性**：同一时间仅允许一个有效授权密钥
- **防重放攻击**：授权密钥验证后立即标记为已使用
- **权限隔离**：严格的修饰符控制，确保只有授权角色可执行相应操作
- **应急机制**：紧急暂停功能，可快速停止关键操作
- **防暴力破解**：密码错误5次后锁定1小时

## Gas优化

- **存储优化**：使用mapping存储DID字段，支持部分更新
- **批量限制**：设置maxBatchSize参数，防止单次操作gas消耗过高
- **事件记录**：关键操作触发事件，便于链下监听和状态同步
- **自定义错误**：使用自定义错误替代require语句，节省gas

## 主要接口

### DID文档管理
- `updateDIDDocField(string fieldName, string newValue)` - 更新单个字段
- `updateDIDDocument(string[] fields, string[] values)` - 批量更新
- `getDIDDocument()` - 查询完整DID文档
- `getDIDDocField(string fieldName)` - 查询单个字段

### 授权密钥管理
- `requestAuthKey(string agentPassword)` - 生成授权密钥
- `verifyAgentAuth(string authKey)` - 验证授权密钥
- `invalidateAuthKey(string agentPassword)` - 失效授权密钥

### 密码管理
- `updateAgentPassword(string oldPassword, string newPassword)` - 修改密码
- `resetAgentPassword(string newPassword)` - 重置密码

### 权限控制
- `transferOwnership(address newOwner)` - 发起所有权转移
- `acceptOwnership()` - 确认所有权转移
- `emergencyPause()` - 紧急暂停
- `emergencyUnpause()` - 恢复运行

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进项目。

## 联系方式

如有问题，请通过GitHub Issues联系我们。