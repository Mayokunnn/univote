import cron from "node-cron";
import Election from "./models/elections.js";
import { syncElectionStatus, syncAllCandidateVotes, syncCandidates } from "./routes/election.js";

// Run every 1 minute
cron.schedule("* * * * *", async () => {
  try {
    const elections = await Election.findAll();
    for (const election of elections) {
      await syncElectionStatus(election.id);
      await syncCandidates(election.id);
      await syncAllCandidateVotes(election.id);
    }
    console.log("Background sync completed");
  } catch (err) {
    console.error("Background sync error:", err);
  }
});