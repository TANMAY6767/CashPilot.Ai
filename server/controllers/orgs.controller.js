import prisma from "../prisma/client.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse, statusType } from "../utils/index.js";

const getUserId = (req) => req.user?._id;


/* =========================================================
   1. CREATE ORGANIZATION
   ========================================================= */

const createOrg = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const name = req.body.name?.trim();

  if (!userId) {
    throw new ApiError(statusType.UNAUTHORIZED, "Unauthorized");
  }

  if (!name) {
    throw new ApiError(statusType.BAD_REQUEST, "Organization name is required.")
  }

  const existingOrg = await prisma.organization.findFirst({
    where: {
      name,
    }
  });

  if (existingOrg) {
    throw new ApiError(statusType.CONFLICT, "Organization already exists.")
  }

  const organization = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name,
        createdById: userId,
        members: {
          create: {
            userId,
            role: "owner"
          }
        }
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

    await tx.account.create({
      data: {
        organizationId: org.id,
        accountType: "asset",
        name: "financial cash Account",
      }
    });

    await tx.account.create({
      data: {
        organizationId: org.id,
        accountType: "labibility",
        name: "employee Payable Account",
      }
    });

    return org;
  });


  return sendResponse(
    res,
    "success",
    organization,
    "Organization fetched successfully",
    statusType.OK
  )
});



/* =========================================================
   2. GET ALL ORGANIZATIONS OF LOGGED-IN USER
   ========================================================= */

const getAllOrgs = asyncHandler(async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    throw new ApiError(statusType.UNAUTHORIZED, "Unauthorized");
  }

  const organizations = await prisma.organization.findMany({
    where: {
      members: {
        some: {
          userId
        }
      }
    },
    orderBy: { createdAt: "desc" },

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

  return sendResponse(
    res,
    "success",
    organizations,
    "Organizations Fetched",
    statusType.OK
  )

});


/* =========================================================
   3. GET ONE ORGANIZATION
   ========================================================= */
const getOrganization = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { orgId } = req.params;

  if (!userId) {
    throw new ApiError(statusType.UNAUTHORIZED, "Unauthorized");
  }
  if (!orgId) {
    throw new ApiError(statusType.BAD_REQUEST, "Organization ID is required.");
  }

  const organization = await prisma.organization.findFirst({
    where: {
      id: orgId,
      members: {
        some: {    // some is relation filter
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
              name: true,
              email: true,
            },
          },
        },
      },
      teams:{
        select:{
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

  if(!organization){
    throw new ApiError(statusType.NOT_FOUND,"Organization not found.")
  }

  return sendResponse(
    res,
    "success",
    organization,
    "Organization fetched successfully.",
    statusType.OK
  );

});





/* =========================================================
   4. UPDATE ORGANIZATION
   ========================================================= */
const updateOrganization = asyncHandler(async(req,res) => {
  const userId = getUserId(req);
  const { orgId } = req.params;
  const name = req.body.name?.trim();

  if (!userId) {
    throw new ApiError(statusType.UNAUTHORIZED, "Unauthorized");
  }
  if (!orgId) {
    throw new ApiError(statusType.BAD_REQUEST, "Organization ID is required.");
  }
  if (!name) {
    throw new ApiError(statusType.BAD_REQUEST, "Organization name is required.");
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
        organizationId_userId: {
        organizationId: orgId,
        userId,
      },
    },
    select: {
      role: true,
    },
  });

  if(!membership){
    throw new ApiError(statusType.FORBIDDEN,"You are not a member of this organization.") 
  }
  if (membership.role !== "owner") {
      throw new ApiError(statusType.FORBIDDEN,"Only the organization owner can update it.") 
  }

  const organization = await prisma.organization.update({
    where:{
      id:orgId
    },
    data:{
      name,
    },
    select:{
      id: true,
      name: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return sendResponse(
    res,
    "success",
    organization,
    "Organization updated successfully.",
    statusType.OK
  );

});





/* =========================================================
   5. DELETE ORGANIZATION
   ========================================================= */
const deleteOrganization = asyncHandler(async(req,res) => {
  const userId = getUserId(req);
  const { orgId } = req.params;

  if (!userId) {
    throw new ApiError(statusType.UNAUTHORIZED, "Unauthorized");
  }
  if (!orgId) {
    throw new ApiError(statusType.BAD_REQUEST, "Organization ID is required.");
  }

  const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
      select:{
        role:true,
      },
    });

    if(!membership){
      throw new ApiError(statusType.FORBIDDEN,"You are not a member of this organization.") 
    }
    if (membership.role !== "owner") {
      throw new ApiError(statusType.FORBIDDEN,"Only the organization owner can update it.") 
    }
    await prisma.organization.delete({
      where: {
        id: orgId,
      },
    });
    return sendResponse(
      res,
      "success",
      null,
      "Organization deleted successfully.",
      statusType.OK
    );

});



/* =========================================================
   6. GET ORGANIZATION MEMBERS
   ========================================================= */

const getOrganizationMembers = asyncHandler(async(req,res) => {
  const userId = getUserId(req);
  const { orgId } = req.params;

  if (!userId) {
    throw new ApiError(statusType.UNAUTHORIZED, "Unauthorized");
  }
  if (!orgId) {
    throw new ApiError(statusType.BAD_REQUEST, "Organization ID is required.");
  }

  const requester = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

  if(!requester){
    throw new ApiError(statusType.FORBIDDEN,"You are not a member of this organization.") 
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
            name: true,
            email: true,
          },
        },
      },
    });

    return sendResponse(
      res,
      "success",
      members,
      "Organization members fetched successfully.",
      statusType.OK
    );
})




/* =========================================================
   7. ADD MEMBER TO ORGANIZATION
   ========================================================= */

const addOrganizationMember = asyncHandler(async(req,res) => {
  const userId = getUserId(req);
  const { orgId } = req.params;
  const { email, role = "member" } = req.body;

  if (!userId) {
    throw new ApiError(statusType.UNAUTHORIZED, "Unauthorized");
  }
  if (!orgId) {
    throw new ApiError(statusType.BAD_REQUEST, "Organization ID is required.");
  }
  if (!email) {
    throw new ApiError(statusType.BAD_REQUEST, "User email is required.");
  }

  if(!["owner","admin","member"].includes(role)){
    throw new ApiError(statusType.BAD_REQUEST,"Invalid member role.") 
  }

  const requester = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
      select:{
        role:true
      }
    });

  if(!requester){
    throw new ApiError(statusType.FORBIDDEN,"You are not a member of this organization.") 
  }
  if (requester.role !== "owner") {
    throw new ApiError(statusType.FORBIDDEN,"Only the organization owner can add it.") 
  }

  const user = await prisma.user.findUnique({
    where:{
      email:email.toLowerCase().trim(),
    },
    select:{
      id:true,
      name:true,
      email:true,
    },
  });

  if (!user) {
    throw new ApiError(statusType.NOT_FOUND, "User not found.");
  }

  const existingMember = await prisma.organizationMember.findUnique({
    where:{
      organizationId_userId:{
        organizationId:orgId,
        userId:user.id
      },
    },
  });
  if (existingMember) {
    throw new ApiError(statusType.CONFLICT, "User is already a member of this organization.");
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
            name: true,
            email: true,
          },
        },
      },
    });

    return sendResponse(
      res,
      "success",
      member,
      "Member added successfully.",
      statusType.OK
    );

})




/* =========================================================
   8. UPDATE MEMBER ROLE
   ========================================================= */

const updateOrganizationMemberRole = asyncHandler(async(req,res) => {
  const userId = getUserId(req);
  const { orgId, memberUserId } = req.params;
  const { role } = req.body;

  if (!userId) {
    throw new ApiError(statusType.UNAUTHORIZED, "Unauthorized");
  }
  if (!orgId) {
    throw new ApiError(statusType.BAD_REQUEST, "Organization ID is required.");
  }
  if (!memberUserId) {
    throw new ApiError(statusType.BAD_REQUEST, "Member UserId is required.");
  }

  if(!["owner","admin","member"].includes(role)){
    throw new ApiError(statusType.BAD_REQUEST,"Invalid role.") 
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
      throw new ApiError(statusType.FORBIDDEN, "Only the organization owner can change member roles.");
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
      throw new ApiError(statusType.NOT_FOUND, "Organization member not found.");
    }

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
              throw new ApiError(statusType.BAD_REQUEST, "Organization must have at least one owner.");
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
            name: true,
            email: true,
          },
        },
      },
    });
    return sendResponse(
      res,
      "success",
      updatedMember,
      "Member role updated successfully.",
      statusType.OK
    );
});





/* =========================================================
   9. REMOVE MEMBER
   ========================================================= */

const removeOrganizationMember =asyncHandler(async(req,res) => {
  const userId = getUserId(req);
  const { orgId, memberUserId } = req.params;

  if (!userId) {
    throw new ApiError(statusType.UNAUTHORIZED, "Unauthorized");
  }
  if (!orgId) {
    throw new ApiError(statusType.BAD_REQUEST, "Organization ID is required.");
  }
  if (!memberUserId) {
    throw new ApiError(statusType.BAD_REQUEST, "Member UserId is required.");
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
      throw new ApiError(statusType.FORBIDDEN, "Only the organization owner can change member roles.");
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
      throw new ApiError(statusType.NOT_FOUND, "Organization member not found.");
    }

    if (targetMember.role === "owner") {
      const ownerCount = await prisma.organizationMember.count({
        where: {
          organizationId: orgId,
          role: "owner",
        },
      });

      if (ownerCount <= 1) {
        throw new ApiError(statusType.BAD_REQUEST, "The last owner cannot be removed.");
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

    return sendResponse(
      res,
      "success",
      null,
      "Member removed successfully.",
      statusType.OK
    );
})




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