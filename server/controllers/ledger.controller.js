import prisma from "../prisma/client.js";

const getUserId = (req) => req.user?._id;


/* =========================================================
   HELPER: CHECK TEAM MEMBERSHIP
   ========================================================= */

const checkTeamMember = async (teamId, userId) => {
  return prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },

    select: {
      id: true,
      userId: true,
      teamId: true,
      role: true,
    },
  });
};


/* =========================================================
   1. GET ALL LEDGER ENTRIES FOR AN ACCOUNT
   ========================================================= */

const getAccountLedger = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { teamId, accountId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    /*
      User must belong to the team.
    */

    const teamMember = await checkTeamMember(
      teamId,
      userId
    );

    if (!teamMember) {
      return res.status(403).json({
        message: "You are not a member of this team",
      });
    }

    /*
      Make sure account belongs to this team.
    */

    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        teamId,
      },

      select: {
        id: true,
        name: true,
        accountType: true,
        ownerUserId: true,
      },
    });

    if (!account) {
      return res.status(404).json({
        message: "Account not found",
      });
    }

    /*
      Get ledger entries.
    */

    const entries = await prisma.ledgerEntry.findMany({
      where: {
        accountId,
      },

      orderBy: {
        transaction: {
          createdAt: "desc",
        },
      },

      select: {
        id: true,
        accountId: true,
        transactionId: true,
        debit: true,
        credit: true,
        description: true,

        transaction: {
          select: {
            id: true,
            transactionType: true,
            description: true,
            createdById: true,
            referenceId: true,
            createdAt: true,

            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      message: "Account ledger fetched successfully",
      account,
      entries,
    });

  } catch (error) {
    console.error("getAccountLedger:", error);

    return res.status(500).json({
      message: "Failed to fetch account ledger",
    });
  }
};


/* =========================================================
   2. GET LEDGER ENTRIES FOR A TRANSACTION
   ========================================================= */

const getTransactionLedger = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { teamId, transactionId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    /*
      User must belong to the team.
    */

    const teamMember = await checkTeamMember(
      teamId,
      userId
    );

    if (!teamMember) {
      return res.status(403).json({
        message: "You are not a member of this team",
      });
    }

    /*
      Make sure transaction belongs to this team.
    */

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        teamId,
      },

      select: {
        id: true,
        teamId: true,
        transactionType: true,
        description: true,
        createdById: true,
        referenceId: true,
        createdAt: true,

        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    const entries = await prisma.ledgerEntry.findMany({
      where: {
        transactionId,
      },

      select: {
        id: true,
        accountId: true,
        transactionId: true,
        debit: true,
        credit: true,
        description: true,

        account: {
          select: {
            id: true,
            name: true,
            accountType: true,
            ownerUserId: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: "Transaction ledger fetched successfully",
      transaction,
      entries,
    });

  } catch (error) {
    console.error("getTransactionLedger:", error);

    return res.status(500).json({
      message: "Failed to fetch transaction ledger",
    });
  }
};


/* =========================================================
   3. GET ACCOUNT BALANCE / MOVEMENT
   ========================================================= */

const getAccountBalance = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { teamId, accountId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    /*
      User must belong to the team.
    */

    const teamMember = await checkTeamMember(
      teamId,
      userId
    );

    if (!teamMember) {
      return res.status(403).json({
        message: "You are not a member of this team",
      });
    }

    /*
      Verify account.
    */

    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        teamId,
      },

      select: {
        id: true,
        name: true,
        accountType: true,
        ownerUserId: true,
      },
    });

    if (!account) {
      return res.status(404).json({
        message: "Account not found",
      });
    }

    /*
      Sum all debits.
    */

    const debitResult = await prisma.ledgerEntry.aggregate({
      where: {
        accountId,
      },

      _sum: {
        debit: true,
      },
    });

    /*
      Sum all credits.
    */

    const creditResult = await prisma.ledgerEntry.aggregate({
      where: {
        accountId,
      },

      _sum: {
        credit: true,
      },
    });

    const totalDebit =
      debitResult._sum.debit?.toString() || "0.00";

    const totalCredit =
      creditResult._sum.credit?.toString() || "0.00";

    /*
      For a generic account, the safest value to expose
      is the net movement:

          debit - credit

      The accounting meaning depends on the account's
      financial nature.
    */

    const debit = Number(totalDebit);
    const credit = Number(totalCredit);

    const netMovement = debit - credit;

    return res.status(200).json({
      message: "Account balance fetched successfully",

      account: {
        id: account.id,
        name: account.name,
        accountType: account.accountType,
        ownerUserId: account.ownerUserId,
      },

      totals: {
        debit: totalDebit,
        credit: totalCredit,
        netMovement: netMovement.toFixed(2),
      },
    });

  } catch (error) {
    console.error("getAccountBalance:", error);

    return res.status(500).json({
      message: "Failed to calculate account balance",
    });
  }
};


/* =========================================================
   4. GET RECENT LEDGER ENTRIES
   ========================================================= */

const getRecentLedgerEntries = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { teamId } = req.params;

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 20, 1),
      100
    );

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const teamMember = await checkTeamMember(
      teamId,
      userId
    );

    if (!teamMember) {
      return res.status(403).json({
        message: "You are not a member of this team",
      });
    }

    const entries = await prisma.ledgerEntry.findMany({
      where: {
        transaction: {
          teamId,
        },
      },

      orderBy: {
        transaction: {
          createdAt: "desc",
        },
      },

      take: limit,

      select: {
        id: true,
        accountId: true,
        transactionId: true,
        debit: true,
        credit: true,
        description: true,

        account: {
          select: {
            id: true,
            name: true,
            accountType: true,
          },
        },

        transaction: {
          select: {
            id: true,
            transactionType: true,
            description: true,
            createdAt: true,

            createdBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      message: "Recent ledger entries fetched successfully",
      entries,
    });

  } catch (error) {
    console.error("getRecentLedgerEntries:", error);

    return res.status(500).json({
      message: "Failed to fetch recent ledger entries",
    });
  }
};


export {
  getAccountLedger,
  getTransactionLedger,
  getAccountBalance,
  getRecentLedgerEntries,
};