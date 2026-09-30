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
} from "../controllers/orgs.controller.js";

import { checkAuth } from "../middleware/index.js";

const router = Router();


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


export default router;