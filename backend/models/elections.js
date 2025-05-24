import { DataTypes } from "sequelize";
import sequelize from "../db.js"; // your sequelize instance

const Election = sequelize.define("Election", {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM("program", "department"),
    allowNull: false,
  },
  allowedValues: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

export default Election;
