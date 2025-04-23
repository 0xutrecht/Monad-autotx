require("dotenv").config();
const { ethers } = require("ethers");
const colors = require("colors");
const displayHeader = require("../src/banner.js");

// =============================================
// ??? KONFIGURASI UTAMA
// =============================================

const PRIVATE_KEY = process.env.CURRENT_PK || process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
    throw new Error("? Private key tidak ditemukan di .env");
}

const RPC_URLS = [
    "https://testnet-rpc.monorail.xyz",
    "https://testnet-rpc.monad.xyz",
    "https://monad-testnet.drpc.org"
];

const CONTRACT_ADDRESS = "0x2c9C959516e9AAEdB2C748224a41249202ca8BE7";
const EXPLORER_URL = "https://testnet.monadexplorer.com/tx/";

// Konfigurasi berdasarkan transaksi berhasil
const CONFIG = {
    STAKE_AMOUNT: ethers.utils.parseEther("0.00001"), // 0.01 MON
    GAS_PRICE: ethers.utils.parseUnits("75", "gwei"), // 75 Gwei
    STAKE_GAS_LIMIT: 120000,
    UNSTAKE_GAS_LIMIT: 150000,
    MAX_RETRIES: 3,
    DELAY_BETWEEN_ACTIONS: 30000 // 30 detik
};

// =============================================
// ?? FUNGSI PENDUKUNG
// =============================================

async function connectToRPC() {
    let lastError;
    for (const url of RPC_URLS) {
        try {
            const provider = new ethers.providers.JsonRpcProvider(url);
            await Promise.race([
    		provider.getNetwork(),
    		new Promise((_, reject) => 
       		 setTimeout(() => reject(new Error("Timeout")), 10000))
	]);
            console.log(colors.green(`? Terhubung ke RPC: ${url}`));
            return provider;
        } catch (error) {
            lastError = error;
            console.log(colors.yellow(`?? Gagal ke ${url}: ${error.message}`));
        }
    }
    throw new Error(`? Semua RPC gagal. Error terakhir: ${lastError.message}`);
}

async function checkBalance(wallet) {
    const balance = await wallet.getBalance();
    console.log(colors.cyan(`?? Balance: ${ethers.utils.formatEther(balance)} MON`));
    
    if (balance.lt(CONFIG.STAKE_AMOUNT.mul(2))) {
        throw new Error(`? Saldo tidak cukup. Minimal dibutuhkan: ${
            ethers.utils.formatEther(CONFIG.STAKE_AMOUNT.mul(2))} MON`);
    }
}

// =============================================
// ?? FUNGSI STAKE & UNSTAKE
// =============================================

async function stakeMON(wallet, attempt = 1) {
    try {
        console.log(colors.magenta(`\n?? Mencoba staking ${ethers.utils.formatEther(CONFIG.STAKE_AMOUNT)} MON (Percobaan ${attempt})`));

        const tx = await wallet.sendTransaction({
            to: CONTRACT_ADDRESS,
            data: "0xd5575982", // Fungsi stake()
            value: CONFIG.STAKE_AMOUNT,
            gasLimit: CONFIG.STAKE_GAS_LIMIT,
            gasPrice: CONFIG.GAS_PRICE
        });

        console.log(colors.green(`? Tx Hash: ${tx.hash}`));
        console.log(colors.blue(`?? Explorer: ${EXPLORER_URL}${tx.hash}`));

        const receipt = await tx.wait(2);
        if (receipt.status === 0) throw new Error("Status transaksi gagal");

        console.log(colors.green("?? Staking berhasil!"));
        return CONFIG.STAKE_AMOUNT;

    } catch (error) {
        if (attempt < CONFIG.MAX_RETRIES) {
            console.log(colors.yellow(`?? Akan mencoba lagi (${attempt}/${CONFIG.MAX_RETRIES})...`));
            await new Promise(resolve => setTimeout(resolve, 5000));
            return stakeMON(wallet, attempt + 1);
        }
        throw error;
    }
}

async function unstakeGMON(wallet, amount, attempt = 1) {
    try {
        console.log(colors.magenta(`\n?? Mencoba unstaking ${ethers.utils.formatEther(amount)} gMON (Percobaan ${attempt})`));

        // Encode function call: unstake(uint256)
        const data = ethers.utils.hexConcat([
            "0x6fed1ea7", // Function selector
            ethers.utils.zeroPad(amount.toHexString(), 32)
        ]);

        const tx = await wallet.sendTransaction({
            to: CONTRACT_ADDRESS,
            data: data,
            gasLimit: CONFIG.UNSTAKE_GAS_LIMIT,
            gasPrice: CONFIG.GAS_PRICE
        });

        console.log(colors.green(`? Tx Hash: ${tx.hash}`));
        console.log(colors.blue(`?? Explorer: ${EXPLORER_URL}${tx.hash}`));

        const receipt = await tx.wait(2);
        if (receipt.status === 0) throw new Error("Status transaksi gagal");

        console.log(colors.green("?? Unstaking berhasil!"));

    } catch (error) {
        if (attempt < CONFIG.MAX_RETRIES) {
            console.log(colors.yellow(`?? Akan mencoba lagi (${attempt}/${CONFIG.MAX_RETRIES})...`));
            await new Promise(resolve => setTimeout(resolve, 5000));
            return unstakeGMON(wallet, amount, attempt + 1);
        }
        throw error;
    }
}

// =============================================
// ?? EKSEKUSI UTAMA
// =============================================

async function main() {
    try {
        displayHeader();
        
        // 1. Hubungkan ke RPC
        const provider = await connectToRPC();
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        // 2. Tampilkan info wallet
        console.log(colors.green("\n=============================="));
        console.log(colors.bold(`?? Wallet: ${wallet.address}`));
        console.log(colors.green("=============================="));

        // 3. Cek balance
        await checkBalance(wallet);

        // 4. Stake -> Delay -> Unstake
        const stakedAmount = await stakeMON(wallet);
        console.log(colors.yellow(`\n? Menunggu ${CONFIG.DELAY_BETWEEN_ACTIONS/1000} detik...`));
        await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_ACTIONS));
        await unstakeGMON(wallet, stakedAmount);

        console.log(colors.green("\n? Siklus stake/unstake selesai!"));

    } catch (error) {
        console.error(colors.red("\n?? Error:"));
        console.error(error.message);
        
        if (error.transactionHash) {
            console.log(colors.yellow("\n?? Detail error di explorer:"));
            console.log(`${EXPLORER_URL}${error.transactionHash}`);
        }
        
        process.exit(1);
    }
}

main();