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

    // Save in DB with smart contract's electionId
    const newElection = await Election.create({
      id: newElectionId,
      title,
      type,
      allowedValues: allowedValues || [],
      isStarted: false,
      isEnded: false,
      isNotStarted: true,
    });

    res.status(201).json({
      message: "Election created successfully.",
      election: newElection,
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

    // Create candidate in DB with contract-generated candidateId as id
    const candidate = await Candidate.create({
      id: onChainCandidateId, // Set DB id to contract's candidateId
      electionId,
      name,
      candidateAddress: null,
      voteCount: 0,
    });

    res.status(201).json({
      message: "Candidate added successfully",
      candidate: {
        id: candidate.id, // Contract-generated ID
        electionId: candidate.electionId,
        name: candidate.name,
        candidateAddress: candidate.candidateAddress,
        voteCount: candidate.voteCount || 0,
      },
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
    await tx.wait();

    await Election.update(
      {
        isStarted: true,
        isNotStarted: false,
      },
      { where: { id: electionId } }
    );
    res.json({ message: "Election started successfully" });
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
    await tx.wait();

    await Election.update(
      {
        isEnded: true,
      },
      { where: { id: electionId } }
    );
    res.json({ message: "Election ended successfully" });
  } catch (err) {
    console.error("Error ending election:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUBLIC ENDPOINTS
router.post("/candidates/:electionId", async (req, res) => {
  try {
    const { electionId } = req.params;

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

    // Convert to JSON for consistent response
    const electionsWithVotes = elections.map((election) => election.toJSON());

    res.json(electionsWithVotes);
  } catch (err) {
    console.error("Error fetching elections:", err.message, err.stack);
    res.status(500).json({ error: err.message || "Failed to fetch elections" });
  }
});

router.post("/status/:electionId", async (req, res) => {
  try {
    const { electionId } = req.params;

    // Fetch election status from smart contract
    const started = await contract.isElectionStarted(electionId);
    const ended = await contract.isElectionEnded(electionId);

    // Update database
    await Election.update(
      {
        isStarted: started,
        isEnded: ended,
        isNotStarted: !started && !ended,
      },
      { where: { id: electionId } }
    );

    res.json({ started, ended });
  } catch (err) {
    console.error("Error fetching election status:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/winner/:electionId", async (req, res) => {
  try {
    const { electionId } = req.params;
    const [winnerName, highestVotes] = await contract.getWinner(electionId);
    res.json({ winnerName, highestVotes: highestVotes.toString() });
  } catch (err) {
    console.error("Error fetching winner:", err);
    res.status(500).json({ error: err.message });
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
      return res
        .status(400)
        .json({
          error:
            "Election ID, candidate ID, address, and signature are required",
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

    // Update database
    await Candidate.increment("voteCount", {
      where: { id: candidateId, electionId },
    });
    await Voter.upsert({
      electionId: electionId,
      walletAddress: normalizedAddress.toLowerCase(),
      hasVoted: true,
      votedCandidateId: candidateId,
    });

    res.json({ message: "Vote cast successfully", txHash: tx.hash });
  } catch (error) {
    console.error("Error casting vote:", error);
    res.status(500).json({ error: error.message || "Failed to cast vote" });
  }
});

router.post("/voters/:electionId/:address", async (req, res) => {
  try {
    const { electionId, address } = req.params;

    // Validate inputs
    const electionIdNum = parseInt(electionId);
    if (isNaN(electionIdNum) || electionIdNum <= 0) {
      return res.status(400).json({ error: "Invalid election ID" });
    }
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: "Invalid Ethereum address" });
    }
    const normalizedAddress = ethers.getAddress(address); // Normalize case

    // Verify election exists
    const election = await Election.findByPk(electionIdNum);
    if (!election) {
      return res.status(404).json({ error: "Election not found" });
    }

    // Get voter data from contract
    let contractHasVoted = false;
    let contractVotedCandidateId = 0;
    try {
      const [hasVoted, votedCandidateId] = await contract.getVoter(
        electionIdNum,
        normalizedAddress
      );
      contractHasVoted = hasVoted;
      contractVotedCandidateId = Number(votedCandidateId); // Handle BigInt
    } catch (error) {
      console.error(
        `Contract getVoter error for election ${electionIdNum}, address ${normalizedAddress}:`,
        error.message
      );
    }

    // Check Voters table
    const voter = await Voter.findOne({
      where: {
        electionId: electionIdNum,
        walletAddress: normalizedAddress.toLowerCase(),
      },
    });
    const dbHasVoted = voter ? voter.hasVoted : false;
    const dbVotedCandidateId = voter ? voter.votedCandidateId || 0 : 0;

    // Determine final voter status
    const finalHasVoted = contractHasVoted; // Require both to confirm vote
    // const finalVotedCandidateId = finalHasVoted ? (dbVotedCandidateId || contractVotedCandidateId) : 0;

    // // Log for debugging
    // console.log(`Voter status for election ${electionIdNum}, address ${normalizedAddress}:`, {
    //   contract: { hasVoted: contractHasVoted, votedCandidateId: contractVotedCandidateId },
    //   db: { hasVoted: dbHasVoted, votedCandidateId: dbVotedCandidateId },
    //   final: { hasVoted: finalHasVoted, votedCandidateId: finalVotedCandidateId },
    // });

    res.json({
      hasVoted: finalHasVoted,
      votedCandidateId: contractVotedCandidateId.toString(),
    });
  } catch (err) {
    console.error("Error fetching voter:", err.message, err.stack);
    res
      .status(500)
      .json({ error: err.message || "Failed to fetch voter info" });
  }
});

export default router;
