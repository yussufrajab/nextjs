-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "employeeId" TEXT,
    "institutionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeEntityId" TEXT,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "profileImageUrl" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "placeOfBirth" TEXT,
    "region" TEXT,
    "countryOfBirth" TEXT,
    "zanId" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "contactAddress" TEXT,
    "zssfNumber" TEXT,
    "payrollNumber" TEXT,
    "cadre" TEXT,
    "salaryScale" TEXT,
    "ministry" TEXT,
    "department" TEXT,
    "appointmentType" TEXT,
    "contractType" TEXT,
    "recentTitleDate" TIMESTAMP(3),
    "currentReportingOffice" TEXT,
    "currentWorkplace" TEXT,
    "employmentDate" TIMESTAMP(3),
    "confirmationDate" TIMESTAMP(3),
    "retirementDate" TIMESTAMP(3),
    "status" TEXT,
    "ardhilHaliUrl" TEXT,
    "confirmationLetterUrl" TEXT,
    "jobContractUrl" TEXT,
    "birthCertificateUrl" TEXT,
    "institutionId" TEXT NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeCertificate" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "employeeId" TEXT NOT NULL,

    CONSTRAINT "EmployeeCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfirmationRequest" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reviewStage" TEXT NOT NULL,
    "documents" TEXT[],
    "rejectionReason" TEXT,
    "employeeId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "decisionDate" TIMESTAMP(3),
    "commissionDecisionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfirmationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionRequest" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reviewStage" TEXT NOT NULL,
    "proposedCadre" TEXT NOT NULL,
    "promotionType" TEXT NOT NULL,
    "studiedOutsideCountry" BOOLEAN,
    "documents" TEXT[],
    "rejectionReason" TEXT,
    "employeeId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LwopRequest" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reviewStage" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "documents" TEXT[],
    "rejectionReason" TEXT,
    "employeeId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LwopRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadreChangeRequest" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reviewStage" TEXT NOT NULL,
    "newCadre" TEXT NOT NULL,
    "reason" TEXT,
    "studiedOutsideCountry" BOOLEAN,
    "documents" TEXT[],
    "rejectionReason" TEXT,
    "employeeId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadreChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetirementRequest" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reviewStage" TEXT NOT NULL,
    "retirementType" TEXT NOT NULL,
    "illnessDescription" TEXT,
    "proposedDate" TIMESTAMP(3) NOT NULL,
    "delayReason" TEXT,
    "documents" TEXT[],
    "rejectionReason" TEXT,
    "employeeId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetirementRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResignationRequest" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reviewStage" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "documents" TEXT[],
    "rejectionReason" TEXT,
    "employeeId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResignationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceExtensionRequest" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reviewStage" TEXT NOT NULL,
    "currentRetirementDate" TIMESTAMP(3) NOT NULL,
    "requestedExtensionPeriod" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "documents" TEXT[],
    "rejectionReason" TEXT,
    "employeeId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceExtensionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeparationRequest" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reviewStage" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "documents" TEXT[],
    "rejectionReason" TEXT,
    "employeeId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeparationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "complaintType" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "complainantPhoneNumber" TEXT NOT NULL,
    "nextOfKinPhoneNumber" TEXT NOT NULL,
    "attachments" TEXT[],
    "status" TEXT NOT NULL,
    "reviewStage" TEXT NOT NULL,
    "officerComments" TEXT,
    "internalNotes" TEXT,
    "rejectionReason" TEXT,
    "complainantId" TEXT NOT NULL,
    "assignedOfficerRole" TEXT NOT NULL,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_name_key" ON "Institution"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_zanId_key" ON "Employee"("zanId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCertificate" ADD CONSTRAINT "EmployeeCertificate_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfirmationRequest" ADD CONSTRAINT "ConfirmationRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfirmationRequest" ADD CONSTRAINT "ConfirmationRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfirmationRequest" ADD CONSTRAINT "ConfirmationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRequest" ADD CONSTRAINT "PromotionRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRequest" ADD CONSTRAINT "PromotionRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRequest" ADD CONSTRAINT "PromotionRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LwopRequest" ADD CONSTRAINT "LwopRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LwopRequest" ADD CONSTRAINT "LwopRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LwopRequest" ADD CONSTRAINT "LwopRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadreChangeRequest" ADD CONSTRAINT "CadreChangeRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadreChangeRequest" ADD CONSTRAINT "CadreChangeRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadreChangeRequest" ADD CONSTRAINT "CadreChangeRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetirementRequest" ADD CONSTRAINT "RetirementRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetirementRequest" ADD CONSTRAINT "RetirementRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetirementRequest" ADD CONSTRAINT "RetirementRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResignationRequest" ADD CONSTRAINT "ResignationRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResignationRequest" ADD CONSTRAINT "ResignationRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResignationRequest" ADD CONSTRAINT "ResignationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceExtensionRequest" ADD CONSTRAINT "ServiceExtensionRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceExtensionRequest" ADD CONSTRAINT "ServiceExtensionRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceExtensionRequest" ADD CONSTRAINT "ServiceExtensionRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeparationRequest" ADD CONSTRAINT "SeparationRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeparationRequest" ADD CONSTRAINT "SeparationRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeparationRequest" ADD CONSTRAINT "SeparationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_complainantId_fkey" FOREIGN KEY ("complainantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
