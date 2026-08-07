import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/user.routes.js"
import teamRoutes from "./routes/team.routes.js"
dotenv.config();
const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use(cookieParser());
app.get("/",(req, res) => {
    res.send("hello tanmay");
})
app.use("/users", userRoutes);
app.use("/teams", teamRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});