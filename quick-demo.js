const { ethers } = require("hardhat");

async function main() {
    console.log("🔹 AgentDID 智能合约快速演示");
    console.log("=".repeat(50));
    
    try {
        // 获取签名者
        const [owner, agent, thirdParty] = await ethers.getSigners();
        console.log("✅ 获取签名者成功");
        console.log(`   Owner: ${owner.address}`);
        console.log(`   Agent: ${agent.address}`);
        console.log(`   第三方: ${thirdParty.address}`);
        
        // 部署新合约进行演示
        console.log("\n📋 部署新的演示合约...");
        const AgentDID = await ethers.getContractFactory("AgentDID");
        
        const agentName = "Demo AI Agent";
        const functionType = "Demo Assistant";
        const version = "1.0.0";
        const agentPassword = "demoPassword123";  // 使用原始密码字符串
        
        const contract = await AgentDID.deploy(
            agentName,
            functionType,
            version,
            agentPassword  // 传递原始密码，构造函数会自动哈希
        );
        
        await contract.waitForDeployment();
        const contractAddress = await contract.getAddress();
        
        console.log("✅ 合约部署成功");
        console.log(`   合约地址: ${contractAddress}`);
        
        // 1. 查询DID文档
        console.log("\n📋 1. 查询DID文档");
        const didDoc = await contract.getDIDDocument();
        console.log("✅ DID文档信息:");
        
        // didDoc 返回 [fields, values] 两个数组
        const fields = didDoc[0];
        const values = didDoc[1];
        
        for (let i = 0; i < fields.length; i++) {
            console.log(`   ${fields[i]}: ${values[i]}`);
        }
        
        // 2. 更新DID文档
        console.log("\n📋 2. 更新DID文档字段");
        const updateTx = await contract.connect(owner).updateDIDDocument(
            ["serviceUrl", "description"],
            ["https://demo-api.com", "演示AI助手"]
        );
        await updateTx.wait();
        console.log("✅ DID文档更新成功");
        
        const updatedDidDoc = await contract.getDIDDocument();
        const updatedFields = updatedDidDoc[0];
        const updatedValues = updatedDidDoc[1];
        
        // 显示更新后的特定字段
        for (let i = 0; i < updatedFields.length; i++) {
            if (updatedFields[i] === "serviceUrl" || updatedFields[i] === "description") {
                console.log(`   ${updatedFields[i]}: ${updatedValues[i]}`);
            }
        }
        
        // 3. 生成授权密钥 (使用Owner身份，因为Agent地址不同)
        console.log("\n📋 3. 生成授权密钥");
        const authKeyTx = await contract.connect(owner).requestAuthKey("demoPassword123");
        const authKeyReceipt = await authKeyTx.wait();
        
        console.log("✅ 授权密钥生成成功");
        console.log(`   交易哈希: ${authKeyReceipt.hash}`);
        
        // 4. 验证授权密钥 (使用模拟密钥，因为实际密钥是内部生成的)
        console.log("\n📋 4. 第三方验证授权密钥");
        const testAuthKey = "test_auth_key_123";
        const isValid = await contract.connect(thirdParty).verifyAgentAuth(testAuthKey);
        console.log(`✅ 验证结果: ${isValid ? "有效" : "无效"} (预期为无效，因为使用的是测试密钥)`);
        
        // 5. 失效授权密钥
        console.log("\n📋 5. 失效授权密钥");
        const invalidateTx = await contract.connect(owner).invalidateAuthKey("demoPassword123");
        await invalidateTx.wait();
        console.log("✅ 授权密钥已失效");
        
        // 6. 再次验证（应该失败）
        const isValidAfter = await contract.connect(thirdParty).verifyAgentAuth(testAuthKey);
        console.log(`✅ 失效后验证结果: ${isValidAfter ? "有效" : "无效"}`);
        
        // 7. 查询系统参数
        console.log("\n📋 6. 查询系统参数");
        console.log("✅ 系统参数:");
        console.log(`   授权密钥有效期: ${await contract.authKeyExpiryTime()} 秒`);
        console.log(`   合约暂停状态: ${await contract.isPaused()}`);
        console.log(`   最大批量操作数: ${await contract.maxBatchSize()}`);
        
        // 8. 查询密码锁定信息
        console.log("\n📋 7. 查询密码锁定信息");
        const lockInfo = await contract.getPasswordLockInfo();
        console.log("✅ 密码锁定信息:");
        console.log(`   是否锁定: ${lockInfo.isLocked}`);
        console.log(`   错误次数: ${lockInfo.errorCount}`);
        
        // 9. 查询授权密钥状态
        console.log("\n📋 8. 查询授权密钥状态");
        const authKeyStatus = await contract.getAuthKeyStatus();
        const statusNames = ["VALID", "USED", "EXPIRED", "INVALIDATED"];
        console.log("✅ 授权密钥状态:");
        console.log(`   状态: ${statusNames[authKeyStatus.status]} (${authKeyStatus.status})`);
        console.log(`   生成时间: ${authKeyStatus.generateTime}`);
        console.log(`   是否过期: ${authKeyStatus.isExpired}`);
        
        console.log("\n🎉 演示完成！所有功能正常运行！");
        
    } catch (error) {
        console.error("❌ 演示过程中发生错误:", error.message);
        throw error;
    }
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}