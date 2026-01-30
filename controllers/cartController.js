const Cart = require("../models/Cart");
const Book = require("../models/Book");

const safeAmountDefault = 150;

/* ==== Helper – Dynamic Rent Calculation ==== */
function calculateDynamicRent(base, duration) {
  let extra = 0;
  if (duration === 14) extra = 20;
  else if (duration === 21) extra = 35;
  else if (duration === 29) extra = 50;
  else if (duration === 35) extra = 65;
  return base + extra;
}

/* ===================== ADD TO CART ===================== */
const addToCart = async (req, res) => {
  try {
    const { bookId, type, quantity, duration } = req.body;
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    let price = type === "purchase" ? book.price : book.rentPrice;
    if (type === "rent") {
      price = calculateDynamicRent(book.rentPrice, duration);
    }

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      cart = await Cart.create({
        user: req.user.id,
        items: [
          {
            book: bookId,
            type,
            quantity,
            duration,
            price,
            safeAmount: type === "rent" ? safeAmountDefault : 0
          }
        ],
        totalAmount:
          price * quantity +
          (type === "rent" ? safeAmountDefault * quantity : 0)
      });
      return res.status(201).json(cart);
    }

    const existingItem = cart.items.find(
      item => item.book.toString() === bookId && item.type === type
    );

    if (existingItem) {
      existingItem.quantity += quantity;
      if (duration) existingItem.duration = duration;
      existingItem.safeAmount = type === "rent" ? safeAmountDefault : 0;
    } else {
      cart.items.push({
        book: bookId,
        type,
        quantity,
        duration,
        price,
        safeAmount: type === "rent" ? safeAmountDefault : 0
      });
    }

    cart.totalAmount = cart.items.reduce(
      (sum, item) =>
        sum +
        item.quantity * item.price +
        (item.safeAmount || 0) * item.quantity,
      0
    );

    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ===================== UPDATE RENTAL DURATION ===================== */
const updateDuration = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { duration } = req.body;

    if (!duration)
      return res.status(400).json({ message: "Duration required" });

    // populate to access new rent base (like 85)
    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.book"
    );

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find(i => i._id.toString() === itemId);
    if (!item) return res.status(404).json({ message: "Cart item not found" });

    item.duration = duration;

    if (item.type === "rent") {
      const base = item.book.rentPrice;
      const newPrice = calculateDynamicRent(base, duration);
      item.price = newPrice;
      item.safeAmount = safeAmountDefault;
    }

    cart.totalAmount = cart.items.reduce(
      (sum, it) =>
        sum +
        it.quantity * it.price +
        (it.safeAmount || 0) * it.quantity,
      0
    );

    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ===================== GET CART ===================== */
const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.book"
    );
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ===================== REMOVE ITEM ===================== */
const removeItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const cart = await Cart.findOne({ user: req.user.id });

    cart.items = cart.items.filter(i => i._id.toString() !== itemId);

    cart.totalAmount = cart.items.reduce(
      (sum, item) =>
        sum +
        item.quantity * item.price +
        (item.safeAmount || 0) * item.quantity,
      0
    );

    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ===================== UPDATE QUANTITY ===================== */
const updateQuantity = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.book"
    );
    const item = cart.items.find(i => i._id.toString() === itemId);
    if (!item) return res.status(404).json({ message: "Cart item not found" });

    item.quantity = quantity;

    cart.totalAmount = cart.items.reduce(
      (sum, it) =>
        sum +
        it.quantity * it.price +
        (it.safeAmount || 0) * it.quantity,
      0
    );

    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ============== EXPORTS ================= */
module.exports = {
  addToCart,
  getCart,
  removeItem,
  updateQuantity,
  updateDuration
};
