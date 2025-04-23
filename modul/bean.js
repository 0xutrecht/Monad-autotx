const { ethers } = require("ethers");
const colors = require("colors");
require("dotenv").config();

const displayHeader = require("../src/banner.js");
const {
  ROUTER_CONTRACT,
  WMON_CONTRACT,
  USDC_CONTRACT,
  BEAN_CONTRACT,
  JAI_CONTRACT,
  ABI
} = require("../abi/BEAN.js");

displayHeader();

const RPC_URLS = [
  "https://testnet-rpc.monorail.xyz",
  "https://testnet-rpc.monad.xyz",
  "https://monad-testnet.drpc.org"
];

const TOKEN_ADDRESSES = {
  WMON: WMON_CONTRACT,
  USDC: USDC_CONTRACT,
  BEAN: BEAN_CONTRACT,
  JAI: JAI_CONTRACT
};

const CHAIN_ID = 10143;
const BEAN_SWAP_ROUTER_ADDRESS = ROUTER_CONTRACT;
const WETH_ADDRESS = WMON_CONTRACT;

const PRIVATE_KEY = process.env.CURRENT_PK?.trim();
if (!PRIVATE_KEY) {
  throw new Error("? No CURRENT_PK found in .env");
}

const erc20Abi = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function"
  }
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRandomEthAmount() {
  return ethers.utils.parseEther(
    (Math.random() * (0.0001 - 0.00001) + 0.00001).toFixed(6)
  );
}

async function connectToRpc() {
  for (const url of RPC_URLS) {
    try {
      const provider = new ethers.providers.JsonRpcProvider(url);
      const network = await provider.getNetwork();
      console.log(`? Connected to chain ID: ${network.chainId}`.cyan);
      return provider;
    } catch (err) {
      console.log(`?? Failed to connect to ${url}, trying next...`.red);
    }
  }
  throw new Error("? Unable to connect to any RPC endpoint".red);
}

async function getBalance(wallet) {
  const provider = wallet.provider;
  const monBalance = await provider.getBalance(wallet.address);
  console.log(`?? MON Balance : ${ethers.utils.formatEther(monBalance)} MON`.green);

  const wethContract = new ethers.Contract(WETH_ADDRESS, erc20Abi, wallet);
  const wethBalance = await wethContract.balanceOf(wallet.address);
  console.log(`?? WETH Balance: ${ethers.utils.formatEther(wethBalance)} WETH`.green);

  return monBalance;
}

async function swapEthForTokens(wallet, tokenAddress, amountInWei, tokenSymbol) {
  const router = new ethers.Contract(BEAN_SWAP_ROUTER_ADDRESS, ABI, wallet);

  try {
    console.log(`?? Swapping ${ethers.utils.formatEther(amountInWei)} MON ? ${tokenSymbol}`.yellow);

    const estimate = await router.estimateGas.swapExactETHForTokens(
      0,
      [WETH_ADDRESS, tokenAddress],
      wallet.address,
      Math.floor(Date.now() / 1000) + 600,
      { value: amountInWei }
    );
    console.log(`? Estimated gas: ${estimate.toString()}`);

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
    console.log(`?? TX Hash: ${tx.hash}`.blue);
  } catch (err) {
    console.error("? Swap failed:", err.message.red);
  }
}

async function swapTokensForEth(wallet, tokenAddress, tokenSymbol) {
  const token = new ethers.Contract(tokenAddress, erc20Abi, wallet);
  const balance = await token.balanceOf(wallet.address);

  if (balance.eq(0)) {
    console.log(`?? No ${tokenSymbol} balance to swap`.gray);
    return;
  }

  try {
    console.log(`?? Swapping ${tokenSymbol} ? MON`.yellow);

    const approveTx = await token.approve(BEAN_SWAP_ROUTER_ADDRESS, balance);
    console.log(`? Approve TX: ${approveTx.hash}`);

    const router = new ethers.Contract(BEAN_SWAP_ROUTER_ADDRESS, ABI, wallet);

    const tx = await router.swapExactTokensForETH(
      balance,
      0,
      [tokenAddress, WETH_ADDRESS],
      wallet.address,
      Math.floor(Date.now() / 1000) + 600,
      {
        gasLimit: 210000
      }
    );
    console.log(`?? Swap TX: ${tx.hash}`.blue);
  } catch (err) {
    console.error(`? Swap failed: ${err.message}`.red);
  }
}

async function runForWallet(wallet) {
  console.log(`\n?? Wallet: ${wallet.address}`.bold.green);

  const monBalance = await getBalance(wallet);
  if (monBalance.lt(ethers.utils.parseEther("0.001"))) {
    console.log("?? MON balance too low, skipping wallet".red);
    return;
  }

  for (const [symbol, address] of Object.entries(TOKEN_ADDRESSES)) {
    const amount = getRandomEthAmount();
    await swapEthForTokens(wallet, address, amount, symbol);
    await sleep(3000);
  }

  console.log(`\n?? Reversing tokens to MONAD...\n`.white);

  for (const [symbol, address] of Object.entries(TOKEN_ADDRESSES)) {
    await swapTokensForEth(wallet, address, symbol);
    await sleep(3000);
  }
}

async function main() {
  const provider = await connectToRpc();
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`\n==============================`);
  console.log(`?? Running Bean for SINGLE Wallet`);
  console.log(`==============================`);

  await runForWallet(wallet);

  console.log("\n? Bean process completed for current wallet\n".green);
}

main().catch((err) => console.error("? Fatal Error:", err));
