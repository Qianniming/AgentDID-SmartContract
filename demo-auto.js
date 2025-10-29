const { ethers } = require("hardhat");

// 合约地址 - 从部署脚本获取
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Agent密码 - 用于演示
const AGENT_PASSWORD = "securePassword123";

// 工具函数：格式化输出
function printSection(title) {
    console.log("\n" + "=".repeat(60));
    console.log(`🔹 ${title}`);
    console.log("=".repeat(60));
}

function printSubSection(title) {
    console.log(`\n📋 ${title}`);
    console.log("-".repeat(40));
}

function printSuccess(message) {
    console.log(`✅ ${message}`);
}

function printError(message) {
    console.log(`❌ ${message}`);
}

function printInfo(key, value) {
    console.log(`   ${key}: ${value}`);
}

// 工具函数：延迟
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    try {
        printSection("AgentDID 智能合约交互演示 (自动模式)");
        
        // 1. 连接到合约
        printSubSection("1. 连接到已部署的合约");
        
        const [owner, agent, thirdParty] = await ethers.getSigners();
        const AgentDID = await ethers.getContractFactory("AgentDID");
        const contract = AgentDID.attach(CONTRACT_ADDRESS);
        
        printSuccess("合约连接成功");
        printInfo("合约地址", CONTRACT_ADDRESS);
        printInfo("Owner地址", owner.address);
        printInfo("Agent地址", agent.address);
        printInfo("第三方地址", thirdParty.address);
        
        await delay(1000);
        
        // 2. 查询初始状态
        printSubSection("2. 查询合约初始状态");
        
        const didDoc = await contract.getDIDDocument();
        const systemParams = await contract.getSystemParameters();
        const lockInfo = await contract.getPasswordLockInfo();
        
        printSuccess("DID文档信息:");
        printInfo("Agent名称", didDoc.agentName);
        printInfo("功能类型", didDoc.functionType);
        printInfo("版本", didDoc.version);
        printInfo("DID标识", didDoc.did);
        
        printSuccess("系统参数:");
        printInfo("授权密钥有效期", `${systemParams.authKeyValidityPeriod} 秒`);
        printInfo("合约暂停状态", systemParams.isPaused);
        printInfo("最大批量操作数", systemParams.maxBatchSize.toString());
        
        printSuccess("密码锁定信息:");
        printInfo("是否锁定", lockInfo.isLocked);
        printInfo("错误次数", lockInfo.errorCount.toString());
        
        await delay(1000);
        
        // 3. 更新DID文档字段
        printSubSection("3. 演示更新DID文档字段");
        
        console.log("正在更新服务URL和描述...");
        const updateTx = await contract.connect(owner).updateDIDDocument(
            ["serviceUrl", "description"],
            ["https://api.ai-assistant.com", "高级AI助手，提供多种智能服务"]
        );
        await updateTx.wait();
        
        printSuccess("DID文档更新成功");
        printInfo("交易哈希", updateTx.hash);
        
        // 查询更新后的DID文档
        const updatedDidDoc = await contract.getDIDDocument();
        printSuccess("更新后的DID文档:");
        printInfo("服务URL", updatedDidDoc.serviceUrl);
        printInfo("描述", updatedDidDoc.description);
        
        await delay(1000);
        
        // 4. 生成授权密钥
        printSubSection("4. 演示生成授权密钥");
        
        console.log("Agent正在生成授权密钥...");
        const authKeyTx = await contract.connect(agent).requestAuthKey(AGENT_PASSWORD);
        const authKeyReceipt = await authKeyTx.wait();
        
        // 从事件中获取授权密钥
        const authKeyEvent = authKeyReceipt.logs.find(
            log => log.fragment && log.fragment.name === "AuthKeyGenerated"
        );
        
        if (authKeyEvent) {
            const authKey = authKeyEvent.args.authKey;
            printSuccess("授权密钥生成成功");
            printInfo("授权密钥", authKey);
            printInfo("交易哈希", authKeyTx.hash);
            
            // 查询授权密钥状态
            const keyStatus = await contract.getAuthKeyStatus();
            printSuccess("授权密钥状态:");
            printInfo("状态", keyStatus.status === 0 ? "ACTIVE" : keyStatus.status === 1 ? "INVALIDATED" : "EXPIRED");
            printInfo("生成时间", new Date(Number(keyStatus.generatedAt) * 1000).toLocaleString());
            printInfo("是否过期", keyStatus.isExpired);
            
            await delay(1000);
            
            // 5. 第三方验证授权密钥
            printSubSection("5. 演示第三方验证授权密钥");
            
            console.log("第三方正在验证授权密钥...");
            const isValid = await contract.connect(thirdParty).verifyAuthKey(authKey);
            
            if (isValid) {
                printSuccess("授权密钥验证通过");
                printInfo("验证结果", "有效");
            } else {
                printError("授权密钥验证失败");
                printInfo("验证结果", "无效");
            }
            
            await delay(1000);
            
            // 6. 演示密钥失效
            printSubSection("6. 演示主动失效授权密钥");
            
            console.log("Agent正在失效当前授权密钥...");
            const invalidateTx = await contract.connect(agent).invalidateAuthKey(AGENT_PASSWORD);
            await invalidateTx.wait();
            
            printSuccess("授权密钥已失效");
            printInfo("交易哈希", invalidateTx.hash);
            
            // 再次验证密钥（应该失败）
            console.log("再次验证已失效的密钥...");
            const isValidAfterInvalidation = await contract.connect(thirdParty).verifyAuthKey(authKey);
            
            if (!isValidAfterInvalidation) {
                printSuccess("验证结果符合预期：密钥已失效");
            } else {
                printError("验证结果异常：密钥仍然有效");
            }
            
            await delay(1000);
            
        } else {
            printError("未能获取授权密钥事件");
        }
        
        // 7. 演示密码验证功能
        printSubSection("7. 演示密码验证功能");
        
        console.log("测试正确密码验证...");
        const checkResult = await contract.connect(agent).checkPassword(AGENT_PASSWORD);
        await checkResult.wait();
        
        printSuccess("密码验证完成");
        
        // 查询密码锁定信息
        const finalLockInfo = await contract.getPasswordLockInfo();
        printSuccess("最终密码锁定信息:");
        printInfo("是否锁定", finalLockInfo.isLocked);
        printInfo("错误次数", finalLockInfo.errorCount.toString());
        
        await delay(1000);
        
        // 8. 演示系统参数查询
        printSubSection("8. 演示系统参数查询");
        
        const allowedFields = await contract.getAllowedFields();
        printSuccess("允许更新的字段列表:");
        allowedFields.forEach((field, index) => {
            printInfo(`字段 ${index + 1}`, field);
        });
        
        const finalSystemParams = await contract.getSystemParameters();
        printSuccess("最终系统参数:");
        printInfo("授权密钥有效期", `${finalSystemParams.authKeyValidityPeriod} 秒`);
        printInfo("合约暂停状态", finalSystemParams.isPaused);
        printInfo("最大批量操作数", finalSystemParams.maxBatchSize.toString());
        
        // 9. 演示完成
        printSection("演示完成");
        printSuccess("所有功能演示已完成！");
        console.log("\n📝 演示总结:");
        console.log("   ✅ 合约连接和状态查询");
        console.log("   ✅ DID文档字段更新");
        console.log("   ✅ 授权密钥生成和验证");
        console.log("   ✅ 授权密钥失效");
        console.log("   ✅ 密码验证机制");
        console.log("   ✅ 系统参数查询");
        
        console.log("\n🎉 AgentDID 智能合约功能完整且运行正常！");
        
    } catch (error) {
        printError(`演示过程中发生错误: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// 运行演示
if (require.main === module) {
    main()
        .then(() => {
            console.log("\n👋 感谢使用 AgentDID 演示！");
            process.exit(0);
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { main };