import express from "express";
const router = express.Router();
import { contract } from "../config.js";
import isAdmin from "../middleware/adminAuth.js";
import validateEligibility from "../middleware/validateEligibility.js";
import Election from "../models/elections.js"; // Sequelize models

// ADMIN ENDPOINTS
router.post("/admin/elections", isAdmin, async (req, res) => {
  try {
    const { title, type, isActive = false } = req.body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({ error: "Election title is required." });
    }
    if (!type || !["general", "department"].includes(type)) {
      return res
        .status(400)
        .json({ error: "Election type must be 'general' or 'department'." });
    }

    const activeStatus = typeof isActive === "boolean" ? isActive : false;

    // Check duplicate title
    const existing = await Election.findOne({ where: { title } });
    if (existing) {
      return res
        .status(409)
        .json({ error: "An election with this title already exists." });
    }

    // 1. Call contract to create election on-chain
    const tx = await contract.createElection(title);
    await tx.wait();

    // 2. Save in DB
    const newElection = await Election.create({
      title,
      type,
      isActive: activeStatus,
    });

    res
      .status(201)
      .json({
        message: "Election created successfully.",
        election: newElection,
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/candidates", isAdmin, async (req, res) => {
  try {
    const { electionId, name } = req.body;
    if (!electionId || !name) {
      return res
        .status(400)
        .json({ error: "Election ID and candidate name are required" });
    }

    // Add candidate on-chain
    const tx = await contract.addCandidate(electionId, name);
    const receipt = await tx.wait();

    // Extract candidate address from the event logs if your contract emits one
    // This is optional and depends on your contract event
    let candidateAddress = null;
    if (receipt.events && receipt.events.length > 0) {
      const event = receipt.events.find((e) => e.event === "CandidateAdded"); // change to your event name
      if (event) {
        candidateAddress = event.args.candidateAddress;
      }
    }

    // Save candidate to DB
    const candidate = await Candidate.create({
      electionId,
      name,
      candidateAddress,
    });

    res
      .status(201)
      .json({ message: "Candidate added successfully", candidate });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.json({ message: "Election started successfully" });
  } catch (err) {
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
    res.json({ message: "Election ended successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUBLIC ENDPOINTS
router.get("/candidates/:electionId", async (req, res) => {
  try {
    const { electionId } = req.params;

    // Fetch candidates from DB instead of contract calls
    const candidates = await Candidate.findAll({
      where: { electionId },
      attributes: ["id", "name", "candidateAddress"],
    });

    res.json(candidates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/all", async (req, res) => {
  try {
    const elections = await Election.findAll({
      order: [["createdAt", "DESC"]], // returns the latest first
    });
    res.json(elections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/status/:electionId", async (req, res) => {
  try {
    const { electionId } = req.params;
    const started = await contract.isElectionStarted(electionId);
    const ended = await contract.isElectionEnded(electionId);
    res.json({ started, ended });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/winner/:electionId", async (req, res) => {
  try {
    const { electionId } = req.params;
    const [winnerName, highestVotes] = await contract.getWinner(electionId);
    res.json({ winnerName, highestVotes: highestVotes.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// VOTER ENDPOINTS
router.post("/vote", validateEligibility, async (req, res) => {
  try {
    const { electionId, candidateId } = req.body;

    if (!electionId || !candidateId) {
      return res
        .status(400)
        .json({ error: "Election ID and candidate ID are required" });
    }

    const tx = await contract.vote(electionId, candidateId);
    await tx.wait();

    res.json({ message: "Vote cast successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/voters/:electionId/:address", async (req, res) => {
  try {
    const { electionId, address } = req.params;
    const voter = await contract.getVoter(electionId, address);
    res.json({
      hasVoted: voter.hasVoted,
      votedCandidateId: voter.votedCandidateId.toString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
