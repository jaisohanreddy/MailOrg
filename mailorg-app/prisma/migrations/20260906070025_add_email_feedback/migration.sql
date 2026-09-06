-- CreateEnum
CREATE TYPE "EmailFeedbackDecision" AS ENUM ('IMPORTANT', 'NOT_IMPORTANT');

-- CreateTable
CREATE TABLE "EmailFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "decision" "EmailFeedbackDecision" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailFeedback_userId_messageId_key" ON "EmailFeedback"("userId", "messageId");

-- AddForeignKey
ALTER TABLE "EmailFeedback" ADD CONSTRAINT "EmailFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
