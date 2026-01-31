const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const path = require("path");
const addressRoutes = require("./routes/addressRoutes");
dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(cors({
  origin: [
    "http://localhost:5173",      // local frontend (Vite)
    "http://localhost:3000",      // if you ever used CRA
    "https://redico-frontend.vercel.app" // Vercel frontend (we’ll confirm later)
  ],
  credentials: true
}));

app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/books", require("./routes/bookRoutes"));
app.use("/api/cart", require("./routes/cartRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/admin/categories", require("./routes/categoryRoutes"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/contact", require("./routes/contactRoutes"));
app.use("/api/addresses", addressRoutes);

require("./jobs/rentalReminder");

app.get("/", (req, res) => {
  res.send("REDICO backend is running ");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
