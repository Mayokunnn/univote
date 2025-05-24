import Election from "../models/elections.js";
import { extractAcademicInfo } from "../utils/matricParser.js";

const validateEligibility = async (req, res, next) => {
  const { matricNumber, electionId } = req.body;

  if (!matricNumber || !electionId) {
    return res.status(400).json({ error: "matricNumber and electionId are required" });
  }

  const election = await Election.findByPk(electionId);
  if (!election || !election.isActive) {
    return res.status(404).json({ error: "Election not found or inactive" });
  }

  const academic = extractAcademicInfo(matricNumber);
  if (!academic) {
    return res.status(400).json({ error: "Invalid matric number" });
  }

  const { department, program } = academic;

  const isEligible =
    (election.type === "program" && election.allowedValues.includes(program)) ||
    (election.type === "department" && election.allowedValues.includes(department));

  if (!isEligible) {
    return res.status(403).json({ error: "You are not eligible to vote in this election" });
  }

  req.election = election;
  req.academic = academic;
  next();
};

export default validateEligibility;
