--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Ubuntu 16.9-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.9 (Ubuntu 16.9-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: CadreChangeRequest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."CadreChangeRequest" (
    id text NOT NULL,
    status text NOT NULL,
    "reviewStage" text NOT NULL,
    "newCadre" text NOT NULL,
    reason text,
    "studiedOutsideCountry" boolean,
    documents text[],
    "rejectionReason" text,
    "employeeId" text NOT NULL,
    "submittedById" text NOT NULL,
    "reviewedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CadreChangeRequest" OWNER TO postgres;

--
-- Name: Complaint; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Complaint" (
    id text NOT NULL,
    "complaintType" text NOT NULL,
    subject text NOT NULL,
    details text NOT NULL,
    "complainantPhoneNumber" text NOT NULL,
    "nextOfKinPhoneNumber" text NOT NULL,
    attachments text[],
    status text NOT NULL,
    "reviewStage" text NOT NULL,
    "officerComments" text,
    "internalNotes" text,
    "rejectionReason" text,
    "complainantId" text NOT NULL,
    "assignedOfficerRole" text NOT NULL,
    "reviewedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Complaint" OWNER TO postgres;

--
-- Name: ConfirmationRequest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ConfirmationRequest" (
    id text NOT NULL,
    status text NOT NULL,
    "reviewStage" text NOT NULL,
    documents text[],
    "rejectionReason" text,
    "employeeId" text NOT NULL,
    "submittedById" text NOT NULL,
    "reviewedById" text,
    "decisionDate" timestamp(3) without time zone,
    "commissionDecisionDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ConfirmationRequest" OWNER TO postgres;

--
-- Name: Employee; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Employee" (
    id text NOT NULL,
    "employeeEntityId" text,
    name text NOT NULL,
    gender text NOT NULL,
    "profileImageUrl" text,
    "dateOfBirth" timestamp(3) without time zone,
    "placeOfBirth" text,
    region text,
    "countryOfBirth" text,
    "zanId" text NOT NULL,
    "phoneNumber" text,
    "contactAddress" text,
    "zssfNumber" text,
    "payrollNumber" text,
    cadre text,
    "salaryScale" text,
    ministry text,
    department text,
    "appointmentType" text,
    "contractType" text,
    "recentTitleDate" timestamp(3) without time zone,
    "currentReportingOffice" text,
    "currentWorkplace" text,
    "employmentDate" timestamp(3) without time zone,
    "confirmationDate" timestamp(3) without time zone,
    "retirementDate" timestamp(3) without time zone,
    status text,
    "ardhilHaliUrl" text,
    "confirmationLetterUrl" text,
    "jobContractUrl" text,
    "birthCertificateUrl" text,
    "institutionId" text NOT NULL
);


ALTER TABLE public."Employee" OWNER TO postgres;

--
-- Name: EmployeeCertificate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EmployeeCertificate" (
    id text NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    url text,
    "employeeId" text NOT NULL
);


ALTER TABLE public."EmployeeCertificate" OWNER TO postgres;

--
-- Name: Institution; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Institution" (
    id text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public."Institution" OWNER TO postgres;

--
-- Name: LwopRequest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."LwopRequest" (
    id text NOT NULL,
    status text NOT NULL,
    "reviewStage" text NOT NULL,
    duration text NOT NULL,
    reason text NOT NULL,
    documents text[],
    "rejectionReason" text,
    "employeeId" text NOT NULL,
    "submittedById" text NOT NULL,
    "reviewedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."LwopRequest" OWNER TO postgres;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    message text NOT NULL,
    link text,
    "isRead" boolean DEFAULT false NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Notification" OWNER TO postgres;

--
-- Name: PromotionRequest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PromotionRequest" (
    id text NOT NULL,
    status text NOT NULL,
    "reviewStage" text NOT NULL,
    "proposedCadre" text NOT NULL,
    "promotionType" text NOT NULL,
    "studiedOutsideCountry" boolean,
    documents text[],
    "rejectionReason" text,
    "employeeId" text NOT NULL,
    "submittedById" text NOT NULL,
    "reviewedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PromotionRequest" OWNER TO postgres;

--
-- Name: ResignationRequest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ResignationRequest" (
    id text NOT NULL,
    status text NOT NULL,
    "reviewStage" text NOT NULL,
    "effectiveDate" timestamp(3) without time zone NOT NULL,
    reason text,
    documents text[],
    "rejectionReason" text,
    "employeeId" text NOT NULL,
    "submittedById" text NOT NULL,
    "reviewedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ResignationRequest" OWNER TO postgres;

--
-- Name: RetirementRequest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RetirementRequest" (
    id text NOT NULL,
    status text NOT NULL,
    "reviewStage" text NOT NULL,
    "retirementType" text NOT NULL,
    "illnessDescription" text,
    "proposedDate" timestamp(3) without time zone NOT NULL,
    "delayReason" text,
    documents text[],
    "rejectionReason" text,
    "employeeId" text NOT NULL,
    "submittedById" text NOT NULL,
    "reviewedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RetirementRequest" OWNER TO postgres;

--
-- Name: SeparationRequest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SeparationRequest" (
    id text NOT NULL,
    type text NOT NULL,
    status text NOT NULL,
    "reviewStage" text NOT NULL,
    reason text NOT NULL,
    documents text[],
    "rejectionReason" text,
    "employeeId" text NOT NULL,
    "submittedById" text NOT NULL,
    "reviewedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SeparationRequest" OWNER TO postgres;

--
-- Name: ServiceExtensionRequest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ServiceExtensionRequest" (
    id text NOT NULL,
    status text NOT NULL,
    "reviewStage" text NOT NULL,
    "currentRetirementDate" timestamp(3) without time zone NOT NULL,
    "requestedExtensionPeriod" text NOT NULL,
    justification text NOT NULL,
    documents text[],
    "rejectionReason" text,
    "employeeId" text NOT NULL,
    "submittedById" text NOT NULL,
    "reviewedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ServiceExtensionRequest" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    role text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "employeeId" text,
    "institutionId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: CadreChangeRequest CadreChangeRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CadreChangeRequest"
    ADD CONSTRAINT "CadreChangeRequest_pkey" PRIMARY KEY (id);


--
-- Name: Complaint Complaint_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Complaint"
    ADD CONSTRAINT "Complaint_pkey" PRIMARY KEY (id);


--
-- Name: ConfirmationRequest ConfirmationRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ConfirmationRequest"
    ADD CONSTRAINT "ConfirmationRequest_pkey" PRIMARY KEY (id);


--
-- Name: EmployeeCertificate EmployeeCertificate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EmployeeCertificate"
    ADD CONSTRAINT "EmployeeCertificate_pkey" PRIMARY KEY (id);


--
-- Name: Employee Employee_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_pkey" PRIMARY KEY (id);


--
-- Name: Institution Institution_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Institution"
    ADD CONSTRAINT "Institution_pkey" PRIMARY KEY (id);


--
-- Name: LwopRequest LwopRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LwopRequest"
    ADD CONSTRAINT "LwopRequest_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: PromotionRequest PromotionRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PromotionRequest"
    ADD CONSTRAINT "PromotionRequest_pkey" PRIMARY KEY (id);


--
-- Name: ResignationRequest ResignationRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ResignationRequest"
    ADD CONSTRAINT "ResignationRequest_pkey" PRIMARY KEY (id);


--
-- Name: RetirementRequest RetirementRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RetirementRequest"
    ADD CONSTRAINT "RetirementRequest_pkey" PRIMARY KEY (id);


--
-- Name: SeparationRequest SeparationRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SeparationRequest"
    ADD CONSTRAINT "SeparationRequest_pkey" PRIMARY KEY (id);


--
-- Name: ServiceExtensionRequest ServiceExtensionRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceExtensionRequest"
    ADD CONSTRAINT "ServiceExtensionRequest_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Employee_zanId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Employee_zanId_key" ON public."Employee" USING btree ("zanId");


--
-- Name: Institution_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Institution_name_key" ON public."Institution" USING btree (name);


--
-- Name: User_employeeId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_employeeId_key" ON public."User" USING btree ("employeeId");


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: CadreChangeRequest CadreChangeRequest_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CadreChangeRequest"
    ADD CONSTRAINT "CadreChangeRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CadreChangeRequest CadreChangeRequest_reviewedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CadreChangeRequest"
    ADD CONSTRAINT "CadreChangeRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CadreChangeRequest CadreChangeRequest_submittedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CadreChangeRequest"
    ADD CONSTRAINT "CadreChangeRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Complaint Complaint_complainantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Complaint"
    ADD CONSTRAINT "Complaint_complainantId_fkey" FOREIGN KEY ("complainantId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Complaint Complaint_reviewedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Complaint"
    ADD CONSTRAINT "Complaint_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ConfirmationRequest ConfirmationRequest_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ConfirmationRequest"
    ADD CONSTRAINT "ConfirmationRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ConfirmationRequest ConfirmationRequest_reviewedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ConfirmationRequest"
    ADD CONSTRAINT "ConfirmationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ConfirmationRequest ConfirmationRequest_submittedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ConfirmationRequest"
    ADD CONSTRAINT "ConfirmationRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeCertificate EmployeeCertificate_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EmployeeCertificate"
    ADD CONSTRAINT "EmployeeCertificate_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Employee Employee_institutionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES public."Institution"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LwopRequest LwopRequest_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LwopRequest"
    ADD CONSTRAINT "LwopRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LwopRequest LwopRequest_reviewedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LwopRequest"
    ADD CONSTRAINT "LwopRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LwopRequest LwopRequest_submittedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LwopRequest"
    ADD CONSTRAINT "LwopRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PromotionRequest PromotionRequest_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PromotionRequest"
    ADD CONSTRAINT "PromotionRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PromotionRequest PromotionRequest_reviewedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PromotionRequest"
    ADD CONSTRAINT "PromotionRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PromotionRequest PromotionRequest_submittedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PromotionRequest"
    ADD CONSTRAINT "PromotionRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ResignationRequest ResignationRequest_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ResignationRequest"
    ADD CONSTRAINT "ResignationRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ResignationRequest ResignationRequest_reviewedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ResignationRequest"
    ADD CONSTRAINT "ResignationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ResignationRequest ResignationRequest_submittedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ResignationRequest"
    ADD CONSTRAINT "ResignationRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RetirementRequest RetirementRequest_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RetirementRequest"
    ADD CONSTRAINT "RetirementRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RetirementRequest RetirementRequest_reviewedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RetirementRequest"
    ADD CONSTRAINT "RetirementRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RetirementRequest RetirementRequest_submittedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RetirementRequest"
    ADD CONSTRAINT "RetirementRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SeparationRequest SeparationRequest_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SeparationRequest"
    ADD CONSTRAINT "SeparationRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SeparationRequest SeparationRequest_reviewedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SeparationRequest"
    ADD CONSTRAINT "SeparationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SeparationRequest SeparationRequest_submittedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SeparationRequest"
    ADD CONSTRAINT "SeparationRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ServiceExtensionRequest ServiceExtensionRequest_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceExtensionRequest"
    ADD CONSTRAINT "ServiceExtensionRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ServiceExtensionRequest ServiceExtensionRequest_reviewedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceExtensionRequest"
    ADD CONSTRAINT "ServiceExtensionRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ServiceExtensionRequest ServiceExtensionRequest_submittedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceExtensionRequest"
    ADD CONSTRAINT "ServiceExtensionRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: User User_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: User User_institutionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES public."Institution"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

