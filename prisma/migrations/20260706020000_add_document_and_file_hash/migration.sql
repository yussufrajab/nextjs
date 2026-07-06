-- CreateTable: DocumentHash (employee document integrity, keyed by employeeId+fieldName)
CREATE TABLE "DocumentHash" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerified" TIMESTAMP(3),
    "uploadedBy" TEXT,

    CONSTRAINT "DocumentHash_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentHash_employeeId_fieldName_key" ON "DocumentHash"("employeeId", "fieldName");

-- CreateIndex
CREATE INDEX "DocumentHash_employeeId_idx" ON "DocumentHash"("employeeId");

-- CreateIndex
CREATE INDEX "DocumentHash_fieldName_idx" ON "DocumentHash"("fieldName");

-- CreateTable: FileHash (generic MinIO upload integrity, keyed by objectKey)
CREATE TABLE "FileHash" (
    "id" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerified" TIMESTAMP(3),
    "uploadedBy" TEXT,

    CONSTRAINT "FileHash_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FileHash_objectKey_key" ON "FileHash"("objectKey");