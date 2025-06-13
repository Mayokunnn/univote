// add-candidate.js
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Fix the path to go up one directory to find the artifacts folder
const contractABI = JSON.parse(
  readFileSync(
    join(__dirname, "..", "artifacts/contracts/Vote.sol/DecentralizedVoting.json"),
    "utf8"
  )
).abi;

const contractAddress = "0xbD6B55710503f75886fc05Cc175d4285574F63d4";
const provider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/8e256d2417a647cb827138d2736b496c");

async function addCandidate() {
  try {
    const privateKey = "0xfea4b8ba0fc6675c5b8109861069497997ce0b79408c8ef903cec5f8e9d1cb98";
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);

    console.log("Connected with address:", wallet.address);

    // Add candidate to election 2
    const candidateName = "Candidate 3"; // Replace with your candidate's name
    const tx = await contract.addCandidate(1, candidateName);
    console.log("Transaction sent:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed:", receipt.hash);

    // Verify candidate was added
    const [name, voteCount] = await contract.getCandidate(1, 4);
    console.log("Candidate details after adding:", { name, voteCount });
  } catch (error) {
    console.error("Error:", error);
  }
}

addCandidate();