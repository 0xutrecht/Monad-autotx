const { spawn } = require('child_process');
const prompts = require('prompts');
const { ethers } = require('ethers');
const displayHeader = require('./src/banner.js');
require('dotenv').config();

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

  // ======== DELAY CONFIG ========
  const DELAY = {
    ANTAR_MODUL: 30000,    // 30 detik
    ANTAR_WALLET: 30000    // 30 detik
  };

  async function runScript(script, walletIndex, totalWallets) {
    console.log(chalk.yellow(`\n?? Running ${script.name} [Wallet ${walletIndex + 1}/${totalWallets}]`));

    return new Promise((resolve, reject) => {
      const process = spawn("node", [script.path], { stdio: 'inherit' });

      process.on('close', (code) => {
        if (code === 0) resolve();
        else reject();
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
        console.log(chalk.cyan(`\n?? Wallet ${j + 1}: ${address}`));

        for (const script of selectedScripts) {
          try {
            await runScript(script, j, privateKeys.length);
            console.log(chalk.gray(`? Tunggu ${DELAY.ANTAR_MODUL / 1000} detik sebelum modul berikutnya...`));
            await new Promise(resolve => setTimeout(resolve, DELAY.ANTAR_MODUL));
          } catch {
            console.log(chalk.red("? Modul error, lanjut ke modul berikutnya"));
          }
        }

        if (j < privateKeys.length - 1) {
          console.log(chalk.gray(`? Tunggu ${DELAY.ANTAR_WALLET / 1000} detik sebelum wallet berikutnya...`));
          await new Promise(resolve => setTimeout(resolve, DELAY.ANTAR_WALLET));
        }
      }
    }
  }

  async function main() {
    const { selectedModules } = await prompts({
      type: 'multiselect',
      name: 'selectedModules',
      message: 'Pilih modul:',
      choices: scripts.map(s => ({ title: s.name, value: s })),
      min: 1
    });

    const { loopCount } = await prompts({
      type: 'number',
      name: 'loopCount',
      message: 'Jumlah loop per wallet?',
      initial: 1,
      min: 1
    });

    await runAllWallets(loopCount, selectedModules);
    console.log(chalk.green.bold("\n? Semua transaksi selesai!"));
  }

  main().catch(console.error);
})();
