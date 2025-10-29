const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Simple Password Lock Test", function () {
    let agentDID;
    let owner;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();
        
        const AgentDID = await ethers.getContractFactory("AgentDID");
        agentDID = await AgentDID.deploy(
            "TestAgent",
            "AI Assistant",
            "1.0.0",
            "InitialPassword123"
        );
        await agentDID.waitForDeployment();
    });

    it("应该在第5次错误密码时触发锁定", async function () {
        const wrongPassword = "WrongPassword";
        
        console.log("开始测试...");
        
        // 前4次应该抛出 InvalidAgentPassword
        for (let i = 1; i <= 4; i++) {
            console.log(`第${i}次错误密码尝试...`);
            
            const beforeCount = await agentDID.getDebugErrorCount();
            console.log(`尝试前错误计数: ${beforeCount}`);
            
            try {
                await agentDID.requestAuthKey(wrongPassword);
                throw new Error("应该抛出错误");
            } catch (error) {
                console.log(`错误信息: ${error.message}`);
                expect(error.message).to.include("InvalidAgentPassword");
            }
            
            const afterCount = await agentDID.getDebugErrorCount();
            console.log(`尝试后错误计数: ${afterCount}`);
            
            const lockInfo = await agentDID.getPasswordLockInfo();
            console.log(`第${i}次后 - 错误次数: ${lockInfo[1]}, 是否锁定: ${lockInfo[0]}`);
        }
        
        // 第5次应该抛出 TooManyAgentPasswordErrors
        console.log("第5次错误密码尝试...");
        try {
            await agentDID.requestAuthKey(wrongPassword);
            throw new Error("应该抛出错误");
        } catch (error) {
            console.log("第5次错误:", error.message);
            expect(error.message).to.include("TooManyAgentPasswordErrors");
        }
        
        const lockInfo = await agentDID.getPasswordLockInfo();
        console.log(`第5次后 - 错误次数: ${lockInfo[1]}, 是否锁定: ${lockInfo[0]}`);
        
        // 第6次应该抛出 AgentPasswordLockedError（因为已经锁定）
        console.log("第6次错误密码尝试（应该被锁定）...");
        try {
            await agentDID.requestAuthKey(wrongPassword);
            throw new Error("应该抛出错误");
        } catch (error) {
            console.log("第6次错误:", error.message);
            expect(error.message).to.include("AgentPasswordLockedError");
        }
        
        console.log("测试完成！");
    });
});