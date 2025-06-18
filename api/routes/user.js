import express from "express";
import User from "../models/user.js";
import { extractAcademicInfo } from "../utils/matricParser.js";
import checkLoggedIn from "../middleware/checkLoggedIn.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { matricNumber, walletAddress, isAdmin = false } = req.body;
  isAdmin = matricNumber === "21CG029830" ? true : false;

  // 1. Basic Validation
  if (!matricNumber || !walletAddress) {
    return res.status(400).json({
      success: false,
      message: "Matric number and wallet address are required.",
    });
  }

  const matricRegex = /^\d{2}[A-Z]{2}\d{6}$/;
  if (!matricRegex.test(matricNumber)) {
    return res.status(400).json({
      success: false,
      message: "Invalid matric number format. Use the format: 21CG029830",
    });
  }

  // 2. Extract Academic Info from Matric Number
  const programInfo = extractAcademicInfo(matricNumber);
  if (!programInfo) {
    return res.status(400).json({
      success: false,
      message: "Matric number code not recognized for any department.",
    });
  }

  try {
    // 3. Check if this wallet is already linked
    const existingUser = await User.findOne({ where: { walletAddress } });

    if (existingUser) {
      if (existingUser.matricNumber !== matricNumber) {
        return res.status(409).json({
          success: false,
          message:
            "This wallet is already linked to a different matric number.",
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
        success: false,
        message:
          "This matric number is already registered with another wallet.",
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
      success: false,
      message: "Server error. " + (err && err.message ? err.message : ""),
    });
  }
});

router.post("/logout", checkLoggedIn, async (req, res) => {
  const { walletAddress } = req.body;
  if (!walletAddress) {
    return res
      .status(400)
      .json({ success: false, message: "Wallet address is required." });
  }

  try {
    const user = await User.findOne({ where: { walletAddress } });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });

    user.loggedIn = false;
    await user.save();

    return res.status(200).json({ message: "User logged out successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    console.log("Received request for wallet address:", walletAddress);

    const address = walletAddress.toLowerCase();
    console.log("Normalized wallet address:", address);

    const user = await User.findOne({ where: { walletAddress: address } });
    console.log("Database query result:", user);

    if (user) {
      console.log("User found, sending response");
      res.json({
        success: true,
        user: {
          matricNumber: user.matricNumber,
          walletAddress: user.walletAddress,
          isAdmin: user.isAdmin,
        },
      });
    } else {
      console.log("No user found, sending success: false");
      res.json({ success: false });
    }
  } catch (err) {
    console.error("Error in GET /:walletAddress:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/", (req, res) => {
  res.send("User API root");
});

export default router;
