"use strict";

export async function up(queryInterface, Sequelize) {
  // Check if the column exists first
  const tableInfo = await queryInterface.describeTable("Candidates");
  if (!tableInfo.uuid) {
    await queryInterface.addColumn("Candidates", "uuid", {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      unique: true,
      allowNull: false,
      primaryKey: true,
      comment: "Unique identifier for each candidate",
    });
  }
}

export async function down(queryInterface, Sequelize) {
  const tableInfo = await queryInterface.describeTable("Candidates");
  if (tableInfo.uuid) {
    await queryInterface.removeColumn("Candidates", "uuid");
  }
}
