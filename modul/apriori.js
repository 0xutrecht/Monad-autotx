// apriori.js - Sudah disinkronkan dengan struktur dan gaya di uniswap.js

require("dotenv").config();
const { ethers } = require("ethers");
const colors = require("colors");
const displayHeader = require("../src/banner.js");
const axios = require("axios");

// ============================
// ?? KONFIGURASI UTAMA
// ============================
const RPC_URL = "https://testnet-rpc.monad.xyz";
const EXPLORER_URL = "https://testnet.monadexplorer.com/tx/";
const contractAddress = "0xb2f82D0f38dc453D596Ad40A37799446Cc89274A";

const PRIVATE_KEY = process.env.CURRENT_PK || process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) throw new Error("\u274c Tidak ada Private Key di .env");

const gasLimitStake = 100000;
const gasLimitUnstake = 300000;
const gasLimitClaim = 300000;

const minimalABI = [
  "function getPendingUnstakeRequests(address) view returns (uint256[] memory)"
];

// ============================
// ?? UTILS
// ============================
function getRandomAmount() {
  const min = 0.0001;
  const max = 0.0005;
  const randomAmount = Math.random() * (max - min) + min;
  return ethers.utils.parseEther(randomAmount.toFixed(4));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================
// ?? EKSEKUSI UTAMA
// ============================
(async () => {
  try {
    displayHeader();
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(colors.green("\n=============================="));
    console.log(colors.bold(`?? Wallet: ${wallet.address}`));
    console.log(colors.green("=============================="));

    const stakeAmount = getRandomAmount();

    // ?? STAKE
    console.log(colors.cyan(`\n?? Stake: ${ethers.utils.formatEther(stakeAmount)} MON`));
    const stakeData =
      "0x6e553f65" +
      ethers.utils.hexZeroPad(stakeAmount.toHexString(), 32).slice(2) +
      ethers.utils.hexZeroPad(wallet.address, 32).slice(2);

    const stakeTx = await wallet.sendTransaction({
      to: contractAddress,
      data: stakeData,
      gasLimit: ethers.utils.hexlify(gasLimitStake),
      value: stakeAmount
    });
    console.log(colors.yellow(`?? Tx Hash: ${stakeTx.hash}`));
    await stakeTx.wait();
    console.log(colors.green("\u2705 Stake berhasil!"));

    await sleep(3000);

    // ?? UNSTAKE
    const unstakeData =
      "0x7d41c86e" +
      ethers.utils.hexZeroPad(stakeAmount.toHexString(), 32).slice(2) +
      ethers.utils.hexZeroPad(wallet.address, 32).slice(2) +
      ethers.utils.hexZeroPad(wallet.address, 32).slice(2);

    console.log(colors.cyan(`\n?? Unstake: ${ethers.utils.formatEther(stakeAmount)} aprMON`));
    const unstakeTx = await wallet.sendTransaction({
      to: contractAddress,
      data: unstakeData,
      gasLimit: ethers.utils.hexlify(gasLimitUnstake),
      value: 0
    });
    console.log(colors.yellow(`?? Tx Hash: ${unstakeTx.hash}`));
    await unstakeTx.wait();
    console.log(colors.green("\u2705 Unstake berhasil!"));

    await sleep(3000);

    // ?? CLAIM
    const apiUrl = `https://testnet.monadexplorer.com/api/v1/unstake-requests?address=${wallet.address}`;
    const res = await axios.get(apiUrl, { timeout: 10000 });
    const claimable = res.data.find(r => !r.claimed && r.is_claimable);

    if (!claimable) {
      console.log(colors.gray("\n?? Tidak ada yang bisa diklaim"));
      return;
    }

    const claimData =
      "0x48c54b9d" +
      ethers.utils.hexZeroPad(ethers.BigNumber.from(claimable.id).toHexString(), 32).slice(2) +
      ethers.utils.hexZeroPad(wallet.address, 32).slice(2);

    console.log(colors.cyan(`\n?? Klaim ID: ${claimable.id}`));
    const claimTx = await wallet.sendTransaction({
      to: contractAddress,
      data: claimData,
      gasLimit: ethers.utils.hexlify(gasLimitClaim),
      value: 0
    });
    console.log(colors.yellow(`?? Tx Hash: ${claimTx.hash}`));
    await claimTx.wait();
    console.log(colors.green("\u2705 Klaim berhasil!"));

  } catch (error) {
    console.error(colors.red(`\n?? Error: ${error.message}`));
    process.exit(1);
  }
})();
