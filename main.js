const { spawn } = require('child_process');
const prompts = require('prompts');
const { ethers } = require('ethers');
const displayHeader = require('./src/banner.js');
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// === LOCK FILE ===
const LOCK_FILE = path.join(__dirname, 'main.lock');
if (fs.existsSync(LOCK_FILE)) {
  console.log("? Bot sudah berjalan di screen lain. Keluar...");
  process.exit(1);
}
fs.writeFileSync(LOCK_FILE, 'running');
process.on('exit', () => {
  if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
});
process.on('SIGINT', () => process.exit());
process.on('SIGTERM', () => process.exit());

// === TELEGRAM ===
function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const message = encodeURIComponent(text);
  const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${message}`;

  https.get(url, (res) => {
    if (res.statusCode !== 200) {
      console.error(`? Gagal kirim ke Telegram, status code: ${res.statusCode}`);
    }
  }).on('error', (e) => {
    console.error("? Error koneksi Telegram:", e);
  });
}

// === CEK SALDO ===
async function getWalletBalances(privateKeys) {
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const balances = [];

  for (const pk of privateKeys) {
    const address = ethers.utils.computeAddress(pk);
    let balance;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        balance = await provider.getBalance(address);
        break;
      } catch (err) {
        console.warn(`?? Gagal ambil saldo untuk ${address} (percobaan ${attempt})`);
        if (attempt === 3) {
          sendTelegramMessage(`? Gagal ambil saldo untuk ${address} setelah 3x percobaan.`);
          balance = ethers.BigNumber.from("0");
        } else {
          await new Promise(res => setTimeout(res, 3000));
        }
      }
    }

    const mnt = parseFloat(ethers.utils.formatEther(balance)).toFixed(4);
    balances.push({ address, mnt });
  }

  return balances;
}

// === UTILITY ===
async function loadChalk() {
  return (await import("chalk")).default;
}

(async () => {
  const chalk = await loadChalk();
  console.clear();
  displayHeader();
  console.log(chalk.blueBright.bold("\n?? Auto TX Monad Testnet - Multi Wallet\n"));

  const scripts = [
    { name: "Uniswap", path: "./modul/uniswap.js" },
    { name: "Rubic Swap", path: "./modul/rubic.js" },
    { name: "Magma Staking", path: "./modul/magma.js" },
    { name: "Kitsu", path: "./modul/kitsu.js" },
    { name: "Izumi", path: "./modul/izumi.js" },
    { name: "Deploy", path: "./modul/deploy.mjs" },
    { name: "Bebop", path: "./modul/bebop.js" },
    { name: "Bean", path: "./modul/bean.js" },
    { name: "Apriori", path: "./modul/apriori.js" },
    { name: "Kuru", path: "./modul/kuru.js" },
  ];

  const DELAY = {
    ANTAR_MODUL: 30000,
    ANTAR_WALLET: 30000
  };

  let totalTx = 0;

  async function runScript(script, walletIndex, totalWallets) {
    console.log(chalk.yellow(`\n?? Running ${script.name} [Wallet ${walletIndex + 1}/${totalWallets}]`));
    return new Promise((resolve, reject) => {
      const process = spawn("node", [script.path], { stdio: 'inherit' });
      process.on('close', (code) => {
        if (code === 0) {
          totalTx++;
          sendTelegramMessage(`? ${script.name} [Wallet ${walletIndex + 1}] selesai ?`);
          resolve();
        } else {
          sendTelegramMessage(`? ${script.name} [Wallet ${walletIndex + 1}] error ?`);
          reject();
        }
      });
    });
  }

  async function runAllWallets(loopCount, selectedScripts) {
    const privateKeys = process.env.PRIVATE_KEYS.split(',')
      .map(key => key.trim())
      .filter(key => key);

    for (let i = 0; i < loopCount; i++) {
      console.log(chalk.magenta(`\n?? Loop ${i + 1}/${loopCount}`));
      for (let j = 0; j < privateKeys.length; j++) {
        process.env.CURRENT_PK = privateKeys[j];
        const address = ethers.utils.computeAddress(privateKeys[j]);
        console.log(chalk.cyan(`\n?? Mulai wallet ${j + 1}: ${address}`));
        sendTelegramMessage(`?? Mulai swap wallet\n${address}`);

        for (const script of selectedScripts) {
          try {
            await runScript(script, j, privateKeys.length);
            console.log(chalk.gray(`? Delay ${DELAY.ANTAR_MODUL / 1000} detik sebelum modul berikutnya...`));
            await new Promise(resolve => setTimeout(resolve, DELAY.ANTAR_MODUL));
          } catch {
            console.log(chalk.red("? Modul error, lanjut ke modul berikutnya"));
          }
        }

        if (j < privateKeys.length - 1) {
          console.log(chalk.gray(`? Delay ${DELAY.ANTAR_WALLET / 1000} detik sebelum wallet berikutnya...`));
          await new Promise(resolve => setTimeout(resolve, DELAY.ANTAR_WALLET));
        }

        sendTelegramMessage(`? Wallet ${address} selesai.\n?? TX: ${totalTx} total\n?? Hari aktif: 11`);
      }
    }

    console.log(chalk.green.bold("\n?? Semua transaksi selesai!"));

    const balances = await getWalletBalances(privateKeys);
    let message = `? Semua transaksi selesai!\n\n?? Total TX: ${totalTx}\n\n?? Saldo Wallet:\n`;
    balances.forEach((b, i) => {
      message += `?? Wallet ${i + 1}: ${b.address}\n   ?? ${b.mnt} MNT\n`;
    });

    sendTelegramMessage(message);
  }

  function getRandomDelayUntilNextRun() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const millisUntilMidnight = tomorrow.getTime() - now.getTime();
    const randomDelay = Math.floor(Math.random() * millisUntilMidnight);
    return randomDelay;
  }

  async function scheduleDailyRun() {
    try {
      totalTx = 0;
      await runAllWallets(1, scripts);
    } catch (err) {
      console.error(chalk.red("? Error saat eksekusi awal:"), err);
      sendTelegramMessage("? Error saat eksekusi awal:\n" + err.message);
    }

    while (true) {
      const delay = getRandomDelayUntilNextRun();
      const nextRun = new Date(Date.now() + delay);
      console.log(chalk.blue(`\n?? Menunggu hingga eksekusi berikutnya: ${nextRun.toLocaleString()}`));
      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        totalTx = 0;
        await runAllWallets(1, scripts);
      } catch (err) {
        console.error(chalk.red("? Error saat eksekusi harian:"), err);
        sendTelegramMessage("? Error saat eksekusi harian:\n" + err.message);
      }
    }
  }

  scheduleDailyRun();
})();
