require("dotenv").config();

console.log("🔍 检查环境变量:");
console.log("ETHERSCAN_API_KEY:", process.env.ETHERSCAN_API_KEY ? "已设置" : "未设置");
console.log("API Key 长度:", process.env.ETHERSCAN_API_KEY ? process.env.ETHERSCAN_API_KEY.length : 0);
console.log("API Key 前缀:", process.env.ETHERSCAN_API_KEY ? process.env.ETHERSCAN_API_KEY.substring(0, 10) + "..." : "N/A");