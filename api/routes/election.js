import express from "express";
const router = express.Router();
import { contract } from "../config.js";
import isAdmin from "../middleware/adminAuth.js";
import validateEligibility from "../middleware/validateEligibility.js";
import Election from "../models/elections.js";
import Candidate from "../models/candidates.js";
import User from "../models/user.js";
import Voter from "../models/voter.js";
import { ethers } from "ethers";
import { Sequelize } from "sequelize";

// Utility function to sync election status
async function syncElectionStatus(electionId) {
  try {
    const started = await contract.isElectionStarted(electionId);
    const ended = await contract.isElectionEnded(electionId);

    await Election.update(
      {
        isStarted: started,
        isEnded: ended,
        isNotStarted: !started && !ended,
      },
      { where: { id: electionId } }
    );

    return { started, ended };
  } catch (error) {
    console.error(`Error syncing election ${electionId} status:`, error);
    throw error;
  }
}

// Utility function to sync candidate votes
async function syncCandidateVotes(electionId, candidateId) {
  try {
    const [name, voteCount] = await contract.getCandidate(
      electionId,
      candidateId
    );

    await Candidate.update(
      {
        voteCount: Number(voteCount),
      },
      { where: { id: candidateId, electionId } }
    );

    return { name, voteCount: Number(voteCount) };
  } catch (error) {
    console.error(`Error syncing candidate ${candidateId} votes:`, error);
    throw error;
  }
}

// Utility function to sync all candidates for an election
async function syncAllCandidateVotes(electionId) {
  try {
    const candidates = await Candidate.findAll({
      where: { electionId },
      attributes: ["id"],
    });

    for (const candidate of candidates) {
      await syncCandidateVotes(electionId, candidate.id);
    }
  } catch (error) {
    console.error(
      `Error syncing all candidates for election ${electionId}:`,
      error
    );
    throw error;
  }
}

// Update the syncCandidates function
async function syncCandidates(electionId) {
  try {
    // Get all candidates from contract in one call
    const [ids, names, addresses, voteCounts] =
      await contract.getElectionCandidates(electionId);

    // Get existing candidates from DB
    const existingCandidates = await Candidate.findAll({
      where: { electionId },
      attributes: ["id", "name"],
    });

    // Create a map of existing candidates by ID
    const existingMap = new Map(existingCandidates.map((c) => [c.id, c]));

    // Update or create candidates
    for (let i = 0; i < ids.length; i++) {
      const id = Number(ids[i]);
      const name = names[i];
      const voteCount = Number(voteCounts[i]);
      const candidateAddress = addresses[i];

      if (existingMap.has(id)) {
        // Update existing candidate
        await Candidate.update(
          {
            name,
            voteCount,
            candidateAddress,
          },
          { where: { id, electionId } }
        );
      } else {
        // Create new candidate
        await Candidate.create({
          id,
          electionId,
          name,
          voteCount,
          candidateAddress,
        });
      }
    }

    // Remove any candidates that no longer exist in the contract
    const contractCandidateIds = ids.map((id) => Number(id));
    const dbCandidateIds = existingCandidates.map((c) => c.id);
    const candidatesToRemove = dbCandidateIds.filter(
      (id) => !contractCandidateIds.includes(id)
    );

    if (candidatesToRemove.length > 0) {
      await Candidate.destroy({
        where: {
          id: candidatesToRemove,
          electionId,
        },
      });
    }

    return ids.length;
  } catch (error) {
    console.error(
      `Error syncing candidates for election ${electionId}:`,
      error
    );
    throw error;
  }
}

// ADMIN ENDPOINTS
router.post("/admin/elections", isAdmin, async (req, res) => {
  try {
    const { title, type, allowedValues } = req.body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({ error: "Election title is required." });
    }
    if (!type || !["general", "department", "program"].includes(type)) {
      return res.status(400).json({
        error: "Election type must be 'general', 'department' or 'program'.",
      });
    }

    // Check duplicate title
    const existing = await Election.findOne({ where: { title } });
    if (existing) {
      return res
        .status(409)
        .json({ error: "An election with this title already exists." });
    }

    // Get current electionCount from smart contract
    const electionCount = await contract.electionCount();

    // Call contract to create election on-chain
    const tx = await contract.createElection(title);
    const receipt = await tx.wait();

    // New election ID is electionCount + 1
    const newElectionId = Number(electionCount) + 1;

    // Save in DB with smart contract's electionId and txHash
    const newElection = await Election.create({
      id: newElectionId,
      title,
      type,
      allowedValues: allowedValues || [],
      isStarted: false,
      isEnded: false,
      isNotStarted: true,
      txHash: tx.hash,
    });

    res.status(201).json({
      message: "Election created successfully.",
      election: newElection,
      txHash: tx.hash,
    });
  } catch (err) {
    console.error("Error creating election:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/candidates", isAdmin, async (req, res) => {
  try {
    const { electionId, name, candidateAddress } = req.body;
    if (!electionId || !name) {
      return res
        .status(400)
        .json({ error: "Election ID and candidate name are required" });
    }

    // Verify election exists and is not started
    const election = await Election.findByPk(electionId);
    if (!election) {
      return res.status(404).json({ error: "Election not found" });
    }
    if (election.isStarted) {
      return res
        .status(400)
        .json({ error: "Cannot add candidates to a started election" });
    }

    // Add candidate on-chain
    const tx = await contract.addCandidate(electionId, name);
    const receipt = await tx.wait();

    console.log(
      "Expected topic:",
      ethers.keccak256(
        ethers.toUtf8Bytes("CandidateAdded(uint256,uint256,string,address)")
      )
    );

    // Extract candidateId and candidateAddress from CandidateAdded event
    let onChainCandidateId = null;
    let onChainCandidateAddress = null; // Default to null
    if (receipt.logs && receipt.logs.length > 0) {
      const event = receipt.logs
        .map((log) => {
          try {
            const parsed = contract.interface.parseLog(log);
            console.log("Parsed log:", parsed);
            return parsed;
          } catch (error) {
            console.error("Error parsing log:", error.message, log);
            return null;
          }
        })
        .find((e) => e && e.name === "CandidateAdded");
      if (event) {
        onChainCandidateId = Number(event.args.candidateId);
        onChainCandidateAddress = event.args.candidateAddress;
        console.log("Parsed event args:", event.args);
      } else {
        console.error("CandidateAdded event not found in logs:", receipt.logs);
      }
    }

    // Fallback: Query contract state
    if (!onChainCandidateId) {
      console.warn("Falling back to contract state query for candidateId");
      const electionData = await contract.elections(electionId);
      onChainCandidateId = Number(electionData.candidateCount);
      // Verify candidate
      const [candidateName, voteCount] = await contract.getCandidate(
        electionId,
        onChainCandidateId
      );
      if (candidateName !== name) {
        return res
          .status(500)
          .json({ error: "Candidate ID verification failed" });
      }
      // Get candidateAddress (if contract includes it)
      try {
        const candidate = await contract
          .elections(electionId)
          .candidates(onChainCandidateId);
        onChainCandidateAddress = candidate.candidateAddress || null;
      } catch (error) {
        console.warn(
          "Candidate struct may not include candidateAddress:",
          error.message
        );
        onChainCandidateAddress = null;
      }
    }

    console.log("On-chain candidateId:", onChainCandidateId);
    console.log("On-chain candidateAddress:", onChainCandidateAddress);

    if (!onChainCandidateId) {
      return res
        .status(500)
        .json({ error: "Failed to retrieve candidate ID from contract" });
    }

    // Create candidate in DB with contract-generated candidateId as id and txHash
    const candidate = await Candidate.create({
      id: onChainCandidateId,
      electionId,
      name,
      candidateAddress: null,
      voteCount: 0,
      txHash: tx.hash,
    });

    res.status(201).json({
      message: "Candidate added successfully",
      candidate: {
        id: candidate.id,
        electionId: candidate.electionId,
        name: candidate.name,
        candidateAddress: candidate.candidateAddress,
        voteCount: candidate.voteCount || 0,
      },
      txHash: tx.hash,
    });
  } catch (err) {
    console.error("Error adding candidate:", err);
    res.status(500).json({ error: err.message || "Failed to add candidate" });
  }
});

router.post("/admin/start", isAdmin, async (req, res) => {
  try {
    const { electionId } = req.body;
    if (!electionId) {
      return res.status(400).json({ error: "Election ID is required" });
    }

    const tx = await contract.startElection(electionId);
    const receipt = await tx.wait();

    await Election.update(
      {
        isStarted: true,
        isNotStarted: false,
      },
      { where: { id: electionId } }
    );
    res.json({
      message: "Election started successfully",
      txHash: tx.hash,
    });
  } catch (err) {
    console.error("Error starting election:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/end", isAdmin, async (req, res) => {
  try {
    const { electionId } = req.body;
    if (!electionId) {
      return res.status(400).json({ error: "Election ID is required" });
    }

    const tx = await contract.endElection(electionId);
    const receipt = await tx.wait();

    await Election.update(
      {
        isEnded: true,
      },
      { where: { id: electionId } }
    );
    res.json({
      message: "Election ended successfully",
      txHash: tx.hash,
    });
  } catch (err) {
    console.error("Error ending election:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUBLIC ENDPOINTS
router.post("/candidates/:electionId", async (req, res) => {
  try {
    const { electionId } = req.params;
    // await syncCandidates(electionId);
    // await syncAllCandidateVotes(electionId);
    const candidates = await Candidate.findAll({
      where: { electionId },
      attributes: ["id", "name", "voteCount"],
    });
    res.json(candidates);
  } catch (err) {
    console.error("Error fetching candidates:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/all", async (req, res) => {
  try {
    const elections = await Election.findAll({
      order: [["createdAt", "DESC"]],
    });
    // for (const election of elections) {
    //   await syncElectionStatus(election.id);
    //   await syncAllCandidateVotes(election.id);
    // }
    const updatedElections = await Election.findAll({
      order: [["createdAt", "DESC"]],
      attributes: {
        include: [
          [
            Sequelize.literal(`(
              SELECT COALESCE(SUM("voteCount"), 0)
              FROM "Candidates"
              WHERE "Candidates"."electionId" = "Election"."id"
            )`),
            "totalVotes",
          ],
        ],
      },
    });
    const electionsWithVotes = updatedElections.map((election) =>
      election.toJSON()
    );
    res.json(electionsWithVotes);
  } catch (err) {
    console.error("Error fetching elections:", err.message, err.stack);
    res.status(500).json({ error: err.message || "Failed to fetch elections" });
  }
});

router.post("/status/:electionId", async (req, res) => {
  try {
    const { electionId } = req.params;
    // const status = await syncElectionStatus(electionId);
    const election = await Election.findByPk(electionId);
    if (!election) {
      return res.status(404).json({ error: "Election not found" });
    }
    res.json({ isStarted: election.isStarted, isEnded: election.isEnded });
  } catch (err) {
    console.error("Error fetching election status:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/winner/:electionId", async (req, res) => {
  try {
    const { electionId } = req.params;
    // await syncAllCandidateVotes(electionId);
    const candidates = await Candidate.findAll({
      where: { electionId },
      order: [["voteCount", "DESC"]],
      limit: 1,
    });
    if (candidates.length === 0) {
      return res.status(404).json({ error: "No candidates found" });
    }
    res.json({
      winnerName: candidates[0].name,
      highestVotes: candidates[0].voteCount,
    });
  } catch (err) {
    console.error("Error fetching winner:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/voters/:electionId/:address", async (req, res) => {
  try {
    const { electionId, address } = req.params;
    const normalizedAddress = ethers.getAddress(address);
    const voter = await Voter.findOne({
      where: { electionId, walletAddress: normalizedAddress.toLowerCase() },
    });
    if (!voter) {
      return res.json({ hasVoted: false, votedCandidateId: null });
    }
    res.json({
      hasVoted: voter.hasVoted,
      votedCandidateId: voter.votedCandidateId,
    });
  } catch (err) {
    console.error("Error fetching voter:", err.message, err.stack);
    res
      .status(500)
      .json({ error: err.message || "Failed to fetch voter info" });
  }
});

// VOTE ENDPOINTS
router.post("/vote", validateEligibility, async (req, res) => {
  try {
    const { electionId, candidateId, address, signature } = req.body;
    console.log("Vote request:", {
      electionId,
      candidateId,
      address,
      signature,
    });

    if (!electionId || !candidateId || !address || !signature) {
      return res.status(400).json({
        error: "Election ID, candidate ID, address, and signature are required",
      });
    }

    // Normalize address
    const normalizedAddress = ethers.getAddress(address);

    // Verify user
    const user = await User.findOne({
      where: { walletAddress: normalizedAddress.toLowerCase() },
    });
    console.log(
      normalizedAddress.toLowerCase(),
      "Normalized address for user lookup"
    );
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Verify election
    const election = await Election.findByPk(electionId);
    if (!election) {
      return res.status(404).json({ error: "Election not found" });
    }
    if (!election.isStarted || election.isEnded) {
      return res.status(400).json({ error: "Election is not active" });
    }

    // Verify candidate
    const candidate = await Candidate.findOne({
      where: { id: candidateId, electionId },
    });
    if (!candidate) {
      return res
        .status(404)
        .json({ error: "Candidate not found for this election" });
    }

    // Check voter status
    const [hasVoted, votedCandidateId] = await contract.getVoter(
      electionId,
      normalizedAddress
    );
    console.log(
      `Voter ${normalizedAddress} - Has Voted: ${hasVoted}, Voted Candidate ID: ${votedCandidateId}`
    );

    // Call voteWithSignature
    console.log("Calling smart contract voteWithSignature...");
    const tx = await contract.voteWithSignature(
      electionId,
      candidateId,
      normalizedAddress,
      signature,
      { gasLimit: 1000000 }
    );
    console.log("Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log(
      "Transaction confirmed:",
      receipt.status === 1 ? "Success" : "Failed"
    );

    // Update database with txHash
    await Candidate.increment("voteCount", {
      where: { id: candidateId, electionId },
    });
    await Voter.upsert({
      electionId: electionId,
      walletAddress: normalizedAddress.toLowerCase(),
      hasVoted: true,
      votedCandidateId: candidateId,
      txHash: tx.hash,
    });

    res.json({ message: "Vote cast successfully", txHash: tx.hash });
  } catch (error) {
    console.error("Error casting vote:", error);
    res.status(500).json({ error: error.message || "Failed to cast vote" });
  }
});

export default router;
export { syncElectionStatus, syncAllCandidateVotes, syncCandidates };
