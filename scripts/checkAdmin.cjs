const { ethers } = require("hardhat");
async function checkAdmin() {
  const contractAddress = "0x20fBac00B52AE59A55E4B3f2BAb2b3fc647e8311";
  const contract = await ethers.getContractAt(
    "DecentralizedVoting",
    contractAddress
  );
  const admin = await contract.admins();
  console.log("Contract admin:", admin);
}
checkAdmin();
