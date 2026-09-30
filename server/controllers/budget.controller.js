import prisma from "../prisma/client.js";

const getUserId = (req) => req.user?._id;


/* =========================================================
   CREATE BUDGET
   ========================================================= */

const createBudget = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { teamId } = req.params;
    const { totalBudget, currency = "INR" } = req.body;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!teamId || totalBudget === undefined) {
      return res.status(400).json({
        message: "Team ID and total budget are required",
      });
    }

    const amount = Number(totalBudget);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        message: "Total budget must be a positive number",
      });
    }

    if (
      typeof currency !== "string" ||
      currency.length !== 3
    ) {
      return res.status(400).json({
        message: "Currency must be a valid 3-letter code",
      });
    }

    /*
      Find the team and also verify that the
      logged-in user is the team creator.
    */

    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        createdById: userId,
      },
    });

    if (!team) {
      return res.status(403).json({
        message: "Only the team creator can manage the budget",
      });
    }

    /*
      A team can have only ONE budget because:
      teamId String @unique
    */

    const existingBudget = await prisma.budget.findUnique({
      where: {
        teamId,
      },
    });

    if (existingBudget) {
      return res.status(409).json({
        message: "Budget already exists for this team",
      });
    }

    const budget = await prisma.budget.create({
      data: {
        teamId,
        totalBudget: amount,
        currency: currency.toUpperCase(),
      },

      select: {
        id: true,
        teamId: true,
        totalBudget: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json({
      message: "Budget created successfully",
      budget,
    });

  } catch (error) {
    console.error("createBudget:", error);

    return res.status(500).json({
      message: "Failed to create budget",
    });
  }
};


/* =========================================================
   GET BUDGET
   ========================================================= */

const getBudget = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { teamId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    /*
      User must be a member of the team.
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

    const budget = await prisma.budget.findUnique({
      where: {
        teamId,
      },

      select: {
        id: true,
        teamId: true,
        totalBudget: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!budget) {
      return res.status(404).json({
        message: "Budget not found",
      });
    }

    return res.status(200).json({
      message: "Budget fetched successfully",
      budget,
    });

  } catch (error) {
    console.error("getBudget:", error);

    return res.status(500).json({
      message: "Failed to get budget",
    });
  }
};


/* =========================================================
   UPDATE BUDGET
   ========================================================= */

const updateBudget = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { teamId } = req.params;
    const { totalBudget, currency } = req.body;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    /*
      Only team creator can update budget.
    */

    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        createdById: userId,
      },
    });

    if (!team) {
      return res.status(403).json({
        message: "Only the team creator can update the budget",
      });
    }

    /*
      Make sure budget exists.
    */

    const existingBudget = await prisma.budget.findUnique({
      where: {
        teamId,
      },
    });

    if (!existingBudget) {
      return res.status(404).json({
        message: "Budget not found",
      });
    }

    /*
      Build update object only with fields
      actually provided.
    */

    const data = {};

    if (totalBudget !== undefined) {
      const amount = Number(totalBudget);

      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
          message: "Total budget must be a positive number",
        });
      }

      data.totalBudget = amount;
    }

    if (currency !== undefined) {
      if (
        typeof currency !== "string" ||
        currency.length !== 3
      ) {
        return res.status(400).json({
          message: "Currency must be a valid 3-letter code",
        });
      }

      data.currency = currency.toUpperCase();
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        message: "No fields provided for update",
      });
    }

    const budget = await prisma.budget.update({
      where: {
        teamId,
      },

      data,

      select: {
        id: true,
        teamId: true,
        totalBudget: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      message: "Budget updated successfully",
      budget,
    });

  } catch (error) {
    console.error("updateBudget:", error);

    return res.status(500).json({
      message: "Failed to update budget",
    });
  }
};


/* =========================================================
   DELETE BUDGET
   ========================================================= */

const deleteBudget = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { teamId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    /*
      Only team creator can delete budget.
    */

    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        createdById: userId,
      },
    });

    if (!team) {
      return res.status(403).json({
        message: "Only the team creator can delete the budget",
      });
    }

    const budget = await prisma.budget.findUnique({
      where: {
        teamId,
      },
    });

    if (!budget) {
      return res.status(404).json({
        message: "Budget not found",
      });
    }

    await prisma.budget.delete({
      where: {
        teamId,
      },
    });

    return res.status(200).json({
      message: "Budget deleted successfully",
    });

  } catch (error) {
    console.error("deleteBudget:", error);

    return res.status(500).json({
      message: "Failed to delete budget",
    });
  }
};


export {
  createBudget,
  getBudget,
  updateBudget,
  deleteBudget,
};