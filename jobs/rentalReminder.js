const cron = require("node-cron");
const Order = require("../models/Order");
const sendEmail = require("../utils/sendEmail");

/**
 * Runs every day at 9 AM
 */
cron.schedule("0 9 * * *", async () => {
  try {
    console.log("⏰ Running rental reminder job...");

    const today = new Date();

    const orders = await Order.find({
      "items.type": "rent",
      "items.returned": false,
      "items.dueDate": { $exists: true },
    })
      .populate("user", "email name")
      .populate("items.book", "title");

    for (const order of orders) {
      for (const item of order.items) {
        if (item.type !== "rent" || item.returned) continue;

        const dueDate = new Date(item.dueDate);
        const diffDays = Math.ceil(
          (dueDate - today) / (1000 * 60 * 60 * 24)
        );

        // 🔔 Reminder 1 day before
        if (diffDays === 1) {
          await sendEmail({
            to: order.user.email,
            subject: "📚 REDICO – Rental Due Tomorrow",
            html: `
              <p>Hi ${order.user.name},</p>
              <p>Your rented book <strong>${item.book.title}</strong> is due <strong>tomorrow</strong>.</p>
              <p>Please return it on time to avoid fines.</p>
              <br />
              <p>— REDICO Team</p>
            `,
          });
        }

        // ⚠️ Overdue mail
        if (diffDays < 0) {
          await sendEmail({
            to: order.user.email,
            subject: "⚠️ REDICO – Rental Overdue",
            html: `
              <p>Hi ${order.user.name},</p>
              <p>Your rented book <strong>${item.book.title}</strong> is overdue.</p>
              <p>Please return it immediately to avoid additional fines.</p>
              <br />
              <p>— REDICO Team</p>
            `,
          });
        }
      }
    }
  } catch (err) {
    console.error("❌ Rental reminder job error:", err.message);
  }
});
