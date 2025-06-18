// migrations/XXXX-create-candidates-table.js
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("Candidates", {
    uuid: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal("gen_random_uuid()"),
      allowNull: false,
      primaryKey: true,
    },
    id: {
      type: Sequelize.INTEGER, // on-chain candidate ID
      allowNull: false,
    },
    electionId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Elections",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    candidateAddress: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    voteCount: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    createdAt: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.fn("NOW"),
    },
    updatedAt: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.fn("NOW"),
    },
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("Candidates");
}
