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
            where: { id: req.user._id },  // Use id not _id
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
        const userId = req.user.id || req.user._id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User ID not found in token"
            });
        }

        // Step 1: Check if user owns any teams
        const ownedTeams = await prisma.team.findMany({
            where: { createdById: userId },
            include: { members: true }
        });

        // Step 2: Handle owned teams (transfer or delete)
        for (const team of ownedTeams) {
            const otherMembers = team.members.filter(m => m.userId !== userId);
            
            if (otherMembers.length > 0) {
                // Transfer ownership to first other member
                await prisma.team.update({
                    where: { id: team.id },
                    data: { createdById: otherMembers[0].userId }
                });
            } else {
                // No other members — delete the team (cascade will handle rest)
                await prisma.team.delete({ where: { id: team.id } });
            }
        }

        // Step 3: Now safe to delete user
        await prisma.user.delete({
            where: { id: userId }
        });

        res.clearCookie("token");

        return res.status(200).json({
            success: true,
            message: "Account deleted successfully"
        });

    } catch (err) {
        console.error("Delete error:", err);
        return res.status(500).json({
            success: false,
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