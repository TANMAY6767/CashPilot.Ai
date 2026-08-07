import { verifyToken } from "../services/tokens.js";

const checkAuth = (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.redirect("/login");
    }

    const user = verifyToken(token);
    if (!user) {
        return res.redirect("/login");
    }

    req.user = user; 

    next();
};

export {checkAuth};