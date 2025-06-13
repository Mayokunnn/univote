// check-election.js
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the ABI file
const DecentralizedVoting = JSON.parse(
  readFileSync(
    join(__dirname, "../backend/abi/DecentralizedVoting.json"),
    "utf8"
  )
);

async function checkElection() {
  // Connect to the network
  const provider = new ethers.JsonRpcProvider(
    "https://sepolia.infura.io/v3/8e256d2417a647cb827138d2736b496c"
  );

  // Contract address
  const contractAddress = "0xbD6B55710503f75886fc05Cc175d4285574F63d4";

  // Create contract instance
  const contract = new ethers.Contract(
    contractAddress,
    DecentralizedVoting.abi,
    provider
  );

  try {
    const electionId = 3;
    console.log(`Checking election ${electionId}...`);

    // Get election details
    const election = await contract.elections(electionId);
    console.log("\nElection Details:");
    console.log("----------------");
    console.log(`ID: ${election.id}`);
    console.log(`Title: ${election.title}`);
    console.log(`Started: ${election.started}`);
    console.log(`Ended: ${election.ended}`);
    console.log(`Candidate Count: ${election.candidateCount}`);

    // Get election status
    const started = await contract.isElectionStarted(electionId);
    const ended = await contract.isElectionEnded(electionId);
    console.log("\nElection Status:");
    console.log("----------------");
    console.log(`Started: ${started}`);
    console.log(`Ended: ${ended}`);

    // Get candidates if any exist
    if (Number(election.candidateCount) > 0) {
      console.log("\nFetching candidates...");
      const [ids, names, addresses, voteCounts] =
        await contract.getElectionCandidates(electionId);

      console.log("\nCandidates found:");
      console.log("----------------");

      for (let i = 0; i < ids.length; i++) {
        console.log(`\nCandidate ${i + 1}:`);
        console.log(`ID: ${ids[i]}`);
        console.log(`Name: ${names[i]}`);
        console.log(`Address: ${addresses[i]}`);
        console.log(`Votes: ${voteCounts[i]}`);
      }
    } else {
      console.log("\nNo candidates found for this election.");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

checkElection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
