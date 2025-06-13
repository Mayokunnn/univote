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

async function testVoting() {
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
    // 1. Get the current election count
    const electionCount = await contract.electionCount();
    console.log("\nCurrent election count:", Number(electionCount));

    // 2. Create a new election (requires admin wallet)
    console.log("\nCreating new election...");
    const adminWallet = new ethers.Wallet(
      "0xfea4b8ba0fc6675c5b8109861069497997ce0b79408c8ef903cec5f8e9d1cb98",
      provider
    );
    const adminContract = contract.connect(adminWallet);

    const tx = await adminContract.createElection("Election 2024");
    const receipt = await tx.wait();
    console.log("Election created:", receipt.hash);

    // Get the new election ID
    const newElectionId = Number(electionCount) + 1;
    console.log("New election ID:", newElectionId);

    // 3. Add candidates (requires admin)
    console.log("\nAdding candidates...");
    const candidates = [
      { name: "John Doe", address: adminWallet.address },
      { name: "Jane Smith", address: adminWallet.address },
      { name: "Mike Johnson", address: adminWallet.address },
    ];

    for (const candidate of candidates) {
      const tx = await adminContract.addCandidate(
        newElectionId,
        candidate.name
      );
      const receipt = await tx.wait();
      console.log(`Added candidate: ${candidate.name}`, receipt.hash);
    }

    // 4. Start the election (requires admin)
    console.log("\nStarting election...");
    const startTx = await adminContract.startElection(newElectionId);
    const startReceipt = await startTx.wait();
    console.log("Election started:", startReceipt.hash);

    // 5. Create a voter wallet
    const voterWallet = new ethers.Wallet(
      "0xfea4b8ba0fc6675c5b8109861069497997ce0b79408c8ef903cec5f8e9d1cb98",
      provider
    );
    console.log("\nVoter address:", voterWallet.address);

    // 6. Generate signature for voting
    console.log("\nGenerating vote signature...");
    const candidateId = 1; // Vote for first candidate

    // Create the message hash exactly as the contract expects it
    const messageHash = ethers.keccak256(
      ethers.solidityPacked(
        ["uint256", "uint256", "address"],
        [newElectionId, candidateId, voterWallet.address]
      )
    );

    // Sign the message hash with the Ethereum prefix
    const signature = await voterWallet.signMessage(
      ethers.getBytes(messageHash)
    );

    console.log("Message hash:", messageHash);
    console.log("Signature generated:", signature);

    // 7. Submit vote with signature
    console.log("\nSubmitting vote...");
    const voterContract = contract.connect(voterWallet);
    const voteTx = await voterContract.voteWithSignature(
      newElectionId,
      candidateId,
      voterWallet.address,
      signature
    );
    const voteReceipt = await voteTx.wait();
    console.log("Vote submitted:", voteReceipt.hash);

    // 8. Verify the vote was recorded
    console.log("\nVerifying vote...");
    const [hasVoted, votedCandidateId] = await contract.getVoter(
      newElectionId,
      voterWallet.address
    );
    console.log("Vote verification:");
    console.log("- Has voted:", hasVoted);
    console.log("- Voted for candidate:", Number(votedCandidateId));

    // 9. Check candidate vote count
    const [ids, names, addresses, voteCounts] =
      await contract.getElectionCandidates(newElectionId);
    console.log("\nUpdated vote counts:");
    for (let i = 0; i < ids.length; i++) {
      console.log(`${names[i]}: ${voteCounts[i]} votes`);
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Check for required environment variables
// if (!process.env.ADMIN_PRIVATE_KEY || !process.env.VOTER_PRIVATE_KEY) {
//   console.error(
//     "Error: ADMIN_PRIVATE_KEY and VOTER_PRIVATE_KEY environment variables are required"
//   );
//   process.exit(1);
// }

testVoting()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
