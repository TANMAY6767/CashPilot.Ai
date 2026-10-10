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
import { auditMutation } from "../services/auditLog.service.js";

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
  .post(auditMutation, createOrg);


// GET    /organizations/:orgId
// PATCH  /organizations/:orgId
// DELETE /organizations/:orgId
router
  .route("/:orgId")
  .get(getOrganization)
  .patch(auditMutation, updateOrganization)
  .delete(auditMutation, deleteOrganization);


// =========================================================
// ORGANIZATION MEMBERS
// =========================================================

// GET  /organizations/:orgId/members
// POST /organizations/:orgId/members
router
  .route("/:orgId/members")
  .get(getOrganizationMembers)
  .post(auditMutation, addOrganizationMember);


// PATCH /organizations/:orgId/members/:memberUserId
router
  .route("/:orgId/members/:memberUserId")
  .patch(auditMutation, updateOrganizationMemberRole)

  // DELETE /organizations/:orgId/members/:memberUserId
  .delete(auditMutation, removeOrganizationMember);

// POST /api/teams/:teamId/invitations
router.route("/:orgId/invitations")
  .post(auditMutation, sendOrgInvitationEmail);


// POST /api/invitations/:token/accept
router.route("/invitations/:token/accept")
  .post(auditMutation, acceptInvitation);

router.route("/:orgId/accounts")
  .get(getOrganizationAccounts);

router.route("/:orgId/addfunds")
  .post(auditMutation, addFunds);

router.route("/:orgId/getfunds")
  .get(getFinancialCashFunds);


export default router;
