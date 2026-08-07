import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const getToken = (user) => {
    return jwt.sign({
        _id:user.id,
        email:user.email
    },process.env.secret)
};

const verifyToken = (token) => {
    if(!token) return null;
    try {
        return jwt.verify(token, process.env.secret);
    } catch (error) {
        return null;
    }
};

export { getToken, verifyToken };