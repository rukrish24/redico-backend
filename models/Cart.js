const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [
    {
      book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
      type: { type: String, enum: ["purchase", "rent"], required: true },
      quantity: { type: Number, default: 1 },
      duration: { type: Number }, 
      price: { type: Number, required: true },
      safeAmount: { type: Number, default: 0 } 
    }
  ],
  totalAmount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Cart", cartSchema);
