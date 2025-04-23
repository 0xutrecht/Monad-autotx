require("dotenv").config();
const { ethers } = require("ethers");
const colors = require("colors");
const displayHeader = require("../src/banner.js");

// ======================
// KONFIGURASI UTAMA
// ======================
const RPC_URLS = [
  "https://testnet-rpc.monorail.xyz",
  "https://testnet-rpc.monad.xyz",
  "https://monad-testnet.drpc.org"
];
const WMON_CONTRACT = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701"; // Alamat kontrak WMON

// ======================
// FUNGSI UTAMA
// ======================
displayHeader();

async function connectToRPC() {
  // Mencoba semua RPC secara bergantian
  for (const url of RPC_URLS) {
    try {
      const provider = new ethers.providers.JsonRpcProvider(url);
      await provider.getNetwork(); // Test koneksi
      console.log(colors.green(`? Terhubung ke RPC: ${url}`));
      return provider;
    } catch (e) {
      console.log(colors.yellow(`?? Gagal ke ${url}, mencoba RPC lain...`));
    }
  }
  throw new Error("? Semua RPC gagal");
}

function getRandomAmount(min = 0.0001, max = 0.00001) {
  // Generate jumlah acak antara min-max MON
  const random = Math.random() * (max - min) + min;
  return ethers.utils.parseEther(random.toFixed(4)); // Konversi ke wei
}

async function wrapMON(wallet, amount) {
  const contract = new ethers.Contract(
    WMON_CONTRACT,
    ["function deposit() public payable"],
    wallet
  );

  try {
    console.log(colors.magenta(`\n?? Wrap ${ethers.utils.formatEther(amount)} MON ? WMON`));
    const tx = await contract.deposit({ 
      value: amount,
      gasLimit: 500000 // Gas limit tinggi untuk antisipasi
    });
    console.log(colors.green(`? Berhasil! Tx Hash: ${tx.hash}`));
    await tx.wait(); // Tunggu konfirmasi blockchain
  } catch (error) {
    console.error(colors.red(`? Gagal wrap: ${error.reason || error.message}`));
    throw error;
  }
}

async function unwrapMON(wallet, amount) {
  const contract = new ethers.Contract(
    WMON_CONTRACT,
    ["function withdraw(uint256 amount) public"],
    wallet
  );

  try {
    console.log(colors.magenta(`\n?? Unwrap ${ethers.utils.formatEther(amount)} WMON ? MON`));
    const tx = await contract.withdraw(amount, {
      gasLimit: 500000
    });
    console.log(colors.green(`? Berhasil! Tx Hash: ${tx.hash}`));
    await tx.wait();
  } catch (error) {
    console.error(colors.red(`? Gagal unwrap: ${error.reason || error.message}`));
    throw error;
  }
}

// ======================
// EKSEKUSI UTAMA
// ======================
async function main() {
  try {
    // 1. Validasi Private Key
    const privateKey = process.env.CURRENT_PK || process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("? Private key tidak ditemukan di .env");
    
    // Format: harus 64 karakter hex (dengan atau tanpa 0x)
    const formattedPK = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    if (!/^0x[0-9a-fA-F]{64}$/.test(formattedPK)) {
      throw new Error("? Format private key tidak valid (harus 64 karakter hex)");
    }

    // 2. Hubungkan ke RPC
    const provider = await connectToRPC();
    const wallet = new ethers.Wallet(formattedPK, provider);
    
    // 3. Tampilkan info wallet
    console.log(colors.green(`\n==============================`));
    console.log(colors.bold(`?? Wallet: ${wallet.address}`));
    console.log(colors.green(`==============================`));

    // 4. Eksekusi swap
    const amount = getRandomAmount(); // Dapatkan jumlah acak 0.01-0.05 MON
    await wrapMON(wallet, amount);
    await unwrapMON(wallet, amount);

    // 5. Delay 30 detik (revisi)
    console.log(colors.blue(`\n? Menunggu 30 detik...`));
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error(colors.red(`\n?? Error fatal: ${error.message}`));
    process.exit(1); // Keluar dengan kode error
  }
}

main();