/*
  Warnings:

  - A unique constraint covering the columns `[created_by,name]` on the table `organizations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organization_id,name]` on the table `teams` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "organizations_created_by_name_idx";

-- CreateIndex
CREATE INDEX "organizations_created_by_idx" ON "organizations"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_created_by_name_key" ON "organizations"("created_by", "name");

-- CreateIndex
CREATE UNIQUE INDEX "teams_organization_id_name_key" ON "teams"("organization_id", "name");
