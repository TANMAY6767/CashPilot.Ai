import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/user.routes.js"
import teamRoutes from "./routes/team.routes.js"
import orgRoutes from "./routes/organization.routes.js"
import accountRoutes from "./routes/account.routes.js"
import budgetRoutes from "./routes/budget.routes.js"
import ledgerRoutes from "./routes/ledger.routes.js"
import transactionRoutes from "./routes/transaction.routes.js"
import auditLogsRoutes from "./routes/auditLogs.routes.js"
dotenv.config();
const PORT = process.env.PORT || 3000;
const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use(cookieParser());
app.use(multer().none());
app.get("/",(req, res) => {
    res.send("hello tanmay");
})
app.use("/users", userRoutes);
app.use("/org", orgRoutes);
app.use("/", teamRoutes);
app.use("/teams", accountRoutes);
app.use("/teams", budgetRoutes);
app.use("/teams", ledgerRoutes);
app.use("/teams", transactionRoutes);
app.use("/audit-logs", auditLogsRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
