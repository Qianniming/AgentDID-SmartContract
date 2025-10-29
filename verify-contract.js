const { run } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔍 开始验证 AgentDID 合约...\n");

  // 合约信息
  const contractAddress = "0x8E2e0E6c73157CA291fA978102b4db80381C916C";
  const constructorArgs = [
    "AI Assistant Agent",
    "General Purpose AI", 
    "1.0.0",
    "SecurePassword123!"
  ];

  console.log("📋 验证信息:");
  console.log(`   合约地址: ${contractAddress}`);
  console.log(`   网络: Sepolia`);
  console.log(`   构造函数参数:`);
  console.log(`     - agentName: "${constructorArgs[0]}"`);
  console.log(`     - functionType: "${constructorArgs[1]}"`);
  console.log(`     - version: "${constructorArgs[2]}"`);
  console.log(`     - initialPassword: [已隐藏]`);
  console.log("");

  // 检查 API Key
  if (!process.env.ETHERSCAN_API_KEY) {
    console.log("❌ 错误: Etherscan API Key 未配置");
    console.log("请按照以下步骤配置:");
    console.log("1. 访问 https://etherscan.io/myapikey");
    console.log("2. 创建新的 API Key");
    console.log("3. 在 .env 文件中设置 ETHERSCAN_API_KEY=你的真实API密钥");
    console.log("");
    return;
  }

  console.log("✅ API Key 已配置");

  try {
    console.log("🚀 正在提交验证请求...");
    
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArgs
    });

    console.log("✅ 合约验证成功!");
    console.log("");
    console.log("🌐 查看验证结果:");
    console.log(`   https://sepolia.etherscan.io/address/${contractAddress}#code`);
    console.log("");
    console.log("📝 您现在可以:");
    console.log("   - 在 Etherscan 上查看合约源代码");
    console.log("   - 直接与合约进行交互");
    console.log("   - 让其他人审计您的代码");

  } catch (error) {
    console.log("❌ 验证失败:");
    
    if (error.message.includes("already verified")) {
      console.log("   合约已经验证过了!");
      console.log(`   查看链接: https://sepolia.etherscan.io/address/${contractAddress}#code`);
    } else if (error.message.includes("Invalid API Key")) {
      console.log("   API Key 无效，请检查配置");
    } else if (error.message.includes("Constructor arguments")) {
      console.log("   构造函数参数不匹配");
    } else {
      console.log(`   错误详情: ${error.message}`);
    }
    
    console.log("");
    console.log("💡 解决方案:");
    console.log("   1. 检查 .env 文件中的 ETHERSCAN_API_KEY");
    console.log("   2. 确认构造函数参数正确");
    console.log("   3. 查看 CONTRACT_VERIFICATION_GUIDE.md 获取详细指南");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });