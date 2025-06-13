import express from "express";
import User from "../models/user.js";
import { extractAcademicInfo } from "../utils/matricParser.js";
import checkLoggedIn from "../middleware/checkLoggedIn.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { matricNumber, walletAddress, isAdmin = true } = req.body;

  // 1. Basic Validation
  if (!matricNumber || !walletAddress) {
    return res
      .status(400)
      .json({ error: "Matric number and wallet address are required." });
  }

  const matricRegex = /^\d{2}[A-Z]{2}\d{6}$/;
  if (!matricRegex.test(matricNumber)) {
    return res.status(400).json({
      error: "Invalid matric number format. Use the format: 21CG029830",
    });
  }

  // 2. Extract Academic Info from Matric Number
  const programInfo = extractAcademicInfo(matricNumber);
  if (!programInfo) {
    return res
      .status(400)
      .json({ error: "Matric number code not recognized for any department." });
  }

  try {
    // 3. Check if this wallet is already linked
    const existingUser = await User.findOne({ where: { walletAddress } });

    if (existingUser) {
      if (existingUser.matricNumber !== matricNumber) {
        return res.status(409).json({
          error: "This wallet is already linked to a different matric number.",
        });
      }

      // 4. If wallet and matric match — treat as login
      return res.status(200).json({
        message: "User already registered. Logging in...",
        user: existingUser,
      });
    }

    // 5. Check if matric number is already taken by a different wallet
    const matricExists = await User.findOne({ where: { matricNumber } });
    if (matricExists) {
      return res.status(409).json({
        error: "This matric number is already registered with another wallet.",
      });
    }

    // 6. Create new user
    const newUser = await User.create({
      matricNumber,
      walletAddress: walletAddress.toLowerCase(),
      department: programInfo.department,
      program: programInfo.program,
      isAdmin,
    });

    return res.status(201).json({
      message: "Student registered successfully",
      user: newUser,
    });
  } catch (err) {
    console.error("🔥 Registration error:", err);
    return res.status(500).json({
      error: "Server error. " + (err && err.message ? err.message : ""),
    });
  }
});

router.post("/logout", checkLoggedIn, async (req, res) => {
  const { walletAddress } = req.body;
  if (!walletAddress) {
    return res.status(400).json({ error: "Wallet address is required." });
  }

  try {
    const user = await User.findOne({ where: { walletAddress } });
    if (!user) return res.status(404).json({ error: "User not found." });

    user.loggedIn = false;
    await user.save();

    return res.status(200).json({ message: "User logged out successfully." });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const address = walletAddress.toLowerCase();
    const user = await User.findOne({ where: { walletAddress: address } });
    if (user) {
      res.json({
        success: true,
        user: {
          matricNumber: user.matricNumber,
          walletAddress: user.walletAddress,
          isAdmin: user.isAdmin,
        },
      });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/test-abi", async (req, res) => {
  try {
    const encoded = contract.interface.encodeFunctionData("voteWithSignature", [
      1,
      2,
      "0xa30d8c996d0fcf1ffbde4bc742a14f2cd8d553da",
      "0x774d2f6e8319e0f4149abe82d4307bdeb056c5933bc21fd7aa8275dc2b4e1ffa037703ee676640d1bc5ebe7e8bec594a67fc9b21ec37c584e43f0c5d0ea514b21b",
    ]);
    res.json({ encoded });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
