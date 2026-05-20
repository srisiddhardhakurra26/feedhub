-- DropColumn (SQLite 3.35+ supports DROP COLUMN)
ALTER TABLE "Item" DROP COLUMN "summary";

-- AddColumn
ALTER TABLE "Item" ADD COLUMN "category" TEXT;
ALTER TABLE "Item" ADD COLUMN "categoryScore" REAL;

-- CreateIndex
CREATE INDEX "Item_category_idx" ON "Item"("category");
