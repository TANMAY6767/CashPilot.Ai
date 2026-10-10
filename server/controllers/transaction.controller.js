import prisma from "../prisma/client.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse, statusType } from "../utils/index.js";
import { sendEmail } from "../services/email.service.js";
import crypto from "crypto";


const getUserId = (req) => req.user?.sub;


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

const createTransaction = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { teamId } = req.params;

  const {
    transactionType,
    description,
    referenceId,
    entries,
  } = req.body ?? {};

  if (!userId) {
    throw new ApiError(
      statusType.UNAUTHORIZED,
      "Unauthorized"
    );
  }

  if (!teamId || !transactionType || !entries) {
    throw new ApiError(
      statusType.BAD_REQUEST,
      "Team ID, transaction type and entries are required."
    );
  }

  if (!Array.isArray(entries) || entries.length < 2) {
    throw new ApiError(
      statusType.BAD_REQUEST,
      "A transaction must contain at least two ledger entries."
    );
  }

  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
    select: {
      id: true,
      organizationId: true,
    },
  });

  if (!team) {
    throw new ApiError(
      statusType.NOT_FOUND,
      "Team not found."
    );
  }

  const teamMember = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!teamMember) {
    throw new ApiError(
      statusType.FORBIDDEN,
      "You are not a member of this team."
    );
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
      throw new ApiError(
        statusType.BAD_REQUEST,
        "Every ledger entry must have an accountId."
      );
    }

    if (!isValidUUID(accountId)) {
      throw new ApiError(
        statusType.BAD_REQUEST,
        `Invalid account ID: ${accountId}`
      );
    }

    const debitCents = parseAmount(debit);
    const creditCents = parseAmount(credit);

    if (debitCents === null || creditCents === null) {
      throw new ApiError(
        statusType.BAD_REQUEST,
        "Debit and credit must be valid numbers with at most 2 decimal places."
      );
    }

    if (debitCents > 0n && creditCents > 0n) {
      throw new ApiError(
        statusType.BAD_REQUEST,
        "A ledger entry cannot have both debit and credit."
      );
    }

    if (debitCents === 0n && creditCents === 0n) {
      throw new ApiError(
        statusType.BAD_REQUEST,
        "A ledger entry must contain either a debit or a credit."
      );
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

  if (totalDebit !== totalCredit) {
    throw new ApiError(
      statusType.BAD_REQUEST,
      "Transaction is not balanced: total debit must equal total credit."
    );
  }

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
      organizationId: team.organizationId,

      OR: [
        {
          teamId: teamId,
        },
        {
          teamId: null,
        },
      ],
    },
    select: {
      id: true,
      teamId: true,
      accountType: true,
      name: true,
    },
  });

  if (accounts.length !== accountIds.length) {
    throw new ApiError(
      statusType.BAD_REQUEST,
      "One or more accounts do not belong to this team or organization."
    );
  }

  const transaction = await prisma.$transaction(async (tx) => {
    const newTransaction = await tx.transaction.create({
      data: {
        organizationId: team.organizationId,
        teamId,
        createdById: userId,
        transactionType,
        description: description || null,
        referenceId: referenceId || null,

        ledgerEntries: {
          create: normalizedEntries,
        },
      },
      include: {
        ledgerEntries: {
          include: {
            account: {
              select: {
                id: true,
                name: true,
                accountType: true,
                teamId: true,
              },
            },
          },
        },
      },
    });

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
  });

  return sendResponse(
    res,
    "success",
    transaction,
    "Transaction created successfully.",
    statusType.CREATED
  );
});

const getAllTransactions = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { orgId, teamId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const [team, teamMember] = await Promise.all([
      prisma.team.findFirst({ where: { id: teamId, organizationId: orgId }, select: { organizationId: true } }),
      getTeamMember(teamId, userId),
    ]);
    const organizationMembership = team
      ? await prisma.organizationMember.findUnique({
          where: { organizationId_userId: { organizationId: team.organizationId, userId } },
          select: { role: true },
        })
      : null;

    if (!team || (!teamMember && organizationMembership?.role !== "owner")) {
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

const getTransaction = async (req, res) => {
  try {
    const userId = getUserId(req);

    const { orgId, teamId, transactionId } =
      req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const team = await prisma.team.findFirst({ where: { id: teamId, organizationId: orgId }, select: { id: true } });
    if (!team) return res.status(404).json({ message: "Team not found" });

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

const getMyTransactions = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { orgId, teamId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const team = await prisma.team.findFirst({ where: { id: teamId, organizationId: orgId }, select: { id: true } });
    if (!team) return res.status(404).json({ message: "Team not found" });

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
