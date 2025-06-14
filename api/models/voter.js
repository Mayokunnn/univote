import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Voter = sequelize.define("Voter", {
  electionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  walletAddress: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  hasVoted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  votedCandidateId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

export default Voter;
