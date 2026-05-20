-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "headlineItemId" TEXT,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "sourceCount" INTEGER NOT NULL DEFAULT 0,
    "firstSeenAt" DATETIME NOT NULL,
    "lastSeenAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- AlterTable: add embedding + storyId
ALTER TABLE "Item" ADD COLUMN "embedding" BLOB;
ALTER TABLE "Item" ADD COLUMN "storyId" TEXT REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Item_storyId_idx" ON "Item"("storyId");
CREATE INDEX "Story_lastSeenAt_idx" ON "Story"("lastSeenAt");
