# Monad Testnet Automation Guide

## Prerequisites
- Ensure you have **MON** & **ETH MON** in your wallet.
- Complete all **Monad Testnet** tasks before running the script.

---

## Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/0xutrecht/Monad-autotx.git
   cd Monad-autotx
   ```
2. **Install Dependencies**
   ```bash
   npm install ethers@5 dotenv ethers ora readline cfonts prompts colors axios chalk figlet solc
   ```
3. **Set Private Key**
   ```bash
   nano .env
   ```
   **isi dengan
   ```bash
   PRIVATE_KEYS=0xwallet1,0xwallet2
   ```
4. **Create and Use Screen**
   ```bash
   screen -R monad
   ```
5. **Run the Application**
   ```bash
   node main.js
   ```
(Press Ctrl + A, then D to keep the session running in the background.)


**Update**
 ```bash
cd Monad-trx && rm package-lock.json && rm package.json && git pull --no-rebase && npm install
 ```

**Node.js Cleanup & Reinstallation**
   ```bash
	sudo apt remove --purge nodejs npm libnode-dev -y
	sudo apt autoremove -y
	sudo rm -rf /usr/include/node /usr/lib/node_modules ~/.npm ~/.nvm
	curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
	sudo apt install -y nodejs
	node -v && npm -v
   ```
