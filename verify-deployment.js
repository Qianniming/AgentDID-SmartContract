const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔍 验证 Sepolia 网络上的 AgentDID 合约部署...\n");

  // 合约地址（从部署输出中获取）
  const contractAddress = "0x8E2e0E6c73157CA291fA978102b4db80381C916C";
  
  try {
    // 连接到已部署的合约
    const AgentDID = await ethers.getContractFactory("AgentDID");
    const contract = AgentDID.attach(contractAddress);
    
    console.log("📋 合约基本信息:");
    console.log(`   合约地址: ${contractAddress}`);
    console.log(`   网络: Sepolia (Chain ID: 11155111)`);
    
    // 验证合约Owner
    const owner = await contract.owner();
    console.log(`   合约Owner: ${owner}`);
    
    // 获取DID文档
    console.log("\n📄 DID文档信息:");
    const agentName = await contract.getDIDDocField("agentName");
    const functionType = await contract.getDIDDocField("functionType");
    const version = await contract.getDIDDocField("version");
    const did = await contract.getDIDDocField("did");
    
    console.log(`   Agent名称: ${agentName}`);
    console.log(`   功能类型: ${functionType}`);
    console.log(`   版本: ${version}`);
    console.log(`   DID标识: ${did}`);
    
    // 检查系统参数
    console.log("\n⚙️ 系统参数:");
    const authKeyExpiryTime = await contract.authKeyExpiryTime();
    const isPaused = await contract.isPaused();
    const maxBatchSize = await contract.maxBatchSize();
    
    console.log(`   授权密钥有效期: ${authKeyExpiryTime} 秒`);
    console.log(`   合约暂停状态: ${isPaused}`);
    console.log(`   最大批量操作数: ${maxBatchSize}`);
    
    // 检查授权密钥状态
    console.log("\n🔑 授权密钥状态:");
    const authKeyStatus = await contract.getAuthKeyStatus();
    const statusNames = ["VALID", "USED", "EXPIRED", "INVALIDATED"];
    console.log(`   状态: ${statusNames[authKeyStatus[0]]}`);
    console.log(`   生成时间: ${authKeyStatus[1]}`);
    console.log(`   是否过期: ${authKeyStatus[2]}`);
    
    console.log("\n✅ 合约验证完成！");
    console.log("\n🌐 在 Etherscan 上查看:");
    console.log(`   https://sepolia.etherscan.io/address/${contractAddress}`);
    
  } catch (error) {
    console.error("❌ 验证失败:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });