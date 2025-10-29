const { ethers } = require("hardhat");
require("dotenv").config();

async function testSepoliaConfig() {
  console.log("🔧 测试 Sepolia 网络配置...\n");

  // 检查环境变量
  const requiredEnvVars = [
    "SEPOLIA_RPC_URL",
    "PRIVATE_KEY", 
    "AGENT_NAME",
    "AGENT_FUNCTION_TYPE",
    "AGENT_VERSION",
    "AGENT_INITIAL_PASSWORD"
  ];

  console.log("📋 检查环境变量:");
  let missingVars = [];
  
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar}: 已设置`);
    } else {
      console.log(`   ❌ ${envVar}: 未设置`);
      missingVars.push(envVar);
    }
  }

  if (missingVars.length > 0) {
    console.log(`\n❌ 缺少环境变量: ${missingVars.join(", ")}`);
    console.log("请创建 .env 文件并设置这些变量");
    return;
  }

  console.log("\n🌐 测试网络连接:");
  try {
    // 测试网络连接
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const network = await provider.getNetwork();
    console.log(`   ✅ 网络连接成功`);
    console.log(`   📡 网络名称: ${network.name}`);
    console.log(`   🔗 Chain ID: ${network.chainId}`);
    
    if (network.chainId !== 11155111n) {
      console.log(`   ⚠️  警告: Chain ID 不是 Sepolia (11155111)`);
    }

    // 测试账户
    console.log("\n👤 测试部署账户:");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`   📍 地址: ${wallet.address}`);
    
    const balance = await provider.getBalance(wallet.address);
    const balanceInEth = ethers.formatEther(balance);
    console.log(`   💰 余额: ${balanceInEth} ETH`);
    
    if (parseFloat(balanceInEth) < 0.01) {
      console.log(`   ⚠️  警告: 余额较低，建议至少 0.01 ETH`);
      console.log(`   💡 获取测试 ETH: https://sepoliafaucet.com/`);
    } else {
      console.log(`   ✅ 余额充足，可以进行部署`);
    }

    // 测试合约编译
    console.log("\n📦 测试合约编译:");
    try {
      const AgentDID = await ethers.getContractFactory("AgentDID");
      console.log(`   ✅ 合约编译成功`);
      
      // 估算部署费用
      const deploymentData = AgentDID.interface.encodeDeploy([
        process.env.AGENT_NAME,
        process.env.AGENT_FUNCTION_TYPE,
        process.env.AGENT_VERSION,
        process.env.AGENT_INITIAL_PASSWORD
      ]);

      const gasEstimate = await provider.estimateGas({
        data: deploymentData,
        from: wallet.address
      });

      const feeData = await provider.getFeeData();
      const estimatedCost = gasEstimate * feeData.gasPrice;
      const estimatedCostInEth = ethers.formatEther(estimatedCost);

      console.log(`   ⛽ 预估 Gas: ${gasEstimate.toString()}`);
      console.log(`   💸 预估费用: ${estimatedCostInEth} ETH`);
      
    } catch (error) {
      console.log(`   ❌ 合约编译失败: ${error.message}`);
    }

    console.log("\n🎉 配置测试完成!");
    console.log("\n📝 部署命令:");
    console.log("   npm run deploy:sepolia");
    console.log("   或");
    console.log("   npx hardhat run scripts/deploy-sepolia.js --network sepolia");

  } catch (error) {
    console.log(`   ❌ 网络连接失败: ${error.message}`);
    console.log("\n🔧 可能的解决方案:");
    console.log("   1. 检查 SEPOLIA_RPC_URL 是否正确");
    console.log("   2. 确认网络连接正常");
    console.log("   3. 尝试使用不同的 RPC 提供商");
  }
}

testSepoliaConfig()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 测试失败:", error);
    process.exit(1);
  });