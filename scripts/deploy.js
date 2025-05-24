const hre = require("hardhat");

async function main() {
    const Vote = await hre.ethers.getContractFactory("DecentralizedVoting");
    const vote = await Vote.deploy();

    await vote.waitForDeployment();


    console.log("Contract deployed to:", vote.target);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
