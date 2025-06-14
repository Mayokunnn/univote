import { where } from "sequelize";
import Election from "../models/elections.js";
import User from "../models/user.js";
import { extractAcademicInfo } from "../utils/matricParser.js";

const validateEligibility = async (req, res, next) => {
  const { electionId, address } = req.body;

  if (!electionId || !address) {
    return res
      .status(400)
      .json({ error: "address and electionId are required" });
  }
  const voter = await User.findOne({ where: { walletAddress: address } });

  if (!voter) {
    return res.status(404).json({ error: "Voter not found" });
  }

  const election = await Election.findByPk(electionId);
  if (!election || !election.isStarted) {
    return res.status(404).json({ error: "Election not found or inactive" });
  }

  const academic = extractAcademicInfo(voter.matricNumber);
  if (!academic) {
    return res.status(400).json({ error: "Invalid matric number" });
  }

  const { department, program } = academic;

  const isEligible =
  election.type === "general" ||
  (election.type === "program" && election.allowedValues.includes(program)) ||
  (election.type === "department" && election.allowedValues.includes(program));


  if (!isEligible) {
    return res
      .status(403)
      .json({ error: "You are not eligible to vote in this election" });
  }

  req.election = election;
  req.academic = academic;
  next();
};

export default validateEligibility;
