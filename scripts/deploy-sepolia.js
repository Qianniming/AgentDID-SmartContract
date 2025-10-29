const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 开始部署 AgentDID 智能合约到 Sepolia 测试网...\n");

  // 检查环境变量
  const requiredEnvVars = [
    "SEPOLIA_RPC_URL",
    "PRIVATE_KEY", 
    "AGENT_NAME",
    "AGENT_FUNCTION_TYPE",
    "AGENT_VERSION",
    "AGENT_INITIAL_PASSWORD"
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ 错误: 环境变量 ${envVar} 未设置`);
      console.error("请检查 .env 文件配置");
      process.exit(1);
    }
  }

  // 获取部署参数
  const agentName = process.env.AGENT_NAME;
  const functionType = process.env.AGENT_FUNCTION_TYPE;
  const version = process.env.AGENT_VERSION;
  const initialPassword = process.env.AGENT_INITIAL_PASSWORD;

  console.log("📋 部署参数:");
  console.log(`   Agent名称: ${agentName}`);
  console.log(`   功能类型: ${functionType}`);
  console.log(`   版本: ${version}`);
  console.log(`   网络: Sepolia (Chain ID: 11155111)`);
  console.log("");

  // 获取签名者
  const [deployer] = await ethers.getSigners();
  console.log("👤 部署账户:", deployer.address);

  // 检查账户余额
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceInEth = ethers.formatEther(balance);
  console.log("💰 账户余额:", balanceInEth, "ETH");

  if (parseFloat(balanceInEth) < 0.01) {
    console.warn("⚠️  警告: 账户余额较低，可能不足以支付部署费用");
    console.warn("   建议至少有 0.01 ETH 用于部署");
  }
  console.log("");

  try {
    // 获取合约工厂
    console.log("📦 编译合约...");
    const AgentDID = await ethers.getContractFactory("AgentDID");

    // 估算部署费用
    console.log("💸 估算部署费用...");
    const deploymentData = AgentDID.interface.encodeDeploy([
      agentName,
      functionType,
      version,
      initialPassword
    ]);

    const gasEstimate = await ethers.provider.estimateGas({
      data: deploymentData,
      from: deployer.address
    });

    const gasPrice = await ethers.provider.getFeeData();
    const estimatedCost = gasEstimate * gasPrice.gasPrice;
    const estimatedCostInEth = ethers.formatEther(estimatedCost);

    console.log(`   预估 Gas: ${gasEstimate.toString()}`);
    console.log(`   Gas 价格: ${ethers.formatUnits(gasPrice.gasPrice, "gwei")} Gwei`);
    console.log(`   预估费用: ${estimatedCostInEth} ETH`);
    console.log("");

    // 部署合约
    console.log("🔨 部署合约中...");
    const contract = await AgentDID.deploy(
      agentName,
      functionType,
      version,
      initialPassword,
      {
        gasLimit: BigInt(500000), // 设置足够的 Gas 限制
      }
    );

    console.log("⏳ 等待交易确认...");
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    const deploymentTx = contract.deploymentTransaction();

    console.log("✅ 合约部署成功!");
    console.log(`   合约地址: ${contractAddress}`);
    console.log(`   交易哈希: ${deploymentTx.hash}`);
    console.log(`   区块号: ${deploymentTx.blockNumber}`);
    console.log("");

    // 验证部署
    console.log("🔍 验证合约部署...");
    try {
      const [fields, values] = await contract.getDIDDocument();
      console.log("✅ 合约功能验证成功!");
      console.log("   DID文档字段数量:", fields.length);
      
      // 显示 DID 信息
      const didIndex = fields.indexOf("did");
      if (didIndex !== -1) {
        console.log(`   DID标识: ${values[didIndex]}`);
      }
      console.log("");
    } catch (error) {
      console.error("❌ 合约功能验证失败:", error.message);
    }

    // 保存部署信息
    const deploymentInfo = {
      network: "sepolia",
      chainId: 11155111,
      contractAddress: contractAddress,
      deploymentTx: deploymentTx.hash,
      blockNumber: deploymentTx.blockNumber,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      gasUsed: deploymentTx.gasLimit?.toString(),
      gasPrice: deploymentTx.gasPrice?.toString(),
      agentName: agentName,
      functionType: functionType,
      version: version
    };

    // 写入部署记录文件
    const fs = require("fs");
    const deploymentFile = `deployment-sepolia-${Date.now()}.json`;
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`📄 部署信息已保存到: ${deploymentFile}`);
    console.log("");

    // 合约验证提示
    if (process.env.ETHERSCAN_API_KEY) {
      console.log("🔐 合约验证命令:");
      console.log(`npx hardhat verify --network sepolia ${contractAddress} "${agentName}" "${functionType}" "${version}" "${initialPassword}"`);
      console.log("");
      console.log("⚠️  注意: 合约验证会公开构造函数参数，包括初始密码");
      console.log("   如果密码敏感，请考虑在验证前修改密码");
    } else {
      console.log("⚠️  未设置 ETHERSCAN_API_KEY，无法自动验证合约");
      console.log("   请在 .env 文件中添加 Etherscan API Key 以启用合约验证");
    }
    console.log("");

    console.log("🎉 部署完成!");
    console.log(`🔗 在 Sepolia Etherscan 查看: https://sepolia.etherscan.io/address/${contractAddress}`);

  } catch (error) {
    console.error("❌ 部署失败:", error);
    
    if (error.code === "INSUFFICIENT_FUNDS") {
      console.error("💰 账户余额不足，请向账户充值 Sepolia ETH");
      console.error("   获取测试 ETH: https://sepoliafaucet.com/");
    } else if (error.code === "NETWORK_ERROR") {
      console.error("🌐 网络连接错误，请检查 SEPOLIA_RPC_URL 配置");
    } else if (error.message.includes("nonce")) {
      console.error("🔢 Nonce 错误，请稍后重试");
    }
    
    process.exit(1);
  }
}

// 错误处理
process.on("unhandledRejection", (error) => {
  console.error("❌ 未处理的错误:", error);
  process.exit(1);
});

// 运行部署脚本
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });