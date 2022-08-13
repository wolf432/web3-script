import { createAlchemyWeb3 } from "@alch/alchemy-web3";
import { cLog, fLog } from "./cLog.js";
import {createClient} from "redis";

/**
 * 初始化redis
 */
const client = createClient();
client.connect();
client.on('error', (err) => {console.log('Redis Client Error', err);process.exit()});

/**
 * 初始化网络
 * 注意：我们使用wss的话，会自动阻塞，持续监听
 */
const web3 = new createAlchemyWeb3("");  // 初始化交互的RPC


/**
 * 处理收到的交易信息
 * @param {*} txn 监测到的交易信息
 */
const handleTx = async (txn) => {
	//console.log("txn", txn);

	const transactionHash = txn.transactionHash;  // 读取哈希
	try{
		const tx = await web3.eth.getTransaction(transactionHash);  // 获取交易详情（联网）
		if(tx.to == null){
			console.log(tx.to);
			console.log("txn", txn);
			return '';
		}

		// 输出一下得到的交易详情
		// console.log("tx", tx);
		console.log(`监听到交易: 交互合约：\t${tx.to}\n交互HASH：\t${tx.hash}\n`);
		//写入redis
        const date = new Date();
        const month= date.getMonth()+1;
        const day  = date.getDate();
        const key = `ETH_MINT_SUB_${month}${day}`;
		await client.zIncrBy(key,1,tx.to);

	}catch(err){
		console.log("catch:",err);
		return '';
	}
};

// 订阅事件
const subscribe = async (filter) => {
    web3.eth
        .subscribe("logs", filter)
        .on("data", handleTx)
        .on("error", (error) => {
            cLog("error", {
                info: "subscribe error",
                error,
            });
	    process.exit()
        })
        .on("connected", (subscriptionId) => {
            fLog(`开始监听：${subscriptionId}(订阅ID)`, "监听中...");
        });
};

/**
 * 主函数
 */
const main = async () => {
    // 准备筛选器
    const zeroTopic =
        "0x0000000000000000000000000000000000000000000000000000000000000000";

    const filter = {
        fromBlock: null,
        address: null,
        topics: [null, zeroTopic, null],
    };

    // 开始监听
    await subscribe(filter);
};

await main();

