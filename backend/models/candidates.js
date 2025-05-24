import { DataTypes } from "sequelize";
import db from "./index.js"; // your sequelize instance

const Candidate = db.define(
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
  },
  {
    tableName: "candidates",
    timestamps: true,
  }
);

export default Candidate;
