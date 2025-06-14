import { DataTypes } from "sequelize";
import sequelize from "../db.js"; // your sequelize instance

const Election = sequelize.define(
  "Election",
  {
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("general", "program", "department"),
      allowNull: false,
    },
    allowedValues: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
    },
    isStarted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isEnded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isNotStarted: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    txHash: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "Elections",
    timestamps: true,
  }
);

export default Election;
