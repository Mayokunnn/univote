// migrations/XXXX-create-candidates-table.js
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("Candidates", {
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
    },
    updatedAt: {
      allowNull: false,
      type: Sequelize.DATE,
    },
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("Candidates");
}
