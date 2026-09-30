import prisma from "../prisma/client.js";


const getUserId = (req) => req.user?._id;


/* =========================================================
   HELPERS
   ========================================================= */

/*
  Your DB uses Decimal(14,2), so amounts should have
  at most 2 decimal places.

  We convert to "cents" using BigInt so that we don't
  use floating-point arithmetic for financial comparisons.
*/

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


/*
  Normalize amount for Prisma Decimal.
  Example:
  "5000"   -> "5000.00"
  "5000.5" -> "5000.50"
*/

const normalizeAmount = (value) => {
  const amount = String(value).trim();

  const [whole, decimal = ""] = amount.split(".");

  return `${whole}.${decimal.padEnd(2, "0")}`;
};


/*
  UUID validation.
*/

const isValidUUID = (value) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
};


/*
  Check that the logged-in user belongs to the team.
*/

const getTeamMember = async (teamId, userId) => {
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
   1. CREATE TRANSACTION
   ========================================================= */

const createTransaction = async (req, res) => {
  try {
    const userId = getUserId(req);

    const { teamId } = req.params;

    const {
      transactionType,
      description,
      referenceId,
      entries,
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!teamId || !transactionType || !entries) {
      return res.status(400).json({
        message:
          "Team ID, transaction type and entries are required",
      });
    }

    /*
      A transaction needs at least two ledger entries.
    */

    if (!Array.isArray(entries) || entries.length < 2) {
      return res.status(400).json({
        message:
          "A transaction must contain at least two ledger entries",
      });
    }

    /*
      User must belong to the team.
    */

    const teamMember = await getTeamMember(teamId, userId);

    if (!teamMember) {
      return res.status(403).json({
        message: "You are not a member of this team",
      });
    }

    /*
      Validate referenceId if provided.
    */

    if (referenceId && !isValidUUID(referenceId)) {
      return res.status(400).json({
        message: "Invalid reference ID",
      });
    }

    let totalDebit = 0n;
    let totalCredit = 0n;

    const normalizedEntries = [];

    for (const entry of entries) {
      const {
        accountId,
        debit = "0",
        credit = "0",
        description: entryDescription,
      } = entry;

      if (!accountId) {
        return res.status(400).json({
          message: "Every ledger entry must have an accountId",
        });
      }

      if (!isValidUUID(accountId)) {
        return res.status(400).json({
          message: `Invalid account ID: ${accountId}`,
        });
      }

      const debitCents = parseAmount(debit);
      const creditCents = parseAmount(credit);

      if (debitCents === null || creditCents === null) {
        return res.status(400).json({
          message:
            "Debit and credit must be valid numbers with at most 2 decimal places",
        });
      }

      /*
        One ledger entry cannot have both debit and credit.
      */

      if (debitCents > 0n && creditCents > 0n) {
        return res.status(400).json({
          message:
            "A ledger entry cannot have both debit and credit",
        });
      }

      /*
        An entry with zero debit AND zero credit is useless.
      */

      if (debitCents === 0n && creditCents === 0n) {
        return res.status(400).json({
          message:
            "A ledger entry must contain either a debit or a credit",
        });
      }

      totalDebit += debitCents;
      totalCredit += creditCents;

      normalizedEntries.push({
        accountId,
        debit: normalizeAmount(debit),
        credit: normalizeAmount(credit),
        description: entryDescription || null,
      });
    }

    /*
      Double-entry accounting rule:
      Debit must equal Credit.
    */

    if (totalDebit !== totalCredit) {
      return res.status(400).json({
        message:
          "Transaction is not balanced: total debit must equal total credit",
      });
    }

    /*
      Make sure all referenced accounts belong
      to this team.
    */

    const accountIds = [
      ...new Set(
        normalizedEntries.map((entry) => entry.accountId)
      ),
    ];

    const accounts = await prisma.account.findMany({
      where: {
        id: {
          in: accountIds,
        },
        teamId,
      },

      select: {
        id: true,
        accountType: true,
        ownerUserId: true,
      },
    });

    if (accounts.length !== accountIds.length) {
      return res.status(400).json({
        message:
          "One or more accounts do not belong to this team",
      });
    }

    /*
      A user cannot post directly to another person's
      reimbursement account.
    */

    for (const account of accounts) {
      if (
        account.accountType === "reimbursement" &&
        account.ownerUserId !== userId
      ) {
        return res.status(403).json({
          message:
            "You cannot use another member's reimbursement account",
        });
      }
    }

    /*
      Create transaction + ledger entries + audit log
      atomically.
    */

    const transaction = await prisma.$transaction(
      async (tx) => {
        const newTransaction =
          await tx.transaction.create({
            data: {
              teamId,
              createdById: userId,
              transactionType,
              description: description || null,
              referenceId: referenceId || null,

              ledgerEntries: {
                create: normalizedEntries,
              },
            },

            select: {
              id: true,
              teamId: true,
              createdById: true,
              transactionType: true,
              description: true,
              referenceId: true,
              createdAt: true,

              ledgerEntries: {
                select: {
                  id: true,
                  accountId: true,
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
                },
              },
            },
          });

        /*
          Record the action.
        */

        await tx.auditLog.create({
          data: {
            userId,
            entityType: "transaction",
            entityId: newTransaction.id,
            action: "create",

            newValue: {
              transactionType,
              description: description || null,
              referenceId: referenceId || null,
              entries: normalizedEntries,
            },
          },
        });

        return newTransaction;
      }
    );

    return res.status(201).json({
      message: "Transaction created successfully",
      transaction,
    });

  } catch (error) {
    console.error("createTransaction:", error);

    return res.status(500).json({
      message: "Failed to create transaction",
    });
  }
};


/* =========================================================
   2. GET ALL TRANSACTIONS FOR A TEAM
   ========================================================= */

const getAllTransactions = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { teamId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const teamMember = await getTeamMember(
      teamId,
      userId
    );

    if (!teamMember) {
      return res.status(403).json({
        message: "You are not a member of this team",
      });
    }

    const transactions =
      await prisma.transaction.findMany({
        where: {
          teamId,
        },

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          teamId: true,
          createdById: true,
          transactionType: true,
          description: true,
          referenceId: true,
          createdAt: true,

          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },

          ledgerEntries: {
            select: {
              id: true,
              accountId: true,
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
            },
          },
        },
      });

    return res.status(200).json({
      message: "Transactions fetched successfully",
      transactions,
    });

  } catch (error) {
    console.error(
      "getAllTransactions:",
      error
    );

    return res.status(500).json({
      message: "Failed to fetch transactions",
    });
  }
};


/* =========================================================
   3. GET ONE TRANSACTION
   ========================================================= */

const getTransaction = async (req, res) => {
  try {
    const userId = getUserId(req);

    const { teamId, transactionId } =
      req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const teamMember = await getTeamMember(
      teamId,
      userId
    );

    if (!teamMember) {
      return res.status(403).json({
        message: "You are not a member of this team",
      });
    }

    const transaction =
      await prisma.transaction.findFirst({
        where: {
          id: transactionId,
          teamId,
        },

        select: {
          id: true,
          teamId: true,
          createdById: true,
          transactionType: true,
          description: true,
          referenceId: true,
          createdAt: true,

          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },

          ledgerEntries: {
            select: {
              id: true,
              accountId: true,
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
          },
        },
      });

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      message: "Transaction fetched successfully",
      transaction,
    });

  } catch (error) {
    console.error(
      "getTransaction:",
      error
    );

    return res.status(500).json({
      message: "Failed to fetch transaction",
    });
  }
};


/* =========================================================
   4. GET CURRENT USER'S TRANSACTIONS
   ========================================================= */

const getMyTransactions = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { teamId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const teamMember = await getTeamMember(
      teamId,
      userId
    );

    if (!teamMember) {
      return res.status(403).json({
        message: "You are not a member of this team",
      });
    }

    const transactions =
      await prisma.transaction.findMany({
        where: {
          teamId,
          createdById: userId,
        },

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          transactionType: true,
          description: true,
          referenceId: true,
          createdAt: true,

          ledgerEntries: {
            select: {
              id: true,
              accountId: true,
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
            },
          },
        },
      });

    return res.status(200).json({
      message: "Your transactions fetched successfully",
      transactions,
    });

  } catch (error) {
    console.error(
      "getMyTransactions:",
      error
    );

    return res.status(500).json({
      message: "Failed to fetch your transactions",
    });
  }
};


/* =========================================================
   EXPORT
   ========================================================= */

export {
  createTransaction,
  getAllTransactions,
  getTransaction,
  getMyTransactions,
};