"use strict";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("Voters", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      electionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Elections",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      walletAddress: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      hasVoted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      votedCandidateId: {
        type: Sequelize.INTEGER,
        allowNull: true,
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

    await queryInterface.addConstraint("Voters", {
      fields: ["electionId", "walletAddress"],
      type: "unique",
      name: "unique_election_wallet",
    });
  }

 
export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable("Voters");
}