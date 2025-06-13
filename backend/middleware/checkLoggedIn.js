import User from "../models/user.js";

const checkLoggedIn = async (req, res, next) => {
  const { address } = req.body;
  if (!address)
    return res.status(400).json({ error: "Wallet address required" });

  const user = await User.findOne({ where: { walletAddress: address.toLowerCase()} });
  if (!user || !user.loggedIn) {
    return res
      .status(403)
      .json({ error: "You must be logged in to perform this action." });
  }

  next();
};
export default checkLoggedIn;
