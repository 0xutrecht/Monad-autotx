require("dotenv").config();
const { ethers } = require("ethers");
const colors = require("colors");
const displayHeader = require("../src/banner.js");

// =============================================
// Ì†ΩÌª†Ô∏è KONFIGURASI UTAMA
// =============================================

// Private Key dari environment variable
const PRIVATE_KEY = process.env.CURRENT_PK || process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
    throw new Error("‚ùå Tidak ada Private Key di .env");
}

// Daftar RPC Cadangan
const RPC_URLS = [
    "https://testnet-rpc.monorail.xyz",  // RPC Utama
    "https://testnet-rpc.monad.xyz",     // Backup 1
    "https://monad-testnet.drpc.org"     // Backup 2  
];

// Konfigurasi Jaringan
const CHAIN_ID = 10143;
const UNISWAP_V2_ROUTER_ADDRESS = "0xCa810D095e90Daae6e867c19DF6D9A8C56db2c89";
const WETH_ADDRESS = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";

// Daftar Token yang Didukung
const TOKEN_ADDRESSES = {
    "DAC": "0x0f0bdebf0f83cd1ee3974779bcb7315f9808c714",
    "USDT": "0x88b8e2161dedc77ef4ab7585569d2415a1c1055d",
    "MUK": "0x989d38aeed8408452f0273c7d4a17fef20878e62",
    "USDC": "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea"
};

// ABI Dasar untuk Kontrak ERC20
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
// Ì†ΩÌ¥ß FUNGSI PENDUKUNG
// =============================================

/**
 * Menghubungkan ke RPC Monad Testnet
 * @returns {ethers.providers.JsonRpcProvider} Provider yang terhubung
 */
async function connectToRpc() {
    for (const url of RPC_URLS) {
        try {
            const provider = new ethers.providers.JsonRpcProvider(url);
            await provider.getNetwork(); // Test koneksi
            console.log(colors.green(`‚úì Terhubung ke RPC: ${url}`));
            return provider;
        } catch (error) {
            console.log(colors.yellow(`‚ö†Ô∏è Gagal ke ${url}, mencoba RPC lain...`));
        }
    }
    throw new Error("‚ùå Semua RPC gagal");
}

/**
 * Menghasilkan jumlah acak untuk swap
 * @returns {ethers.BigNumber} Jumlah dalam wei (0.0001 - 0.001 MON)
 */
function getRandomEthAmount() {
    const min = 0.00001;
    const max = 0.0001;
    return ethers.utils.parseEther((Math.random() * (max - min) + min).toFixed(6));
}

/**
 * Jeda eksekusi
 * @param {number} ms - Waktu dalam milidetik 
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================
// Ì†ΩÌ¥Ñ FUNGSI SWAP
// =============================================

/**
 * Swap MON ke Token
 * @param {ethers.Wallet} wallet - Wallet yang digunakan
 * @param {string} tokenAddress - Alamat kontrak token
 * @param {ethers.BigNumber} amountInWei - Jumlah MON dalam wei
 * @param {string} tokenSymbol - Simbol token
 */
async function swapEthForTokens(wallet, tokenAddress, amountInWei, tokenSymbol) {
    const router = new ethers.Contract(
        UNISWAP_V2_ROUTER_ADDRESS,
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
        console.log(colors.cyan(`\nÌ†ΩÌ¥Ñ Swap ${ethers.utils.formatEther(amountInWei)} MON ‚Üí ${tokenSymbol}`));
        
        const tx = await router.swapExactETHForTokens(
            0, // amountOutMin (slippage 0% untuk testnet)
            [WETH_ADDRESS, tokenAddress], // Path swap
            wallet.address,
            Math.floor(Date.now() / 1000) + 600, // Deadline 10 menit
            { 
                value: amountInWei, 
                gasLimit: 210000 
            }
        );
        
        console.log(colors.green(`‚úÖ Tx Hash: ${tx.hash}`));
    } catch (error) {
        console.error(colors.red(`‚ùå Gagal swap: ${error.message}`));
        throw error; // Lempar error ke main.js
    }
}

/**
 * Swap Token kembali ke MON
 * @param {ethers.Wallet} wallet - Wallet yang digunakan
 * @param {string} tokenAddress - Alamat kontrak token 
 * @param {string} tokenSymbol - Simbol token
 */
async function swapTokensForEth(wallet, tokenAddress, tokenSymbol) {
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, wallet);
    const balance = await tokenContract.balanceOf(wallet.address);

    // Skip jika balance 0
    if (balance.eq(0)) {
        console.log(colors.gray(`\n‚ö†Ô∏è Balance ${tokenSymbol} kosong, dilewati`));
        return;
    }

    const router = new ethers.Contract(
        UNISWAP_V2_ROUTER_ADDRESS,
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
        console.log(colors.cyan(`\nÌ†ΩÌ¥Ñ Swap ${tokenSymbol} ‚Üí MON`));
        
        // 1. Approve dulu
        await tokenContract.approve(UNISWAP_V2_ROUTER_ADDRESS, balance);
        
        // 2. Eksekusi swap
        const tx = await router.swapExactTokensForETH(
            balance,
            0, // amountOutMin
            [tokenAddress, WETH_ADDRESS], // Path
            wallet.address,
            Math.floor(Date.now() / 1000) + 600, // Deadline
            { gasLimit: 210000 }
        );
        
        console.log(colors.green(`‚úÖ Tx Hash: ${tx.hash}`));
        
        // Jeda 2 detik setelah swap
        await sleep(2000); 
    } catch (error) {
        console.error(colors.red(`‚ùå Gagal swap: ${error.message}`));
        throw error;
    }
}

/**
 * Cek balance MON dan WETH
 * @param {ethers.Wallet} wallet - Wallet yang digunakan
 */
async function getBalance(wallet) {
    const provider = wallet.provider;
    
    // Balance MON (native token)
    const monBalance = await provider.getBalance(wallet.address);
    console.log(colors.green(`Ì†ΩÌ≤∞ Balance MON: ${ethers.utils.formatEther(monBalance)}`));
    
    // Balance WETH (wrapped MON)
    const wethContract = new ethers.Contract(WETH_ADDRESS, erc20Abi, wallet);
    const wethBalance = await wethContract.balanceOf(wallet.address);
    console.log(colors.green(`Ì†ΩÌ≤∞ Balance WETH: ${ethers.utils.formatEther(wethBalance)}`));
}

// =============================================
// Ì†ΩÌ∫Ä EKSEKUSI UTAMA
// =============================================
async function main() {
    try {
        // 1. Tampilkan header
        displayHeader();
        
        // 2. Hubungkan ke RPC
        const provider = await connectToRpc();
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        // 3. Tampilkan info wallet
        console.log(colors.green("\n=============================="));
        console.log(colors.bold(`Ì†ΩÌ±õ Wallet: ${wallet.address}`));
        console.log(colors.green("=============================="));
        
        // 4. Cek balance awal
        await getBalance(wallet);

        // 5. Swap MON ‚Üí Semua Token
        console.log(colors.yellow("\nÌ†ΩÌ¥Ä Mulai swap MON ke Token..."));
        for (const [tokenSymbol, tokenAddress] of Object.entries(TOKEN_ADDRESSES)) {
            const amount = getRandomEthAmount();
            await swapEthForTokens(wallet, tokenAddress, amount, tokenSymbol);
            
            // Jeda acak 1-3 detik antar swap
            await sleep(1000 + Math.random() * 2000);
        }

        // 6. Swap Token ‚Üí MON
        console.log(colors.yellow("\nÌ†ΩÌ¥Ä Konversi balik ke MON..."));
        for (const [tokenSymbol, tokenAddress] of Object.entries(TOKEN_ADDRESSES)) {
            await swapTokensForEth(wallet, tokenAddress, tokenSymbol);
        }

        // 7. Tampilkan balance akhir
        console.log(colors.green("\n‚úÖ Selesai!"));
        await getBalance(wallet);

    } catch (error) {
        console.error(colors.red(`\nÌ†ΩÌ≤Ä Error: ${error.message}`));
        process.exit(1); // Exit dengan kode error
    }
}

main();