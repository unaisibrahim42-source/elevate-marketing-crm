-- CreateTable
CREATE TABLE "Freelancer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "specialty" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "rateAmountPence" INTEGER,
    "rateType" TEXT,
    "availability" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT,
    "portfolioUrl" TEXT,
    "rating" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Freelancer_pkey" PRIMARY KEY ("id")
);

