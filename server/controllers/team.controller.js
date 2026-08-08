import prisma from "../prisma/client.js";
import crypto from "crypto";
import { sendEmail } from "../services/email.service.js";

const getOneTeam = async(req,res) => {
    try {
        const team = await prisma.team.findUnique({
            where:{
                id:req.body.id
            }
        })
        if(!team){
            return res.status(404).json({
                message: "Team not found"
            });
        }
         return res.status(200).json({
            message: "team found successfully",
            team
        });
    } catch (error) {
        res.status(500).json("something went wrong");
    }
}

const createTeam = async(req,res) => {
    try{
        const  name  = req.body.name;
        const createdBy = req.user._id;

        if( !name || !createdBy ){
            return res.status(400).json({
                message: "Please fill all the required details."
            });
        }


        const team = await prisma.team.create({
            data: {
                name: name,
                createdById: createdBy
            }
        });


        return res.status(201).json({
            message: "User created successfully",
            team,
        });

    }catch(err){
        res.status(500).json("something went wrong");
    }

};

const updateTeam = async (req, res) => {
    try {
        const  name = req.body.name;

        const updatedTeam = await prisma.team.update({
            where: { id: req.body.id },  
            data: { name }
        });

        return res.status(200).json({
            success: true,
            message: "Team updated successfully",
            team: updatedTeam
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};
const deleteTeam = async (req, res) => {
    try {
        const team = await prisma.team.delete({
            where: { id: req.body.id }
        });

        if (!team) {
            return res.status(404).json({
                message: "team not found"
            });
        }


        return res.status(200).json({
            message: "team deleted successfully"
        });

    } catch (err) {
        return res.status(500).json({
            message: "Something went wrong"
        });
    }
};

//-----------------------------------------------------------

const sendTeamInvitationEmail  = async(req,res) => {
    try {
        const { teamId } = req.params;
        const {email, role= "member"} =req.body;
        const userId = req.user._id;

        const team = await prisma.team.findUnique({
            where:{
                id:teamId
            }
        });

        if(!team){
            return res.status(404).json({
                message: "Team not found"
            });
        }

        if(team.createdById !== userId){
            return res.status(403).json({
                message: "Only the team creator can invite members"
            });
        }

        const existingUser = await prisma.user.findUnique({
            where:{
                email
            }
        });

        if(existingUser){
            const existingMember = await prisma.teamMember.findUnique({
                where:{
                    teamId_userId:{
                        teamId,
                        userId:existingUser.id
                    }
                }
            });
            if (existingMember) {
                return res.status(409).json({
                    message: "User is already a team member"
                });
            }
        }
        const existingInvitation =
            await prisma.teamInvitation.findFirst({
                where: {
                    teamId,
                    email,
                    status: "pending"
                }
            });

        if (existingInvitation) {
            return res.status(409).json({
                message: "Invitation already sent"
            });
        }

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();

        expiresAt.setDate(
            expiresAt.getDate() + 7
        );

        const invitation =await prisma.teamInvitation.create({
                data: {
                    teamId,
                    email,
                    invitedById: userId,
                    role,
                    token,
                    expiresAt
                },
                include: {
                    team: true,
                    invitedBy: true
                }
        });

        await sendEmail({
            email,
            teamName: invitation.team.name,
            inviterName: invitation.invitedBy.name,
            token
        })
        return res.status(201).json({
            message: "Invitation sent successfully"
        });


    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Failed to send invitation"
        });
    }
}

const acceptInvitation = async(req,res) => {
    try {
        
        const {token} = req.params;
        const userId = req.user._id;

        const invitation = await prisma.teamInvitation.findUnique({
            where:{
                token
            }
        });
        if (!invitation) {
            return res.status(404).json({
                message: "Invitation not found"
            });
        }

        if (invitation.status !== "pending") {
            return res.status(400).json({
                message: "Invitation is no longer valid"
            });
        }

        if (invitation.expiresAt < new Date()) {

            await prisma.teamInvitation.update({
                where: {
                    id: invitation.id
                },
                data: {
                    status: "expired"
                }
            });

            return res.status(400).json({
                message: "Invitation has expired"
            });
        }
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            }
        });

        if (user.email !== invitation.email) {
            return res.status(403).json({
                message:
                    "This invitation was sent to another email address"
            });
        }

        await prisma.$transaction(async (tx) => {

            await tx.teamMember.create({
                data: {
                    teamId: invitation.teamId,
                    userId,
                    role: invitation.role
                }
            });

            await tx.teamInvitation.update({
                where: {
                    id: invitation.id
                },
                data: {
                    status: "accepted"
                }
            });

        });
        return res.status(200).json({
            message: "You have joined the team"
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Failed to accept invitation"
        });
    }
}


export {createTeam,getOneTeam,updateTeam,deleteTeam,sendTeamInvitationEmail,acceptInvitation}