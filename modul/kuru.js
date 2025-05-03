require("dotenv").config();
const { ethers } = require("ethers");
const colors = require("colors");
const displayHeader = require("../src/banner.js");

// =============================================
// 🛠️ KONFIGURASI UTAMA
// =============================================

const PRIVATE_KEY = process.env.CURRENT_PK || process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
    throw new Error("❌ Tidak ada Private Key di .env");
}

const RPC_URLS = [
    "https://testnet-rpc.monorail.xyz",
    "https://testnet-rpc.monad.xyz",
    "https://monad-testnet.drpc.org"
];

const CHAIN_ID = 10143;
const ROUTER_ADDRESS = "0xc816865f172d640d93712C68a7E1F83F3fA63235";
const WETH_ADDRESS = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";

// Token Address
const TOKEN_ADDRESSES = {
    "CHOG": "0xE0590015A873bF326bd645c3E1266d4db41C4E6B",
    "DAK":  "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714",
    "BEAN": "0x268E4E24E0051EC27b3D27A95977E71cE6875a05",
    "YAKI": "0xfe140e1dCe99Be9F4F15d657CD9b7BF622270C50"
};

// ABI ERC20
const erc20Abi = [
    {
        "constant": true,
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            { "name": "_spender", "type": "address" },
            { "name": "_value", "type": "uint256" }
        ],
        "name": "approve",
        "outputs": [{ "name": "", "type": "bool" }],
        "type": "function"
    }
];

// =============================================
// 🔧 FUNGSI
// =============================================

async function connectToRpc() {
    for (const url of RPC_URLS) {
        try {
            const provider = new ethers.providers.JsonRpcProvider(url);
            await provider.getNetwork();
            console.log(colors.green(`✓ Terhubung ke RPC: ${url}`));
            return provider;
        } catch (error) {
            console.log(colors.yellow(`⚠️ Gagal ke ${url}, mencoba RPC lain...`));
        }
    }
    throw new Error("❌ Semua RPC gagal");
}

function getRandomEthAmount() {
    const min = 0.00001;
    const max = 0.0001;
    return ethers.utils.parseEther((Math.random() * (max - min) + min).toFixed(6));
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function swapEthForTokens(wallet, tokenAddress, amountInWei, tokenSymbol) {
    const router = new ethers.Contract(
        ROUTER_ADDRESS,
        [
            {
                "name": "swapExactETHForTokens",
                "type": "function",
                "stateMutability": "payable",
                "inputs": [
                    { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
                    { "internalType": "address[]", "name": "path", "type": "address[]" },
                    { "internalType": "address", "name": "to", "type": "address" },
                    { "internalType": "uint256", "name": "deadline", "type": "uint256" }
                ]
            }
        ],
        wallet
    );

    try {
        console.log(colors.cyan(`\n🔄 Swap ${ethers.utils.formatEther(amountInWei)} MON → ${tokenSymbol}`));

        const tx = await router.swapExactETHForTokens(
            0,
            [WETH_ADDRESS, tokenAddress],
            wallet.address,
            Math.floor(Date.now() / 1000) + 600,
            {
                value: amountInWei,
                gasLimit: 210000
            }
        );

        console.log(colors.green(`✅ Tx Hash: ${tx.hash}`));
    } catch (error) {
        console.error(colors.red(`❌ Gagal swap: ${error.message}`));
        throw error;
    }
}

async function swapTokensForEth(wallet, tokenAddress, tokenSymbol) {
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, wallet);
    const balance = await tokenContract.balanceOf(wallet.address);

    if (balance.eq(0)) {
        console.log(colors.gray(`⚠️ Balance ${tokenSymbol} kosong, dilewati`));
        return;
    }

    const router = new ethers.Contract(
        ROUTER_ADDRESS,
        [
            {
                "name": "swapExactTokensForETH",
                "type": "function",
                "stateMutability": "nonpayable",
                "inputs": [
                    { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
                    { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
                    { "internalType": "address[]", "name": "path", "type": "address[]" },
                    { "internalType": "address", "name": "to", "type": "address" },
                    { "internalType": "uint256", "name": "deadline", "type": "uint256" }
                ]
            }
        ],
        wallet
    );

    try {
        console.log(colors.cyan(`\n🔄 Swap ${tokenSymbol} → MON`));

        await tokenContract.approve(ROUTER_ADDRESS, balance);

        const tx = await router.swapExactTokensForETH(
            balance,
            0,
            [tokenAddress, WETH_ADDRESS],
            wallet.address,
            Math.floor(Date.now() / 1000) + 600,
            { gasLimit: 210000 }
        );

        console.log(colors.green(`✅ Tx Hash: ${tx.hash}`));
        await sleep(2000);
    } catch (error) {
        console.error(colors.red(`❌ Gagal swap: ${error.message}`));
        throw error;
    }
}

async function getBalance(wallet) {
    const provider = wallet.provider;

    const monBalance = await provider.getBalance(wallet.address);
    console.log(colors.green(`💰 Balance MON: ${ethers.utils.formatEther(monBalance)}`));

    const wethContract = new ethers.Contract(WETH_ADDRESS, erc20Abi, wallet);
    const wethBalance = await wethContract.balanceOf(wallet.address);
    console.log(colors.green(`💰 Balance WETH: ${ethers.utils.formatEther(wethBalance)}`));
}

// =============================================
// 🚀 EKSEKUSI
// =============================================

async function main() {
    try {
        displayHeader();

        const provider = await connectToRpc();
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

        console.log(colors.green("\n=============================="));
        console.log(colors.bold(`👛 Wallet: ${wallet.address}`));
        console.log(colors.green("=============================="));

        await getBalance(wallet);

        console.log(colors.yellow("\n🔀 Swap MON ke Semua Token..."));
        for (const [symbol, address] of Object.entries(TOKEN_ADDRESSES)) {
            const amount = getRandomEthAmount();
            await swapEthForTokens(wallet, address, amount, symbol);
            await sleep(1000 + Math.random() * 2000);
        }

        console.log(colors.yellow("\n🔀 Swap Balik Token ke MON..."));
        for (const [symbol, address] of Object.entries(TOKEN_ADDRESSES)) {
            await swapTokensForEth(wallet, address, symbol);
        }

        console.log(colors.green("\n✅ Semua selesai!"));
        await getBalance(wallet);
    } catch (error) {
        console.error(colors.red(`\n💀 Error: ${error.message}`));
        process.exit(1);
    }
}

main();
