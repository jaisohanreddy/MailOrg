-- CreateEnum
CREATE TYPE "PersonalizedImportance" AS ENUM ('IMPORTANT', 'NOT_IMPORTANT', 'UNCERTAIN');

-- CreateTable
CREATE TABLE "PersonalizedEmailAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "importance" "PersonalizedImportance" NOT NULL,
    "reason" TEXT NOT NULL,
    "contextUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalizedEmailAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonalizedEmailAnalysis_userId_messageId_key" ON "PersonalizedEmailAnalysis"("userId", "messageId");

-- AddForeignKey
ALTER TABLE "PersonalizedEmailAnalysis" ADD CONSTRAINT "PersonalizedEmailAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
