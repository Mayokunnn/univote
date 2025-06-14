import { contract } from "../config.js";

const isAdmin = async (req, res, next) => {
  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    const isAdmin = await contract.admins(address);
    console.log("Is Admin:", isAdmin);

    if (!isAdmin) {
      return res.status(403).json({ error: "Unauthorized: Admin only" });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export default isAdmin;
