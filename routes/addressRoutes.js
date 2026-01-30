const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const User = require("../models/User");

// GET saved addresses
router.get("/", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(user.addresses || []);
});

// ADD new address
router.post("/", auth, async (req, res) => {
  const user = await User.findById(req.user.id);

  const newAddr = {
    ...req.body,
    isDefault: user.addresses.length === 0 // first becomes default
  };

  user.addresses.push(newAddr);
  await user.save();
  res.json(newAddr);
});

// SET default
router.put("/:id/default", auth, async (req, res) => {
  const user = await User.findById(req.user.id);

  user.addresses = user.addresses.map(a => ({
    ...a.toObject(),
    isDefault: a._id.toString() === req.params.id
  }));

  await user.save();
  res.json({ message: "Default address updated" });
});

module.exports = router;
