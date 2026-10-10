import prisma from "../prisma/client.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse, statusType } from "../utils/index.js";

const getUserId = (req) => req.user?.sub;

const findOwnedTeam = async (teamId, userId) => {
  if (!teamId) throw new ApiError(statusType.BAD_REQUEST, "Team ID is required.");
  const team = await prisma.team.findFirst({
    where: { id: teamId, createdById: userId },
    select: { id: true },
  });
  if (!team) throw new ApiError(statusType.FORBIDDEN, "Only the team creator can manage this budget.");
  return team;
};

const getBudget = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { teamId } = req.params;
  if (!userId) throw new ApiError(statusType.UNAUTHORIZED, "Unauthorized.");
  if (!teamId) throw new ApiError(statusType.BAD_REQUEST, "Team ID is required.");

  const teamMember = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { id: true },
  });
  if (!teamMember) throw new ApiError(statusType.FORBIDDEN, "You are not a member of this team.");

  const budget = await prisma.budget.findUnique({
    where: { teamId },
    select: { id: true, teamId: true, totalBudget: true, currency: true, createdAt: true, updatedAt: true },
  });
  if (!budget) throw new ApiError(statusType.NOT_FOUND, "Budget not found.");

  return sendResponse(res, "success", { budget }, "Budget fetched successfully.", statusType.OK);
});

const createBudget = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { teamId } = req.params;
  const { totalBudget, currency = "INR" } = req.body ?? {};
  if (!userId) throw new ApiError(statusType.UNAUTHORIZED, "Unauthorized.");
  await findOwnedTeam(teamId, userId);

  const amount = Number(totalBudget);
  if (totalBudget === undefined || !Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(statusType.BAD_REQUEST, "Total budget must be a positive number.");
  }
  if (typeof currency !== "string" || !/^[a-zA-Z]{3}$/.test(currency)) {
    throw new ApiError(statusType.BAD_REQUEST, "Currency must be a valid 3-letter code.");
  }
  if (await prisma.budget.findUnique({ where: { teamId }, select: { id: true } })) {
    throw new ApiError(statusType.CONFLICT, "Budget already exists for this team.");
  }

  const budget = await prisma.budget.create({
    data: { teamId, totalBudget: amount, currency: currency.toUpperCase() },
    select: { id: true, teamId: true, totalBudget: true, currency: true, createdAt: true, updatedAt: true },
  });
  return sendResponse(res, "success", { budget }, "Budget created successfully.", statusType.CREATED);
});

const updateBudget = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { teamId } = req.params;
  const { totalBudget, currency } = req.body ?? {};
  if (!userId) throw new ApiError(statusType.UNAUTHORIZED, "Unauthorized.");
  await findOwnedTeam(teamId, userId);

  const data = {};
  if (totalBudget !== undefined) {
    const amount = Number(totalBudget);
    if (!Number.isFinite(amount) || amount <= 0) throw new ApiError(statusType.BAD_REQUEST, "Total budget must be a positive number.");
    data.totalBudget = amount;
  }
  if (currency !== undefined) {
    if (typeof currency !== "string" || !/^[a-zA-Z]{3}$/.test(currency)) {
      throw new ApiError(statusType.BAD_REQUEST, "Currency must be a valid 3-letter code.");
    }
    data.currency = currency.toUpperCase();
  }
  if (Object.keys(data).length === 0) throw new ApiError(statusType.BAD_REQUEST, "Provide a budget amount or currency to update.");
  if (!(await prisma.budget.findUnique({ where: { teamId }, select: { id: true } }))) {
    throw new ApiError(statusType.NOT_FOUND, "Budget not found.");
  }

  const budget = await prisma.budget.update({
    where: { teamId },
    data,
    select: { id: true, teamId: true, totalBudget: true, currency: true, createdAt: true, updatedAt: true },
  });
  return sendResponse(res, "success", { budget }, "Budget updated successfully.", statusType.OK);
});

const deleteBudget = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { teamId } = req.params;
  if (!userId) throw new ApiError(statusType.UNAUTHORIZED, "Unauthorized.");
  await findOwnedTeam(teamId, userId);

  if (!(await prisma.budget.findUnique({ where: { teamId }, select: { id: true } }))) {
    throw new ApiError(statusType.NOT_FOUND, "Budget not found.");
  }
  await prisma.budget.delete({ where: { teamId } });
  return sendResponse(res, "success", null, "Budget deleted successfully.", statusType.OK);
});

const getRemainingBudget = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { teamId } = req.params;

  if (!userId) {
    throw new ApiError(
      statusType.UNAUTHORIZED,
      "Unauthorized."
    );
  }

  if (!teamId) {
    throw new ApiError(
      statusType.BAD_REQUEST,
      "Team ID is required."
    );
  }

  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
    select: {
      id: true,
      name: true,
      organizationId: true,

      budget: {
        select: {
          id: true,
          totalBudget: true,
          currency: true,
        },
      },
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
    },
  });

  const organizationOwner = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: team.organizationId,
        userId,
      },
    },
    select: { role: true },
  });

  if (!teamMember && organizationOwner?.role !== "owner") {
    throw new ApiError(
      statusType.FORBIDDEN,
      "You are not a member of this team."
    );
  }

  if (!team.budget) {
    throw new ApiError(
      statusType.NOT_FOUND,
      "Budget not found."
    );
  }

  const totals = await prisma.ledgerEntry.aggregate({
    where: {
      account: {
        organizationId: team.organizationId,
        teamId: team.id,
        accountType: "expense",
      },
    },

    _sum: {
      debit: true,
      credit: true,
    },
  });

  const totalDebit = Number(totals._sum.debit ?? 0);
  const totalCredit = Number(totals._sum.credit ?? 0);

  const spent = totalDebit - totalCredit;

  const budget = Number(team.budget.totalBudget);

  const remaining = budget - spent;

  return sendResponse(
    res,
    "success",
    {
      team: {
        id: team.id,
        name: team.name,
      },

      budget: {
        total: budget,
        currency: team.budget.currency,
      },

      spending: {
        spent,
      },

      remaining,
    },
    "Remaining budget fetched successfully.",
    statusType.OK
  );
});

export { createBudget, getBudget, updateBudget, deleteBudget,getRemainingBudget };
