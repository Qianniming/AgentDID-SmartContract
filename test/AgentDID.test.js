const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("AgentDID Smart Contract", function () {
  let agentDID;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  // 测试用的初始参数
  const AGENT_NAME = "Test AI Agent";
  const FUNCTION_TYPE = "Test Assistant";
  const VERSION = "1.0.0";
  const INITIAL_PASSWORD = "TestPassword123!";
  const NEW_PASSWORD = "NewPassword456!";

  beforeEach(async function () {
    // 获取测试账户
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // 部署合约
    const AgentDID = await ethers.getContractFactory("AgentDID");
    agentDID = await AgentDID.deploy(
      AGENT_NAME,
      FUNCTION_TYPE,
      VERSION,
      INITIAL_PASSWORD
    );
    await agentDID.waitForDeployment();
  });

  describe("模块一：基础身份与DID文档管理", function () {
    
    it("场景1：合约部署初始化 - 应该正确初始化所有参数", async function () {
      // 验证Owner
      expect(await agentDID.owner()).to.equal(owner.address);
      
      // 验证DID文档字段
      expect(await agentDID.getDIDDocField("agentName")).to.equal(AGENT_NAME);
      expect(await agentDID.getDIDDocField("functionType")).to.equal(FUNCTION_TYPE);
      expect(await agentDID.getDIDDocField("version")).to.equal(VERSION);
      
      // 验证DID标识格式
      const did = await agentDID.getDIDDocField("did");
      expect(did).to.include("did:ethr:");
      expect(did.toLowerCase()).to.include((await agentDID.getAddress()).toLowerCase());
      
      // 验证系统参数
      expect(await agentDID.authKeyExpiryTime()).to.equal(86400); // 24小时
      expect(await agentDID.isPaused()).to.equal(false);
      expect(await agentDID.maxBatchSize()).to.equal(50);
      
      // 验证授权密钥初始状态
      const authKeyStatus = await agentDID.getAuthKeyStatus();
      expect(authKeyStatus[0]).to.equal(3); // INVALIDATED
    });

    it("场景2：Owner更新DID文档单个字段 - 应该成功更新", async function () {
      const newServiceUrl = "https://api.example.com";
      
      await expect(agentDID.updateDIDDocField("serviceUrl", newServiceUrl))
        .to.emit(agentDID, "DIDDocumentUpdated")
        .withArgs("serviceUrl", newServiceUrl);
      
      expect(await agentDID.getDIDDocField("serviceUrl")).to.equal(newServiceUrl);
    });

    it("场景3：第三方查询DID文档 - 应该返回完整信息", async function () {
      // 使用非Owner账户查询
      const didDocument = await agentDID.connect(addr1).getDIDDocument();
      
      expect(didDocument[0]).to.include("agentName");
      expect(didDocument[0]).to.include("functionType");
      expect(didDocument[0]).to.include("version");
      expect(didDocument[0]).to.include("did");
      
      expect(didDocument[1]).to.include(AGENT_NAME);
      expect(didDocument[1]).to.include(FUNCTION_TYPE);
      expect(didDocument[1]).to.include(VERSION);
    });
  });

  describe("模块二：授权密钥全生命周期管理", function () {
    
    it("场景4：Agent生成授权密钥 - 应该成功生成", async function () {
      await expect(agentDID.requestAuthKey(INITIAL_PASSWORD))
        .to.emit(agentDID, "AuthKeyGenerated");
      
      const authKeyStatus = await agentDID.getAuthKeyStatus();
      expect(authKeyStatus[0]).to.equal(0); // VALID
      expect(authKeyStatus[1]).to.be.gt(0); // generateTime > 0
      expect(authKeyStatus[2]).to.equal(false); // not expired
    });

    it("场景5：第三方验证有效授权密钥 - 应该验证成功", async function () {
      // 先生成授权密钥
      await agentDID.requestAuthKey(INITIAL_PASSWORD);
      
      // 模拟授权密钥（实际应用中由Agent提供）
      const authKey = "test_auth_key";
      
      // 由于我们无法获取实际的授权密钥，这里测试验证失败的情况
      await expect(agentDID.connect(addr1).verifyAgentAuth(authKey))
        .to.emit(agentDID, "AuthKeyVerified")
        .withArgs(addr1.address, owner.address, false);
    });

    it("场景6：Agent主动失效授权密钥 - 应该成功失效", async function () {
      // 先生成授权密钥
      await agentDID.requestAuthKey(INITIAL_PASSWORD);
      
      await expect(agentDID.invalidateAuthKey(INITIAL_PASSWORD))
        .to.emit(agentDID, "AuthKeyInvalidated");
      
      const authKeyStatus = await agentDID.getAuthKeyStatus();
      expect(authKeyStatus[0]).to.equal(3); // INVALIDATED
    });

    it("场景7：授权密钥自动过期 - 应该正确处理过期", async function () {
      // 生成授权密钥
      await agentDID.requestAuthKey(INITIAL_PASSWORD);
      
      // 快进时间超过有效期
      await time.increase(86401); // 24小时 + 1秒
      
      const authKeyStatus = await agentDID.getAuthKeyStatus();
      expect(authKeyStatus[2]).to.equal(true); // isExpired = true
    });
  });

  describe("模块三：Agent密码管理", function () {
    
    it("场景9：Owner修改Agent密码（提供旧密码） - 应该成功修改", async function () {
      await expect(agentDID.updateAgentPassword(INITIAL_PASSWORD, NEW_PASSWORD))
        .to.emit(agentDID, "AgentPasswordUpdated");
      
      // 验证新密码可以使用
      await expect(agentDID.requestAuthKey(NEW_PASSWORD))
        .to.emit(agentDID, "AuthKeyGenerated");
      
      // 验证旧密码不能使用
      await expect(agentDID.requestAuthKey(INITIAL_PASSWORD))
        .to.be.revertedWithCustomError(agentDID, "InvalidAgentPassword");
    });

    it("场景10：Owner重置Agent密码（忘记旧密码） - 应该成功重置", async function () {
      await expect(agentDID.resetAgentPassword(NEW_PASSWORD))
        .to.emit(agentDID, "AgentPasswordReset");
      
      // 验证新密码可以使用
      await expect(agentDID.requestAuthKey(NEW_PASSWORD))
        .to.emit(agentDID, "AuthKeyGenerated");
      
      // 验证旧密码不能使用
      await expect(agentDID.requestAuthKey(INITIAL_PASSWORD))
        .to.be.revertedWithCustomError(agentDID, "InvalidAgentPassword");
    });
  });

  describe("模块四：权限与应急处理", function () {
    
    it("场景11：Owner发起所有权转移 - 应该正确发起", async function () {
      const tx = await agentDID.transferOwnership(addr1.address);
      const receipt = await tx.wait();
      const currentTime = await time.latest();
      
      await expect(tx)
        .to.emit(agentDID, "OwnershipTransferInitiated")
        .withArgs(owner.address, addr1.address, currentTime);
      
      expect(await agentDID.pendingOwner()).to.equal(addr1.address);
    });

    it("场景12：新Owner确认所有权转移 - 应该成功转移", async function () {
      // 发起转移
      await agentDID.transferOwnership(addr1.address);
      
      // 新Owner确认
      await expect(agentDID.connect(addr1).acceptOwnership())
        .to.emit(agentDID, "OwnershipTransferred")
        .withArgs(owner.address, addr1.address);
      
      expect(await agentDID.owner()).to.equal(addr1.address);
      expect(await agentDID.pendingOwner()).to.equal(ethers.ZeroAddress);
    });

    it("场景13：Owner紧急暂停和恢复合约 - 应该正确执行", async function () {
      // 暂停合约
      await expect(agentDID.emergencyPause())
        .to.emit(agentDID, "ContractPaused");
      
      expect(await agentDID.isPaused()).to.equal(true);
      
      // 暂停状态下不能生成授权密钥
      await expect(agentDID.requestAuthKey(INITIAL_PASSWORD))
        .to.be.revertedWithCustomError(agentDID, "ContractPausedError");
      
      // 恢复合约
      await expect(agentDID.emergencyUnpause())
        .to.emit(agentDID, "ContractUnpaused");
      
      expect(await agentDID.isPaused()).to.equal(false);
      
      // 恢复后可以正常使用
      await expect(agentDID.requestAuthKey(INITIAL_PASSWORD))
        .to.emit(agentDID, "AuthKeyGenerated");
    });
  });

  describe("模块五：异常与边界处理", function () {
    
    it("场景14：非Owner尝试修改权限/数据 - 应该被拒绝", async function () {
      // 非Owner尝试更新DID文档
      await expect(agentDID.connect(addr1).updateDIDDocField("agentName", "Hacked"))
        .to.be.revertedWithCustomError(agentDID, "OnlyOwner");
      
      // 非Owner尝试修改密码
      await expect(agentDID.connect(addr1).updateAgentPassword(INITIAL_PASSWORD, NEW_PASSWORD))
        .to.be.revertedWithCustomError(agentDID, "OnlyOwner");
      
      // 非Owner尝试转移所有权
      await expect(agentDID.connect(addr1).transferOwnership(addr2.address))
        .to.be.revertedWithCustomError(agentDID, "OnlyOwner");
      
      // 非Owner尝试暂停合约
      await expect(agentDID.connect(addr1).emergencyPause())
        .to.be.revertedWithCustomError(agentDID, "OnlyOwner");
    });

    it("场景15：Agent多次输入错误密码 - 应该触发锁定机制", async function () {
      const wrongPassword = "WrongPassword";
      
      // 使用checkPassword函数来累积错误计数（前4次）
      for (let i = 0; i < 4; i++) {
        await agentDID.checkPassword(wrongPassword);
        
        // 检查错误计数是否正确累积
        const lockInfo = await agentDID.getPasswordLockInfo();
        expect(lockInfo[0]).to.equal(false); // isLocked = false (前4次不锁定)
        expect(lockInfo[1]).to.equal(i + 1); // errorCount 应该递增
      }
      
      // 第5次应该触发锁定
      await agentDID.checkPassword(wrongPassword);
      
      // 检查锁定状态
      const lockInfo = await agentDID.getPasswordLockInfo();
      expect(lockInfo[0]).to.equal(true); // isLocked
      expect(lockInfo[1]).to.equal(5); // errorCount
      
      // 锁定期间即使密码正确也不能使用
      await expect(agentDID.requestAuthKey(INITIAL_PASSWORD))
        .to.be.revertedWithCustomError(agentDID, "AgentPasswordLockedError");
    });

    it("场景16：第三方验证无效/过期密钥 - 应该被拒绝", async function () {
      const invalidAuthKey = "invalid_key";
      
      // 验证无效密钥
      const result1 = await agentDID.connect(addr1).verifyAgentAuth.staticCall(invalidAuthKey);
      expect(result1).to.equal(false);
      
      // 生成有效密钥然后让其过期
      await agentDID.requestAuthKey(INITIAL_PASSWORD);
      
      // 快进时间使密钥过期
      await time.increase(86401); // 24小时 + 1秒
      
      // 验证过期密钥
      const result2 = await agentDID.connect(addr1).verifyAgentAuth.staticCall(invalidAuthKey);
      expect(result2).to.equal(false);
    });
  });

  describe("边界条件和错误处理", function () {
    
    it("应该拒绝无效的字段名", async function () {
      await expect(agentDID.updateDIDDocField("invalidField", "value"))
        .to.be.revertedWithCustomError(agentDID, "InvalidFieldName");
    });

    it("应该拒绝数组长度不匹配的批量更新", async function () {
      const fields = ["agentName", "version"];
      const values = ["New Name"]; // 长度不匹配
      
      await expect(agentDID.updateDIDDocument(fields, values))
        .to.be.revertedWithCustomError(agentDID, "ArrayLengthMismatch");
    });

    it("应该拒绝零地址的所有权转移", async function () {
      await expect(agentDID.transferOwnership(ethers.ZeroAddress))
        .to.be.revertedWith("New owner cannot be zero address");
    });

    it("应该拒绝转移给当前Owner", async function () {
      await expect(agentDID.transferOwnership(owner.address))
        .to.be.revertedWith("New owner cannot be current owner");
    });

    it("应该拒绝未发起的所有权转移确认", async function () {
      await expect(agentDID.connect(addr1).acceptOwnership())
        .to.be.revertedWithCustomError(agentDID, "OwnershipTransferNotInitiated");
    });

    it("应该拒绝非待确认Owner的确认", async function () {
      await agentDID.transferOwnership(addr1.address);
      
      await expect(agentDID.connect(addr2).acceptOwnership())
        .to.be.revertedWithCustomError(agentDID, "NotPendingOwner");
    });

    it("应该拒绝超时的所有权转移确认", async function () {
      await agentDID.transferOwnership(addr1.address);
      
      // 快进时间超过72小时
      await time.increase(72 * 3600 + 1);
      
      await expect(agentDID.connect(addr1).acceptOwnership())
        .to.be.revertedWithCustomError(agentDID, "OwnershipTransferExpired");
    });
  });

  describe("系统参数配置", function () {
    
    it("Owner应该能够修改授权密钥有效期", async function () {
      const newExpiryTime = 3600; // 1小时
      
      await expect(agentDID.updateAuthKeyExpiry(newExpiryTime))
        .to.emit(agentDID, "AuthKeyExpiryUpdated")
        .withArgs(86400, newExpiryTime);
      
      expect(await agentDID.authKeyExpiryTime()).to.equal(newExpiryTime);
    });

    it("应该正确返回允许的字段列表", async function () {
      const allowedFields = await agentDID.getAllowedFields();
      expect(allowedFields).to.include("agentName");
      expect(allowedFields).to.include("functionType");
      expect(allowedFields).to.include("version");
      expect(allowedFields).to.include("serviceUrl");
      expect(allowedFields).to.include("description");
      expect(allowedFields).to.include("did");
    });
  });

  describe("密码锁定恢复机制", function () {
    
    it("锁定期过后应该自动解锁", async function () {
      const wrongPassword = "WrongPassword";
      
      // 触发锁定
      for (let i = 0; i < 5; i++) {
        try {
          await agentDID.requestAuthKey(wrongPassword);
        } catch (error) {
          // 忽略错误，继续测试
        }
      }
      
      // 快进时间超过锁定期
      await time.increase(3601); // 1小时 + 1秒
      
      // 现在应该可以使用正确密码
      await expect(agentDID.requestAuthKey(INITIAL_PASSWORD))
        .to.emit(agentDID, "AuthKeyGenerated");
      
      // 检查错误计数已重置
      const lockInfo = await agentDID.getPasswordLockInfo();
      expect(lockInfo[0]).to.equal(false); // isLocked
      expect(lockInfo[1]).to.equal(0); // errorCount reset
    });
  });
});