import prisma from "../prisma/client.js";
import crypto from "crypto";
import { sendEmail } from "../services/email.service.js";


const getUserId = (req) => req.user?._id;


/* =========================================================
   GET ALL TEAMS OF AN ORGANIZATION
   ========================================================= */

const getAllTeams = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { orgId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!orgId) {
      return res.status(400).json({
        message: "Organization ID is required",
      });
    }

    /*
      First check whether logged-in user belongs
      to this organization.
    */

    const orgMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!orgMember) {
      return res.status(403).json({
        message: "You are not a member of this organization",
      });
    }

    const teams = await prisma.team.findMany({
      where: {
        organizationId: orgId,
      },

      orderBy: {
        createdAt: "desc",
      },

      select: {
        id: true,
        name: true,
        organizationId: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,

        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        _count: {
          select: {
            members: true,
            transactions: true,
            accounts: true,
          },
        },

        budget: {
          select: {
            id: true,
            totalBudget: true,
            currency: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: "Teams fetched successfully",
      teams,
    });

  } catch (error) {
    console.error("getAllTeams:", error);

    return res.status(500).json({
      message: "Failed to get teams",
    });
  }
};


/* =========================================================
   GET ONE TEAM
   ========================================================= */

const getOneTeam = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { teamId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    /*
      Find team only if the logged-in user belongs
      to its organization.
    */

    const team = await prisma.team.findFirst({
      where: {
        id: teamId,

        organization: {
          members: {
            some: {
              userId,
            },
          },
        },
      },

      select: {
        id: true,
        name: true,
        organizationId: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,

        organization: {
          select: {
            id: true,
            name: true,
          },
        },

        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        members: {
          select: {
            id: true,
            userId: true,
            role: true,
            joinedAt: true,

            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },

        budget: {
          select: {
            id: true,
            totalBudget: true,
            currency: true,
            createdAt: true,
            updatedAt: true,
          },
        },

        _count: {
          select: {
            members: true,
            transactions: true,
            accounts: true,
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({
        message: "Team not found",
      });
    }

    return res.status(200).json({
      message: "Team fetched successfully",
      team,
    });

  } catch (error) {
    console.error("getOneTeam:", error);

    return res.status(500).json({
      message: "Failed to get team",
    });
  }
};


/* =========================================================
   CREATE TEAM
   ========================================================= */

const createTeam = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { orgId } = req.params;
    const name = req.body.name?.trim();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!orgId || !name) {
      return res.status(400).json({
        message: "Organization ID and team name are required",
      });
    }

    const orgMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!orgMember) {
      return res.status(403).json({
        message: "You are not a member of this organization",
      });
    }

    const team = await prisma.$transaction(async (tx) => {

      const newTeam = await tx.team.create({
        data: {
          name,
          organizationId: orgId,
          createdById: userId,

          members: {
            create: {
              userId,
              role: "owner",
            },
          },
        },
      });

      await createDefaultAccounts(tx, newTeam.id);

      return newTeam;
    });

    return res.status(201).json({
      message: "Team created successfully",
      team,
    });

  } catch (error) {
    console.error("createTeam:", error);

    return res.status(500).json({
      message: "Failed to create team",
    });
  }
};


/* =========================================================
   UPDATE TEAM
   ========================================================= */

const updateTeam = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { teamId } = req.params;
    const name = req.body.name?.trim();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!name) {
      return res.status(400).json({
        message: "Team name is required",
      });
    }

    /*
      Only the team creator can update the team.
    */

    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        createdById: userId,
      },
    });

    if (!team) {
      return res.status(404).json({
        message: "Team not found or you are not the team creator",
      });
    }

    const updatedTeam = await prisma.team.update({
      where: {
        id: teamId,
      },

      data: {
        name,
      },

      select: {
        id: true,
        name: true,
        organizationId: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      message: "Team updated successfully",
      team: updatedTeam,
    });

  } catch (error) {
    console.error("updateTeam:", error);

    return res.status(500).json({
      message: "Failed to update team",
    });
  }
};


/* =========================================================
   DELETE TEAM
   ========================================================= */

const deleteTeam = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { teamId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    /*
      Only team creator can delete.
    */

    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        createdById: userId,
      },
    });

    if (!team) {
      return res.status(404).json({
        message: "Team not found or you are not the team creator",
      });
    }

    await prisma.team.delete({
      where: {
        id: teamId,
      },
    });

    /*
      Because Team relations use onDelete: Cascade,
      these related records will cascade:

      TeamMember
      Budget
      Account
      Transaction
      TeamInvitation
    */

    return res.status(200).json({
      message: "Team deleted successfully",
    });

  } catch (error) {
    console.error("deleteTeam:", error);

    return res.status(500).json({
      message: "Failed to delete team",
    });
  }
};


/* =========================================================
   GET TEAM MEMBERS
   ========================================================= */

const getTeamMembers = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { teamId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    /*
      User must belong to the team.
    */

    const requester = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });

    if (!requester) {
      return res.status(403).json({
        message: "You are not a member of this team",
      });
    }

    const members = await prisma.teamMember.findMany({
      where: {
        teamId,
      },

      orderBy: {
        joinedAt: "asc",
      },

      select: {
        id: true,
        userId: true,
        role: true,
        joinedAt: true,

        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: "Team members fetched successfully",
      members,
    });

  } catch (error) {
    console.error("getTeamMembers:", error);

    return res.status(500).json({
      message: "Failed to get team members",
    });
  }
};


/* =========================================================
   SEND TEAM INVITATION
   ========================================================= */

const sendTeamInvitationEmail = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { teamId } = req.params;

    const email = req.body.email?.trim().toLowerCase();
    const role = req.body.role || "member";

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    if (!["member", "admin"].includes(role)) {
      return res.status(400).json({
        message: "Invalid team role",
      });
    }

    /*
      Get team.
    */

    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },

      select: {
        id: true,
        name: true,
        createdById: true,
        organizationId: true,
      },
    });

    if (!team) {
      return res.status(404).json({
        message: "Team not found",
      });
    }

    /*
      Only team creator can send invitations.
    */

    if (team.createdById !== userId) {
      return res.status(403).json({
        message: "Only the team creator can invite members",
      });
    }

    /*
      Check if invited email belongs to an existing user.
    */

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      const existingMember = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMember) {
        return res.status(409).json({
          message: "User is already a team member",
        });
      }
    }

    /*
      Check for pending invitation.
    */

    const existingInvitation = await prisma.teamInvitation.findFirst({
      where: {
        teamId,
        email,
        status: "pending",
      },
    });

    if (existingInvitation) {
      return res.status(409).json({
        message: "Invitation already sent",
      });
    }

    /*
      Create secure invitation token.
    */

    const token = crypto.randomBytes(32).toString("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId,
        email,
        invitedById: userId,
        role,
        token,
        expiresAt,
      },

      include: {
        team: true,
        invitedBy: true,
      },
    });

    /*
      Send email.
    */

    await sendEmail({
      email,
      teamName: invitation.team.name,
      inviterName: invitation.invitedBy.name,
      token,
    });

    return res.status(201).json({
      message: "Invitation sent successfully",
    });

  } catch (error) {
    console.error("sendTeamInvitationEmail:", error);

    return res.status(500).json({
      message: "Failed to send invitation",
    });
  }
};


/* =========================================================
   ACCEPT TEAM INVITATION
   ========================================================= */

const acceptInvitation = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { token } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const invitation = await prisma.teamInvitation.findUnique({
      where: {
        token,
      },
    });

    if (!invitation) {
      return res.status(404).json({
        message: "Invitation not found",
      });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({
        message: "Invitation is no longer valid",
      });
    }

    /*
      Check expiry.
    */

    if (invitation.expiresAt < new Date()) {
      await prisma.teamInvitation.update({
        where: {
          id: invitation.id,
        },

        data: {
          status: "expired",
        },
      });

      return res.status(400).json({
        message: "Invitation has expired",
      });
    }

    /*
      Get current user.
    */

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    /*
      Invitation can only be accepted by the
      account that owns the invited email.
    */

    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return res.status(403).json({
        message: "This invitation was sent to another email address",
      });
    }

    /*
      Make sure user isn't already a member.
    */

    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: invitation.teamId,
          userId,
        },
      },
    });

    if (existingMember) {
      return res.status(409).json({
        message: "You are already a member of this team",
      });
    }

    /*
      Add member + mark invitation accepted
      in ONE transaction.
    */

    await prisma.$transaction(async (tx) => {
      await tx.teamMember.create({
        data: {
          teamId: invitation.teamId,
          userId,
          role: invitation.role,
        },
      });

      await tx.teamInvitation.update({
        where: {
          id: invitation.id,
        },

        data: {
          status: "accepted",
        },
      });
    });

    return res.status(200).json({
      message: "You have joined the team",
    });

  } catch (error) {
    console.error("acceptInvitation:", error);

    return res.status(500).json({
      message: "Failed to accept invitation",
    });
  }
};


/* =========================================================
   UPDATE TEAM MEMBER ROLE
   ========================================================= */

const updateTeamMemberRole = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { teamId, memberUserId } = req.params;
    const { role } = req.body;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!["member", "admin"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    /*
      Only team creator can modify roles.
    */

    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        createdById: userId,
      },
    });

    if (!team) {
      return res.status(403).json({
        message: "Only the team creator can change member roles",
      });
    }

    const member = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: memberUserId,
        },
      },
    });

    if (!member) {
      return res.status(404).json({
        message: "Team member not found",
      });
    }

    /*
      Prevent changing the creator's own owner role.
    */

    if (memberUserId === team.createdById) {
      return res.status(400).json({
        message: "Team creator's role cannot be changed",
      });
    }

    const updatedMember = await prisma.teamMember.update({
      where: {
        teamId_userId: {
          teamId,
          userId: memberUserId,
        },
      },

      data: {
        role,
      },

      select: {
        id: true,
        userId: true,
        role: true,
        joinedAt: true,

        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: "Team member role updated successfully",
      member: updatedMember,
    });

  } catch (error) {
    console.error("updateTeamMemberRole:", error);

    return res.status(500).json({
      message: "Failed to update member role",
    });
  }
};


/* =========================================================
   REMOVE TEAM MEMBER
   ========================================================= */

const removeTeamMember = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { teamId, memberUserId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    /*
      Only creator can remove members.
    */

    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        createdById: userId,
      },
    });

    if (!team) {
      return res.status(403).json({
        message: "Only the team creator can remove members",
      });
    }

    /*
      Creator cannot remove themselves.
    */

    if (memberUserId === team.createdById) {
      return res.status(400).json({
        message: "Team creator cannot be removed",
      });
    }

    const member = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: memberUserId,
        },
      },
    });

    if (!member) {
      return res.status(404).json({
        message: "Team member not found",
      });
    }

    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId,
          userId: memberUserId,
        },
      },
    });

    return res.status(200).json({
      message: "Team member removed successfully",
    });

  } catch (error) {
    console.error("removeTeamMember:", error);

    return res.status(500).json({
      message: "Failed to remove team member",
    });
  }
};


/* =========================================================
   EXPORT
   ========================================================= */

export {
  getAllTeams,
  getOneTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamMembers,
  sendTeamInvitationEmail,
  acceptInvitation,
  updateTeamMemberRole,
  removeTeamMember,
};