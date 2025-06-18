"use strict";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("Elections", {
    id: {
      allowNull: false,
      autoIncrement: true,
      type: Sequelize.INTEGER,
      primaryKey: true,
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    type: {
      type: Sequelize.ENUM("general", "department", "program"),
      allowNull: false,
    },
    allowedValues: {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: false,
    },
    isStarted: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    isEnded: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    isNotStarted: {
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
  await queryInterface.dropTable("Elections");
}
