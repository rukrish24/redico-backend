const ContactMessage = require("../models/ContactMessage");

/**
 * POST /api/contact
 * Public – logged-in or guest users
 */
exports.createMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const newMessage = await ContactMessage.create({
      name,
      email,
      subject,
      message,
      user: req.user?.id || null
    });

    res.status(201).json({
      message: "Message sent successfully",
      data: newMessage
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send message" });
  }
};

/**
 * GET /api/admin/messages
 * Admin only
 */
exports.getAllMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Failed to load messages" });
  }
};
