import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/user.routes.js"
import teamRoutes from "./routes/team.routes.js"
import orgRoutes from "./routes/organization.routes.js"
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
app.get("/",(req, res) => {
    res.send("hello tanmay");
})
app.use("/users", userRoutes);
app.use("/organizations", orgRoutes);
app.use("/teams", teamRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});