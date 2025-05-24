import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const User = sequelize.define("User", {
  matricNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  program: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  walletAddress: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

export default User;
