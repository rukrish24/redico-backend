const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },

  addresses: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
      name: String,
      email: String,
      phone: String,
      address: String,
      city: String,
      state: String,
      pincode: String,
      isDefault: { type: Boolean, default: false }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
