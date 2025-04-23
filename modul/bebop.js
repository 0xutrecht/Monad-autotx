require("dotenv").config();
const { ethers } = require("ethers");
const colors = require("colors");
const displayHeader = require("../src/banner.js");

// =============================================
// ?? KONFIGURASI UTAMA
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

const EXPLORER_URL = "https://testnet.monadexplorer.com/tx/";
const WMON_CONTRACT = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";

const CONFIG = {
    GAS_LIMIT: 150000,
    MIN_AMOUNT: 0.00001,
    MAX_AMOUNT: 0.00005,
    MIN_DELAY: 30000,
    MAX_DELAY: 60000
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
                    setTimeout(() => reject(new Error("Timeout")), 10000)
                )
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

function getRandomAmount() {
    const min = CONFIG.MIN_AMOUNT;
    const max = CONFIG.MAX_AMOUNT;
    return ethers.utils.parseEther((Math.random() * (max - min) + min).toFixed(4));
}

function getRandomDelay() {
    return Math.floor(Math.random() * (CONFIG.MAX_DELAY - CONFIG.MIN_DELAY + 1) + CONFIG.MIN_DELAY);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================
// ?? WRAP & UNWRAP
// =============================================

async function wrapMON(contract, amount) {
    try {
        console.log(colors.magenta(`\n?? Wrapping ${ethers.utils.formatEther(amount)} MON ? WMON`));

        const tx = await contract.deposit({
            value: amount,
            gasLimit: CONFIG.GAS_LIMIT
        });

        console.log(colors.green(`? Wrap TX Hash: ${tx.hash}`));
        console.log(colors.blue(`?? Explorer: ${EXPLORER_URL}${tx.hash}`));

        const receipt = await tx.wait(2);
        if (receipt.status === 0) throw new Error("? Transaksi wrap gagal");
        console.log(colors.green("? Wrap selesai!"));
    } catch (error) {
        console.error(colors.red("? Error saat wrapping:"), error.message);
        throw error;
    }
}

async function unwrapMON(contract, amount) {
    try {
        console.log(colors.magenta(`\n?? Unwrapping ${ethers.utils.formatEther(amount)} WMON ? MON`));

        const tx = await contract.withdraw(amount, {
            gasLimit: CONFIG.GAS_LIMIT
        });

        console.log(colors.green(`? Unwrap TX Hash: ${tx.hash}`));
        console.log(colors.blue(`?? Explorer: ${EXPLORER_URL}${tx.hash}`));

        const receipt = await tx.wait(2);
        if (receipt.status === 0) throw new Error("? Transaksi unwrap gagal");
        console.log(colors.green("? Unwrap selesai!"));
    } catch (error) {
        console.error(colors.red("? Error saat unwrapping:"), error.message);
        throw error;
    }
}

// =============================================
// ?? MAIN FUNCTION
// =============================================

async function main() {
    try {
        displayHeader();

        // 1. Koneksi RPC
        const provider = await connectToRPC();
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        const contract = new ethers.Contract(
            WMON_CONTRACT,
            ["function deposit() public payable", "function withdraw(uint256 amount) public"],
            wallet
        );

        // 2. Info wallet
        console.log(colors.green("\n=============================="));
        console.log(colors.bold(`?? Wallet: ${wallet.address}`));
        console.log(colors.green("=============================="));

        // 3. Jalankan siklus swap
        const randomAmount = getRandomAmount();
        const randomDelay = getRandomDelay();

        await wrapMON(contract, randomAmount);
        await unwrapMON(contract, randomAmount);

        console.log(colors.yellow(`\n? Delay berikutnya: ${(randomDelay / 1000).toFixed(0)} detik`));
        await delay(randomDelay);

        console.log(colors.green("\n? Siklus Bebob selesai!"));

    } catch (error) {
        console.error(colors.red("\n? Error utama:"));
        console.error(error.message);
        process.exit(1);
    }
}

main();
