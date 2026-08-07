import prisma from "../prisma/client.js";
import bcrypt from "bcrypt"
import { getToken } from "../services/tokens.js";
const createUser = async(req,res) => {
    try{
        const { name, email, password} = req.body;

        if( !name || !email || !password ){
            return res.status(400).json({
                message: "Please fill all the required details."
            });
        }

        const userExist = await prisma.user.findUnique({
            where: {
              email:email
            }
        });

        if(userExist){
           return res.status(409).json({
                error: "User already exists",
            });
        }
        const hashedPassword = await bcrypt.hash(password,10);

        const user = await prisma.user.create({
            data: {
                name: name,
                email: email,
                passwordHash: hashedPassword
            }
        });

        const token = getToken(user);

        res.cookie("token", token, {
            httpOnly:true,
            sameSite:"strict",
        });

        return res.status(201).json({
            message: "User created successfully",
            user,
        });

    }catch(err){
        res.status(500).json("something went wrong");
    }

};

const getAllUsers = async(req,res) => {
    try {
        const users = await prisma.user.findMany();
        return res.status(200).json({
            message: "Users found successfully",
            users
        });
    } catch (error) {
        res.status(500).json("something went wrong");
    }
} 

const loginUser = async(req,res) => {
    try {
        const {email, password} = req.body;
        
        if( !email || !password){
            return res.status(400).json({
                message: "Please fill all the required details."
            });
        }
        const user = await prisma.user.findUnique({
            where: { email }
        });
        console.log("btrtbrthrt",user);
        if(!user){
            return res.status(404).json({
                message: "User not found"
            });
        }
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        
        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const token = getToken(user);
        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "strict",
        });

        return res.status(200).json({
            message: "User loggedIn successfully",
            user,
        });

    } catch (error) {
        res.status(500).json("something went wrong");
    }
}
const updateMe = async (req, res) => {
    try {
        const { name, email } = req.body;

        if (email) {
            const existingUser = await prisma.user.findUnique({
                where: { email }
            });

            if (existingUser && existingUser.id !== req.user.id) {
                return res.status(409).json({
                    success: false,
                    message: "Email already in use by another account"
                });
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },  // Use id not _id
            data: { name, email }
        });

        return res.status(200).json({
            success: true,
            message: "User updated successfully",
            user: updatedUser
        });

    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(409).json({
                success: false,
                message: "Email already exists"
            });
        }
        if (err.code === 'P2025') {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        console.error("Update error:", err);
        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};
const deleteMe = async (req, res) => {
    try {
        const user = await prisma.user.delete({
            where: { id: req.user._id }
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // If you're using cookie authentication
        res.clearCookie("token");

        return res.status(200).json({
            message: "Account deleted successfully"
        });

    } catch (err) {
        return res.status(500).json({
            message: "Something went wrong"
        });
    }
};
const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user._id }
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json(user);
    } catch (err) {
        return res.status(500).json({
            message: "Something went wrong"
        });
    }
};
export {createUser,getAllUsers,getMe,deleteMe,updateMe,loginUser};