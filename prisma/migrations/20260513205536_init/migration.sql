-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "updatedAt" DATETIME NOT NULL,
    "apiKey" TEXT,
    "baseUrl" TEXT
);

-- CreateTable
CREATE TABLE "Pattern" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "analysisJson" TEXT NOT NULL
);
