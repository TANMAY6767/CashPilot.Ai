import prisma from "../prisma/client.js";

const getUserId = (req) => req.user?._id;


/* =========================================================
   HELPER: CHECK TEAM ACCESS
   ========================================================= */

const getTeamAccess = async (teamId, userId) => {
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },

    select: {
      id: true,
      name: true,
      organizationId: true,
      createdById: true,

      organization: {
        select: {
          id: true,
          members: {
            where: {
              userId,
            },
            select: {
              role: true,
            },
          },
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

  if (!team) {
    return null;
  }

  const teamMember = team.members[0] || null;
  const organizationMember = team.organization.members[0] || null;

  return {
    team,
    teamMember,
    organizationMember,
  };
};


/* =========================================================
   1. CREATE DEFAULT ACCOUNTS FOR TEAM
   ========================================================= */

/*
  Called automatically when a team is created.

  These are system accounts and should not be created
  through the normal API.
*/


/* =========================================================
   2. GET ALL ACCOUNTS OF A TEAM
   ========================================================= */

const getTeamAccounts = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { teamId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const access = await getTeamAccess(teamId, userId);

    if (!access) {
      return res.status(404).json({
        message: "Team not found",
      });
    }

    /*
      A user must belong to the team OR be an organization
      member to access team accounts.

      In your current architecture, org members can see the
      team's data even if they are not directly added to the team.
    */

    if (!access.teamMember && !access.organizationMember) {
      return res.status(403).json({
        message: "You do not have access to this team",
      });
    }

    const accounts = await prisma.account.findMany({
      where: {
        teamId,
      },

      orderBy: {
        createdAt: "asc",
      },

      select: {
        id: true,
        teamId: true,
        name: true,
        accountType: true,
        ownerUserId: true,
        createdAt: true,

        ownerUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        _count: {
          select: {
            ledgerEntries: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: "Accounts fetched successfully",
      accounts,
    });

  } catch (error) {
    console.error("getTeamAccounts:", error);

    return res.status(500).json({
      message: "Failed to fetch accounts",
    });
  }
};

/* =========================================================
   3. GET ONE ACCOUNT
   ========================================================= */

const getAccount = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { teamId, accountId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const access = await getTeamAccess(teamId, userId);

    if (!access) {
      return res.status(404).json({
        message: "Team not found",
      });
    }

    if (!access.teamMember && !access.organizationMember) {
      return res.status(403).json({
        message: "You do not have access to this team",
      });
    }

    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        teamId,
      },

      select: {
        id: true,
        teamId: true,
        name: true,
        accountType: true,
        ownerUserId: true,
        createdAt: true,

        ownerUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        ledgerEntries: {
          select: {
            id: true,
            debit: true,
            credit: true,
            description: true,
            transactionId: true,
          },

          orderBy: {
            id: "desc",
          },
        },
      },
    });

    if (!account) {
      return res.status(404).json({
        message: "Account not found",
      });
    }

    return res.status(200).json({
      message: "Account fetched successfully",
      account,
    });

  } catch (error) {
    console.error("getAccount:", error);

    return res.status(500).json({
      message: "Failed to fetch account",
    });
  }
};


/* =========================================================
   4. CREATE CUSTOM ACCOUNT
   ========================================================= */

const createCustomAccount = async (req, res) => {
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
        message: "Account name is required",
      });
    }

    const access = await getTeamAccess(teamId, userId);

    if (!access) {
      return res.status(404).json({
        message: "Team not found",
      });
    }

    /*
      Allowed:
      1. Team owner
      2. Team admin
      3. Organization owner
    */

    const isTeamOwner =
      access.teamMember?.role === "owner";

    const isTeamAdmin =
      access.teamMember?.role === "admin";

    const isOrganizationOwner =
      access.organizationMember?.role === "owner";

    if (
      !isTeamOwner &&
      !isTeamAdmin &&
      !isOrganizationOwner
    ) {
      return res.status(403).json({
        message:
          "Only a team admin, team owner, or organization owner can create custom accounts",
      });
    }

    /*
      Prevent duplicate account names within the same team.
    */

    const existingAccount = await prisma.account.findFirst({
      where: {
        teamId,
        name,
      },
    });

    if (existingAccount) {
      return res.status(409).json({
        message: "An account with this name already exists",
      });
    }

    const account = await prisma.account.create({
      data: {
        teamId,
        name,
        accountType: "custom",
        ownerUserId: null,
      },

      select: {
        id: true,
        teamId: true,
        name: true,
        accountType: true,
        ownerUserId: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      message: "Custom account created successfully",
      account,
    });

  } catch (error) {
    console.error("createCustomAccount:", error);

    return res.status(500).json({
      message: "Failed to create custom account",
    });
  }
};


/* =========================================================
   5. CREATE PERSONAL REIMBURSEMENT ACCOUNT
   ========================================================= */

const createReimbursementAccount = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { teamId } = req.params;

    let name = req.body.name?.trim();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    /*
      User must actually belong to the team.
    */

    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });

    if (!teamMember) {
      return res.status(403).json({
        message: "You are not a member of this team",
      });
    }

    /*
      Don't allow a user to create multiple reimbursement
      accounts for the same team.

      We don't have a dedicated unique constraint for this,
      so check it manually.
    */

    const existingAccount = await prisma.account.findFirst({
      where: {
        teamId,
        ownerUserId: userId,
        accountType: "reimbursement",
      },
    });

    if (existingAccount) {
      return res.status(409).json({
        message: "You already have a reimbursement account for this team",
        account: existingAccount,
      });
    }

    /*
      If user didn't provide a name, generate one.
    */

    if (!name) {
      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          name: true,
        },
      });

      name = `${user.name} Reimbursement`;
    }

    /*
      Prevent same name collision.
    */

    const sameNameAccount = await prisma.account.findFirst({
      where: {
        teamId,
        name,
      },
    });

    if (sameNameAccount) {
      return res.status(409).json({
        message: "An account with this name already exists",
      });
    }

    const account = await prisma.account.create({
      data: {
        teamId,
        name,
        accountType: "reimbursement",
        ownerUserId: userId,
      },

      select: {
        id: true,
        teamId: true,
        name: true,
        accountType: true,
        ownerUserId: true,
        createdAt: true,

        ownerUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: "Reimbursement account created successfully",
      account,
    });

  } catch (error) {
    console.error("createReimbursementAccount:", error);

    return res.status(500).json({
      message: "Failed to create reimbursement account",
    });
  }
};


/* =========================================================
   6. UPDATE CUSTOM ACCOUNT
   ========================================================= */

const updateAccount = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { teamId, accountId } = req.params;
    const name = req.body.name?.trim();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!name) {
      return res.status(400).json({
        message: "Account name is required",
      });
    }

    const access = await getTeamAccess(teamId, userId);

    if (!access) {
      return res.status(404).json({
        message: "Team not found",
      });
    }

    const isTeamOwner =
      access.teamMember?.role === "owner";

    const isTeamAdmin =
      access.teamMember?.role === "admin";

    const isOrganizationOwner =
      access.organizationMember?.role === "owner";

    if (
      !isTeamOwner &&
      !isTeamAdmin &&
      !isOrganizationOwner
    ) {
      return res.status(403).json({
        message: "You do not have permission to update accounts",
      });
    }

    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        teamId,
      },
    });

    if (!account) {
      return res.status(404).json({
        message: "Account not found",
      });
    }

    /*
      System accounts cannot be renamed.
    */

    if (account.accountType === "system") {
      return res.status(403).json({
        message: "System accounts cannot be modified",
      });
    }

    /*
      Reimbursement accounts are owned by members.
      Admins shouldn't rename somebody else's personal account.
    */

    if (
      account.accountType === "reimbursement" &&
      account.ownerUserId !== userId &&
      !isOrganizationOwner &&
      !isTeamOwner
    ) {
      return res.status(403).json({
        message: "You cannot modify another member's reimbursement account",
      });
    }

    const duplicate = await prisma.account.findFirst({
      where: {
        teamId,
        name,
        id: {
          not: accountId,
        },
      },
    });

    if (duplicate) {
      return res.status(409).json({
        message: "An account with this name already exists",
      });
    }

    const updatedAccount = await prisma.account.update({
      where: {
        id: accountId,
      },

      data: {
        name,
      },

      select: {
        id: true,
        teamId: true,
        name: true,
        accountType: true,
        ownerUserId: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      message: "Account updated successfully",
      account: updatedAccount,
    });

  } catch (error) {
    console.error("updateAccount:", error);

    return res.status(500).json({
      message: "Failed to update account",
    });
  }
};


/* =========================================================
   7. DELETE ACCOUNT
   ========================================================= */

const deleteAccount = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { teamId, accountId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const access = await getTeamAccess(teamId, userId);

    if (!access) {
      return res.status(404).json({
        message: "Team not found",
      });
    }

    const isTeamOwner =
      access.teamMember?.role === "owner";

    const isTeamAdmin =
      access.teamMember?.role === "admin";

    const isOrganizationOwner =
      access.organizationMember?.role === "owner";

    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        teamId,
      },
    });

    if (!account) {
      return res.status(404).json({
        message: "Account not found",
      });
    }

    /*
      System accounts cannot be deleted.
    */

    if (account.accountType === "system") {
      return res.status(403).json({
        message: "System accounts cannot be deleted",
      });
    }

    /*
      Custom accounts:
      team owner/admin or organization owner.
    */

    if (account.accountType === "custom") {
      if (
        !isTeamOwner &&
        !isTeamAdmin &&
        !isOrganizationOwner
      ) {
        return res.status(403).json({
          message: "You do not have permission to delete this account",
        });
      }
    }

    /*
      Reimbursement account:
      owner can delete their own account.
      Team owner/admin can also delete it.
    */

    if (account.accountType === "reimbursement") {
      const isAccountOwner =
        account.ownerUserId === userId;

      if (
        !isAccountOwner &&
        !isTeamOwner &&
        !isTeamAdmin &&
        !isOrganizationOwner
      ) {
        return res.status(403).json({
          message: "You do not have permission to delete this account",
        });
      }
    }

    await prisma.account.delete({
      where: {
        id: accountId,
      },
    });

    return res.status(200).json({
      message: "Account deleted successfully",
    });

  } catch (error) {
    console.error("deleteAccount:", error);

    return res.status(500).json({
      message: "Failed to delete account",
    });
  }
};


/* =========================================================
   EXPORT
   ========================================================= */

export {
  getTeamAccounts,
  getAccount,
  createCustomAccount,
  createReimbursementAccount,
  updateAccount,
  deleteAccount,
};