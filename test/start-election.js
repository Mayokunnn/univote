// start-election.js
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const contractABI = JSON.parse(
  readFileSync(
    join(
      __dirname,
      "..",
      "artifacts/contracts/Vote.sol/DecentralizedVoting.json"
    ),
    "utf8"
  )
).abi;

const contractAddress = "0xbD6B55710503f75886fc05Cc175d4285574F63d4";
const provider = new ethers.JsonRpcProvider(
  "https://sepolia.infura.io/v3/8e256d2417a647cb827138d2736b496c"
);

async function startElection() {
  try {
    const privateKey =
      "0xfea4b8ba0fc6675c5b8109861069497997ce0b79408c8ef903cec5f8e9d1cb98";
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);

    console.log("Connected with address:", wallet.address);

    // Start election 3
    const tx = await contract.startElection(1);
    console.log("Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("Transaction confirmed:", receipt.hash);

    // Verify election status
    const started = await contract.isElectionStarted(1);
    const ended = await contract.isElectionEnded(1);
    console.log("Updated election status:", { started, ended });

    // Show candidates
    console.log("\nCandidates in election 3:");
    const [name1, votes1] = await contract.getCandidate(1, 1);
    const [name2, votes2] = await contract.getCandidate(1, 2);
    const [name3, votes3] = await contract.getCandidate(1, 3);
    const [name4, votes4] = await contract.getCandidate(1, 4);
    console.log("Candidate 1:", { name: name1, votes: votes1.toString() });
    console.log("Candidate 2:", { name: name2, votes: votes2.toString() });
    console.log("Candidate 3:", { name: name3, votes: votes3.toString() });
    console.log("Candidate 4:", { name: name4, votes: votes4.toString() });
  } catch (error) {
    console.error("Error:", error);
  }
}

startElection();
