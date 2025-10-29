const { ethers } = require("hardhat");

async function main() {
  console.log("开始部署 AgentDID 智能合约...");

  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // 合约构造函数参数
  const agentName = "AI Assistant Agent";
  const functionType = "General Purpose AI";
  const version = "1.0.0";
  const initialAgentPassword = "SecurePassword123!";

  console.log("\n合约初始化参数:");
  console.log("- Agent名称:", agentName);
  console.log("- 功能类型:", functionType);
  console.log("- 版本:", version);
  console.log("- 初始密码: [已隐藏]");

  // 获取合约工厂
  const AgentDID = await ethers.getContractFactory("AgentDID");

  // 部署合约
  console.log("\n正在部署合约...");
  const agentDID = await AgentDID.deploy(
    agentName,
    functionType,
    version,
    initialAgentPassword
  );

  // 等待部署完成
  await agentDID.waitForDeployment();
  const contractAddress = await agentDID.getAddress();

  console.log("\n✅ 合约部署成功!");
  console.log("合约地址:", contractAddress);
  console.log("交易哈希:", agentDID.deploymentTransaction().hash);

  // 验证部署结果
  console.log("\n验证部署结果...");
  
  // 检查Owner
  const owner = await agentDID.owner();
  console.log("合约Owner:", owner);
  console.log("Owner验证:", owner === deployer.address ? "✅ 正确" : "❌ 错误");

  // 检查DID文档
  const didDocument = await agentDID.getDIDDocument();
  console.log("\nDID文档字段:");
  for (let i = 0; i < didDocument[0].length; i++) {
    console.log(`- ${didDocument[0][i]}: ${didDocument[1][i]}`);
  }

  // 检查系统参数
  const authKeyExpiryTime = await agentDID.authKeyExpiryTime();
  const isPaused = await agentDID.isPaused();
  const maxBatchSize = await agentDID.maxBatchSize();

  console.log("\n系统参数:");
  console.log("- 授权密钥有效期:", authKeyExpiryTime.toString(), "秒");
  console.log("- 合约暂停状态:", isPaused);
  console.log("- 最大批量操作数:", maxBatchSize.toString());

  // 检查授权密钥状态
  const authKeyStatus = await agentDID.getAuthKeyStatus();
  console.log("\n授权密钥状态:");
  console.log("- 状态:", getAuthKeyStatusName(authKeyStatus[0]));
  console.log("- 生成时间:", authKeyStatus[1].toString());
  console.log("- 是否过期:", authKeyStatus[2]);

  // 检查密码锁定信息
  const passwordLockInfo = await agentDID.getPasswordLockInfo();
  console.log("\n密码锁定信息:");
  console.log("- 是否锁定:", passwordLockInfo[0]);
  console.log("- 错误次数:", passwordLockInfo[1].toString());
  console.log("- 锁定截止时间:", passwordLockInfo[2].toString());

  console.log("\n🎉 AgentDID 智能合约部署完成!");
  console.log("📝 请保存合约地址以便后续使用:", contractAddress);

  // 返回合约实例供测试使用
  return {
    contract: agentDID,
    address: contractAddress,
    deployer: deployer,
    initParams: {
      agentName,
      functionType,
      version,
      initialAgentPassword
    }
  };
}

// 辅助函数：获取授权密钥状态名称
function getAuthKeyStatusName(status) {
  const statusNames = ["VALID", "USED", "EXPIRED", "INVALIDATED"];
  return statusNames[status] || "UNKNOWN";
}

// 如果直接运行此脚本则执行部署
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ 部署失败:", error);
      process.exit(1);
    });
}

module.exports = main;