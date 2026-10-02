/*
  Warnings:

  - You are about to drop the column `owner_user_id` on the `accounts` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_owner_user_id_fkey";

-- DropIndex
DROP INDEX "accounts_owner_user_id_idx";

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "owner_user_id";

-- CreateTable
CREATE TABLE "reimbursement_claims" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" VARCHAR(500),
    "status" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reimbursement_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reimbursement_claims_organization_id_idx" ON "reimbursement_claims"("organization_id");

-- CreateIndex
CREATE INDEX "reimbursement_claims_employee_id_idx" ON "reimbursement_claims"("employee_id");

-- CreateIndex
CREATE INDEX "reimbursement_claims_team_id_idx" ON "reimbursement_claims"("team_id");

-- CreateIndex
CREATE INDEX "reimbursement_claims_status_idx" ON "reimbursement_claims"("status");

-- AddForeignKey
ALTER TABLE "reimbursement_claims" ADD CONSTRAINT "reimbursement_claims_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursement_claims" ADD CONSTRAINT "reimbursement_claims_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursement_claims" ADD CONSTRAINT "reimbursement_claims_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
