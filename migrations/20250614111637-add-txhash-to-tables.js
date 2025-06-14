"use strict";

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  // Check and add txHash to Elections table
  const electionsTableInfo = await queryInterface.describeTable("Elections");
  if (!electionsTableInfo.txHash) {
    await queryInterface.addColumn("Elections", "txHash", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  }

  // Check and add txHash to Candidates table
  const candidatesTableInfo = await queryInterface.describeTable("Candidates");
  if (!candidatesTableInfo.txHash) {
    await queryInterface.addColumn("Candidates", "txHash", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  }

  // Check and add txHash to Voters table
  const votersTableInfo = await queryInterface.describeTable("Voters");
  if (!votersTableInfo.txHash) {
    await queryInterface.addColumn("Voters", "txHash", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  }
}

export async function down(queryInterface, Sequelize) {
  // Check and remove txHash from Elections table
  const electionsTableInfo = await queryInterface.describeTable("Elections");
  if (electionsTableInfo.txHash) {
    await queryInterface.removeColumn("Elections", "txHash");
  }

  // Check and remove txHash from Candidates table
  const candidatesTableInfo = await queryInterface.describeTable("Candidates");
  if (candidatesTableInfo.txHash) {
    await queryInterface.removeColumn("Candidates", "txHash");
  }

  // Check and remove txHash from Voters table
  const votersTableInfo = await queryInterface.describeTable("Voters");
  if (votersTableInfo.txHash) {
    await queryInterface.removeColumn("Voters", "txHash");
  }
}
