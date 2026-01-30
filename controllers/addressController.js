const User = require("../models/User");

// GET all addresses
exports.getAddresses = async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(user.addresses || []);
};

// ADD address
exports.addAddress = async (req, res) => {
  const user = await User.findById(req.user.id);

  user.addresses.push(req.body);
  await user.save();

  res.json({ message: "Address saved", addresses: user.addresses });
};

// DELETE address
exports.deleteAddress = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $pull: { addresses: { _id: req.params.id } } },
    { new: true }
  );
  res.json(user.addresses);
};

// SET DEFAULT
exports.setDefaultAddress = async (req, res) => {
  const user = await User.findById(req.user.id);

  user.addresses.forEach(a => a.isDefault = (a._id.toString() === req.params.id));
  await user.save();

  res.json({ message: "Default updated", addresses: user.addresses });
};
