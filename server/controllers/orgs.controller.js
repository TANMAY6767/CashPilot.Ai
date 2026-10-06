import prisma from "../prisma/client.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse, statusType } from "../utils/index.js";
import { sendEmail } from "../services/email.service.js";
import crypto from "crypto";

const getUserId = (req) => req.user?.sub;

const parseAmount = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const amount = String(value).trim();

  // Only positive/zero numbers with max 2 decimal places
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
    return null;
  }

  const [whole, decimal = ""] = amount.split(".");

  const decimalPart = decimal.padEnd(2, "0");

  return (
    BigInt(whole) * 100n +
    BigInt(decimalPart)
  );
};

const normalizeAmount = (value) => {
  const amount = String(value).trim();

  const [whole, decimal = ""] = amount.split(".");

  return `${whole}.${decimal.padEnd(2, "0")}`;
};

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
      createdById: userId,
    },
  });

  if (existingOrg) {
    throw new ApiError(
      statusType.CONFLICT,
      "You already have an organization with this name."
    );
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
        name: "Financial cash Account",
      }
    });

    await tx.account.create({
      data: {
        organizationId: org.id,
        accountType: "liability",
        name: "Employee Payable Account",
      }
    });
    await tx.account.create({
      data: {
        organizationId: org.id,
        accountType: "equity",
        name: "Owner Capital Account",
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
      accounts: {
        select: {
          id: true,
          name: true,
          organizationId: true,
          teamId: true,
          accountType: true,
          createdAt: true
        },
      }
    },
  });

  if (!organization) {
    throw new ApiError(statusType.NOT_FOUND, "Organization not found.")
  }

  return sendResponse(
    res,
    "success",
    organization,
    "Organization fetched successfully.",
    statusType.OK
  );

});

const updateOrganization = asyncHandler(async (req, res) => {
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

  if (!membership) {
    throw new ApiError(statusType.FORBIDDEN, "You are not a member of this organization.")
  }
  if (membership.role !== "owner") {
    throw new ApiError(statusType.FORBIDDEN, "Only the organization owner can update it.")
  }

  const organization = await prisma.organization.update({
    where: {
      id: orgId
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

  return sendResponse(
    res,
    "success",
    organization,
    "Organization updated successfully.",
    statusType.OK
  );

});

const deleteOrganization = asyncHandler(async (req, res) => {
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
    select: {
      role: true,
    },
  });

  if (!membership) {
    throw new ApiError(statusType.FORBIDDEN, "You are not a member of this organization.")
  }
  if (membership.role !== "owner") {
    throw new ApiError(statusType.FORBIDDEN, "Only the organization owner can update it.")
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

const getOrganizationMembers = asyncHandler(async (req, res) => {
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

  if (!requester) {
    throw new ApiError(statusType.FORBIDDEN, "You are not a member of this organization.")
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

const addOrganizationMember = asyncHandler(async (req, res) => {
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

  if (!["owner", "admin", "member"].includes(role)) {
    throw new ApiError(statusType.BAD_REQUEST, "Invalid member role.")
  }

  const requester = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: orgId,
        userId,
      },
    },
    select: {
      role: true
    }
  });

  if (!requester) {
    throw new ApiError(statusType.FORBIDDEN, "You are not a member of this organization.")
  }
  if (requester.role !== "owner") {
    throw new ApiError(statusType.FORBIDDEN, "Only the organization owner can add it.")
  }

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
    throw new ApiError(statusType.NOT_FOUND, "User not found.");
  }

  const existingMember = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: orgId,
        userId: user.id
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

const sendOrgInvitationEmail = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { orgId } = req.params;

  const email = typeof req.body?.email === "string"
    ? req.body.email.trim().toLowerCase()
    : "";
  const requestedRole = req.body?.role ?? "member";
  const role = typeof requestedRole === "string" ? requestedRole.toLowerCase() : "";

  if (!userId) {
    throw new ApiError(statusType.UNAUTHORIZED, "Unauthorized");
  }
  if (!orgId) {
    throw new ApiError(statusType.BAD_REQUEST, "Organization ID is required.");
  }
  if (!email) {
    throw new ApiError(statusType.BAD_REQUEST, "User email is required.");
  }

  if (!["owner", "admin", "member"].includes(role)) {
    throw new ApiError(statusType.BAD_REQUEST, "Invalid member role.")
  }

  const requester = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: orgId,
        userId,
      },
    },
    select: {
      role: true
    }
  });

  if (!requester) {
    throw new ApiError(statusType.FORBIDDEN, "You are not a member of this organization.")
  }
  if (requester.role !== "owner") {
    throw new ApiError(statusType.FORBIDDEN, "Only the organization owner can add it.")
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new ApiError(statusType.BAD_REQUEST, "Enter a valid email address.");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });

  if (user) {
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: orgId, userId: user.id },
      },
    });
    if (existingMember) {
      throw new ApiError(statusType.CONFLICT, "User is already a member of this organization.");
    }
  }

  const existingInvitation = await prisma.organizationInvitation.findFirst({
    where: {
      organizationId: orgId,
      email,
      status: "pending",
    },
  });

  if (existingInvitation) {
    if (existingInvitation.expiresAt > new Date()) {
      throw new ApiError(statusType.CONFLICT, "Invitation already sent.");
    }

    await prisma.organizationInvitation.update({
      where: { id: existingInvitation.id },
      data: { status: "expired" },
    });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await prisma.organizationInvitation.create({
    data: {
      organizationId: orgId,
      email,
      invitedById: userId,
      role,
      token,
      expiresAt,
    },

    select: {
      id: true,
      organization: { select: { name: true } },
      invitedBy: { select: { name: true } },
    },
  });

  try {
    await sendEmail({
      email,
      orgName: invitation.organization.name,
      inviterName: invitation.invitedBy.name,
      token,
    });
  } catch (error) {
    await prisma.organizationInvitation.delete({ where: { id: invitation.id } });
    console.error("Organization invitation email failed:", error);
    throw new ApiError(statusType.INTERNAL_SERVER_ERROR, "Could not send the invitation email. Please try again.");
  }

  return sendResponse(
    res,
    "success",
    null,
    "Invitation sent successfully",
    statusType.OK
  );
})

const acceptInvitation = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { token } = req.params;

  if (!userId) {
    throw new ApiError(statusType.UNAUTHORIZED, "Unauthorized.");
  }
  if (!token) {
    throw new ApiError(statusType.BAD_REQUEST, "Invitation token is required.");
  }

  const invitation = await prisma.organizationInvitation.findUnique({
    where: { token },
    select: {
      id: true,
      organizationId: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
    },
  });

  if (!invitation) {
    throw new ApiError(statusType.NOT_FOUND, "Invitation not found.");
  }

  if (invitation.status !== "pending") {
    throw new ApiError(statusType.CONFLICT, "Invitation is no longer valid.");
  }

  if (invitation.expiresAt <= new Date()) {
    await prisma.organizationInvitation.updateMany({
      where: { id: invitation.id, status: "pending" },
      data: { status: "expired" },
    });
    throw new ApiError(statusType.GONE, "Invitation has expired.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new ApiError(statusType.UNAUTHORIZED, "User no longer exists.");
  }

  // KEY CHECK: the logged-in user must be the invitee.
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new ApiError(
      statusType.FORBIDDEN,
      "This invitation was sent to a different email address."
    );
  }

  // Idempotency: already a member?
  const existing = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: invitation.organizationId,
        userId: user.id,
      },
    },
  });

  await prisma.$transaction(async (tx) => {
    const updated = await tx.organizationInvitation.updateMany({
      where: { id: invitation.id, status: "pending", expiresAt: { gt: new Date() } },
      data: { status: "accepted" },
    });

    if (updated.count !== 1) {
      throw new ApiError(statusType.CONFLICT, "Invitation already used.");
    }

    if (!existing) {
      await tx.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId: user.id,
          role: invitation.role,
        },
      });
    }
  });

  return sendResponse(
    res, "success", { organizationId: invitation.organizationId },
    existing ? "You are already a member of this organization." : "Invitation accepted successfully.",
    statusType.OK
  );
});

const getInvitationDetails = asyncHandler(async (req, res) => {
  const { token } = req.params;
  if (!token) {
    throw new ApiError(statusType.BAD_REQUEST, "Invitation token is required.");
  }

  const invitation = await prisma.organizationInvitation.findUnique({
    where: { token },
    select: {
      organizationId: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      organization: { select: { name: true } },
    },
  });

  if (!invitation) {
    throw new ApiError(statusType.NOT_FOUND, "Invitation not found.");
  }

  return sendResponse(
    res,
    "success",
    {
      organizationId: invitation.organizationId,
      organizationName: invitation.organization.name,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
    },
    "Invitation fetched successfully.",
    statusType.OK
  );
});

const updateOrganizationMemberRole = asyncHandler(async (req, res) => {
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

  if (!["owner", "admin", "member"].includes(role)) {
    throw new ApiError(statusType.BAD_REQUEST, "Invalid role.")
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

const removeOrganizationMember = asyncHandler(async (req, res) => {
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

const getOrganizationAccounts = asyncHandler(async (req, res) => {
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
    select: {
      role: true
    }
  });

  if (!requester) {
    throw new ApiError(statusType.FORBIDDEN, "You are not a member of this organization.")
  }
  if (requester.role !== "owner") {
    throw new ApiError(statusType.FORBIDDEN, "Only the organization owner can add it.")
  }

  const accounts = await prisma.account.findMany({
    where: {
      organizationId: orgId,
    },

    select: {
      id: true,
      name: true,
      organizationId: true,
      teamId: true,
      accountType: true,
      createdAt: true
    },
  });

  return sendResponse(
    res,
    "success",
    accounts,
    "Organization accounts fetched successfully.",
    statusType.OK
  );
})

const addFunds = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { orgId } = req.params;
  const { amount, description } = req.body;

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
    select: {
      role: true
    }
  });

  if (!requester) {
    throw new ApiError(statusType.FORBIDDEN, "You are not a member of this organization.")
  }
  if (requester.role !== "owner") {
    throw new ApiError(statusType.FORBIDDEN, "Only the organization owner can add it.")
  }

  const result = await prisma.$transaction(async (tx) => {
    const cashAccount = await tx.account.findFirst({
      where: {
        organizationId:orgId,
        name: "Financial Cash Account",
        accountType: "asset",
        teamId: null,
      },
    });

    const capitalAccount = await tx.account.findFirst({
      where: {
        organizationId:orgId,
        name: "Owner Capital Account",
        accountType: "equity",
        teamId: null,
      },
    });

    if (!cashAccount || !capitalAccount) {
      throw new ApiError(
        statusType.INTERNAL_SERVER_ERROR,
        "Default organization accounts not found."
      );
    }

    const transaction = await tx.transaction.create({
      data: {
        organizationId:orgId,
        teamId: null,
        createdById: userId,
        transactionType: "FUNDING",
        description: description ?? "Owner funding",
        ledgerEntries: {
          create: [
            {
              accountId: cashAccount.id,
              debit: amount,
              credit: 0,
            },
            {
              accountId: capitalAccount.id,
              debit: 0,
              credit: amount,
            },
          ],
        },
      },
      include: {
        ledgerEntries: true,
      },
    });

    return transaction;
  });

  return sendResponse(
    res,
    "success",
    result,
    "Transaction recorded successfully.",
    statusType.OK
  );
})

const getFinancialCashFunds = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { orgId } = req.params;

  if (!userId) {
    throw new ApiError(statusType.UNAUTHORIZED, "Unauthorized");
  }

  if (!orgId) {
    throw new ApiError(
      statusType.BAD_REQUEST,
      "Organization ID is required."
    );
  }

  const requester = await prisma.organizationMember.findUnique({
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

  
  if (!requester) {
    throw new ApiError(
      statusType.FORBIDDEN,
      "You are not a member of this organization."
    );
  }
  if (requester.role !== "owner") {
  throw new ApiError(
    statusType.FORBIDDEN,
    "Only the organization owner can add it."
  );
}


  const cashAccount = await prisma.account.findFirst({
    where: {
      organizationId: orgId,
      name: "Financial Cash Account",
      accountType: "asset",
      teamId: null,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!cashAccount) {
    throw new ApiError(
      statusType.NOT_FOUND,
      "Financial Cash Account not found."
    );
  }


  const totals = await prisma.ledgerEntry.aggregate({
    where: {
      accountId: cashAccount.id,
    },
    _sum: {
      debit: true,
      credit: true,
    },
  });

  const balance =
    Number(totals._sum.debit ?? 0) -
    Number(totals._sum.credit ?? 0);

  return sendResponse(
    res,
    "success",
    {
      accountId: cashAccount.id,
      accountName: cashAccount.name,
      balance,
    },
    "Financial cash balance fetched successfully.",
    statusType.OK
  );
});

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

  sendOrgInvitationEmail,
  acceptInvitation,
  getInvitationDetails,

  getOrganizationAccounts,
  addFunds,
  getFinancialCashFunds
};
