const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
   authorDescription: { type: String, default: "" },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  rentPrice: { type: Number, required: true },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  stock: { type: Number, required: true, default: 1 },
  rentalStock: { type: Number, default: 0 },
  image: { type: String },
  averageRating: {
    type: Number,
    default: 0
  },

  numReviews: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model("Book", bookSchema);
