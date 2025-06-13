import { createRequire } from "node:module";
import dotenv from "dotenv";
import { ethers } from "ethers";

const require = createRequire(import.meta.url);
const contractABI = require("./abi/DecentralizedVoting.json");

dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  contractABI.abi,
  wallet
);

export { contract };
