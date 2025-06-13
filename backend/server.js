import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sequelize from "./db.js";
import Election from "./models/elections.js";

import electionRoutes from "./routes/election.js";
import userRoutes from "./routes/user.js";
import Candidate from "./models/candidates.js";
import User from "./models/user.js";
import checkLoggedIn from "./middleware/checkLoggedIn.js";

dotenv.config();

const app = express();

(async () => {
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
})();

app.use(cors());
app.use(express.json());

app.use("/api/election", checkLoggedIn, electionRoutes);
app.use("/api/user", userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
