-- DropIndex
DROP INDEX "organizations_created_by_idx";

-- CreateIndex
CREATE INDEX "organizations_created_by_name_idx" ON "organizations"("created_by", "name");
