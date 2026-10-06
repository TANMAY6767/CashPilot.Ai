import { Router } from "express";

import {
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
  getFinancialCashFunds,
  addFunds
} from "../controllers/orgs.controller.js";

import { checkAuth } from "../middleware/index.js";

const router = Router();
router.get("/invitations/:token", getInvitationDetails);

// All organization routes require authentication
router.use(checkAuth);


// =========================================================
// ORGANIZATION
// =========================================================

// GET    /organizations
// POST   /organizations
router
  .route("/")
  .get(getAllOrgs)
  .post(createOrg);


// GET    /organizations/:orgId
// PATCH  /organizations/:orgId
// DELETE /organizations/:orgId
router
  .route("/:orgId")
  .get(getOrganization)
  .patch(updateOrganization)
  .delete(deleteOrganization);


// =========================================================
// ORGANIZATION MEMBERS
// =========================================================

// GET  /organizations/:orgId/members
// POST /organizations/:orgId/members
router
  .route("/:orgId/members")
  .get(getOrganizationMembers)
  .post(addOrganizationMember);


// PATCH /organizations/:orgId/members/:memberUserId
router
  .route("/:orgId/members/:memberUserId")
  .patch(updateOrganizationMemberRole)

  // DELETE /organizations/:orgId/members/:memberUserId
  .delete(removeOrganizationMember);

// POST /api/teams/:teamId/invitations
router.route("/:orgId/invitations")
  .post(sendOrgInvitationEmail);


// POST /api/invitations/:token/accept
router.route("/invitations/:token/accept")
  .post(acceptInvitation);

router.route("/:orgId/accounts")
  .get(getOrganizationAccounts);

router.route("/:orgId/addfunds")
  .post(addFunds);

router.route("/:orgId/getfunds")
  .get(getFinancialCashFunds);


export default router;