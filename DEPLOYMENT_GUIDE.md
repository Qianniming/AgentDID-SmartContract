# AgentDID 智能合约 Sepolia 部署指南

## 📋 部署前准备

### 1. 环境要求
- Node.js 18+ 
- npm 或 yarn
- Git

### 2. 获取必要的服务账户

#### 2.1 获取 Sepolia 测试网 ETH
- 访问 [Sepolia Faucet](https://sepoliafaucet.com/) 获取测试 ETH
- 或使用 [Alchemy Faucet](https://sepoliafaucet.com/)
- 建议至少获取 0.1 ETH 用于部署和测试

#### 2.2 获取 RPC 服务
选择以下任一服务提供商：

**Infura (推荐)**
1. 访问 [Infura](https://infura.io/)
2. 注册账户并创建新项目
3. 选择 Ethereum 网络
4. 复制 Sepolia 端点 URL: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`

**Alchemy**
1. 访问 [Alchemy](https://www.alchemy.com/)
2. 创建新应用，选择 Sepolia 网络
3. 复制 HTTP URL: `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`

**公共 RPC (不推荐生产使用)**
- `https://rpc.sepolia.org`
- `https://sepolia.gateway.tenderly.co`

#### 2.3 获取 Etherscan API Key (可选，用于合约验证)
1. 访问 [Etherscan](https://etherscan.io/apis)
2. 注册账户并创建 API Key
3. 复制 API Key

### 3. 准备部署账户
1. 创建新的以太坊钱包账户（推荐使用 MetaMask）
2. **重要**: 仅用于测试，不要使用主网账户
3. 导出私钥（不包含 0x 前缀）
4. 向该账户转入 Sepolia ETH

## 🚀 部署步骤

### 步骤 1: 克隆和安装
```bash
# 如果还没有项目代码
git clone <your-repo-url>
cd SmartContract

# 安装依赖
npm install
```

### 步骤 2: 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件
notepad .env  # Windows
# 或
nano .env     # Linux/Mac
```

在 `.env` 文件中填入以下配置：
```env
# Sepolia RPC URL
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID

# 部署账户私钥 (不包含 0x 前缀)
PRIVATE_KEY=your_private_key_here_without_0x_prefix

# Etherscan API Key (可选)
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Agent DID 合约参数
AGENT_NAME=Production AI Agent
AGENT_FUNCTION_TYPE=AI Assistant  
AGENT_VERSION=1.0.0
AGENT_INITIAL_PASSWORD=your_secure_password_here
```

### 步骤 3: 验证配置
```bash
# 编译合约
npm run compile

# 运行测试 (可选)
npm test
```

### 步骤 4: 部署到 Sepolia
```bash
# 使用专用部署脚本
npx hardhat run scripts/deploy-sepolia.js --network sepolia

# 或使用通用部署脚本
npx hardhat run scripts/deploy.js --network sepolia
```

### 步骤 5: 验证合约 (可选)
```bash
# 自动验证 (如果设置了 ETHERSCAN_API_KEY)
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> "Agent Name" "Function Type" "1.0.0" "password"

# 注意: 验证会公开构造函数参数，包括初始密码
```

## 📊 部署输出示例

成功部署后，您将看到类似以下的输出：

```
🚀 开始部署 AgentDID 智能合约到 Sepolia 测试网...

📋 部署参数:
   Agent名称: Production AI Agent
   功能类型: AI Assistant
   版本: 1.0.0
   网络: Sepolia (Chain ID: 11155111)

👤 部署账户: 0x1234567890123456789012345678901234567890
💰 账户余额: 0.1 ETH

📦 编译合约...
💸 估算部署费用...
   预估 Gas: 2500000
   Gas 价格: 20 Gwei
   预估费用: 0.05 ETH

🔨 部署合约中...
⏳ 等待交易确认...
✅ 合约部署成功!
   合约地址: 0xAbCdEf1234567890123456789012345678901234
   交易哈希: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
   区块号: 12345678

🔍 验证合约部署...
✅ 合约功能验证成功!
   DID文档字段数量: 6
   DID标识: did:ethr:11155111:0xabcdef1234567890123456789012345678901234

📄 部署信息已保存到: deployment-sepolia-1234567890.json

🔐 合约验证命令:
npx hardhat verify --network sepolia 0xAbCdEf1234567890123456789012345678901234 "Production AI Agent" "AI Assistant" "1.0.0" "your_secure_password_here"

🎉 部署完成!
🔗 在 Sepolia Etherscan 查看: https://sepolia.etherscan.io/address/0xAbCdEf1234567890123456789012345678901234
```

## 🔧 部署后操作

### 1. 保存重要信息
- 合约地址
- 交易哈希  
- 部署区块号
- 部署信息 JSON 文件

### 2. 验证合约功能
```bash
# 运行快速演示验证部署
node quick-demo.js
```

### 3. 更新应用配置
在您的应用中更新合约地址：
```javascript
const CONTRACT_ADDRESS = "0xYourDeployedContractAddress";
const NETWORK_ID = 11155111; // Sepolia
```

## 🛠️ 故障排除

### 常见错误及解决方案

#### 1. 余额不足错误
```
Error: insufficient funds for intrinsic transaction cost
```
**解决方案**: 向部署账户充值更多 Sepolia ETH

#### 2. 网络连接错误
```
Error: could not detect network
```
**解决方案**: 
- 检查 `SEPOLIA_RPC_URL` 配置
- 确认 RPC 服务正常
- 尝试使用不同的 RPC 提供商

#### 3. 私钥格式错误
```
Error: invalid private key
```
**解决方案**:
- 确保私钥不包含 `0x` 前缀
- 检查私钥长度为 64 个字符
- 确认私钥格式正确

#### 4. Gas 估算失败
```
Error: cannot estimate gas
```
**解决方案**:
- 检查合约代码是否有语法错误
- 确认构造函数参数正确
- 尝试手动设置 gas limit

#### 5. Nonce 错误
```
Error: nonce too low
```
**解决方案**:
- 等待几分钟后重试
- 或重启 Hardhat 网络连接

### 调试技巧

1. **启用详细日志**:
```bash
DEBUG=* npx hardhat run scripts/deploy-sepolia.js --network sepolia
```

2. **检查网络连接**:
```bash
npx hardhat console --network sepolia
```

3. **验证环境变量**:
```bash
node -e "require('dotenv').config(); console.log(process.env.SEPOLIA_RPC_URL)"
```

## 📚 相关资源

- [Sepolia 测试网信息](https://sepolia.dev/)
- [Hardhat 文档](https://hardhat.org/docs)
- [Etherscan Sepolia](https://sepolia.etherscan.io/)
- [MetaMask 添加 Sepolia 网络](https://chainlist.org/chain/11155111)

## 🔒 安全注意事项

1. **私钥安全**:
   - 永远不要提交 `.env` 文件到版本控制
   - 使用专用的测试账户
   - 定期轮换私钥

2. **合约验证**:
   - 验证会公开构造函数参数
   - 如果密码敏感，验证前先修改密码

3. **网络确认**:
   - 确认部署到正确的网络
   - 检查合约地址和交易哈希

4. **备份重要信息**:
   - 保存部署信息 JSON 文件
   - 记录合约地址和相关参数

---

*最后更新: 2024年12月*