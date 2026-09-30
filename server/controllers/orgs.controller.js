import prisma from "../prisma/client.js";

const getUserId = (req) => req.user?._id;


/* =========================================================
   1. CREATE ORGANIZATION
   ========================================================= */

const createOrg = async (req, res) => {
  try {
    const userId = getUserId(req);
    const name = req.body.name?.trim();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!name) {
      return res.status(400).json({
        message: "Organization name is required.",
      });
    }

    // Your current design treats organization names as globally unique.
    const existingOrg = await prisma.organization.findFirst({
      where: {
        name,
      },
    });

    if (existingOrg) {
      return res.status(409).json({
        message: "Organization already exists.",
      });
    }

    /*
      This creates:

      1. organizations row
      2. organization_members row

      The logged-in user becomes owner.
    */

    const organization = await prisma.organization.create({
      data: {
        name,
        createdById: userId,

        members: {
          create: {
            userId,
            role: "owner",
          },
        },
      },

      select: {
        id: true,
        name: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,

        members: {
          select: {
            id: true,
            userId: true,
            role: true,
            joinedAt: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: "Organization created successfully.",
      organization,
    });
  } catch (error) {
    console.error("createOrg:", error);

    return res.status(500).json({
      message: "Failed to create organization.",
    });
  }
};


/* =========================================================
   2. GET ALL ORGANIZATIONS OF LOGGED-IN USER
   ========================================================= */

const getAllOrgs = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const organizations = await prisma.organization.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },

      select: {
        id: true,
        name: true,
        createdById: true,
        createdAt: true,

        _count: {
          select: {
            members: true,
            teams: true,
          },
        },

        /*
          Get the logged-in user's role in this organization.
        */
        members: {
          where: {
            userId,
          },

          select: {
            role: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: "Organizations fetched successfully.",
      organizations,
    });
  } catch (error) {
    console.error("getAllOrgs:", error);

    return res.status(500).json({
      message: "Failed to get organizations.",
    });
  }
};


/* =========================================================
   3. GET ONE ORGANIZATION
   ========================================================= */

const getOrganization = async (req, res) => {
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
        message: "Organization ID is required.",
      });
    }

    /*
      Very important:

      We don't simply search by id.

      We search by:

      organization ID
      +
      logged-in user must be a member

      Therefore a user cannot fetch an organization
      they don't belong to.
    */

    const organization = await prisma.organization.findFirst({
      where: {
        id: orgId,

        members: {
          some: {
            userId,
          },
        },
      },

      select: {
        id: true,
        name: true,
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

        /*
          We don't need to load every team record here.
          We can return basic team information.
        */
        teams: {
          select: {
            id: true,
            name: true,
            createdById: true,
            createdAt: true,

            _count: {
              select: {
                members: true,
                transactions: true,
              },
            },
          },
        },
      },
    });

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found.",
      });
    }

    return res.status(200).json({
      message: "Organization fetched successfully.",
      organization,
    });
  } catch (error) {
    console.error("getOrganization:", error);

    return res.status(500).json({
      message: "Failed to get organization.",
    });
  }
};


/* =========================================================
   4. UPDATE ORGANIZATION
   ========================================================= */

const updateOrganization = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { orgId } = req.params;
    const name = req.body.name?.trim();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!name) {
      return res.status(400).json({
        message: "Organization name is required.",
      });
    }

    /*
      Find the user's membership in this organization.
    */

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this organization.",
      });
    }

    /*
      Only owner can update organization details.
    */

    if (membership.role !== "owner") {
      return res.status(403).json({
        message: "Only the organization owner can update it.",
      });
    }

    const organization = await prisma.organization.update({
      where: {
        id: orgId,
      },

      data: {
        name,
      },

      select: {
        id: true,
        name: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      message: "Organization updated successfully.",
      organization,
    });
  } catch (error) {
    console.error("updateOrganization:", error);

    return res.status(500).json({
      message: "Failed to update organization.",
    });
  }
};


/* =========================================================
   5. DELETE ORGANIZATION
   ========================================================= */

const deleteOrganization = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { orgId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this organization.",
      });
    }

    if (membership.role !== "owner") {
      return res.status(403).json({
        message: "Only the organization owner can delete it.",
      });
    }

    await prisma.organization.delete({
      where: {
        id: orgId,
      },
    });

    /*
      Because you have onDelete: Cascade on OrganizationMember
      and Team -> Organization, related records will cascade
      according to your schema.
    */

    return res.status(200).json({
      message: "Organization deleted successfully.",
    });
  } catch (error) {
    console.error("deleteOrganization:", error);

    return res.status(500).json({
      message: "Failed to delete organization.",
    });
  }
};


/* =========================================================
   6. GET ORGANIZATION MEMBERS
   ========================================================= */

const getOrganizationMembers = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { orgId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    /*
      Check whether requester belongs to organization.
    */

    const requester = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!requester) {
      return res.status(403).json({
        message: "You are not a member of this organization.",
      });
    }

    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId: orgId,
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
      message: "Organization members fetched successfully.",
      members,
    });
  } catch (error) {
    console.error("getOrganizationMembers:", error);

    return res.status(500).json({
      message: "Failed to get organization members.",
    });
  }
};


/* =========================================================
   7. ADD MEMBER TO ORGANIZATION
   ========================================================= */

const addOrganizationMember = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { orgId } = req.params;
    const { email, role = "member" } = req.body;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!email) {
      return res.status(400).json({
        message: "User email is required.",
      });
    }

    /*
      Only owner can add members.
    */

    const requester = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!requester) {
      return res.status(403).json({
        message: "You are not a member of this organization.",
      });
    }

    if (requester.role !== "owner") {
      return res.status(403).json({
        message: "Only the organization owner can add members.",
      });
    }

    if (!["member", "owner","admin"].includes(role)) {
      return res.status(400).json({
        message: "Invalid member role.",
      });
    }

    /*
      Find the user we want to add.
    */

    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase().trim(),
      },

      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    /*
      Check whether already a member.
    */

    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      return res.status(409).json({
        message: "User is already a member of this organization.",
      });
    }

    const member = await prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: user.id,
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

    return res.status(201).json({
      message: "Member added successfully.",
      member,
    });
  } catch (error) {
    console.error("addOrganizationMember:", error);

    return res.status(500).json({
      message: "Failed to add member.",
    });
  }
};


/* =========================================================
   8. UPDATE MEMBER ROLE
   ========================================================= */

const updateOrganizationMemberRole = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { orgId, memberUserId } = req.params;
    const { role } = req.body;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!["member", "owner"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role.",
      });
    }

    const requester = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!requester || requester.role !== "owner") {
      return res.status(403).json({
        message: "Only the organization owner can change member roles.",
      });
    }

    const targetMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: memberUserId,
        },
      },
    });

    if (!targetMember) {
      return res.status(404).json({
        message: "Organization member not found.",
      });
    }

    /*
      Prevent organization from having zero owners.
    */

    if (
      targetMember.role === "owner" &&
      role === "member"
    ) {
      const ownerCount = await prisma.organizationMember.count({
        where: {
          organizationId: orgId,
          role: "owner",
        },
      });

      if (ownerCount <= 1) {
        return res.status(400).json({
          message: "Organization must have at least one owner.",
        });
      }
    }

    const updatedMember = await prisma.organizationMember.update({
      where: {
        organizationId_userId: {
          organizationId: orgId,
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
      message: "Member role updated successfully.",
      member: updatedMember,
    });
  } catch (error) {
    console.error("updateOrganizationMemberRole:", error);

    return res.status(500).json({
      message: "Failed to update member role.",
    });
  }
};


/* =========================================================
   9. REMOVE MEMBER
   ========================================================= */

const removeOrganizationMember = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { orgId, memberUserId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const requester = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!requester || requester.role !== "owner") {
      return res.status(403).json({
        message: "Only the organization owner can remove members.",
      });
    }

    const targetMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: memberUserId,
        },
      },
    });

    if (!targetMember) {
      return res.status(404).json({
        message: "Organization member not found.",
      });
    }

    /*
      Don't allow the last owner to be removed.
    */

    if (targetMember.role === "owner") {
      const ownerCount = await prisma.organizationMember.count({
        where: {
          organizationId: orgId,
          role: "owner",
        },
      });

      if (ownerCount <= 1) {
        return res.status(400).json({
          message: "The last owner cannot be removed.",
        });
      }
    }

    await prisma.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: memberUserId,
        },
      },
    });

    return res.status(200).json({
      message: "Member removed successfully.",
    });
  } catch (error) {
    console.error("removeOrganizationMember:", error);

    return res.status(500).json({
      message: "Failed to remove member.",
    });
  }
};


/* =========================================================
   EXPORT
   ========================================================= */

export {
  createOrg,
  getAllOrgs,
  getOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationMembers,
  addOrganizationMember,
  updateOrganizationMemberRole,
  removeOrganizationMember,
};