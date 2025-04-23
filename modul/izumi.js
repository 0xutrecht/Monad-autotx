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

const CONTRACT_ADDRESS = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701"; // WMON
const EXPLORER_URL = "https://testnet.monadexplorer.com/tx/";

const CONFIG = {
    GAS_LIMIT: 500000,
    CYCLES: 1,
    MIN_AMOUNT: 0.00001,
    MAX_AMOUNT: 0.00005,
    MIN_DELAY: 30000,      // 1 menit
    MAX_DELAY: 60000      // 1 menit
};

// =============================================
// ?? FUNGSI UTAMA
// =============================================

function getRandomAmount() {
    const value = (Math.random() * (CONFIG.MAX_AMOUNT - CONFIG.MIN_AMOUNT) + CONFIG.MIN_AMOUNT).toFixed(4);
    return ethers.utils.parseEther(value);
}

function getRandomDelay() {
    return Math.floor(Math.random() * (CONFIG.MAX_DELAY - CONFIG.MIN_DELAY + 1) + CONFIG.MIN_DELAY);
}

async function connectToRPC() {
    let lastError;
    for (const url of RPC_URLS) {
        try {
            const provider = new ethers.providers.JsonRpcProvider(url);
            await Promise.race([
                provider.getNetwork(),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))
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

async function wrapMON(contract, amount) {
    try {
        console.log(colors.magenta(`\n?? Wrap ${ethers.utils.formatEther(amount)} MON > WMON`));
        const tx = await contract.deposit({ value: amount, gasLimit: CONFIG.GAS_LIMIT });
        console.log(colors.green(`? Tx Hash: ${tx.hash}`));
        console.log(colors.blue(`?? Explorer: ${EXPLORER_URL}${tx.hash}`));
        const receipt = await tx.wait(2);
        if (receipt.status === 0) throw new Error("Status transaksi gagal");
        console.log(colors.green("? Wrap berhasil!"));
    } catch (error) {
        console.error(colors.red("? Gagal wrap MON > WMON:"), error.message);
        throw error;
    }
}

async function unwrapMON(contract, amount) {
    try {
        console.log(colors.magenta(`\n?? Unwrap ${ethers.utils.formatEther(amount)} WMON > MON`));
        const tx = await contract.withdraw(amount, { gasLimit: CONFIG.GAS_LIMIT });
        console.log(colors.green(`? Tx Hash: ${tx.hash}`));
        console.log(colors.blue(`?? Explorer: ${EXPLORER_URL}${tx.hash}`));
        const receipt = await tx.wait(2);
        if (receipt.status === 0) throw new Error("Status transaksi gagal");
        console.log(colors.green("? Unwrap berhasil!"));
    } catch (error) {
        console.error(colors.red("? Gagal unwrap WMON > MON:"), error.message);
        throw error;
    }
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// =============================================
// ?? EKSEKUSI UTAMA
// =============================================

async function main() {
    try {
        displayHeader();

        // 1. Hubungkan ke RPC
        const provider = await connectToRPC();
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

        // 2. Info wallet
        console.log(colors.green("\n=============================="));
        console.log(colors.bold(`?? Wallet: ${wallet.address}`));
        console.log(colors.green("=============================="));

        // 3. Inisialisasi kontrak
        const contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            ["function deposit() public payable", "function withdraw(uint256 amount) public"],
            wallet
        );

        // 4. Jalankan siklus wrap/unwrap
        for (let i = 0; i < CONFIG.CYCLES; i++) {
            console.log(colors.yellow(`\n?? Loop ${i + 1}/${CONFIG.CYCLES}`));

            const amount = getRandomAmount();
            await wrapMON(contract, amount);
            await unwrapMON(contract, amount);

            if (i < CONFIG.CYCLES - 1) {
                const randomDelay = getRandomDelay();
                console.log(colors.grey(`? Menunggu ${(randomDelay / 1000).toFixed(0)} detik sebelum loop berikutnya...`));
                await delay(randomDelay);
            }
        }

        console.log(colors.green("\n? Selesai semua siklus Izumi!"));

    } catch (error) {
        console.error(colors.red("\n? Error utama:"), error.message);
        process.exit(1);
    }
}

main();
