import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sequelize from "./db.js";
import Election from "./models/elections.js";
import "./syncJobs.js";

import electionRoutes from "./routes/election.js";
import userRoutes from "./routes/user.js";
import Candidate from "./models/candidates.js";
import User from "./models/user.js";
import checkLoggedIn from "./middleware/checkLoggedIn.js";
import { EventEmitter } from "events";

// Increase max listeners
EventEmitter.defaultMaxListeners = 20;

dotenv.config();

const app = express();

// Database sync function
const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    await Election.sync();
    await Candidate.sync();
    await User.sync();
    await sequelize.sync({ alter: true });
    console.log("📦 Database synced");
  } catch (err) {
    console.error("❌ Database error:", err.message);
  }
};

// Sync database on startup
syncDatabase();
const allowedOrigins = [
  "https://univote-edu.vercel.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // If you're using cookies/auth tokens
  })
);

app.use(express.json());
app.use("/api/election", checkLoggedIn, electionRoutes);
app.use("/api/user", userRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Handle serverless environment
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel
export default app;
