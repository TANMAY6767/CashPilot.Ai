import prisma from "../prisma/client.js";

const getUserId = (req) => req.user?._id;


/* =========================================================
   1. GET CURRENT USER'S AUDIT LOGS
   ========================================================= */

const getMyAuditLogs = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    /*
      Pagination
      Example:
      /api/audit-logs?page=1&limit=20
    */

    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 20, 1),
      100
    );

    const skip = (page - 1) * limit;

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where: {
          userId,
        },

        orderBy: {
          createdAt: "desc",
        },

        skip,
        take: limit,

        select: {
          id: true,
          userId: true,
          entityType: true,
          entityId: true,
          action: true,
          oldValue: true,
          newValue: true,
          createdAt: true,

          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),

      prisma.auditLog.count({
        where: {
          userId,
        },
      }),
    ]);

    return res.status(200).json({
      message: "Audit logs fetched successfully",
      logs,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error("getMyAuditLogs:", error);

    return res.status(500).json({
      message: "Failed to fetch audit logs",
    });
  }
};


/* =========================================================
   2. GET AUDIT LOGS FOR ONE ENTITY
   ========================================================= */

/*
  Example:

  GET /api/audit-logs/organization/org-id
  GET /api/audit-logs/team/team-id
  GET /api/audit-logs/transaction/transaction-id

*/

const getEntityAuditLogs = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { entityType, entityId } = req.params;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!entityType || !entityId) {
      return res.status(400).json({
        message: "Entity type and entity ID are required",
      });
    }

    /*
      Allowed entity types.
      Add more as your application grows.
    */

    const allowedEntityTypes = [
      "organization",
      "team",
      "budget",
      "account",
      "transaction",
      "team_member",
      "organization_member",
    ];

    if (!allowedEntityTypes.includes(entityType)) {
      return res.status(400).json({
        message: "Invalid entity type",
      });
    }

    /*
      IMPORTANT:
      Before returning logs, verify the requester actually
      has access to the entity.

      We handle each entity separately because AuditLog has
      a generic entityType/entityId rather than relations.
    */

    let hasAccess = false;

    /* -----------------------------------------------------
       ORGANIZATION
       ----------------------------------------------------- */

    if (entityType === "organization") {
      const member =
        await prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: entityId,
              userId,
            },
          },
        });

      hasAccess = !!member;
    }


    /* -----------------------------------------------------
       TEAM
       ----------------------------------------------------- */

    else if (entityType === "team") {
      const teamMember =
        await prisma.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: entityId,
              userId,
            },
          },
        });

      hasAccess = !!teamMember;
    }


    /* -----------------------------------------------------
       BUDGET
       ----------------------------------------------------- */

    else if (entityType === "budget") {
      const budget =
        await prisma.budget.findUnique({
          where: {
            id: entityId,
          },

          select: {
            teamId: true,
          },
        });

      if (budget) {
        const teamMember =
          await prisma.teamMember.findUnique({
            where: {
              teamId_userId: {
                teamId: budget.teamId,
                userId,
              },
            },
          });

        hasAccess = !!teamMember;
      }
    }


    /* -----------------------------------------------------
       ACCOUNT
       ----------------------------------------------------- */

    else if (entityType === "account") {
      const account =
        await prisma.account.findUnique({
          where: {
            id: entityId,
          },

          select: {
            teamId: true,
          },
        });

      if (account) {
        const teamMember =
          await prisma.teamMember.findUnique({
            where: {
              teamId_userId: {
                teamId: account.teamId,
                userId,
              },
            },
          });

        hasAccess = !!teamMember;
      }
    }


    /* -----------------------------------------------------
       TRANSACTION
       ----------------------------------------------------- */

    else if (entityType === "transaction") {
      const transaction =
        await prisma.transaction.findUnique({
          where: {
            id: entityId,
          },

          select: {
            teamId: true,
          },
        });

      if (transaction) {
        const teamMember =
          await prisma.teamMember.findUnique({
            where: {
              teamId_userId: {
                teamId: transaction.teamId,
                userId,
              },
            },
          });

        hasAccess = !!teamMember;
      }
    }


    /* -----------------------------------------------------
       TEAM MEMBER
       ----------------------------------------------------- */

    else if (entityType === "team_member") {
      const member =
        await prisma.teamMember.findUnique({
          where: {
            id: entityId,
          },

          select: {
            teamId: true,
          },
        });

      if (member) {
        const teamMember =
          await prisma.teamMember.findUnique({
            where: {
              teamId_userId: {
                teamId: member.teamId,
                userId,
              },
            },
          });

        hasAccess = !!teamMember;
      }
    }


    /* -----------------------------------------------------
       ORGANIZATION MEMBER
       ----------------------------------------------------- */

    else if (entityType === "organization_member") {
      const member =
        await prisma.organizationMember.findUnique({
          where: {
            id: entityId,
          },

          select: {
            organizationId: true,
          },
        });

      if (member) {
        const orgMember =
          await prisma.organizationMember.findUnique({
            where: {
              organizationId_userId: {
                organizationId:
                  member.organizationId,
                userId,
              },
            },
          });

        hasAccess = !!orgMember;
      }
    }


    /* -----------------------------------------------------
       ACCESS DENIED
       ----------------------------------------------------- */

    if (!hasAccess) {
      return res.status(403).json({
        message: "You do not have access to this entity",
      });
    }

    const logs =
      await prisma.auditLog.findMany({
        where: {
          entityType,
          entityId,
        },

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          userId: true,
          entityType: true,
          entityId: true,
          action: true,
          oldValue: true,
          newValue: true,
          createdAt: true,

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
      message: "Entity audit logs fetched successfully",
      logs,
    });

  } catch (error) {
    console.error("getEntityAuditLogs:", error);

    return res.status(500).json({
      message: "Failed to fetch entity audit logs",
    });
  }
};


export {
  getMyAuditLogs,
  getEntityAuditLogs,
};