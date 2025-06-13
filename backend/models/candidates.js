import { DataTypes } from "sequelize";
import sequelize from "../db.js"; // your sequelize instance

const Candidate = sequelize.define(
  "Candidate",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    electionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Elections",
        key: "id",
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    candidateAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    voteCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: "Candidates",
    timestamps: true,
  }
);

export default Candidate;
