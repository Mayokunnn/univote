// check-election-status.js
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const contractABI = JSON.parse(
  readFileSync(
    join(__dirname, "..", "artifacts/contracts/Vote.sol/DecentralizedVoting.json"),
    "utf8"
  )
).abi;

const contractAddress = "0xbD6B55710503f75886fc05Cc175d4285574F63d4";
const provider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/8e256d2417a647cb827138d2736b496c");

async function checkElectionStatus() {
  try {
    const contract = new ethers.Contract(contractAddress, contractABI, provider);

    // Check election 3 status
    const started = await contract.isElectionStarted(3);
    const ended = await contract.isElectionEnded(3);
    console.log("Election 3 status:", { started, ended });

    // Get all candidates for election 3
    console.log("\nCandidates in election 3:");
    const [name1, votes1] = await contract.getCandidate(3, 1);
    const [name2, votes2] = await contract.getCandidate(3, 2);
    const [name3, votes3] = await contract.getCandidate(3, 3);
    console.log("Candidate 1:", { name: name1, votes: votes1.toString() });
    console.log("Candidate 2:", { name: name2, votes: votes2.toString() });
    console.log("Candidate 3:", { name: name3, votes: votes3.toString() });

  } catch (error) {
    console.error("Error:", error);
  }
}

checkElectionStatus();