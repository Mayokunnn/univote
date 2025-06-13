"use strict";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("Users", {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },
    matricNumber: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    department: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    program: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    walletAddress: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    isAdmin: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    loggedIn: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
    createdAt: {
      allowNull: false,
      type: Sequelize.DATE,
    },
    updatedAt: {
      allowNull: false,
      type: Sequelize.DATE,
    },
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable("Users");
}
