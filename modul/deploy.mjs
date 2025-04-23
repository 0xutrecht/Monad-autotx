import { config } from "dotenv";
import { ethers } from "ethers";
import solc from "solc";
import chalk from "chalk";
import ora from "ora";

config();

const PRIVATE_KEY = process.env.CURRENT_PK?.trim();
const RPC_URL = "https://testnet-rpc.monad.xyz";

if (!PRIVATE_KEY || !RPC_URL) {
    console.log(chalk.red.bold("❌ Missing CURRENT_PK or RPC_URL!"));
    process.exit(1);
}

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

const chemicalTerms = [
    "Hydrogen", "Oxygen", "Nitrogen", "Carbon", "Helium",
    "Neon", "Argon", "Krypton", "Xenon", "Radon"
];

const planets = [
    "Mercury", "Venus", "Earth", "Mars", "Jupiter",
    "Saturn", "Uranus", "Neptune", "Pluto"
];

function generateRandomName() {
    const combinedTerms = [...chemicalTerms, ...planets];
    const shuffled = combinedTerms.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3).join("");
}

const contractSource = `
pragma solidity ^0.8.0;

contract Counter {
    uint256 private count;

    event CountIncremented(uint256 newCount);

    function increment() public {
        count += 1;
        emit CountIncremented(count);
    }

    function getCount() public view returns (uint256) {
        return count;
    }
}
`;

function compileContract() {
    const spinner = ora("Compiling contract...").start();

    try {
        const input = {
            language: "Solidity",
            sources: { "Counter.sol": { content: contractSource } },
            settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } } }
        };

        const output = JSON.parse(solc.compile(JSON.stringify(input)));
        const contract = output.contracts["Counter.sol"].Counter;

        spinner.succeed(chalk.green("Contract compiled successfully!"));
        return { abi: contract.abi, bytecode: contract.evm.bytecode.object };
    } catch (error) {
        spinner.fail(chalk.red("Contract compilation failed!"));
        console.error(error);
        process.exit(1);
    }
}

async function deployContract(wallet, contractName) {
    const { abi, bytecode } = compileContract();
    const spinner = ora(`Deploying contract ${contractName}...`).start();

    try {
        const factory = new ethers.ContractFactory(abi, bytecode, wallet);
        const contract = await factory.deploy();

        spinner.text = `⏳ Waiting for confirmation...`;
        const receipt = await contract.deployTransaction.wait();

        if (receipt && receipt.status === 1) {
            spinner.succeed(chalk.green(`✅ Contract ${contractName} deployed!`));
            console.log(chalk.cyan("📌 Address: ") + chalk.yellow(contract.address));
            console.log(chalk.cyan("📜 Tx Hash: ") + chalk.yellow(receipt.transactionHash));
        } else {
            spinner.fail(chalk.red("❌ Deployment failed!"));
        }
    } catch (error) {
        spinner.fail(chalk.red("❌ Deployment error!"));
        console.error(error);
    }
}

console.log(chalk.blue("\n🚀 Starting Deployment (Single Wallet)...\n"));

const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contractName = generateRandomName();
console.log(chalk.yellow(`🔨 Deploying contract "${contractName}"`));

await deployContract(wallet, contractName);

console.log(chalk.green.bold("\n✅ Deployment complete! 🎉\n"));
process.exit(0);
