import { contract } from "../config.js";
const isAdmin = async (req, res, next) => {
  try {
    const adminAddress = await contract.admin();
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }
    if (address.toLowerCase() !== adminAddress.toLowerCase()) {
      return res.status(403).json({ error: "Unauthorized: Admin only" });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export default isAdmin
