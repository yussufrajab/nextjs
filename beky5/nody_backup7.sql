--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5 (Ubuntu 17.5-1.pgdg22.04+1)
-- Dumped by pg_dump version 17.5 (Ubuntu 17.5-1.pgdg22.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


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
    name text NOT NULL,
    email text,
    "phoneNumber" text,
    "voteNumber" text
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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    "startDate" timestamp(3) without time zone
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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "commissionDecisionReason" text
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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "phoneNumber" text,
    email text
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Data for Name: CadreChangeRequest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."CadreChangeRequest" (id, status, "reviewStage", "newCadre", reason, "studiedOutsideCountry", documents, "rejectionReason", "employeeId", "submittedById", "reviewedById", "createdAt", "updatedAt") FROM stdin;
cmd08nei5001de6qk339xyxa5	UNDER_REVIEW	FINAL_APPROVAL	Administrative Officer	Department reorganization	f	{https://placehold.co/cadre-change-application.pdf,https://placehold.co/qualifications.pdf}	\N	emp9	cmd06nnbz000ve67wncnv4etg	\N	2025-05-01 12:45:09.293	2025-07-12 12:45:09.293
cmd08nei8001fe6qkx8hdjhoh	REJECTED	DIRECTOR_REVIEW	Education Officer	Professional development	t	{https://placehold.co/cadre-change-application.pdf,https://placehold.co/qualifications.pdf}	Insufficient qualifications for requested cadre	emp8	cmd06nnbx000te67ww4cbaug7	cmd06nnbq000ne67wwmiwxuo8	2025-04-26 12:45:09.296	2025-06-29 12:45:09.296
cmd08neia001he6qkgh2tplbv	APPROVED	HR_REVIEW	Senior Administrative Officer	Career advancement	f	{https://placehold.co/cadre-change-application.pdf,https://placehold.co/qualifications.pdf}	\N	emp9	cmd06nnbx000te67ww4cbaug7	cmd06nnbl000je67wtl28pk42	2025-04-06 12:45:09.298	2025-06-17 12:45:09.298
cmd08neic001je6qkomon6imt	APPROVED	COMMISSION_REVIEW	Senior Education Officer	Skills alignment	t	{https://placehold.co/cadre-change-application.pdf,https://placehold.co/qualifications.pdf}	\N	emp9	cmd06nnbz000ve67wncnv4etg	\N	2025-03-30 12:45:09.3	2025-06-16 12:45:09.3
cmd08neie001le6qkxgss8taj	UNDER_REVIEW	FINAL_APPROVAL	Education Officer	Career advancement	t	{https://placehold.co/cadre-change-application.pdf,https://placehold.co/qualifications.pdf}	\N	emp1	cmd06nnbx000te67ww4cbaug7	cmd06nnbq000ne67wwmiwxuo8	2025-03-27 12:45:09.302	2025-06-19 12:45:09.302
cmd1kypbu0001e6gc7v2yod78	Pending HRMO Review	initial	Afisa Mkuu Daraja la III	kuna uhitaji katika taasisi yetu	f	{"Letter of Request",Certificate}	\N	emp_003	cmd06nnbn000le67wtg41s3su	\N	2025-07-13 11:17:38.106	2025-07-13 11:17:38.106
cmd1let7s0003e6gciwpw9wci	Pending HRMO Review	initial	Afisa Muandamizi Daraja la III	kuna uhitaji mkubwa awa kada hiyo	f	{"Letter of Request",Certificate}	\N	emp_006	cmd06nnbn000le67wtg41s3su	\N	2025-07-13 11:30:09.64	2025-07-13 11:30:09.64
cmd4cgkw50003e6tcho3qmk5z	Approved by Commission	completed	Afisa Mkuu Daraja la III	kuna uhitaji wa kada hii	t	{"Letter of Request",Certificate,"TCU Form"}	\N	emp_003	cmd06nnbn000le67wtg41s3su	cmd06nnbb000be67wwgil78yv	2025-07-15 09:42:54.149	2025-07-15 09:52:42.164
cmd8ff1ij001v2bgt7gt9uriy	Rejected by HRMO - Awaiting HRO Correction	initial	Afisa Sheria	Amesoma kada ya Sheria	f	{"Letter of Request",Certificate}	kada anayoombewa sio sahihi kwa m ujibu wa muundo	emp_020	cmd06nnbl000je67wtl28pk42	cmd06nnbb000be67wwgil78yv	2025-07-18 06:16:45.931	2025-07-18 07:13:04.032
cmd8g3r1e001z2bgtrs7sw3pb	Rejected by Commission	completed	Afisa Rasilimali watu	Kuongeza Elimu	f	{"Letter of Request",Certificate}	\N	emp_003	cmd06nnbn000le67wtg41s3su	cmd06nnbb000be67wwgil78yv	2025-07-18 06:35:58.754	2025-07-18 07:29:59.393
cmd8fguow001x2bgtsbqxtl0i	Approved by Commission	completed	Afisa Ushauri nasaha	ana uzoefu wa kazi hii	f	{"Letter of Request",Certificate}	\N	emp_022	cmd06nnbl000je67wtl28pk42	cmd06nnbb000be67wwgil78yv	2025-07-18 06:18:10.399	2025-07-18 07:30:23.409
cmd1n5ay70001e6m4psaifpsy	Request Received – Awaiting Commission Decision	commission_review	Afisa Mkuu Msaidizi	kuna uhitaji	f	{"Letter of Request",Certificate}	\N	emp_004	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-13 12:18:45.295	2025-07-19 11:43:34.154
cmddezsds000fe67keau7xecg	Pending HRMO/HHRMD Review	initial	Mkurugenzi Fedha	kuna uhitaji	f	{"Letter of Request",Certificate}	\N	ofisi_emp_002	cmd06nnbn000le67wtg41s3su	\N	2025-07-21 18:03:45.101	2025-07-21 18:03:45.101
cmdgpzshb0003e6lwjr42jude	Pending HRMO/HHRMD Review	initial	Afisa Mkuu Daraja la III	sawa	f	{"Letter of Request",Certificate}	\N	ofisi_emp_010	cmd06nnbn000le67wtg41s3su	\N	2025-07-24 01:34:59.567	2025-07-24 01:34:59.567
cmdgyhlfk0003e6xo8eoongn9	Pending HRMO/HHRMD Review	initial	Afisa Mkuu Daraja la III	asad	f	{"Letter of Request",Certificate}	\N	ofisi_emp_010	cmd06nnbn000le67wtg41s3su	\N	2025-07-24 05:32:47.168	2025-07-24 05:32:47.168
cmdh1h5n60001e6l82wqx1ixc	Pending HRMO/HHRMD Review	initial	Afisa Mkuu Msaidizi	sawa	f	{"Letter of Request",Certificate}	\N	ofisi_emp_010	cmd06nnbn000le67wtg41s3su	\N	2025-07-24 06:56:25.554	2025-07-24 06:56:25.554
cmdh5yb690003e6l8fgy3hiww	Pending HRMO/HHRMD Review	initial	Mkurugenzi Fedha	sawa	f	{cadre-change/20250724_120140_77c69689.pdf,cadre-change/20250724_120117_b0bd4df8.pdf}	\N	ofisi_emp_007	cmd06nnbn000le67wtg41s3su	\N	2025-07-24 09:01:44.337	2025-07-24 09:01:44.337
cmdhlyo9w0005e6l8e9fwu1mv	Pending HRMO/HHRMD Review	initial	Afisa Muandamizi Daraja la III	uko	f	{cadre-change/20250724_192949_05acec6d.pdf,cadre-change/20250724_192940_0b9845dd.pdf}	\N	emp_001	cmd06nnbn000le67wtg41s3su	\N	2025-07-24 16:29:55.172	2025-07-24 16:29:55.172
cmdhnxtz10001e65kllyx7hls	Pending HRMO/HHRMD Review	initial	Afisa Muandamizi Daraja la III	ok	f	{cadre-change/20250724_202508_04e771ff.pdf,cadre-change/20250724_202502_21fe0473.pdf}	\N	ofisi_emp_005	cmd06nnbn000le67wtg41s3su	\N	2025-07-24 17:25:15.133	2025-07-24 17:25:15.133
cmdhpvde10005e65khs2oa9eh	Pending HRMO/HHRMD Review	initial	Afisa Muandamizi Daraja la III	saws	t	{cadre-change/20250724_211841_06cb2016.pdf,cadre-change/20250724_211826_e8400882.pdf,cadre-change/20250724_211832_cba57e7a.pdf}	\N	emp_004	cmd06nnbn000le67wtg41s3su	\N	2025-07-24 18:19:19.561	2025-07-24 18:19:19.561
cmdhq3c2a0007e65khcj3tsel	Pending HRMO/HHRMD Review	initial	Mkurugenzi Fedha	sawa	f	{cadre-change/20250724_212523_a08541c4.pdf,cadre-change/20250724_212519_f1a65b2d.pdf}	\N	ofisi_emp_005	cmd06nnbn000le67wtg41s3su	\N	2025-07-24 18:25:31.09	2025-07-24 18:25:31.09
cmdhr2db40009e65koqoagmov	Pending HRMO/HHRMD Review	initial	Afisa Mkuu Daraja la III	sawaa	f	{cadre-change/20250724_215243_a5387445.pdf,cadre-change/20250724_215239_bcef3d4f.pdf}	\N	ofisi_emp_010	cmd06nnbn000le67wtg41s3su	\N	2025-07-24 18:52:45.665	2025-07-24 18:52:45.665
cmdiej2sm0009e6rw7f5klo4v	Pending HRMO/HHRMD Review	initial	Mkurugenzi Fedha	sae	f	{cadre-change/20250725_084929_c76d1a21.pdf,cadre-change/20250725_084925_df88587b.pdf}	\N	ofisi_emp_005	cmd06nnbn000le67wtg41s3su	\N	2025-07-25 05:49:36.357	2025-07-25 05:49:36.357
cmdiekyka000be6rw50hjw9nn	Pending HRMO/HHRMD Review	initial	Afisa Mkuu Daraja la III	fgffdz	f	{cadre-change/20250725_085101_a60b988b.pdf,cadre-change/20250725_085057_9ada7b57.pdf}	\N	ofisi_emp_005	cmd06nnbn000le67wtg41s3su	\N	2025-07-25 05:51:04.186	2025-07-25 05:51:04.186
cmdiu4kuw000fe6z0voji1fo7	Pending HRMO/HHRMD Review	initial	Afisa Mkuu Daraja la III	ddf dfdsfdf	f	{cadre-change/20250725_160611_81b8b571.pdf,cadre-change/20250725_160605_2ed71ba1.pdf}	\N	ofisi_emp_005	cmd06nnbn000le67wtg41s3su	\N	2025-07-25 13:06:13.784	2025-07-25 13:06:13.784
cmdye0kuj00092b41kmfbhlh7	Rejected by Commission - Request Concluded	completed	Afisa Sera na utafiti	kuna uhitaji	t	{cadre-change/1754389280345_ytqs0o_ripoti_ya_likizo_bila_malipo_report.pdf,cadre-change/1754389273559_sw9j83_ripoti_ya_kustaafu_kwa_ugonjwa_report.pdf,cadre-change/1754389276033_twmjuj_ripoti_ya_likizo_bila_malipo_report.pdf}	\N	ofisi_emp_006	cmd06nnbn000le67wtg41s3su	cmd06nnbb000be67wwgil78yv	2025-08-05 10:19:32.108	2025-08-05 10:22:09.334
cmdye5x6y000b2b41ebhw25xi	Approved by Commission	completed	Afisa Sera	elimu	f	{cadre-change/1754389415435_kl8d9w_1754384852415_9af7qo_ripoti_ya_kustaafu_kwa_ugonjwa_report.pdf,cadre-change/1754389414382_m3vk3q_ya_kuacha_kazi_report.pdf}	\N	ofisi_emp_006	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-05 10:23:41.385	2025-08-05 10:24:23.231
cmdytwwym00052b7kxmkjav8s	Pending HRMO/HHRMD Review	initial	Mkurugenzi Fedha	kuna uhitaji	f	{cadre-change/1754415867992_zfj0wb_mfano.pdf,cadre-change/1754415863489_0zq8y5_Employee_Profile_Analysis.pdf}	\N	emp_003	cmd06nnbn000le67wtg41s3su	\N	2025-08-05 17:44:35.039	2025-08-05 17:44:35.039
cmdztvkh700012bl1x6btjdbq	Pending HRMO/HHRMD Review	initial	Afisa Mkuu Daraja la III	kuna uhitaji	f	{cadre-change/1754476276442_45v9jg_Employee_Profile_Analysis.pdf,cadre-change/1754476270993_w4w3xb_cheti.pdf}	\N	ofisi_emp_002	cmd06nnbn000le67wtg41s3su	\N	2025-08-06 10:31:18.379	2025-08-06 10:31:18.379
cme4jwedg000n2btj1wv22elu	Approved by Commission	completed	Afisa Muandamizi Daraja la III	kuna uhitaji	f	{cadre-change/1754761847439_3dirvq_1754324616644_6r2ulr_cheti.pdf,cadre-change/1754761842809_l4grgk_mfano.pdf}	\N	cme45oe31000l2bfw2kzug3tj	cme471pqo00032bidhttxmboj	cmd059ir10002e6d86l802ljc	2025-08-09 17:50:51.844	2025-08-10 13:09:08.696
cme6lvfai000f2bgxqbuumzb2	Pending HRMO/HHRMD Review	initial	Afisa Utawala daraja la I	kuna uhitaji	f	{cadre-change/1754886090525_lkopf9_20250802_094101_02331ce1.pdf,cadre-change/1754886087489_qktbxp_1754407554728_bj7hik_sababu.pdf}	\N	cme571jn200003emp008	cme577oj300022bcqm9dhpzy8	\N	2025-08-11 04:21:37.962	2025-08-11 04:21:37.962
\.


--
-- Data for Name: Complaint; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Complaint" (id, "complaintType", subject, details, "complainantPhoneNumber", "nextOfKinPhoneNumber", attachments, status, "reviewStage", "officerComments", "internalNotes", "rejectionReason", "complainantId", "assignedOfficerRole", "reviewedById", "createdAt", "updatedAt") FROM stdin;
cmd08nejb002be6qkujkym70h	Discrimination	Formal complaint regarding unfair treatment	This is a detailed description of the complaint. The complainant has experienced issues related to discrimination and is seeking appropriate action and resolution. The incident occurred during regular working hours and has affected the complainant's work environment and productivity.	0777-123009	0778-542236	{https://placehold.co/complaint-evidence.pdf,https://placehold.co/witness-statement.pdf}	REJECTED	INITIAL	\N	\N	Insufficient evidence to proceed with investigation	cmd06nnbu000re67wdeax0fwp	HHRMD	\N	2025-04-15 12:45:09.335	2025-06-25 12:45:09.335
cmd08neje002de6qkxls1avnb	Discrimination	Formal complaint regarding workplace harassment	This is a detailed description of the complaint. The complainant has experienced issues related to discrimination and is seeking appropriate action and resolution. The incident occurred during regular working hours and has affected the complainant's work environment and productivity.	0777-447638	0778-440913	{https://placehold.co/complaint-evidence.pdf,https://placehold.co/witness-statement.pdf}	REJECTED	INITIAL	\N	\N	Insufficient evidence to proceed with investigation	cmd06nnbz000ve67wncnv4etg	HRO	\N	2025-04-10 12:45:09.337	2025-07-06 12:45:09.337
cmd08nejg002fe6qk4oeqxes0	Service delivery	Formal complaint regarding policy violation	This is a detailed description of the complaint. The complainant has experienced issues related to unfair treatment and is seeking appropriate action and resolution. The incident occurred during regular working hours and has affected the complainant's work environment and productivity.	0777-914298	0778-993027	{https://placehold.co/complaint-evidence.pdf,https://placehold.co/witness-statement.pdf}	PENDING	HR_REVIEW	Initial review completed. Further investigation required.	Case assigned to investigating officer. Priority: Medium	\N	cmd06nnbu000re67wdeax0fwp	DO	cmd059ir10002e6d86l802ljc	2025-05-22 12:45:09.339	2025-06-24 12:45:09.339
cmd08neji002he6qk9n7hlyxz	Discrimination	Formal complaint regarding unfair treatment	This is a detailed description of the complaint. The complainant has experienced issues related to workplace harassment and is seeking appropriate action and resolution. The incident occurred during regular working hours and has affected the complainant's work environment and productivity.	0777-276616	0778-891037	{https://placehold.co/complaint-evidence.pdf,https://placehold.co/witness-statement.pdf}	PENDING	HR_REVIEW	Initial review completed. Further investigation required.	Case assigned to investigating officer. Priority: Medium	\N	cmd06nnbz000ve67wncnv4etg	HRO	cmd059ir10002e6d86l802ljc	2025-04-19 12:45:09.341	2025-07-12 12:45:09.341
cmd08nejk002je6qk8iqc25p7	Policy violation	Formal complaint regarding service delivery	This is a detailed description of the complaint. The complainant has experienced issues related to unfair treatment and is seeking appropriate action and resolution. The incident occurred during regular working hours and has affected the complainant's work environment and productivity.	0777-344690	0778-919508	{https://placehold.co/complaint-evidence.pdf,https://placehold.co/witness-statement.pdf}	REJECTED	INITIAL	Initial review completed. Further investigation required.	Case assigned to investigating officer. Priority: Medium	Insufficient evidence to proceed with investigation	cmd06nnbx000te67ww4cbaug7	HRO	cmd06nnbl000je67wtl28pk42	2025-05-20 12:45:09.343	2025-07-07 12:45:09.343
cmd08nejm002le6qkwxipk10f	Service delivery	Formal complaint regarding service delivery	This is a detailed description of the complaint. The complainant has experienced issues related to service delivery and is seeking appropriate action and resolution. The incident occurred during regular working hours and has affected the complainant's work environment and productivity.	0777-573004	0778-455709	{https://placehold.co/complaint-evidence.pdf,https://placehold.co/witness-statement.pdf}	APPROVED	DIRECTOR_REVIEW	\N	\N	\N	cmd06nnbu000re67wdeax0fwp	HHRMD	\N	2025-04-10 12:45:09.346	2025-07-12 12:45:09.346
cmd08nejo002ne6qkhr5ts0kd	Workplace harassment	Formal complaint regarding service delivery	This is a detailed description of the complaint. The complainant has experienced issues related to service delivery and is seeking appropriate action and resolution. The incident occurred during regular working hours and has affected the complainant's work environment and productivity.	0777-588006	0778-749376	{https://placehold.co/complaint-evidence.pdf,https://placehold.co/witness-statement.pdf}	UNDER_REVIEW	COMMISSION_REVIEW	\N	\N	\N	cmd06nnbz000ve67wncnv4etg	DO	\N	2025-04-17 12:45:09.348	2025-07-12 12:45:09.348
cmd5ttn0k00012bgtx88086m3	Kuchelewa Kupandishwa Cheo	Kutopandishwa Daraja	daraja tangu 2010 mwaka wa ajira 	776084853	776084853	{}	Rejected by HHRMD - Awaiting HRO/Submitter Action	initial	\N	\N	hujaweka wizara unayotoka	cmd5a9ybm00052bt65vf6eel7	DO	cmd059ir10002e6d86l802ljc	2025-07-16 10:36:43.076	2025-07-16 10:38:44.526
cmd5tycdi00052bgtns81i09b	Kuchelewa Kuthibitishwa	Kutopandishwa daraja	Mwaka wa ajira 2010 .	987654321	123456789	{"Test doc confirmation.pdf"}	Closed - Satisfied	completed	barua\\n\\n--- Additional Information from Employee ---\\nsawa	\N	\N	cmd5a9ybm00052bt65vf6eel7	HHRMD	cmd059ir10002e6d86l802ljc	2025-07-16 10:40:22.566	2025-07-16 10:43:54.467
cmd5u40af000f2bgt0jcwwxoa	Mengineyo	Kazini	mmmmmmmmmmmmmmm bbbbbbbbbbb	987654321	912345678	{}	Resolved - Rejected by Commission	completed	\N	\N	\N	cmd5a9ybm00052bt65vf6eel7	DO	cmd059ir10002e6d86l802ljc	2025-07-16 10:44:46.839	2025-07-16 10:46:10.672
cmd5u7o5l000n2bgt1mln14st	Mengineyo	zxzcxcvc 	wwwwwwwwww bbbbbbb mmmmmmmmm nnnnnnnn	987654321	123456789	{}	Resolved - Approved by Commission	completed	\N	\N	\N	cmd5a9ybm00052bt65vf6eel7	DO	cmd059ir10002e6d86l802ljc	2025-07-16 10:47:37.736	2025-07-16 10:50:27.889
cmd763ezv000x2bgtyjs41zx8	Ubaguzi	Ubaguzi	ubaguzi katika maeneo ya kazi unaendelea	987654321	123456789	{}	Rejected by DO - Awaiting HRO/Submitter Action	initial	\N	\N	naomba uthibitisho wa ubaguzi	cmd5a9ybm00052bt65vf6eel7	DO	cmd06nnbd000de67wb6e6ild5	2025-07-17 09:08:00.81	2025-07-17 09:11:26.244
cmd5g3k3200032btwu6pqqk97	Usalama Mahali Kwa Ajira	tunafanya kazi katika mazingira hatarishi	tunafanya kazi katika mazingira hatarishi.  tunaomba kupatiwa posho la mazingira magumu	776932849	777348920	{}	Awaiting More Information	completed	eleza kwa ufupi/ gdyghvjvjhvjb  khkjh h 	\N	\N	cmd5a9yrw007j2bt6jshonn46	DO	cmd06nnbd000de67wb6e6ild5	2025-07-16 04:12:31.213	2025-07-22 20:33:47.676
cmd7682ts00112bgta2iajjnr	Uamuzi Usio wa Haki	uamuzi	ddddfd ghgfhnh gfbhghg gfhhghg	987654321	123456789	{}	Resolved - Rejected by Commission	completed	\N	\N	\N	cmd5a9ybm00052bt65vf6eel7	DO	cmd06nnbd000de67wb6e6ild5	2025-07-17 09:11:38.321	2025-07-17 10:29:16.378
cmd76i5ap001n2bgtids8lcju	Mengineyo	qweqeqwerw	sdfsgfdgdf fdghfhjgh gfhgfcjghm gfhfghjgfj	987654432	198765432	{}	Closed - Satisfied	completed	Tutawasiliana na wizara yako kwa hatuwa za kupewa stahiki zako.	\N	\N	cmd5a9ybm00052bt65vf6eel7	DO	cmd06nnbd000de67wb6e6ild5	2025-07-17 09:19:28.081	2025-07-17 11:06:45.116
cmdewls7j000be6jogik5ye5j	Kuchelewa Kuthibitishwa	kuchelewa kuthibitishwa kazi	Tumefanya kazi kwa muda mrefu lakini hadi sasa hatujathibitishwa kazini.	773412554	777348920	{cheti.pdf}	Awaiting Commission Review	commission_review	eleze\\n\\n--- Additional Information from Employee ---\\nsawa\\nilikuwa ni jioni sana\\nhatujawahi kurudi mapema kazini . kila siku tunarudi usiku wa manane. 	kwa urefu	\N	cmd5a9yee001h2bt6fubd8gt2	HHRMD	cmd059ir10002e6d86l802ljc	2025-07-22 19:04:30.954	2025-07-22 19:32:58.109
cmd76eto700132bgtoyk4ul4v	Uongozi Mbaya	uongozi	ffsdgdh hgjhugjuy tyrhytjuyt ghthty yrtrhyur	987654321	123456789	{}	Resolved - Pending Employee Confirmation	completed	limewekwa sawa	\N	\N	cmd5a9ybm00052bt65vf6eel7	DO	cmd06nnbd000de67wb6e6ild5	2025-07-17 09:16:53.046	2025-07-22 19:45:36.895
cmd5vhkig000v2bgtwfu906dn	Kuchelewa Kupandishwa Cheo	nimekosa kupandishwa cheo kwa miaka mingi	Ninalalamika kutokana na kutopandishwa cheo tangu kuajiriwa kwangu. Nina sifa na vigezo vinavyohitajika kwa kupandishwa cheo. Hata hivyo, ninaamini kuwa upandishaji wa vyeo katika ofisi yetu unafanyika kwa upendeleo na si kwa kuzingatia sifa.	776543289	655543096	{cheti.pdf}	Rejected by DO - Awaiting HRO/Submitter Action	initial	\N	\N	sheria ndio zipo hivyo. hupaswi kulalamika	cmd06nnbx000te67ww4cbaug7	DO	cmd06nnbd000de67wb6e6ild5	2025-07-16 11:23:19.191	2025-07-22 20:06:42.816
cmdezmtfq000be6ec9mmibz0x	Usalama Mahali Kwa Ajira	tunafanya kazi katika mazingira hatarishi	hatari kazini. tuna shida kwa kweli	655412490	777348967	{}	Closed - Commission Decision (Resolved)	final_decision	tume imepokea lalamiko. na hatua imechukuliwa	\N	\N	cmd06nnbx000te67ww4cbaug7	DO	cmd059ir10002e6d86l802ljc	2025-07-22 20:29:18.086	2025-07-22 21:13:45.427
cmdf19xge000je6ecwttkug2j	Uamuzi Usio wa Haki	sijapata haki zangu za msingi	Nimepotezwa na kuachwa. Hii ni hatari.	655412490	777348920	{"Barua ya Lalamiko: sababu.pdf","Ushahidi: Employee Profile Analysis.pdf"}	Rejected by HHRMD – Waiting submitter reaction	initial	\N	\N	sivyo	cmd06nnbx000te67ww4cbaug7	DO	cmd059ir10002e6d86l802ljc	2025-07-22 21:15:15.998	2025-08-08 19:17:28.499
cmd5fsvuz00012btwexkeboan	Uamuzi Usio wa Haki	sijapata haki zangu za msingi	malipo hayajatimia. tumefanya kazi kubwa na malipo yakawa madogo. tunaomba tuwekewe njia imara ya kupata haki zetu.	773412490	777348967	{sababu.pdf}	Closed - Commission Decision (Resolved)	final_decision	litakubaliwa	\N	\N	cmd5a9yrw007j2bt6jshonn46	DO	cmd059ir10002e6d86l802ljc	2025-07-16 04:04:13.258	2025-08-08 19:18:14.326
cme35g8ll00012bask6u8wow6	Uongozi Mbaya	tunafanya kazi katika mazingira hatarishi	Naandika barua hii kuwasilisha malalamiko rasmi kuhusu mazingira ya kazi yanayoathiri utendaji wangu. Katika wiki mbili zilizopita, nimekumbana na changamoto zifuatazo: (1) Ukosefu wa vifaa vya kazi kama vile kompyuta na vifaa vya ulinzi. (2) Kutendewa vibaya na msimamizi wangu wa moja kwa moja. (3) Kelele na usumbufu wa mara kwa mara ofisini. Naomba ofisi yako iingilie kati ili kutatua hali hii. Niko tayari kushiriki katika mazungumzo yoyote ili kufikia suluhu.	0776932849	0777348967	{complaints/1754676807327_mfbgv3_ripoti_ya_kupandishwa_cheo_report__2_.pdf,complaints/1754676816389_mjk326_request_status_report_report.pdf}	Mtumishi ameridhika na hatua	completed	toa maelezo ya ziada kuhusu manyanyaso unayopata\n\n--- Additional Information from Employee ---\nsawa. nimeteseka sana\nusiku na mchana\nkazi hiyo hiyo moja		\N	cmd06nnbz000ve67wncnv4etg	HHRMD	cmd059ir10002e6d86l802ljc	2025-08-08 18:18:37.06	2025-08-08 18:48:51.403
cme38279300052bj1k2cnqxwa	Uamuzi Usio wa Haki	sijapata haki zangu za msingi	Nimefanyiwa ukiukwaji wa haki kwa kutopewa stahiki zangu. Nilipandishwa cheo miaka mitatu iliyopita lakini hadi sasa sijapokea stahiki za cheo hicho. Naomba msaada ili nipate haki zangu za msingi. Kwa sasa sijiendi kazini kwa kukosa fursa.	0655412490	0777348920	{complaints/1754681437035_ls5rt2_1754324616644_6r2ulr_cheti__1_.pdf,complaints/1754681442803_cbtyp4_cheti.pdf}	Closed - Commission Decision (Resolved)	final_decision	hakuna habari hiyo hapa  mjini	\N	\N	cmd5a9yci000l2bt67nmav3dd	DO	cmd059ir10002e6d86l802ljc	2025-08-08 19:31:40.982	2025-08-08 20:32:09.956
cme3d3xm100012b5rpgaa9m35	Ubaguzi	nimebaguliwa kazini	naomba kutoa maelezo ya ubaguzi	0655412432	0772987609	{complaints/1754689972071_wfdsxa_cheti.pdf,complaints/1754689975556_r3z81f_1754324616644_6r2ulr_cheti__1_.pdf}	Mtumishi ameridhika na hatua	completed	elezea zaidi kuhusu ubaguzi huo\n\n--- Additional Information from Employee ---\nnimeitwa majina mabaya.  nimedharauliwa\n\ntatizo lako tumelipokea. tunafanyia uchunguzi		\N	cmd5a9yci000l2bt67nmav3dd	HHRMD	cmd059ir10002e6d86l802ljc	2025-08-08 21:52:59.88	2025-08-08 21:56:32.656
\.


--
-- Data for Name: ConfirmationRequest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ConfirmationRequest" (id, status, "reviewStage", documents, "rejectionReason", "employeeId", "submittedById", "reviewedById", "decisionDate", "commissionDecisionDate", "createdAt", "updatedAt") FROM stdin;
cmd08nef80001e6qk110e80y6	REJECTED	HR_REVIEW	{https://placehold.co/confirmation-letter.pdf,https://placehold.co/performance-report.pdf}	Insufficient documentation provided	emp8	cmd06nnbz000ve67wncnv4etg	cmd06nnbs000pe67woh62ey8r	2025-06-27 12:45:09.187	\N	2025-05-13 12:45:09.187	2025-07-01 12:45:09.187
cmd08neg50003e6qkxgzynfcq	APPROVED	COMMISSION_REVIEW	{https://placehold.co/confirmation-letter.pdf,https://placehold.co/performance-report.pdf}	\N	emp8	cmd06nnbz000ve67wncnv4etg	\N	2025-07-12 12:45:09.221	2025-07-01 12:45:09.221	2025-04-24 12:45:09.221	2025-07-06 12:45:09.221
cmd08negp0005e6qktv9kh13o	UNDER_REVIEW	DIRECTOR_REVIEW	{https://placehold.co/confirmation-letter.pdf,https://placehold.co/performance-report.pdf}	\N	emp8	cmd06nnbx000te67ww4cbaug7	cmd06nnbq000ne67wwmiwxuo8	\N	\N	2025-07-01 12:45:09.241	2025-07-07 12:45:09.241
cmd08negs0007e6qkc02knatr	REJECTED	FINAL_APPROVAL	{https://placehold.co/confirmation-letter.pdf,https://placehold.co/performance-report.pdf}	Insufficient documentation provided	emp8	cmd06nnbu000re67wdeax0fwp	cmd06nnbq000ne67wwmiwxuo8	2025-07-10 12:45:09.243	\N	2025-05-18 12:45:09.243	2025-06-22 12:45:09.243
cmd08negu0009e6qkond0rg45	PENDING	DIRECTOR_REVIEW	{https://placehold.co/confirmation-letter.pdf,https://placehold.co/performance-report.pdf}	\N	emp9	cmd06nnbx000te67ww4cbaug7	\N	\N	\N	2025-02-06 12:45:09.246	2025-07-07 12:45:09.246
cmd08negx000be6qkuvyr51sw	REJECTED	FINAL_APPROVAL	{https://placehold.co/confirmation-letter.pdf,https://placehold.co/performance-report.pdf}	Insufficient documentation provided	emp1	cmd06nnbx000te67ww4cbaug7	cmd059ir10002e6d86l802ljc	2025-07-05 12:45:09.248	\N	2025-02-26 12:45:09.248	2025-07-11 12:45:09.248
cmd08negz000de6qkwg9rc7j9	REJECTED	HR_REVIEW	{https://placehold.co/confirmation-letter.pdf,https://placehold.co/performance-report.pdf}	Insufficient documentation provided	emp1	cmd06nnbz000ve67wncnv4etg	cmd06nnbl000je67wtl28pk42	2025-07-12 12:45:09.251	\N	2025-06-25 12:45:09.251	2025-06-27 12:45:09.251
cmd08neh1000fe6qkwwhbs675	APPROVED	HR_REVIEW	{https://placehold.co/confirmation-letter.pdf,https://placehold.co/performance-report.pdf}	\N	emp9	cmd06nnbz000ve67wncnv4etg	cmd06nnbl000je67wtl28pk42	2025-07-02 12:45:09.253	2025-07-08 12:45:09.253	2025-05-14 12:45:09.253	2025-06-22 12:45:09.253
cmd0ueqji0001e6gq7bmkselr	Approved by Commission	completed	{"Evaluation Form","Letter of Request","IPA Certificate"}	\N	emp1	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	\N	2025-07-12 22:58:54.214	2025-07-12 22:54:16.542	2025-07-12 22:58:55.547
cmd0vy7a60001e6m40ihekvy4	Approved by Commission	completed	{"Evaluation Form","Letter of Request","IPA Certificate"}	\N	emp1	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	\N	2025-07-12 23:37:55.432	2025-07-12 23:37:24.318	2025-07-12 23:37:57.132
cmdcozbhe0001e6n0cbc1pgtq	Approved by Commission	completed	{cheti.pdf,sababu.pdf}	\N	ofisi_emp_015	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-21 06:00:59.743	2025-07-21 06:01:20.004	2025-07-21 05:55:33.212	2025-07-21 06:01:20.017
cmdcprfgx0003e6n0v0b49p9x	Approved by Commission	completed	{"Evaluation Form","Letter of Request","IPA Certificate"}	\N	ofisi_emp_018	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-21 06:19:37.864	2025-07-21 06:20:13.096	2025-07-21 06:17:24.753	2025-07-21 06:20:13.108
cmdcq7xjz0005e6n0yz1ydjd4	Approved by Commission	completed	{"Evaluation Form","Letter of Request","IPA Certificate"}	\N	ofisi_emp_018	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-21 06:30:28.83	2025-07-21 06:30:31.412	2025-07-21 06:30:14.687	2025-07-21 06:30:31.42
cmdcsek3a0007e6n0miflen8k	Approved by Commission	completed	{mfano.pdf,sababu.pdf}	\N	ofisi_emp_022	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-21 07:32:42.893	2025-07-21 07:32:59.155	2025-07-21 07:31:23.062	2025-07-21 07:32:59.166
cmdbmq1lw0001e6esuvx3rvxu	Request Received – Awaiting Commission Decision	commission_review	{"Evaluation Form","Letter of Request"}	\N	emp_005	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-21 11:22:14.78	\N	2025-07-20 12:04:35.108	2025-07-21 11:22:14.791
cmdd0k3l20009e6n0b9e0qnwh	Approved by Commission	completed	{"Evaluation Form","Letter of Request","IPA Certificate"}	\N	ofisi_emp_015	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-21 11:22:51.31	2025-07-21 11:23:20.346	2025-07-21 11:19:38.504	2025-07-21 11:23:20.358
cmdd0s2y6000be6n0dqrhbbl5	Pending HRMO Review	initial	{cheti.pdf,mfano.pdf,sababu.pdf}	\N	ofisi_emp_013	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-21 11:32:52.713	\N	2025-07-21 11:25:50.958	2025-07-21 11:58:42.701
cmde2s0v70001e6johbjijq4i	Approved by Commission	completed	{cheti.pdf,mfano.pdf,"Employee Profile Analysis.pdf"}	\N	ofisi_emp_020	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-22 05:11:39.1	2025-07-22 05:13:20.476	2025-07-22 05:09:33.651	2025-07-22 05:13:20.571
cmdiduwj40005e6rw7guc7yze	Pending HRMO/HHRMD Review	initial	{confirmation/evaluation-forms/20250725_083042_4925e195.pdf,confirmation/letters/20250725_083046_a61643e5.pdf}	\N	emp_005	cmd06nnbn000le67wtg41s3su	\N	\N	\N	2025-07-25 05:30:48.496	2025-07-25 05:30:48.496
cmdw5hm1n00012b0ne1o21wal	Approved by Commission	completed	{confirmation/evaluation-forms/1754254067580_b76ft4_cheti.pdf,confirmation/ipa-certificates/1754254071390_xlybp2_Employee_Profile_Analysis.pdf,confirmation/letters/1754254076882_xvdl9f_sababu.pdf}	\N	ofisi_emp_016	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-03 20:48:51.749	2025-08-05 00:51:03.879	2025-08-03 20:45:17.916	2025-08-05 00:51:03.959
cmdxud87400072bgt7a1glryc	Pending HRMO/HHRMD Review	initial	{confirmation/evaluation-forms/1754356161389_lf53z9_cheti.pdf,confirmation/letters/1754356167494_8ohpt0_mfano.pdf,confirmation/ipa-certificates/1754356164030_iz4wfk_mfano.pdf}	\N	ofisi_emp_014	cmd06nnbn000le67wtg41s3su	\N	\N	\N	2025-08-05 01:09:29.92	2025-08-05 01:09:29.92
cmdypzw5o00012bocfk8bmwqd	Approved by Commission	completed	{confirmation/evaluation-forms/1754409411389_l1eo9i_Employee_Profile_Analysis.pdf,confirmation/letters/1754409415478_9qb5jr_sababu.pdf}	\N	emp_005	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-05 15:57:51.639	2025-08-05 15:58:17.051	2025-08-05 15:54:55.499	2025-08-05 15:58:15.964
cmdyp7ihm00032bl76yk1u3r2	Pending HRMO/HHRMD Review	initial	{confirmation/evaluation-forms/1754407957125_o4qves_Employee_Profile_Analysis.pdf,confirmation/letters/1754407967935_qtl2ax_sababu.pdf,confirmation/ipa-certificates/1754407959833_ga0r4c_sababu.pdf}	\N	ofisi_emp_013	cmd06nnbn000le67wtg41s3su	\N	\N	\N	2025-08-05 15:32:51.387	2025-08-05 15:32:51.387
cmdzm1aly00072bgqn8l1s75j	Pending HRMO/HHRMD Review	initial	{confirmation/evaluation-forms/1754462658881_5gy5js_ripoti_ya_kustaafu_kwa_ugonjwa_report.pdf,confirmation/letters/1754463106247_9bjze5_kuacha_kazi_report.pdf,confirmation/ipa-certificates/1754462661529_4i4ic3_ripoti_ya_kupandishwa_cheo_report.pdf}	\N	ofisi_emp_017	cmd06nnbn000le67wtg41s3su	\N	\N	\N	2025-08-06 06:51:48.598	2025-08-06 06:51:48.598
cmdzvzx1100012bvsr3cunol4	Request Received – Awaiting Commission Decision	commission_review	{confirmation/evaluation-forms/1754479916140_3libml_1754478141939_tinkd3_SAID_SAID_New.pdf,confirmation/letters/1754479911747_b0ibuh_SAID_New_-_Copy__4_.pdf}	\N	emp_018	cmd06nnbs000pe67woh62ey8r	cmd06nnbb000be67wwgil78yv	2025-08-06 11:32:32.237	\N	2025-08-06 11:30:40.501	2025-08-06 11:32:31.482
cmdzw593j00032bvscdmyn5rl	Request Received – Awaiting Commission Decision	commission_review	{confirmation/evaluation-forms/1754480080292_s5iflr_Employee_Profile_Analysis.pdf,confirmation/letters/1754480087819_0zzfhg_mfano.pdf,confirmation/ipa-certificates/1754480083692_mwqyg5_cheti.pdf}	\N	ofisi_emp_013	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-06 11:35:19.489	\N	2025-08-06 11:34:49.424	2025-08-06 11:35:20.343
cmdzwoajn00052bvsy56z5o5s	Request Received – Awaiting Commission Decision	commission_review	{confirmation/evaluation-forms/1754480964371_377cxr_1754478412047_w3nnl4_ya_kustaafu_kwa_hiar....pdf,confirmation/letters/1754480973252_pim138_1754375024191_hbvy36_AJIRA_ZAWEMA.pdf}	\N	emp_018	cmd06nnbs000pe67woh62ey8r	cmd059ir10002e6d86l802ljc	2025-08-06 11:50:08.618	\N	2025-08-06 11:49:37.763	2025-08-06 11:50:09.464
cme4jplb800052btjfrl2lvvz	Pending HRMO/HHRMD Review	initial	{confirmation/evaluation-forms/1754761521868_3exh8a_request_status_report_report.pdf,confirmation/letters/1754761532449_wg29ym_20250725_100627_d2b91848.pdf,confirmation/ipa-certificates/1754761527165_56t9q8_1754324616644_6r2ulr_cheti.pdf}	\N	cme45oe2u000h2bfwmhka9n0f	cme471pqo00032bidhttxmboj	\N	\N	\N	2025-08-09 17:45:34.244	2025-08-09 17:45:34.244
cme4jqahu00072btjzmscppks	Pending HRMO/HHRMD Review	initial	{confirmation/evaluation-forms/1754761556541_qi7naq_1754407554728_bj7hik_sababu.pdf,confirmation/letters/1754761565198_y2cobq_ripoti_ya_kustaafu_kwa_hiari_report.pdf}	\N	cme45oe2500052bfwa4brwe5k	cme471pqo00032bidhttxmboj	\N	\N	\N	2025-08-09 17:46:06.883	2025-08-09 17:46:06.883
cme4jrggz00092btjq2orp8k1	Pending HRMO/HHRMD Review	initial	{confirmation/evaluation-forms/1754761613110_0417yh_request_status_report_report.pdf,confirmation/letters/1754761618971_4c1uae_1754241939359_p95qlf_cheti.pdf}	\N	cme45oe2000032bfwn1zsdqfe	cme471pqo00032bidhttxmboj	\N	\N	\N	2025-08-09 17:47:01.283	2025-08-09 17:47:01.283
cme6lq9qq00012bgxao337ilj	Rejected by Commission - Request Concluded	completed	{confirmation/evaluation-forms/1754885846536_i3eevn_cheti.pdf,confirmation/letters/1754885855365_paxw8f_ripoti_ya_nyongeza_ya_utumishi_report.pdf,confirmation/ipa-certificates/1754885850999_d860pr_1754407554728_bj7hik_sababu.pdf}	\N	cme571jn200003emp018	cme577oj300022bcqm9dhpzy8	cmd06nnbb000be67wwgil78yv	2025-08-13 07:49:32.139	2025-08-13 07:58:47.089	2025-08-11 04:17:37.49	2025-08-13 07:58:46.868
cme5hhrvz00032boben67f2ex	Approved by Commission	completed	{confirmation/evaluation-forms/1754818365989_a1k26l_1754403408864_8f2228_Employee_Profile_Analysis.pdf,confirmation/ipa-certificates/1754818372163_x6mjdx_1754241939359_p95qlf_cheti.pdf,confirmation/letters/1754818385820_50ba2w_cheti.pdf}	\N	cme45oe2q000f2bfwpadcd6pr	cme471pqo00032bidhttxmboj	cmd059ir10002e6d86l802ljc	2025-08-10 09:35:20.194	2025-08-10 09:36:49.56	2025-08-10 09:31:16.463	2025-08-10 09:36:49.066
cme5ji0bb00012bhe282iu8hw	Pending HRMO/HHRMD Review	initial	{confirmation/evaluation-forms/1754821639911_mz2k9w_1754403408864_8f2228_Employee_Profile_Analysis.pdf,confirmation/letters/1754821644984_xfqv42_20250802_094101_02331ce1.pdf,confirmation/ipa-certificates/1754821641043_mcomnn_1754676807327_mfbgv3_ripoti_ya_kupandishwa_cheo_report__2_.pdf}	\N	cme571jn200003emp020	cme577oj300022bcqm9dhpzy8	\N	\N	\N	2025-08-10 10:27:26.615	2025-08-10 10:27:26.615
cme5lo9mg00092bhemsl1ei9b	Approved by Commission	completed	{confirmation/evaluation-forms/1754825291661_5lf9o7_1754407554728_bj7hik_sababu.pdf,confirmation/letters/1754825295538_wkoykj_1754676807327_mfbgv3_ripoti_ya_kupandishwa_cheo_report__2_.pdf,confirmation/ipa-certificates/1754825294092_t00f8e_request_status_report_report.pdf}	\N	cme45oe2m000d2bfwd3agas2u	cme471pqo00032bidhttxmboj	cmd059ir10002e6d86l802ljc	2025-08-10 11:32:19.919	2025-08-10 11:32:22.926	2025-08-10 11:28:17.848	2025-08-10 11:32:22.421
cme602bjt00012boiv0g9jyul	Pending HRMO/HHRMD Review	initial	{confirmation/evaluation-forms/1754849447678_5z4taa_request_status_report_report.pdf,confirmation/letters/1754849466468_xpcvt3_ripoti_ya_kupandishwa_cheo_report__2_.pdf,confirmation/ipa-certificates/1754849458789_t29cyu_1754407554728_bj7hik_sababu.pdf}	\N	cme45oe2u000h2bfwmhka9n0f	cme471pqo00032bidhttxmboj	\N	\N	\N	2025-08-10 18:11:08.153	2025-08-10 18:11:08.153
\.


--
-- Data for Name: Employee; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Employee" (id, "employeeEntityId", name, gender, "profileImageUrl", "dateOfBirth", "placeOfBirth", region, "countryOfBirth", "zanId", "phoneNumber", "contactAddress", "zssfNumber", "payrollNumber", cadre, "salaryScale", ministry, department, "appointmentType", "contractType", "recentTitleDate", "currentReportingOffice", "currentWorkplace", "employmentDate", "confirmationDate", "retirementDate", status, "ardhilHaliUrl", "confirmationLetterUrl", "jobContractUrl", "birthCertificateUrl", "institutionId") FROM stdin;
emp9	emp9_id	Yussuf Makame	Male	https://placehold.co/100x100.png?text=YM	1982-07-10 00:00:00	Wete	Kaskazini Pemba	Tanzania	123987654	0777-999-111	P.O. Box 999, Wete, Pemba	ZSSF009	PAY009	Technical Officer	ZPS 4.5	Education and Vocational Training	Technical Services	Permanent	Full-time	2019-06-01 00:00:00	Director of Technical Services	Technical Office	2019-06-01 00:00:00	2020-06-01 00:00:00	2042-07-10 00:00:00	Confirmed	https://placehold.co/ardhil-hali-yussuf.pdf	https://placehold.co/confirmation-yussuf.pdf	https://placehold.co/job-contract-yussuf.pdf	https://placehold.co/birth-cert-yussuf.pdf	cmd06nn7r0002e67w8df8thtn
emp8	emp8_id	Khadija Nassor	Female	https://placehold.co/100x100.png?text=KN	1985-03-20 00:00:00	Stone Town	Mjini Magharibi	Tanzania	987654321	0777-888-999	P.O. Box 888, Stone Town, Zanzibar	ZSSF008	PAY008	Senior Manager	ZPS 5.1	Education and Vocational Training	Education	Permanent	Full-time	2020-01-15 00:00:00	Director of Education	Education Office	2020-01-15 00:00:00	2021-01-15 00:00:00	2045-03-20 00:00:00	Confirmed	https://placehold.co/ardhil-hali-khadija.pdf	https://placehold.co/confirmation-khadija.pdf	https://placehold.co/job-contract-khadija.pdf	https://placehold.co/birth-cert-khadija.pdf	cmd06nn7r0002e67w8df8thtn
emp_003	emp_entity_3	Said Juma Nassor	Male	https://placehold.co/150x150.png?text=SJN	1970-08-27 21:00:00	Stone Town	Kaskazini Pemba	Tanzania	1905850030	0777-817032	P.O. Box 3765, Mkoani, Zanzibar	ZSSF003	PAY0003	Director of Finance	ZPS 6.1	OFISI YA RAIS, FEDHA NA MIPANGO	Finance	Permanent	Full-time	2003-12-03 21:00:00	Director of Finance	Head Office	2003-12-03 21:00:00	2004-12-02 21:00:00	2030-08-27 21:00:00	Confirmed	https://placehold.co/ardhil-hali-3.pdf	https://placehold.co/confirmation-3.pdf	https://placehold.co/contract-3.pdf	https://placehold.co/birth-cert-3.pdf	cmd06nn7n0001e67w2h5rf86x
emp_007	emp_entity_7	Prof. Omar Juma Khamis	Male	https://placehold.co/150x150.png?text=POJK	1974-10-23 21:00:00	Mkoani	Kaskazini Pemba	Tanzania	1905650070	0777-696363	P.O. Box 7280, Mkoani, Zanzibar	ZSSF007	PAY0007	Principal Secretary	ZPS 8.1	WIZARA YA ELIMU NA MAFUNZO YA AMALI	Policy	Permanent	Full-time	2008-08-23 21:00:00	Director of Policy	Head Office	2008-08-23 21:00:00	2009-08-23 21:00:00	2034-10-23 21:00:00	Confirmed	https://placehold.co/ardhil-hali-7.pdf	https://placehold.co/confirmation-7.pdf	https://placehold.co/contract-7.pdf	https://placehold.co/birth-cert-7.pdf	cmd06nn7r0002e67w8df8thtn
emp_008	emp_entity_8	Dr. Amina Hassan Said	Female	https://placehold.co/150x150.png?text=DAHS	1962-05-04 21:00:00	Chake Chake	Mjini Magharibi	Tanzania	1906720080	0777-140697	P.O. Box 4560, Mkoani, Zanzibar	ZSSF008	PAY0008	Director of Education	ZPS 6.1	WIZARA YA ELIMU NA MAFUNZO YA AMALI	Primary Education	Permanent	Full-time	2004-11-22 21:00:00	Director of Primary Education	Head Office	2004-11-22 21:00:00	2005-11-22 21:00:00	2022-05-04 21:00:00	Confirmed	https://placehold.co/ardhil-hali-8.pdf	https://placehold.co/confirmation-8.pdf	https://placehold.co/contract-8.pdf	https://placehold.co/birth-cert-8.pdf	cmd06nn7r0002e67w8df8thtn
emp_009	emp_entity_9	Hamad Ali Khamis	Male	https://placehold.co/150x150.png?text=HAK	1989-07-20 21:00:00	Wete	Mjini Magharibi	Tanzania	1907800090	0777-792099	P.O. Box 2350, Mkoani, Zanzibar	ZSSF009	PAY0009	Senior Education Officer	ZPS 5.1	WIZARA YA ELIMU NA MAFUNZO YA AMALI	Secondary Education	Permanent	Full-time	2001-04-10 21:00:00	Director of Secondary Education	Head Office	2001-04-10 21:00:00	2002-04-10 21:00:00	2049-07-20 21:00:00	Confirmed	https://placehold.co/ardhil-hali-9.pdf	https://placehold.co/confirmation-9.pdf	https://placehold.co/contract-9.pdf	https://placehold.co/birth-cert-9.pdf	cmd06nn7r0002e67w8df8thtn
emp_010	emp_entity_10	Mwalimu Fatuma Juma	Female	https://placehold.co/150x150.png?text=MFJ	1988-07-21 21:00:00	Wete	Kaskazini Unguja	Tanzania	1908850100	0777-590498	P.O. Box 5427, Bububu, Zanzibar	ZSSF010	PAY0010	Education Officer	ZPS 4.2	WIZARA YA ELIMU NA MAFUNZO YA AMALI	Curriculum	Permanent	Full-time	2000-06-23 21:00:00	Director of Curriculum	Head Office	2000-06-23 21:00:00	2001-06-23 21:00:00	2048-07-21 21:00:00	Confirmed	https://placehold.co/ardhil-hali-10.pdf	https://placehold.co/confirmation-10.pdf	https://placehold.co/contract-10.pdf	https://placehold.co/birth-cert-10.pdf	cmd06nn7r0002e67w8df8thtn
emp_012	emp_entity_12	Halima Said Ali	Female	https://placehold.co/150x150.png?text=HSA	1976-03-18 21:00:00	Wete	Kaskazini Pemba	Tanzania	1910950120	0777-923910	P.O. Box 6962, Stone Town, Zanzibar	ZSSF012	PAY0012	Assistant Education Officer	ZPS 3.2	WIZARA YA ELIMU NA MAFUNZO YA AMALI	Special Education	Permanent	Full-time	2012-01-11 21:00:00	Director of Special Education	Head Office	2012-01-11 21:00:00	2013-01-10 21:00:00	2036-03-18 21:00:00	Confirmed	https://placehold.co/ardhil-hali-12.pdf	https://placehold.co/confirmation-12.pdf	https://placehold.co/contract-12.pdf	https://placehold.co/birth-cert-12.pdf	cmd06nn7r0002e67w8df8thtn
emp_004	emp_entity_4	Mwanasha Saleh Omar	Female	https://placehold.co/150x150.png?text=MSO	1986-10-06 21:00:00	Mkoani	Kusini Unguja	Tanzania	1906900040	0777-207026	P.O. Box 3536, Vitongoji, Zanzibar	ZSSF004	PAY0004	Afisa Mkuu daraja la II	ZPS 5.2	OFISI YA RAIS, FEDHA NA MIPANGO	Budget	Permanent	Full-time	2006-05-04 21:00:00	Director of Budget	Head Office	2006-05-04 21:00:00	2007-05-04 21:00:00	2046-10-06 21:00:00	Confirmed	https://placehold.co/ardhil-hali-4.pdf	https://placehold.co/confirmation-4.pdf	https://placehold.co/contract-4.pdf	https://placehold.co/birth-cert-4.pdf	cmd06nn7n0001e67w2h5rf86x
emp_005	emp_entity_5	Ahmed Khamis Vuai	Male	https://placehold.co/150x150.png?text=AKV	1973-02-05 21:00:00	Bububu	Mjini Magharibi	Tanzania	1907880050	0777-275399	P.O. Box 5695, Mkoani, Zanzibar	ZSSF005	PAY0005	Senior Administrative Officer	ZPS 4.2	OFISI YA RAIS, FEDHA NA MIPANGO	Human Resources	Permanent	Full-time	2008-05-19 21:00:00	Director of Human Resources	Head Office	2008-05-19 21:00:00	2025-08-05 15:58:15.971	2033-02-05 21:00:00	Retired	https://placehold.co/ardhil-hali-5.pdf	\N	https://placehold.co/contract-5.pdf	https://placehold.co/birth-cert-5.pdf	cmd06nn7n0001e67w2h5rf86x
cme458qjl00012bo8c1hwc5p9	\N	Bi. Mwanaisha Said	Female	\N	1966-11-17 00:00:00	Wilaya ya Kusini Pemba	Wilaya ya Kusini Pemba	Tanzania	1957290527	+255 288 125 385	P.O. Box 4270, Zanzibar	ZSSF2331350	PAY2331350	Afisa Uwongozi	C3	Wizara ya Utumishi wa Umma	Idara ya Mipango	Permanent	Permanent Contract	\N	\N	\N	1994-11-17 00:00:00	1997-11-17 00:00:00	2026-11-17 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
emp_013	emp_entity_13	Dr. Mwalimu Hassan Omar	Male	https://placehold.co/150x150.png?text=DMHO	1965-02-15 21:00:00	Mkoani	Kaskazini Unguja	Tanzania	1906700130	0777-966894	P.O. Box 6948, Mkoani, Zanzibar	ZSSF013	PAY0013	Principal Secretary	ZPS 8.1	WIZARA YA AFYA	Health Policy	Permanent	Full-time	2020-07-15 21:00:00	Director of Health Policy	Head Office	2020-07-15 21:00:00	2021-07-15 21:00:00	2025-02-15 21:00:00	Dismissed	https://placehold.co/ardhil-hali-13.pdf	https://placehold.co/confirmation-13.pdf	https://placehold.co/contract-13.pdf	https://placehold.co/birth-cert-13.pdf	cmd06nn7u0003e67wa4hiyie7
emp_015	emp_entity_15	Daktari Salim Juma Said	Male	https://placehold.co/150x150.png?text=DSJS	1987-01-07 21:00:00	Wete	Kaskazini Unguja	Tanzania	1908800150	0777-712186	P.O. Box 4457, Mkoani, Zanzibar	ZSSF015	PAY0015	Medical Officer	ZPS 6.2	WIZARA YA AFYA	Public Health	Permanent	Full-time	2011-11-07 21:00:00	Director of Public Health	Head Office	2011-11-07 21:00:00	2012-11-06 21:00:00	2047-01-07 21:00:00	Confirmed	https://placehold.co/ardhil-hali-15.pdf	https://placehold.co/confirmation-15.pdf	https://placehold.co/contract-15.pdf	https://placehold.co/birth-cert-15.pdf	cmd06nn7u0003e67wa4hiyie7
emp_016	emp_entity_16	Nurse Mwanasha Hassan	Female	https://placehold.co/150x150.png?text=NMH	1982-11-15 21:00:00	Vitongoji	Kusini Pemba	Tanzania	1909850160	0777-475107	P.O. Box 9242, Kizimbani, Zanzibar	ZSSF016	PAY0016	Senior Nursing Officer	ZPS 5.1	WIZARA YA AFYA	Nursing Services	Permanent	Full-time	2007-03-13 21:00:00	Director of Nursing Services	Head Office	2007-03-13 21:00:00	2008-03-12 21:00:00	2042-11-15 21:00:00	Confirmed	https://placehold.co/ardhil-hali-16.pdf	https://placehold.co/confirmation-16.pdf	https://placehold.co/contract-16.pdf	https://placehold.co/birth-cert-16.pdf	cmd06nn7u0003e67wa4hiyie7
emp_017	emp_entity_17	Pharmacist Ahmed Ali	Male	https://placehold.co/150x150.png?text=PAA	1972-07-03 21:00:00	Kizimbani	Kusini Unguja	Tanzania	1910900170	0777-717241	P.O. Box 1300, Chake Chake, Zanzibar	ZSSF017	PAY0017	Principal Pharmacist	ZPS 5.2	WIZARA YA AFYA	Pharmacy	Permanent	Full-time	2003-11-06 21:00:00	Director of Pharmacy	Head Office	2003-11-06 21:00:00	2004-11-05 21:00:00	2032-07-03 21:00:00	Confirmed	https://placehold.co/ardhil-hali-17.pdf	https://placehold.co/confirmation-17.pdf	https://placehold.co/contract-17.pdf	https://placehold.co/birth-cert-17.pdf	cmd06nn7u0003e67wa4hiyie7
emp_018	emp_entity_18	Fatma Khamis Omar	Female	https://placehold.co/150x150.png?text=FKO	1981-10-24 21:00:00	Mkoani	Kusini Pemba	Tanzania	1911950180	0777-855658	P.O. Box 9574, Kizimbani, Zanzibar	ZSSF018	PAY0018	Health Officer	ZPS 4.1	WIZARA YA AFYA	Health Promotion	Permanent	Full-time	2004-12-14 21:00:00	Director of Health Promotion	Head Office	2004-12-14 21:00:00	\N	2041-10-24 21:00:00	On Probation	https://placehold.co/ardhil-hali-18.pdf	\N	https://placehold.co/contract-18.pdf	https://placehold.co/birth-cert-18.pdf	cmd06nn7u0003e67wa4hiyie7
emp_019	emp_entity_19	Mhe. Ali Mohamed Khamis	Male	https://placehold.co/150x150.png?text=MAMK	1978-05-24 21:00:00	Vitongoji	Mjini Magharibi	Tanzania	1905600190	0777-723886	P.O. Box 3540, Mahonda, Zanzibar	ZSSF019	PAY0019	Commissioner	ZPS 9.1	TUME YA UTUMISHI SERIKALINI	Executive	Permanent	Full-time	2003-12-01 21:00:00	Director of Executive	Head Office	2003-12-01 21:00:00	2004-11-30 21:00:00	2038-05-24 21:00:00	Confirmed	https://placehold.co/ardhil-hali-19.pdf	https://placehold.co/confirmation-19.pdf	https://placehold.co/contract-19.pdf	https://placehold.co/birth-cert-19.pdf	cmd059ion0000e6d85kexfukl
emp_021	emp_entity_21	Mwalimu Hassan Juma	Male	https://placehold.co/150x150.png?text=MHJ	1985-08-31 21:00:00	Mahonda	Mjini Magharibi	Tanzania	1907700210	0777-157936	P.O. Box 4615, Chake Chake, Zanzibar	ZSSF021	PAY0021	Director of HR	ZPS 6.1	TUME YA UTUMISHI SERIKALINI	Human Resources	Permanent	Full-time	2002-10-31 21:00:00	Director of Human Resources	Head Office	2002-10-31 21:00:00	2003-10-31 21:00:00	2045-08-31 21:00:00	Confirmed	https://placehold.co/ardhil-hali-21.pdf	https://placehold.co/confirmation-21.pdf	https://placehold.co/contract-21.pdf	https://placehold.co/birth-cert-21.pdf	cmd059ion0000e6d85kexfukl
emp_022	emp_entity_22	Zeinab Ali Hassan	Female	https://placehold.co/150x150.png?text=ZAH	1971-05-10 21:00:00	Kizimbani	Kusini Pemba	Tanzania	1908750220	0777-553238	P.O. Box 6048, Stone Town, Zanzibar	ZSSF022	PAY0022	Legal Officer	ZPS 5.2	TUME YA UTUMISHI SERIKALINI	Legal Affairs	Permanent	Full-time	2016-01-10 21:00:00	Director of Legal Affairs	Head Office	2016-01-10 21:00:00	2017-01-09 21:00:00	2031-05-10 21:00:00	Confirmed	https://placehold.co/ardhil-hali-22.pdf	https://placehold.co/confirmation-22.pdf	https://placehold.co/contract-22.pdf	https://placehold.co/birth-cert-22.pdf	cmd059ion0000e6d85kexfukl
emp_023	emp_entity_23	Dr. Juma Ali Khamis	Male	https://placehold.co/150x150.png?text=DJAK	1960-05-13 21:00:00	Bububu	Kusini Unguja	Tanzania	1905750230	0777-964707	P.O. Box 2269, Mahonda, Zanzibar	ZSSF023	PAY0023	Principal Secretary	ZPS 8.1	WIZARA YA KILIMO UMWAGILIAJI MALIASILI NA MIFUGO	Policy	Permanent	Full-time	2014-11-19 21:00:00	Director of Policy	Head Office	2014-11-19 21:00:00	2015-11-19 21:00:00	2020-05-13 21:00:00	Confirmed	https://placehold.co/ardhil-hali-23.pdf	https://placehold.co/confirmation-23.pdf	https://placehold.co/contract-23.pdf	https://placehold.co/birth-cert-23.pdf	cmd06xe34000he6bqfdqiw9ll
emp_025	emp_entity_25	Veterinarian Ahmed Hassan	Male	https://placehold.co/150x150.png?text=VAH	1964-06-04 21:00:00	Vitongoji	Mjini Magharibi	Tanzania	1907850250	0777-498768	P.O. Box 6167, Kizimbani, Zanzibar	ZSSF025	PAY0025	Chief Veterinary Officer	ZPS 6.2	WIZARA YA KILIMO UMWAGILIAJI MALIASILI NA MIFUGO	Animal Health	Permanent	Full-time	2013-08-01 21:00:00	Director of Animal Health	Head Office	2013-08-01 21:00:00	2014-08-01 21:00:00	2024-06-04 21:00:00	Confirmed	https://placehold.co/ardhil-hali-25.pdf	https://placehold.co/confirmation-25.pdf	https://placehold.co/contract-25.pdf	https://placehold.co/birth-cert-25.pdf	cmd06xe34000he6bqfdqiw9ll
emp_026	emp_entity_26	Mwanasha Juma Omar	Female	https://placehold.co/150x150.png?text=MJO	1985-09-25 21:00:00	Mahonda	Mjini Magharibi	Tanzania	1908900260	0777-310622	P.O. Box 4079, Chake Chake, Zanzibar	ZSSF026	PAY0026	Agricultural Officer	ZPS 4.2	WIZARA YA KILIMO UMWAGILIAJI MALIASILI NA MIFUGO	Extension Services	Permanent	Full-time	2004-03-24 21:00:00	Director of Extension Services	Head Office	2004-03-24 21:00:00	2005-03-24 21:00:00	2045-09-25 21:00:00	Confirmed	https://placehold.co/ardhil-hali-26.pdf	https://placehold.co/confirmation-26.pdf	https://placehold.co/contract-26.pdf	https://placehold.co/birth-cert-26.pdf	cmd06xe34000he6bqfdqiw9ll
emp_027	emp_entity_27	Engineer Said Hassan	Male	https://placehold.co/150x150.png?text=ESH	1965-12-09 21:00:00	Mahonda	Mjini Magharibi	Tanzania	1905820270	0777-310232	P.O. Box 5981, Vitongoji, Zanzibar	ZSSF027	PAY0027	Principal Secretary	ZPS 8.1	WIZARA YA UJENZI MAWASILIANO NA UCHUKUZI	Infrastructure	Permanent	Full-time	2022-06-13 21:00:00	Director of Infrastructure	Head Office	2022-06-13 21:00:00	2023-06-13 21:00:00	2025-12-09 21:00:00	Confirmed	https://placehold.co/ardhil-hali-27.pdf	https://placehold.co/confirmation-27.pdf	https://placehold.co/contract-27.pdf	https://placehold.co/birth-cert-27.pdf	cmd06xe37000ie6bq43r62ea6
emp_028	emp_entity_28	Engineer Amina Ali	Female	https://placehold.co/150x150.png?text=EAA	1975-02-03 21:00:00	Mahonda	Kusini Pemba	Tanzania	1906870280	0777-680813	P.O. Box 6060, Kizimbani, Zanzibar	ZSSF028	PAY0028	Chief Engineer	ZPS 6.2	WIZARA YA UJENZI MAWASILIANO NA UCHUKUZI	Roads	Permanent	Full-time	2019-02-12 21:00:00	Director of Roads	Head Office	2019-02-12 21:00:00	2020-02-12 21:00:00	2035-02-03 21:00:00	Confirmed	https://placehold.co/ardhil-hali-28.pdf	https://placehold.co/confirmation-28.pdf	https://placehold.co/contract-28.pdf	https://placehold.co/birth-cert-28.pdf	cmd06xe37000ie6bq43r62ea6
emp_029	emp_entity_29	Architect Omar Juma	Male	https://placehold.co/150x150.png?text=AOJ	1966-08-10 21:00:00	Stone Town	Kusini Pemba	Tanzania	1907920290	0777-740540	P.O. Box 1076, Vitongoji, Zanzibar	ZSSF029	PAY0029	Senior Architect	ZPS 5.2	WIZARA YA UJENZI MAWASILIANO NA UCHUKUZI	Building	Permanent	Full-time	2016-01-08 21:00:00	Director of Building	Head Office	2016-01-08 21:00:00	2017-01-07 21:00:00	2026-08-10 21:00:00	Confirmed	https://placehold.co/ardhil-hali-29.pdf	https://placehold.co/confirmation-29.pdf	https://placehold.co/contract-29.pdf	https://placehold.co/birth-cert-29.pdf	cmd06xe37000ie6bq43r62ea6
emp_030	emp_entity_30	Surveyor Mwanajuma Hassan	Female	https://placehold.co/150x150.png?text=SMH	1981-02-20 21:00:00	Mkoani	Kaskazini Pemba	Tanzania	1908970300	0777-776629	P.O. Box 9140, Bububu, Zanzibar	ZSSF030	PAY0030	Senior Surveyor	ZPS 5.1	WIZARA YA UJENZI MAWASILIANO NA UCHUKUZI	Survey	Permanent	Full-time	2011-01-24 21:00:00	Director of Survey	Head Office	2011-01-24 21:00:00	2012-01-24 21:00:00	2041-02-20 21:00:00	Confirmed	https://placehold.co/ardhil-hali-30.pdf	https://placehold.co/confirmation-30.pdf	https://placehold.co/contract-30.pdf	https://placehold.co/birth-cert-30.pdf	cmd06xe37000ie6bq43r62ea6
emp_031	emp_entity_31	Mwalimu Hassan Said	Male	https://placehold.co/150x150.png?text=MHS	1970-10-20 21:00:00	Chake Chake	Kaskazini Pemba	Tanzania	1905840310	0777-295018	P.O. Box 7965, Kizimbani, Zanzibar	ZSSF031	PAY0031	Principal Secretary	ZPS 8.1	WIZARA YA UTALII NA MAMBO YA KALE	Tourism Policy	Permanent	Full-time	2009-01-31 21:00:00	Director of Tourism Policy	Head Office	2009-01-31 21:00:00	2010-01-31 21:00:00	2030-10-20 21:00:00	Confirmed	https://placehold.co/ardhil-hali-31.pdf	https://placehold.co/confirmation-31.pdf	https://placehold.co/contract-31.pdf	https://placehold.co/birth-cert-31.pdf	cmd06xe40000ve6bqrip9e4m6
emp_032	emp_entity_32	Dr. Fatma Juma Ali	Female	https://placehold.co/150x150.png?text=DFJA	1987-11-26 21:00:00	Vitongoji	Kusini Unguja	Tanzania	1906890320	0777-936850	P.O. Box 9878, Vitongoji, Zanzibar	ZSSF032	PAY0032	Director of Tourism	ZPS 6.1	WIZARA YA UTALII NA MAMBO YA KALE	Tourism Development	Permanent	Full-time	2006-05-16 21:00:00	Director of Tourism Development	Head Office	2006-05-16 21:00:00	2007-05-16 21:00:00	2047-11-26 21:00:00	Confirmed	https://placehold.co/ardhil-hali-32.pdf	https://placehold.co/confirmation-32.pdf	https://placehold.co/contract-32.pdf	https://placehold.co/birth-cert-32.pdf	cmd06xe40000ve6bqrip9e4m6
emp_033	emp_entity_33	Ahmed Omar Hassan	Male	https://placehold.co/150x150.png?text=AOH	1962-02-18 21:00:00	Stone Town	Kaskazini Pemba	Tanzania	1907940330	0777-778886	P.O. Box 1079, Wete, Zanzibar	ZSSF033	PAY0033	Tourism Officer	ZPS 4.2	WIZARA YA UTALII NA MAMBO YA KALE	Heritage	Permanent	Full-time	2003-06-03 21:00:00	Director of Heritage	Head Office	2003-06-03 21:00:00	2004-06-02 21:00:00	2022-02-18 21:00:00	Confirmed	https://placehold.co/ardhil-hali-33.pdf	https://placehold.co/confirmation-33.pdf	https://placehold.co/contract-33.pdf	https://placehold.co/birth-cert-33.pdf	cmd06xe40000ve6bqrip9e4m6
emp_034	emp_entity_34	Engineer Ali Hassan	Male	https://placehold.co/150x150.png?text=EAH	1975-05-12 21:00:00	Stone Town	Kusini Pemba	Tanzania	1905860340	0777-378202	P.O. Box 6175, Mkoani, Zanzibar	ZSSF034	PAY0034	Principal Secretary	ZPS 8.1	WIZARA YA MAJI NISHATI NA MADINI	Water Policy	Permanent	Full-time	2014-01-18 21:00:00	Director of Water Policy	Head Office	2014-01-18 21:00:00	2015-01-18 21:00:00	2035-05-12 21:00:00	Confirmed	https://placehold.co/ardhil-hali-34.pdf	https://placehold.co/confirmation-34.pdf	https://placehold.co/contract-34.pdf	https://placehold.co/birth-cert-34.pdf	cmd06xe4g0012e6bqou5f9gur
emp_035	emp_entity_35	Engineer Zeinab Omar	Female	https://placehold.co/150x150.png?text=EZO	1971-10-20 21:00:00	Stone Town	Kaskazini Pemba	Tanzania	1906910350	0777-479265	P.O. Box 9392, Stone Town, Zanzibar	ZSSF035	PAY0035	Director of Water	ZPS 6.1	WIZARA YA MAJI NISHATI NA MADINI	Water Supply	Permanent	Full-time	2021-03-25 21:00:00	Director of Water Supply	Head Office	2021-03-25 21:00:00	2022-03-25 21:00:00	2031-10-20 21:00:00	Confirmed	https://placehold.co/ardhil-hali-35.pdf	https://placehold.co/confirmation-35.pdf	https://placehold.co/contract-35.pdf	https://placehold.co/birth-cert-35.pdf	cmd06xe4g0012e6bqou5f9gur
emp_036	emp_entity_36	Technician Said Ali	Male	https://placehold.co/150x150.png?text=TSA	1980-01-06 21:00:00	Mkoani	Kaskazini Unguja	Tanzania	1907960360	0777-722924	P.O. Box 8708, Mahonda, Zanzibar	ZSSF036	PAY0036	Senior Technician	ZPS 4.2	WIZARA YA MAJI NISHATI NA MADINI	Energy	Permanent	Full-time	2016-04-12 21:00:00	Director of Energy	Head Office	2016-04-12 21:00:00	2017-04-12 21:00:00	2040-01-06 21:00:00	Confirmed	https://placehold.co/ardhil-hali-36.pdf	https://placehold.co/confirmation-36.pdf	https://placehold.co/contract-36.pdf	https://placehold.co/birth-cert-36.pdf	cmd06xe4g0012e6bqou5f9gur
emp_038	emp_entity_38	MBA Mwanasha Said	Female	https://placehold.co/150x150.png?text=MMS	1988-04-22 21:00:00	Stone Town	Kaskazini Pemba	Tanzania	1906930380	0777-597484	P.O. Box 9943, Kizimbani, Zanzibar	ZSSF038	PAY0038	Director of Industry	ZPS 6.1	WIZARA YA BIASHARA NA MAENDELEO YA VIWANDA	Industrial Development	Permanent	Full-time	2009-06-22 21:00:00	Director of Industrial Development	Head Office	2009-06-22 21:00:00	2010-06-22 21:00:00	2048-04-22 21:00:00	Confirmed	https://placehold.co/ardhil-hali-38.pdf	https://placehold.co/confirmation-38.pdf	https://placehold.co/contract-38.pdf	https://placehold.co/birth-cert-38.pdf	cmd06xe3b000ke6bqxuwovzub
emp_039	emp_entity_39	Trade Officer Ahmed	Male	https://placehold.co/150x150.png?text=TOA	1963-09-05 21:00:00	Wete	Mjini Magharibi	Tanzania	1907980390	0777-719203	P.O. Box 8576, Wete, Zanzibar	ZSSF039	PAY0039	Trade Officer	ZPS 4.2	WIZARA YA BIASHARA NA MAENDELEO YA VIWANDA	Export Promotion	Permanent	Full-time	2012-01-23 21:00:00	Director of Export Promotion	Head Office	2012-01-23 21:00:00	\N	2023-09-05 21:00:00	On Probation	https://placehold.co/ardhil-hali-39.pdf	\N	https://placehold.co/contract-39.pdf	https://placehold.co/birth-cert-39.pdf	cmd06xe3b000ke6bqxuwovzub
emp_040	emp_entity_40	Surveyor Hassan Ali	Male	https://placehold.co/150x150.png?text=SHA	1968-10-02 21:00:00	Kizimbani	Kaskazini Pemba	Tanzania	1905900400	0777-955288	P.O. Box 6361, Wete, Zanzibar	ZSSF040	PAY0040	Principal Secretary	ZPS 8.1	WIZARA YA ARDHI NA MAENDELEO YA MAKAAZI ZANZIBAR	Land Policy	Permanent	Full-time	2022-04-12 21:00:00	Director of Land Policy	Head Office	2022-04-12 21:00:00	2023-04-12 21:00:00	2028-10-02 21:00:00	Confirmed	https://placehold.co/ardhil-hali-40.pdf	https://placehold.co/confirmation-40.pdf	https://placehold.co/contract-40.pdf	https://placehold.co/birth-cert-40.pdf	cmd06xe3y000ue6bqzqkztrsa
emp_041	emp_entity_41	Architect Fatma Hassan	Female	https://placehold.co/150x150.png?text=AFH	1973-01-01 21:00:00	Kizimbani	Kusini Unguja	Tanzania	1906950410	0777-774735	P.O. Box 5022, Stone Town, Zanzibar	ZSSF041	PAY0041	Director of Housing	ZPS 6.1	WIZARA YA ARDHI NA MAENDELEO YA MAKAAZI ZANZIBAR	Housing Development	Permanent	Full-time	2019-07-22 21:00:00	Director of Housing Development	Head Office	2019-07-22 21:00:00	2020-07-21 21:00:00	2033-01-01 21:00:00	Confirmed	https://placehold.co/ardhil-hali-41.pdf	https://placehold.co/confirmation-41.pdf	https://placehold.co/contract-41.pdf	https://placehold.co/birth-cert-41.pdf	cmd06xe3y000ue6bqzqkztrsa
emp_042	emp_entity_42	Land Officer Omar Said	Male	https://placehold.co/150x150.png?text=LOOS	1975-09-04 21:00:00	Wete	Kaskazini Pemba	Tanzania	1908000420	0777-266636	P.O. Box 4239, Chake Chake, Zanzibar	ZSSF042	PAY0042	Land Officer	ZPS 4.2	WIZARA YA ARDHI NA MAENDELEO YA MAKAAZI ZANZIBAR	Land Administration	Permanent	Full-time	2002-11-18 21:00:00	Director of Land Administration	Head Office	2002-11-18 21:00:00	2003-11-18 21:00:00	2035-09-04 21:00:00	Confirmed	https://placehold.co/ardhil-hali-42.pdf	https://placehold.co/confirmation-42.pdf	https://placehold.co/contract-42.pdf	https://placehold.co/birth-cert-42.pdf	cmd06xe3y000ue6bqzqkztrsa
emp_043	emp_entity_43	Journalist Ali Omar	Male	https://placehold.co/150x150.png?text=JAO	1983-04-06 21:00:00	Mkoani	Kaskazini Pemba	Tanzania	1905920430	0777-524495	P.O. Box 7910, Vitongoji, Zanzibar	ZSSF043	PAY0043	Principal Secretary	ZPS 8.1	WIZARA YA HABARI, VIJANA, UTAMADUNI NA MICHEZO	Information Policy	Permanent	Full-time	2010-10-11 21:00:00	Director of Information Policy	Head Office	2010-10-11 21:00:00	2011-10-11 21:00:00	2043-04-06 21:00:00	Confirmed	https://placehold.co/ardhil-hali-43.pdf	https://placehold.co/confirmation-43.pdf	https://placehold.co/contract-43.pdf	https://placehold.co/birth-cert-43.pdf	cmd06xe3l000oe6bq5drrocqt
emp_044	emp_entity_44	Dr. Mwanajuma Ali	Female	https://placehold.co/150x150.png?text=DMA	1960-08-22 21:00:00	Mahonda	Kusini Pemba	Tanzania	1906970440	0777-150809	P.O. Box 9463, Kizimbani, Zanzibar	ZSSF044	PAY0044	Director of Youth	ZPS 6.1	WIZARA YA HABARI, VIJANA, UTAMADUNI NA MICHEZO	Youth Development	Permanent	Full-time	2001-03-16 21:00:00	Director of Youth Development	Head Office	2001-03-16 21:00:00	2002-03-16 21:00:00	2020-08-22 21:00:00	Confirmed	https://placehold.co/ardhil-hali-44.pdf	https://placehold.co/confirmation-44.pdf	https://placehold.co/contract-44.pdf	https://placehold.co/birth-cert-44.pdf	cmd06xe3l000oe6bq5drrocqt
emp_045	emp_entity_45	Sports Officer Hassan	Male	https://placehold.co/150x150.png?text=SOH	1976-08-16 21:00:00	Mahonda	Kaskazini Unguja	Tanzania	1908020450	0777-216843	P.O. Box 2727, Kizimbani, Zanzibar	ZSSF045	PAY0045	Sports Officer	ZPS 4.2	WIZARA YA HABARI, VIJANA, UTAMADUNI NA MICHEZO	Sports	Permanent	Full-time	2014-12-15 21:00:00	Director of Sports	Head Office	2014-12-15 21:00:00	2015-12-15 21:00:00	2036-08-16 21:00:00	Confirmed	https://placehold.co/ardhil-hali-45.pdf	https://placehold.co/confirmation-45.pdf	https://placehold.co/contract-45.pdf	https://placehold.co/birth-cert-45.pdf	cmd06xe3l000oe6bq5drrocqt
emp_046	emp_entity_46	Marine Biologist Said	Male	https://placehold.co/150x150.png?text=MBS	1970-06-05 21:00:00	Kizimbani	Kaskazini Pemba	Tanzania	1905940460	0777-187279	P.O. Box 6050, Mkoani, Zanzibar	ZSSF046	PAY0046	Principal Secretary	ZPS 8.1	WIZARA YA UCHUMI WA BULUU NA UVUVI	Blue Economy	Permanent	Full-time	2018-11-30 21:00:00	Director of Blue Economy	Head Office	2018-11-30 21:00:00	2019-11-30 21:00:00	2030-06-05 21:00:00	Confirmed	https://placehold.co/ardhil-hali-46.pdf	https://placehold.co/confirmation-46.pdf	https://placehold.co/contract-46.pdf	https://placehold.co/birth-cert-46.pdf	cmd06xe3r000re6bqum8g62id
emp_047	emp_entity_47	Dr. Amina Juma	Female	https://placehold.co/150x150.png?text=DAJ	1986-01-22 21:00:00	Wete	Kusini Unguja	Tanzania	1906990470	0777-944894	P.O. Box 9610, Kizimbani, Zanzibar	ZSSF047	PAY0047	Director of Fisheries	ZPS 6.1	WIZARA YA UCHUMI WA BULUU NA UVUVI	Fisheries	Permanent	Full-time	2008-05-06 21:00:00	Director of Fisheries	Head Office	2008-05-06 21:00:00	2009-05-06 21:00:00	2046-01-22 21:00:00	Confirmed	https://placehold.co/ardhil-hali-47.pdf	https://placehold.co/confirmation-47.pdf	https://placehold.co/contract-47.pdf	https://placehold.co/birth-cert-47.pdf	cmd06xe3r000re6bqum8g62id
emp_048	emp_entity_48	Fisheries Officer Omar	Male	https://placehold.co/150x150.png?text=FOO	1988-07-04 21:00:00	Kizimbani	Kusini Unguja	Tanzania	1908040480	0777-758201	P.O. Box 7233, Bububu, Zanzibar	ZSSF048	PAY0048	Fisheries Officer	ZPS 4.2	WIZARA YA UCHUMI WA BULUU NA UVUVI	Marine Resources	Permanent	Full-time	2016-04-12 21:00:00	Director of Marine Resources	Head Office	2016-04-12 21:00:00	2017-04-12 21:00:00	2048-07-04 21:00:00	Confirmed	https://placehold.co/ardhil-hali-48.pdf	https://placehold.co/confirmation-48.pdf	https://placehold.co/contract-48.pdf	https://placehold.co/birth-cert-48.pdf	cmd06xe3r000re6bqum8g62id
emp_049	emp_entity_49	Social Worker Fatma	Female	https://placehold.co/150x150.png?text=SWF	1981-06-17 21:00:00	Bububu	Kusini Pemba	Tanzania	1905960490	0777-211708	P.O. Box 4756, Wete, Zanzibar	ZSSF049	PAY0049	Principal Secretary	ZPS 8.1	WIZARA YA MAENDELEO YA JAMII,JINSIA,WAZEE NA WATOTO	Social Policy	Permanent	Full-time	2012-03-31 21:00:00	Director of Social Policy	Head Office	2012-03-31 21:00:00	2013-03-31 21:00:00	2041-06-17 21:00:00	Confirmed	https://placehold.co/ardhil-hali-49.pdf	https://placehold.co/confirmation-49.pdf	https://placehold.co/contract-49.pdf	https://placehold.co/birth-cert-49.pdf	cmd06xe270003e6bq0wm0v3c7
emp_051	emp_entity_51	Child Protection Officer	Male	https://placehold.co/150x150.png?text=CPO	1986-09-03 21:00:00	Kizimbani	Kusini Pemba	Tanzania	1908060510	0777-670950	P.O. Box 9313, Mahonda, Zanzibar	ZSSF051	PAY0051	Child Protection Officer	ZPS 4.2	WIZARA YA MAENDELEO YA JAMII,JINSIA,WAZEE NA WATOTO	Child Welfare	Permanent	Full-time	2000-03-23 21:00:00	Director of Child Welfare	Head Office	2000-03-23 21:00:00	\N	2046-09-03 21:00:00	On Probation	https://placehold.co/ardhil-hali-51.pdf	\N	https://placehold.co/contract-51.pdf	https://placehold.co/birth-cert-51.pdf	cmd06xe270003e6bq0wm0v3c7
emp_052	emp_entity_52	Auditor General Hassan	Male	https://placehold.co/150x150.png?text=AGH	1983-03-04 21:00:00	Kizimbani	Kaskazini Pemba	Tanzania	1905980520	0777-403637	P.O. Box 6199, Mahonda, Zanzibar	ZSSF052	PAY0052	Auditor General	ZPS 9.1	OFISI YA MKAGUZI MKUU WA NDANI WA SERIKALI	Audit	Permanent	Full-time	2020-08-22 21:00:00	Director of Audit	Head Office	2020-08-22 21:00:00	2021-08-22 21:00:00	2043-03-04 21:00:00	Confirmed	https://placehold.co/ardhil-hali-52.pdf	https://placehold.co/confirmation-52.pdf	https://placehold.co/contract-52.pdf	https://placehold.co/birth-cert-52.pdf	cmd06xe2e0006e6bqvjfhq32c
emp_053	emp_entity_53	Senior Auditor Amina	Female	https://placehold.co/150x150.png?text=SAA	1961-02-20 21:00:00	Mkoani	Mjini Magharibi	Tanzania	1907030530	0777-917805	P.O. Box 1995, Stone Town, Zanzibar	ZSSF053	PAY0053	Senior Auditor	ZPS 5.2	OFISI YA MKAGUZI MKUU WA NDANI WA SERIKALI	Financial Audit	Permanent	Full-time	2005-04-11 21:00:00	Director of Financial Audit	Head Office	2005-04-11 21:00:00	2006-04-11 21:00:00	2021-02-20 21:00:00	Confirmed	https://placehold.co/ardhil-hali-53.pdf	https://placehold.co/confirmation-53.pdf	https://placehold.co/contract-53.pdf	https://placehold.co/birth-cert-53.pdf	cmd06xe2e0006e6bqvjfhq32c
emp_054	emp_entity_54	IT Manager Omar Ali	Male	https://placehold.co/150x150.png?text=IMOA	1967-09-22 21:00:00	Chake Chake	Mjini Magharibi	Tanzania	1908080540	0777-546302	P.O. Box 9980, Mahonda, Zanzibar	ZSSF054	PAY0054	IT Manager	ZPS 5.1	WAKALA WA SERIKALI MTANDAO (eGAZ)	ICT	Permanent	Full-time	2022-08-20 21:00:00	Director of ICT	Head Office	2022-08-20 21:00:00	2023-08-20 21:00:00	2027-09-22 21:00:00	Confirmed	https://placehold.co/ardhil-hali-54.pdf	https://placehold.co/confirmation-54.pdf	https://placehold.co/contract-54.pdf	https://placehold.co/birth-cert-54.pdf	cmd06xe2c0005e6bqulk6iu8g
emp_055	emp_entity_55	Records Manager Fatma	Female	https://placehold.co/150x150.png?text=RMF	1979-01-05 21:00:00	Chake Chake	Kusini Pemba	Tanzania	1907050550	0777-352857	P.O. Box 9112, Mahonda, Zanzibar	ZSSF055	PAY0055	Records Manager	ZPS 5.1	TAASISI YA NYARAKA NA KUMBUKUMBU	Archives	Permanent	Full-time	2006-07-03 21:00:00	Director of Archives	Head Office	2006-07-03 21:00:00	2007-07-03 21:00:00	2039-01-05 21:00:00	Confirmed	https://placehold.co/ardhil-hali-55.pdf	https://placehold.co/confirmation-55.pdf	https://placehold.co/contract-55.pdf	https://placehold.co/birth-cert-55.pdf	cmd06xe2m0009e6bq0ps9u9ut
emp_059	emp_entity_59	CPA Amina Juma Hassan	Female	https://placehold.co/150x150.png?text=CA	1972-11-10 21:00:00	Mkokotoni	Kaskazini Pemba	Tanzania	1905700590	0777-763187	P.O. Box 1943, Chake Chake, Zanzibar	ZSSF059	PAY0059	Registrar of Treasury	ZPS 7.2	Ofisi ya Msajili wa Hazina	Treasury Operations	Permanent	Full-time	2010-11-18 21:00:00	Director of Treasury Operations	Head Office	2010-11-18 21:00:00	2012-01-26 05:10:02.94	2032-11-10 21:00:00	Confirmed	https://placehold.co/ardhil-hali-59.pdf	https://placehold.co/confirmation-59.pdf	https://placehold.co/contract-59.pdf	https://placehold.co/birth-cert-59.pdf	cmd06xe1x0000e6bqalx28nja
emp_060	emp_entity_60	Accountant Said Ali Khamis	Male	https://placehold.co/150x150.png?text=AS	1972-07-04 21:00:00	Vitongoji	Kaskazini Unguja	Tanzania	1906750600	0777-696604	P.O. Box 6794, Wete, Zanzibar	ZSSF060	PAY0060	Senior Accountant	ZPS 5.1	Ofisi ya Msajili wa Hazina	Financial Management	Permanent	Full-time	2000-08-21 21:00:00	Director of Financial Management	Head Office	2000-08-21 21:00:00	2001-09-11 11:12:39.998	2032-07-04 21:00:00	Confirmed	https://placehold.co/ardhil-hali-60.pdf	https://placehold.co/confirmation-60.pdf	https://placehold.co/contract-60.pdf	https://placehold.co/birth-cert-60.pdf	cmd06xe1x0000e6bqalx28nja
emp_061	emp_entity_61	Auditor Mwanajuma Omar	Female	https://placehold.co/150x150.png?text=AM	1982-08-06 21:00:00	Stone Town	Kusini Unguja	Tanzania	1907800610	0777-959438	P.O. Box 4327, Chake Chake, Zanzibar	ZSSF061	PAY0061	Internal Auditor	ZPS 4.2	Ofisi ya Msajili wa Hazina	Internal Audit	Permanent	Full-time	2015-06-15 21:00:00	Director of Internal Audit	Head Office	2015-06-15 21:00:00	2016-10-04 19:58:02.417	2042-08-06 21:00:00	Confirmed	https://placehold.co/ardhil-hali-61.pdf	https://placehold.co/confirmation-61.pdf	https://placehold.co/contract-61.pdf	https://placehold.co/birth-cert-61.pdf	cmd06xe1x0000e6bqalx28nja
emp_062	emp_entity_62	Metrologist Dr. Hassan Ali	Male	https://placehold.co/150x150.png?text=MD	1969-04-10 21:00:00	Mkoani	Mjini Magharibi	Tanzania	1905720620	0777-236972	P.O. Box 2510, Nungwi, Zanzibar	ZSSF062	PAY0062	Chief Metrologist	ZPS 6.2	Wakala wa Vipimo Zanzibar	Standards	Permanent	Full-time	2005-04-25 21:00:00	Director of Standards	Head Office	2005-04-25 21:00:00	2006-12-31 10:54:41.118	2029-04-10 21:00:00	Confirmed	https://placehold.co/ardhil-hali-62.pdf	https://placehold.co/confirmation-62.pdf	https://placehold.co/contract-62.pdf	https://placehold.co/birth-cert-62.pdf	cmd06xe250002e6bqp8aabk92
emp_063	emp_entity_63	Engineer Fatma Said Omar	Female	https://placehold.co/150x150.png?text=EF	1966-11-03 21:00:00	Stone Town	Kaskazini Unguja	Tanzania	1906770630	0777-872651	P.O. Box 7372, Vitongoji, Zanzibar	ZSSF063	PAY0063	Calibration Engineer	ZPS 5.1	Wakala wa Vipimo Zanzibar	Calibration Services	Permanent	Full-time	2002-03-19 21:00:00	Director of Calibration Services	Head Office	2002-03-19 21:00:00	2003-08-16 00:27:43.407	2026-11-03 21:00:00	Confirmed	https://placehold.co/ardhil-hali-63.pdf	https://placehold.co/confirmation-63.pdf	https://placehold.co/contract-63.pdf	https://placehold.co/birth-cert-63.pdf	cmd06xe250002e6bqp8aabk92
emp_064	emp_entity_64	Technician Ahmed Hassan	Male	https://placehold.co/150x150.png?text=TA	1976-08-18 21:00:00	Mkokotoni	Mjini Magharibi	Tanzania	1907820640	0777-829773	P.O. Box 3354, Stone Town, Zanzibar	ZSSF064	PAY0064	Laboratory Technician	ZPS 3.2	Wakala wa Vipimo Zanzibar	Testing Laboratory	Permanent	Full-time	2006-12-06 21:00:00	Director of Testing Laboratory	Head Office	2006-12-06 21:00:00	\N	2036-08-18 21:00:00	On Probation	https://placehold.co/ardhil-hali-64.pdf	\N	https://placehold.co/contract-64.pdf	https://placehold.co/birth-cert-64.pdf	cmd06xe250002e6bqp8aabk92
emp_065	emp_entity_65	Judge (Rtd) Ali Mohamed	Male	https://placehold.co/150x150.png?text=J(	1950-03-09 21:00:00	Kizimbani	Kaskazini Unguja	Tanzania	1905740650	0777-787602	P.O. Box 1983, Stone Town, Zanzibar	ZSSF065	PAY0065	Chairman	ZPS 9.2	KAMISHENI YA UTUMISHI WA UMMA	Commission	Permanent	Full-time	1979-04-09 21:00:00	Director of Commission	Head Office	1979-04-09 21:00:00	1980-11-13 16:21:25.088	2010-03-09 21:00:00	Confirmed	https://placehold.co/ardhil-hali-65.pdf	https://placehold.co/confirmation-65.pdf	https://placehold.co/contract-65.pdf	https://placehold.co/birth-cert-65.pdf	cmd06xe2a0004e6bqwbtjm4x9
emp_067	emp_entity_67	HR Specialist Juma Ali	Male	https://placehold.co/150x150.png?text=HS	1966-11-09 21:00:00	Wete	Kaskazini Unguja	Tanzania	1907840670	0777-793057	P.O. Box 5349, Mkoani, Zanzibar	ZSSF067	PAY0067	HR Development Officer	ZPS 5.2	KAMISHENI YA UTUMISHI WA UMMA	Human Resources	Permanent	Full-time	2001-05-17 21:00:00	Director of Human Resources	Head Office	2001-05-17 21:00:00	2003-05-05 14:13:36.219	2026-11-09 21:00:00	Confirmed	https://placehold.co/ardhil-hali-67.pdf	https://placehold.co/confirmation-67.pdf	https://placehold.co/contract-67.pdf	https://placehold.co/birth-cert-67.pdf	cmd06xe2a0004e6bqwbtjm4x9
emp_068	emp_entity_68	IT Director Dr. Omar Hassan	Male	https://placehold.co/150x150.png?text=ID	1974-03-05 21:00:00	Nungwi	Kaskazini Pemba	Tanzania	1905760680	0777-950797	P.O. Box 3920, Kizimbani, Zanzibar	ZSSF068	PAY0068	Chief Technology Officer	ZPS 7.1	WAKALA WA SERIKALI MTANDAO (eGAZ)	ICT Strategy	Permanent	Full-time	2009-03-12 21:00:00	Director of ICT Strategy	Head Office	2009-03-12 21:00:00	2010-09-29 03:49:39.713	2034-03-05 21:00:00	Confirmed	https://placehold.co/ardhil-hali-68.pdf	https://placehold.co/confirmation-68.pdf	https://placehold.co/contract-68.pdf	https://placehold.co/birth-cert-68.pdf	cmd06xe2c0005e6bqulk6iu8g
emp_069	emp_entity_69	Cyber Security Expert Amina	Female	https://placehold.co/150x150.png?text=CS	1984-01-08 21:00:00	Mkokotoni	Mjini Magharibi	Tanzania	1906810690	0777-448237	P.O. Box 1695, Wete, Zanzibar	ZSSF069	PAY0069	Security Analyst	ZPS 6.1	WAKALA WA SERIKALI MTANDAO (eGAZ)	Cyber Security	Permanent	Full-time	2012-06-22 21:00:00	Director of Cyber Security	Head Office	2012-06-22 21:00:00	2014-05-05 03:26:32.853	2044-01-08 21:00:00	Confirmed	https://placehold.co/ardhil-hali-69.pdf	https://placehold.co/confirmation-69.pdf	https://placehold.co/contract-69.pdf	https://placehold.co/birth-cert-69.pdf	cmd06xe2c0005e6bqulk6iu8g
emp_070	emp_entity_70	Web Developer Said Omar	Male	https://placehold.co/150x150.png?text=WD	1974-01-08 21:00:00	Chake Chake	Mjini Magharibi	Tanzania	1907860700	0777-949429	P.O. Box 7549, Wete, Zanzibar	ZSSF070	PAY0070	Software Developer	ZPS 4.2	WAKALA WA SERIKALI MTANDAO (eGAZ)	Development	Permanent	Full-time	2012-04-16 21:00:00	Director of Development	Head Office	2012-04-16 21:00:00	\N	2034-01-08 21:00:00	On Probation	https://placehold.co/ardhil-hali-70.pdf	\N	https://placehold.co/contract-70.pdf	https://placehold.co/birth-cert-70.pdf	cmd06xe2c0005e6bqulk6iu8g
emp_071	emp_entity_71	Database Admin Fatma Ali	Female	https://placehold.co/150x150.png?text=DA	1969-08-11 21:00:00	Chake Chake	Kusini Pemba	Tanzania	1908910710	0777-150361	P.O. Box 5159, Chake Chake, Zanzibar	ZSSF071	PAY0071	Database Administrator	ZPS 5.1	WAKALA WA SERIKALI MTANDAO (eGAZ)	Data Management	Permanent	Full-time	2003-01-27 21:00:00	Director of Data Management	Head Office	2003-01-27 21:00:00	2005-01-10 19:47:33.685	2029-08-11 21:00:00	Confirmed	https://placehold.co/ardhil-hali-71.pdf	https://placehold.co/confirmation-71.pdf	https://placehold.co/contract-71.pdf	https://placehold.co/birth-cert-71.pdf	cmd06xe2c0005e6bqulk6iu8g
emp_072	emp_entity_72	Surveyor General Hassan	Male	https://placehold.co/150x150.png?text=SG	1952-11-07 21:00:00	Mkoani	Kaskazini Unguja	Tanzania	1905780720	0777-412273	P.O. Box 5923, Wete, Zanzibar	ZSSF072	PAY0072	Chairman	ZPS 8.2	Kamisheni ya Ardhi Zanzibar	Land Administration	Permanent	Full-time	1980-08-15 21:00:00	Director of Land Administration	Head Office	1980-08-15 21:00:00	1982-02-05 10:34:39.843	2012-11-07 21:00:00	Confirmed	https://placehold.co/ardhil-hali-72.pdf	https://placehold.co/confirmation-72.pdf	https://placehold.co/contract-72.pdf	https://placehold.co/birth-cert-72.pdf	cmd06xe2h0007e6bqta680e3b
emp_073	emp_entity_73	Land Lawyer Dr. Mwanajuma	Female	https://placehold.co/150x150.png?text=LL	1969-06-01 21:00:00	Vitongoji	Kusini Pemba	Tanzania	1906830730	0777-459325	P.O. Box 1360, Wete, Zanzibar	ZSSF073	PAY0073	Legal Advisor	ZPS 6.2	Kamisheni ya Ardhi Zanzibar	Land Law	Permanent	Full-time	2006-03-04 21:00:00	Director of Land Law	Head Office	2006-03-04 21:00:00	2007-11-20 03:46:56.773	2029-06-01 21:00:00	Confirmed	https://placehold.co/ardhil-hali-73.pdf	https://placehold.co/confirmation-73.pdf	https://placehold.co/contract-73.pdf	https://placehold.co/birth-cert-73.pdf	cmd06xe2h0007e6bqta680e3b
emp_074	emp_entity_74	Cartographer Ahmed Said	Male	https://placehold.co/150x150.png?text=CA	1973-07-31 21:00:00	Wete	Kaskazini Pemba	Tanzania	1907880740	0777-577798	P.O. Box 3292, Wete, Zanzibar	ZSSF074	PAY0074	Senior Cartographer	ZPS 5.1	Kamisheni ya Ardhi Zanzibar	Mapping	Permanent	Full-time	2004-01-16 21:00:00	Director of Mapping	Head Office	2004-01-16 21:00:00	2005-05-28 05:47:13.096	2033-07-31 21:00:00	Confirmed	https://placehold.co/ardhil-hali-74.pdf	https://placehold.co/confirmation-74.pdf	https://placehold.co/contract-74.pdf	https://placehold.co/birth-cert-74.pdf	cmd06xe2h0007e6bqta680e3b
emp_075	emp_entity_75	CPA Dr. Ali Hassan Omar	Male	https://placehold.co/150x150.png?text=CD	1977-07-19 21:00:00	Bububu	Mjini Magharibi	Tanzania	1905800750	0777-931022	P.O. Box 2514, Stone Town, Zanzibar	ZSSF075	PAY0075	Accountant General	ZPS 8.2	Ofisi ya Mhasibu Mkuu wa Serikali	Government Accounting	Permanent	Full-time	2003-09-08 21:00:00	Director of Government Accounting	Head Office	2003-09-08 21:00:00	2004-10-09 02:50:36.835	2037-07-19 21:00:00	Confirmed	https://placehold.co/ardhil-hali-75.pdf	https://placehold.co/confirmation-75.pdf	https://placehold.co/contract-75.pdf	https://placehold.co/birth-cert-75.pdf	cmd06xe2j0008e6bqqpmbs9bv
emp_076	emp_entity_76	Budget Analyst Fatma Juma	Female	https://placehold.co/150x150.png?text=BA	1987-11-21 21:00:00	Mkoani	Kusini Unguja	Tanzania	1906850760	0777-661921	P.O. Box 1392, Kizimbani, Zanzibar	ZSSF076	PAY0076	Principal Budget Officer	ZPS 6.1	Ofisi ya Mhasibu Mkuu wa Serikali	Budget Analysis	Permanent	Full-time	2024-02-06 21:00:00	Director of Budget Analysis	Head Office	2024-02-06 21:00:00	2026-01-31 12:09:34.436	2047-11-21 21:00:00	Confirmed	https://placehold.co/ardhil-hali-76.pdf	https://placehold.co/confirmation-76.pdf	https://placehold.co/contract-76.pdf	https://placehold.co/birth-cert-76.pdf	cmd06xe2j0008e6bqqpmbs9bv
emp_077	emp_entity_77	Financial Controller Said	Male	https://placehold.co/150x150.png?text=FC	1972-10-06 21:00:00	Bububu	Kusini Unguja	Tanzania	1907900770	0777-547427	P.O. Box 2203, Wete, Zanzibar	ZSSF077	PAY0077	Financial Controller	ZPS 5.2	Ofisi ya Mhasibu Mkuu wa Serikali	Financial Control	Permanent	Full-time	2011-10-24 21:00:00	Director of Financial Control	Head Office	2011-10-24 21:00:00	2012-11-11 07:42:44.697	2032-10-06 21:00:00	Confirmed	https://placehold.co/ardhil-hali-77.pdf	https://placehold.co/confirmation-77.pdf	https://placehold.co/contract-77.pdf	https://placehold.co/birth-cert-77.pdf	cmd06xe2j0008e6bqqpmbs9bv
emp_078	emp_entity_78	Chief Archivist Dr. Mwanajuma	Female	https://placehold.co/150x150.png?text=CA	1959-12-18 21:00:00	Mkoani	Kusini Unguja	Tanzania	1906870780	0777-334903	P.O. Box 4701, Stone Town, Zanzibar	ZSSF078	PAY0078	Chief Archivist	ZPS 6.2	TAASISI YA NYARAKA NA KUMBUKUMBU	Archives Management	Permanent	Full-time	1989-09-02 21:00:00	Director of Archives Management	Head Office	1989-09-02 21:00:00	1991-07-13 16:25:20.096	2019-12-18 21:00:00	Confirmed	https://placehold.co/ardhil-hali-78.pdf	https://placehold.co/confirmation-78.pdf	https://placehold.co/contract-78.pdf	https://placehold.co/birth-cert-78.pdf	cmd06xe2m0009e6bq0ps9u9ut
emp_080	emp_entity_80	Librarian Amina Omar	Female	https://placehold.co/150x150.png?text=LA	1983-05-02 21:00:00	Vitongoji	Kaskazini Pemba	Tanzania	1908970800	0777-787558	P.O. Box 8998, Bububu, Zanzibar	ZSSF080	PAY0080	Research Librarian	ZPS 4.1	TAASISI YA NYARAKA NA KUMBUKUMBU	Research Services	Permanent	Full-time	2018-06-25 21:00:00	Director of Research Services	Head Office	2018-06-25 21:00:00	\N	2043-05-02 21:00:00	On Probation	https://placehold.co/ardhil-hali-80.pdf	\N	https://placehold.co/contract-80.pdf	https://placehold.co/birth-cert-80.pdf	cmd06xe2m0009e6bq0ps9u9ut
emp_081	emp_entity_81	Economist Dr. Omar Juma	Male	https://placehold.co/150x150.png?text=ED	1970-04-08 21:00:00	Wete	Kusini Unguja	Tanzania	1905890810	0777-723541	P.O. Box 7399, Wete, Zanzibar	ZSSF081	PAY0081	Chief Economist	ZPS 7.2	AFISI YA RAISI KAZI, UCHUMI NA UWEKEZAJI	Economic Policy	Permanent	Full-time	1995-03-21 21:00:00	Director of Economic Policy	Head Office	1995-03-21 21:00:00	1996-08-26 10:58:07.614	2030-04-08 21:00:00	Confirmed	https://placehold.co/ardhil-hali-81.pdf	https://placehold.co/confirmation-81.pdf	https://placehold.co/contract-81.pdf	https://placehold.co/birth-cert-81.pdf	cmd06xe2o000ae6bquqbkbg4z
emp_082	emp_entity_82	Investment Analyst Zeinab	Female	https://placehold.co/150x150.png?text=IA	1971-04-30 21:00:00	Mkoani	Kusini Pemba	Tanzania	1906940820	0777-949092	P.O. Box 2017, Mkoani, Zanzibar	ZSSF082	PAY0082	Senior Investment Officer	ZPS 5.2	AFISI YA RAISI KAZI, UCHUMI NA UWEKEZAJI	Investment Promotion	Permanent	Full-time	2004-10-13 21:00:00	Director of Investment Promotion	Head Office	2004-10-13 21:00:00	2005-12-08 13:45:52.012	2031-04-30 21:00:00	Confirmed	https://placehold.co/ardhil-hali-82.pdf	https://placehold.co/confirmation-82.pdf	https://placehold.co/contract-82.pdf	https://placehold.co/birth-cert-82.pdf	cmd06xe2o000ae6bquqbkbg4z
emp_083	emp_entity_83	Statistics Officer Ahmed	Male	https://placehold.co/150x150.png?text=SO	1967-01-14 21:00:00	Vitongoji	Kaskazini Unguja	Tanzania	1907990830	0777-162075	P.O. Box 1915, Nungwi, Zanzibar	ZSSF083	PAY0083	Principal Statistician	ZPS 5.1	AFISI YA RAISI KAZI, UCHUMI NA UWEKEZAJI	Economic Statistics	Permanent	Full-time	1996-04-06 21:00:00	Director of Economic Statistics	Head Office	1996-04-06 21:00:00	1997-06-28 08:17:12.41	2027-01-14 21:00:00	Confirmed	https://placehold.co/ardhil-hali-83.pdf	https://placehold.co/confirmation-83.pdf	https://placehold.co/contract-83.pdf	https://placehold.co/birth-cert-83.pdf	cmd06xe2o000ae6bquqbkbg4z
emp_084	emp_entity_84	Tourism Expert Dr. Hassan	Male	https://placehold.co/150x150.png?text=TE	1962-04-24 21:00:00	Mahonda	Kusini Pemba	Tanzania	1905910840	0777-810515	P.O. Box 6866, Bububu, Zanzibar	ZSSF084	PAY0084	Director General	ZPS 7.2	KAMISHENI YA UTALII ZANZIBAR	Tourism Development	Permanent	Full-time	2001-07-07 21:00:00	Director of Tourism Development	Head Office	2001-07-07 21:00:00	2003-01-17 12:31:12.526	2022-04-24 21:00:00	Confirmed	https://placehold.co/ardhil-hali-84.pdf	https://placehold.co/confirmation-84.pdf	https://placehold.co/contract-84.pdf	https://placehold.co/birth-cert-84.pdf	cmd06xe2r000be6bqrqhwhbq1
emp_085	emp_entity_85	Marketing Manager Fatma	Female	https://placehold.co/150x150.png?text=MM	1952-09-30 21:00:00	Mahonda	Kaskazini Pemba	Tanzania	1906960850	0777-329294	P.O. Box 9274, Mkoani, Zanzibar	ZSSF085	PAY0085	Marketing Director	ZPS 6.1	KAMISHENI YA UTALII ZANZIBAR	Tourism Marketing	Permanent	Full-time	1989-04-02 21:00:00	Director of Tourism Marketing	Head Office	1989-04-02 21:00:00	1991-02-15 05:48:54.748	2012-09-30 21:00:00	Confirmed	https://placehold.co/ardhil-hali-85.pdf	https://placehold.co/confirmation-85.pdf	https://placehold.co/contract-85.pdf	https://placehold.co/birth-cert-85.pdf	cmd06xe2r000be6bqrqhwhbq1
emp_086	emp_entity_86	Tour Guide Coordinator Said	Male	https://placehold.co/150x150.png?text=TG	1955-03-08 21:00:00	Chake Chake	Kaskazini Pemba	Tanzania	1908010860	0777-156395	P.O. Box 5947, Stone Town, Zanzibar	ZSSF086	PAY0086	Senior Tourism Officer	ZPS 4.2	KAMISHENI YA UTALII ZANZIBAR	Tourism Services	Permanent	Full-time	1992-11-20 21:00:00	Director of Tourism Services	Head Office	1992-11-20 21:00:00	\N	2015-03-08 21:00:00	On Probation	https://placehold.co/ardhil-hali-86.pdf	\N	https://placehold.co/contract-86.pdf	https://placehold.co/birth-cert-86.pdf	cmd06xe2r000be6bqrqhwhbq1
emp_087	emp_entity_87	Labour Economist Dr. Ali	Male	https://placehold.co/150x150.png?text=LE	1962-01-31 21:00:00	Nungwi	Mjini Magharibi	Tanzania	1905930870	0777-149653	P.O. Box 6436, Vitongoji, Zanzibar	ZSSF087	PAY0087	Director of Employment	ZPS 6.2	SEKRETARIETI YA AJIRA	Employment Policy	Permanent	Full-time	1996-06-21 21:00:00	Director of Employment Policy	Head Office	1996-06-21 21:00:00	1998-01-12 01:07:58.747	2022-01-31 21:00:00	Confirmed	https://placehold.co/ardhil-hali-87.pdf	https://placehold.co/confirmation-87.pdf	https://placehold.co/contract-87.pdf	https://placehold.co/birth-cert-87.pdf	cmd06xe3e000le6bqscwfh5be
emp_088	emp_entity_88	Career Counselor Amina	Female	https://placehold.co/150x150.png?text=CC	1976-01-13 21:00:00	Chake Chake	Mjini Magharibi	Tanzania	1906980880	0777-489539	P.O. Box 1970, Stone Town, Zanzibar	ZSSF088	PAY0088	Principal Career Officer	ZPS 5.1	SEKRETARIETI YA AJIRA	Career Development	Permanent	Full-time	2003-09-14 21:00:00	Director of Career Development	Head Office	2003-09-14 21:00:00	2005-02-21 01:41:09.235	2036-01-13 21:00:00	Confirmed	https://placehold.co/ardhil-hali-88.pdf	https://placehold.co/confirmation-88.pdf	https://placehold.co/contract-88.pdf	https://placehold.co/birth-cert-88.pdf	cmd06xe3e000le6bqscwfh5be
emp_089	emp_entity_89	Skills Development Officer	Male	https://placehold.co/150x150.png?text=SD	1980-12-23 21:00:00	Bububu	Kaskazini Unguja	Tanzania	1908030890	0777-898172	P.O. Box 8696, Kizimbani, Zanzibar	ZSSF089	PAY0089	Training Coordinator	ZPS 4.1	SEKRETARIETI YA AJIRA	Skills Training	Permanent	Full-time	2015-11-24 21:00:00	Director of Skills Training	Head Office	2015-11-24 21:00:00	2017-07-04 13:06:10.984	2040-12-23 21:00:00	Confirmed	https://placehold.co/ardhil-hali-89.pdf	https://placehold.co/confirmation-89.pdf	https://placehold.co/contract-89.pdf	https://placehold.co/birth-cert-89.pdf	cmd06xe3e000le6bqscwfh5be
emp_090	emp_entity_90	Education Researcher Prof. Omar	Male	https://placehold.co/150x150.png?text=ER	1951-09-15 21:00:00	Mahonda	Mjini Magharibi	Tanzania	1905950900	0777-933644	P.O. Box 6757, Kizimbani, Zanzibar	ZSSF090	PAY0090	Director of Research	ZPS 7.1	TAASISI YA ELIMU YA ZANZIBAR	Educational Research	Permanent	Full-time	1977-10-14 21:00:00	Director of Educational Research	Head Office	1977-10-14 21:00:00	1979-06-26 09:30:45.319	2011-09-15 21:00:00	Confirmed	https://placehold.co/ardhil-hali-90.pdf	https://placehold.co/confirmation-90.pdf	https://placehold.co/contract-90.pdf	https://placehold.co/birth-cert-90.pdf	cmd06xe2w000de6bqzqo9qu3m
emp_091	emp_entity_91	Curriculum Developer Dr. Fatma	Female	https://placehold.co/150x150.png?text=CD	1980-03-17 21:00:00	Chake Chake	Mjini Magharibi	Tanzania	1907000910	0777-401817	P.O. Box 5815, Vitongoji, Zanzibar	ZSSF091	PAY0091	Curriculum Specialist	ZPS 6.1	TAASISI YA ELIMU YA ZANZIBAR	Curriculum Development	Permanent	Full-time	2008-01-24 21:00:00	Director of Curriculum Development	Head Office	2008-01-24 21:00:00	2009-09-07 22:13:47.532	2040-03-17 21:00:00	Confirmed	https://placehold.co/ardhil-hali-91.pdf	https://placehold.co/confirmation-91.pdf	https://placehold.co/contract-91.pdf	https://placehold.co/birth-cert-91.pdf	cmd06xe2w000de6bqzqo9qu3m
emp_011	emp_entity_11	Rashid Mohammed Omar	Male	https://placehold.co/150x150.png?text=RMO	1978-02-13 21:00:00	Stone Town	Kusini Pemba	Tanzania	1909900110	0777-293532	P.O. Box 8520, Kizimbani, Zanzibar	ZSSF011	PAY0011	Education Officer	ZPS 4.1	WIZARA YA ELIMU NA MAFUNZO YA AMALI	Teacher Training	Permanent	Full-time	2021-02-17 21:00:00	Director of Teacher Training	Head Office	2021-02-17 21:00:00	\N	2038-02-13 21:00:00	On Probation	https://placehold.co/ardhil-hali-11.pdf	\N	https://placehold.co/contract-11.pdf	https://placehold.co/birth-cert-11.pdf	cmd06nn7r0002e67w8df8thtn
emp_093	emp_entity_93	Emergency Manager Dr. Said	Male	https://placehold.co/150x150.png?text=EM	1950-03-13 21:00:00	Kizimbani	Kaskazini Pemba	Tanzania	1905970930	0777-944204	P.O. Box 2121, Nungwi, Zanzibar	ZSSF093	PAY0093	Director General	ZPS 7.2	KAMISHENI YA KUKABILIANA NA MAAFA ZANZIBAR	Disaster Management	Permanent	Full-time	1985-03-02 21:00:00	Director of Disaster Management	Head Office	1985-03-02 21:00:00	1986-12-23 20:49:41.9	2010-03-13 21:00:00	Confirmed	https://placehold.co/ardhil-hali-93.pdf	https://placehold.co/confirmation-93.pdf	https://placehold.co/contract-93.pdf	https://placehold.co/birth-cert-93.pdf	cmd06xe2y000ee6bqel875c2s
emp_094	emp_entity_94	Risk Assessment Expert Zeinab	Female	https://placehold.co/150x150.png?text=RA	1984-07-15 21:00:00	Nungwi	Kaskazini Unguja	Tanzania	1907020940	0777-828508	P.O. Box 8232, Kizimbani, Zanzibar	ZSSF094	PAY0094	Risk Analysis Officer	ZPS 5.2	KAMISHENI YA KUKABILIANA NA MAAFA ZANZIBAR	Risk Assessment	Permanent	Full-time	2023-07-20 21:00:00	Director of Risk Assessment	Head Office	2023-07-20 21:00:00	2025-06-27 15:08:43.053	2044-07-15 21:00:00	Confirmed	https://placehold.co/ardhil-hali-94.pdf	https://placehold.co/confirmation-94.pdf	https://placehold.co/contract-94.pdf	https://placehold.co/birth-cert-94.pdf	cmd06xe2y000ee6bqel875c2s
emp_095	emp_entity_95	Emergency Response Coordinator	Male	https://placehold.co/150x150.png?text=ER	1985-07-15 21:00:00	Chake Chake	Kusini Pemba	Tanzania	1908070950	0777-167103	P.O. Box 8173, Mkokotoni, Zanzibar	ZSSF095	PAY0095	Response Coordinator	ZPS 4.2	KAMISHENI YA KUKABILIANA NA MAAFA ZANZIBAR	Emergency Response	Permanent	Full-time	2015-02-06 21:00:00	Director of Emergency Response	Head Office	2015-02-06 21:00:00	\N	2045-07-15 21:00:00	On Probation	https://placehold.co/ardhil-hali-95.pdf	\N	https://placehold.co/contract-95.pdf	https://placehold.co/birth-cert-95.pdf	cmd06xe2y000ee6bqel875c2s
emp_096	emp_entity_96	Construction Manager Eng. Ali	Male	https://placehold.co/150x150.png?text=CM	1956-07-26 21:00:00	Mahonda	Kaskazini Unguja	Tanzania	1905990960	0777-130180	P.O. Box 5388, Nungwi, Zanzibar	ZSSF096	PAY0096	Chief Executive Officer	ZPS 7.2	WAKALA WA MAJENGO ZANZIBAR	Construction Management	Permanent	Full-time	1991-11-22 21:00:00	Director of Construction Management	Head Office	1991-11-22 21:00:00	1993-05-17 22:37:29.811	2016-07-26 21:00:00	Confirmed	https://placehold.co/ardhil-hali-96.pdf	https://placehold.co/confirmation-96.pdf	https://placehold.co/contract-96.pdf	https://placehold.co/birth-cert-96.pdf	cmd06xe30000fe6bqe6ljiz1v
emp_097	emp_entity_97	Quantity Surveyor Amina	Female	https://placehold.co/150x150.png?text=QS	1977-10-14 21:00:00	Stone Town	Kusini Unguja	Tanzania	1907040970	0777-196266	P.O. Box 9278, Stone Town, Zanzibar	ZSSF097	PAY0097	Principal Quantity Surveyor	ZPS 6.1	WAKALA WA MAJENGO ZANZIBAR	Cost Estimation	Permanent	Full-time	2014-11-05 21:00:00	Director of Cost Estimation	Head Office	2014-11-05 21:00:00	2016-01-24 21:03:00.019	2037-10-14 21:00:00	Confirmed	https://placehold.co/ardhil-hali-97.pdf	https://placehold.co/confirmation-97.pdf	https://placehold.co/contract-97.pdf	https://placehold.co/birth-cert-97.pdf	cmd06xe30000fe6bqe6ljiz1v
emp_098	emp_entity_98	Site Supervisor Hassan	Male	https://placehold.co/150x150.png?text=SS	1966-02-19 21:00:00	Mkoani	Kusini Pemba	Tanzania	1908090980	0777-507757	P.O. Box 3411, Vitongoji, Zanzibar	ZSSF098	PAY0098	Construction Supervisor	ZPS 4.1	WAKALA WA MAJENGO ZANZIBAR	Site Management	Permanent	Full-time	1995-03-11 21:00:00	Director of Site Management	Head Office	1995-03-11 21:00:00	1996-10-23 19:09:10.141	2026-02-19 21:00:00	Confirmed	https://placehold.co/ardhil-hali-98.pdf	https://placehold.co/confirmation-98.pdf	https://placehold.co/contract-98.pdf	https://placehold.co/birth-cert-98.pdf	cmd06xe30000fe6bqe6ljiz1v
emp_099	emp_entity_99	Mhe. Dr. Seif Sharif Hamad	Male	https://placehold.co/150x150.png?text=MD	1973-04-12 21:00:00	Koani	Kusini Unguja	Tanzania	1905550560	0777-229309	P.O. Box 6508, Koani, Zanzibar	ZSSF099	PAY0099	Regional Commissioner	ZPS 8.2	Ofisi ya Mkuu wa Mkoa wa Kusini Unguja	Regional Administration	Permanent	Full-time	2008-05-03 21:00:00	Director of Regional Administration	Regional Office	2008-05-03 21:00:00	2009-05-03 21:00:00	2033-04-12 21:00:00	Confirmed	https://placehold.co/ardhil-hali-99.pdf	https://placehold.co/confirmation-99.pdf	https://placehold.co/contract-99.pdf	https://placehold.co/birth-cert-99.pdf	cmd06xe220001e6bqj26tnlsj
emp_100	emp_entity_100	Dkt. Mwalimu Fatma Khamis	Female	https://placehold.co/150x150.png?text=DM	1975-01-13 21:00:00	Koani	Kusini Unguja	Tanzania	1906600570	0777-302012	P.O. Box 3554, Koani, Zanzibar	ZSSF100	PAY0100	District Commissioner	ZPS 7.1	Ofisi ya Mkuu wa Mkoa wa Kusini Unguja	Local Government	Permanent	Full-time	2014-01-31 21:00:00	Director of Local Government	Regional Office	2014-01-31 21:00:00	2015-01-31 21:00:00	2035-01-13 21:00:00	Confirmed	https://placehold.co/ardhil-hali-100.pdf	https://placehold.co/confirmation-100.pdf	https://placehold.co/contract-100.pdf	https://placehold.co/birth-cert-100.pdf	cmd06xe220001e6bqj26tnlsj
emp_101	emp_entity_101	Mwanakijiji Hassan Omar	Male	https://placehold.co/150x150.png?text=MH	1978-02-03 21:00:00	Koani	Kusini Unguja	Tanzania	1907650580	0777-189899	P.O. Box 2172, Koani, Zanzibar	ZSSF101	PAY0101	Ward Development Officer	ZPS 4.1	Ofisi ya Mkuu wa Mkoa wa Kusini Unguja	Community Development	Permanent	Full-time	2016-04-12 21:00:00	Director of Community Development	Regional Office	2016-04-12 21:00:00	\N	2038-02-03 21:00:00	On Probation	https://placehold.co/ardhil-hali-101.pdf	\N	https://placehold.co/contract-101.pdf	https://placehold.co/birth-cert-101.pdf	cmd06xe220001e6bqj26tnlsj
emp_102	emp_entity_102	Marine Conservation Expert Dr. Zeinab	Female	https://placehold.co/150x150.png?text=MC	1986-05-02 21:00:00	Mahonda	Kaskazini Unguja	Tanzania	1906031491	0777-840445	P.O. Box 1869, Jambiani, Zanzibar	ZSSF102	PAY0102	Marine Biologist	ZPS 6.2	WIZARA YA UCHUMI WA BULUU NA UVUVI	Marine Conservation	Permanent	Full-time	2019-11-13 21:00:00	Director of Marine Conservation	Head Office	2019-11-13 21:00:00	2021-04-23 15:07:32.95	2046-05-02 21:00:00	Confirmed	https://placehold.co/ardhil-hali-102.pdf	https://placehold.co/confirmation-102.pdf	https://placehold.co/contract-102.pdf	https://placehold.co/birth-cert-102.pdf	cmd06xe3r000re6bqum8g62id
emp_105	emp_entity_105	Investigation Officer Zeinab Omar	Female	https://placehold.co/150x150.png?text=IO	1967-02-28 21:00:00	Stone Town	Kaskazini Unguja	Tanzania	1906781051	0777-865896	P.O. Box 9409, Jambiani, Zanzibar	ZSSF105	PAY0105	Senior Investigator	ZPS 6.1	MAMLAKA YA KUZUIA RUSHWA NA UHUJUMU WA UCHUMI ZANZIBAR	Anti-Corruption	Permanent	Full-time	1996-10-12 21:00:00	Director of Anti-Corruption	Head Office	1996-10-12 21:00:00	1997-11-13 06:11:35.907	2027-02-28 21:00:00	Confirmed	https://placehold.co/ardhil-hali-105.pdf	https://placehold.co/confirmation-105.pdf	https://placehold.co/contract-105.pdf	https://placehold.co/birth-cert-105.pdf	cmd06xe3w000te6bqc44b0xpr
emp_106	emp_entity_106	Forensic Accountant Said Ali	Male	https://placehold.co/150x150.png?text=FA	1976-06-21 21:00:00	Kiwengwa	Kaskazini Pemba	Tanzania	1907831061	0777-259179	P.O. Box 3242, Mkoani, Zanzibar	ZSSF106	PAY0106	Forensic Analyst	ZPS 5.1	MAMLAKA YA KUZUIA RUSHWA NA UHUJUMU WA UCHUMI ZANZIBAR	Financial Crimes	Permanent	Full-time	2005-11-18 21:00:00	Director of Financial Crimes	Head Office	2005-11-18 21:00:00	2007-04-04 19:13:07.85	2036-06-21 21:00:00	Confirmed	https://placehold.co/ardhil-hali-106.pdf	https://placehold.co/confirmation-106.pdf	https://placehold.co/contract-106.pdf	https://placehold.co/birth-cert-106.pdf	cmd06xe3w000te6bqc44b0xpr
emp_107	emp_entity_107	Chief Prosecutor Dr. Mwalimu Hassan	Male	https://placehold.co/150x150.png?text=CP	1966-04-30 21:00:00	Mkoani	Kaskazini Unguja	Tanzania	1905751071	0777-841325	P.O. Box 2534, Wete, Zanzibar	ZSSF107	PAY0107	Director of Public Prosecutions	ZPS 8.2	AFISI YA MKURUGENZI WA MASHTAKA	Criminal Prosecutions	Permanent	Full-time	1998-07-22 21:00:00	Director of Criminal Prosecutions	Head Office	1998-07-22 21:00:00	2000-04-15 20:48:51.935	2026-04-30 21:00:00	Confirmed	https://placehold.co/ardhil-hali-107.pdf	https://placehold.co/confirmation-107.pdf	https://placehold.co/contract-107.pdf	https://placehold.co/birth-cert-107.pdf	cmd06xe4b0010e6bqt54zkblq
emp_108	emp_entity_108	State Attorney Amina Juma Ali	Female	https://placehold.co/150x150.png?text=SA	1972-02-13 21:00:00	Kiwengwa	Kaskazini Pemba	Tanzania	1906801081	0777-432141	P.O. Box 4539, Jambiani, Zanzibar	ZSSF108	PAY0108	Senior State Attorney	ZPS 6.2	AFISI YA MKURUGENZI WA MASHTAKA	Court Proceedings	Permanent	Full-time	2005-05-11 21:00:00	Director of Court Proceedings	Head Office	2005-05-11 21:00:00	2006-11-22 01:52:18.058	2032-02-13 21:00:00	Confirmed	https://placehold.co/ardhil-hali-108.pdf	https://placehold.co/confirmation-108.pdf	https://placehold.co/contract-108.pdf	https://placehold.co/birth-cert-108.pdf	cmd06xe4b0010e6bqt54zkblq
emp_109	emp_entity_109	Legal Research Officer Omar Said	Male	https://placehold.co/150x150.png?text=LR	1975-05-18 21:00:00	Bububu	Kusini Unguja	Tanzania	1907851091	0777-157973	P.O. Box 2152, Mkokotoni, Zanzibar	ZSSF109	PAY0109	Legal Research Officer	ZPS 4.2	AFISI YA MKURUGENZI WA MASHTAKA	Legal Research	Permanent	Full-time	2000-05-27 21:00:00	Director of Legal Research	Head Office	2000-05-27 21:00:00	2002-01-15 01:09:18.967	2035-05-18 21:00:00	Confirmed	https://placehold.co/ardhil-hali-109.pdf	https://placehold.co/confirmation-109.pdf	https://placehold.co/contract-109.pdf	https://placehold.co/birth-cert-109.pdf	cmd06xe4b0010e6bqt54zkblq
emp_110	emp_entity_110	Attorney General Prof. Fatma Hassan	Female	https://placehold.co/150x150.png?text=AG	1992-03-07 21:00:00	Mahonda	Kusini Pemba	Tanzania	1905771101	0777-302580	P.O. Box 2862, Vitongoji, Zanzibar	ZSSF110	PAY0110	Attorney General	ZPS 8.2	AFISI YA MWANASHERIA MKUU	Legal Affairs	Permanent	Full-time	2029-12-09 21:00:00	Director of Legal Affairs	Head Office	2029-12-09 21:00:00	2031-03-25 02:28:55.632	2052-03-07 21:00:00	Confirmed	https://placehold.co/ardhil-hali-110.pdf	https://placehold.co/confirmation-110.pdf	https://placehold.co/contract-110.pdf	https://placehold.co/birth-cert-110.pdf	cmd06xe4e0011e6bqv8eg0b16
emp_111	emp_entity_111	Deputy Attorney General Dr. Ahmed Omar	Male	https://placehold.co/150x150.png?text=DA	1977-07-01 21:00:00	Chake Chake	Kaskazini Pemba	Tanzania	1906821111	0777-744541	P.O. Box 8028, Chake Chake, Zanzibar	ZSSF111	PAY0111	Deputy Attorney General	ZPS 7.2	AFISI YA MWANASHERIA MKUU	Legal Advisory	Permanent	Full-time	2015-11-24 21:00:00	Director of Legal Advisory	Head Office	2015-11-24 21:00:00	2017-05-20 13:32:17.248	2037-07-01 21:00:00	Confirmed	https://placehold.co/ardhil-hali-111.pdf	https://placehold.co/confirmation-111.pdf	https://placehold.co/contract-111.pdf	https://placehold.co/birth-cert-111.pdf	cmd06xe4e0011e6bqv8eg0b16
emp_112	emp_entity_112	Legal Advisor Mwanasha Ali	Female	https://placehold.co/150x150.png?text=LA	1965-10-14 21:00:00	Kizimbani	Kusini Unguja	Tanzania	1907871121	0777-931236	P.O. Box 3012, Mahonda, Zanzibar	ZSSF112	PAY0112	Principal Legal Officer	ZPS 6.1	AFISI YA MWANASHERIA MKUU	Legal Drafting	Permanent	Full-time	1995-05-03 21:00:00	Director of Legal Drafting	Head Office	1995-05-03 21:00:00	1996-06-06 16:16:45.2	2025-10-14 21:00:00	Confirmed	https://placehold.co/ardhil-hali-112.pdf	https://placehold.co/confirmation-112.pdf	https://placehold.co/contract-112.pdf	https://placehold.co/birth-cert-112.pdf	cmd06xe4e0011e6bqv8eg0b16
emp_113	emp_entity_113	Drug Control Expert Dr. Hassan Ali Omar	Male	https://placehold.co/150x150.png?text=DC	1957-11-27 21:00:00	Kiwengwa	Kusini Unguja	Tanzania	1905791131	0777-658035	P.O. Box 6944, Jambiani, Zanzibar	ZSSF113	PAY0113	Director General	ZPS 7.2	MAMLAKA YA KUDHIBITI NA KUPAMBANA NA DAWA ZA KULEVYA ZANZIBAR	Drug Control	Permanent	Full-time	1993-03-20 21:00:00	Minister	Head Office	1993-03-20 21:00:00	1994-11-03 08:23:21.419	2017-11-27 21:00:00	Confirmed	https://placehold.co/ardhil-hali-113.pdf	https://placehold.co/confirmation-113.pdf	https://placehold.co/contract-113.pdf	https://placehold.co/birth-cert-113.pdf	cmd06xe45000xe6bqb6qc19ys
emp_128	emp_entity_128	Policy Advisor Dr. Zeinab Omar	Female	https://placehold.co/150x150.png?text=PA	1955-08-31 21:00:00	Chake Chake	Mjini Magharibi	Tanzania	1905891281	0777-919695	P.O. Box 3281, Kiwengwa, Zanzibar	ZSSF128	PAY0128	Principal Secretary	ZPS 8.1	OFISI YA MAKAMO WA KWANZA WA RAISI	Policy Coordination	Permanent	Full-time	1981-03-08 21:00:00	Minister	Head Office	1981-03-08 21:00:00	1983-02-24 23:38:06.251	2015-08-31 21:00:00	Confirmed	https://placehold.co/ardhil-hali-128.pdf	https://placehold.co/confirmation-128.pdf	https://placehold.co/contract-128.pdf	https://placehold.co/birth-cert-128.pdf	cmd06xe39000je6bqeouszvrd
ofisi_emp_009	\N	Rashid Mfaume Haji	Male	https://placehold.co/150x150.png?text=RMH	1976-01-10 00:00:00	Nungwi	Kaskazini Unguja	Tanzania	1905760110	0777-012345	S.L.P 9012, Nungwi, Zanzibar	ZSSF2009	PAY2009	Mkuu wa Kitengo	ZPS 5.1	OFISI YA RAIS, FEDHA NA MIPANGO	Teknolojia ya Habari	Permanent	Full-time	2015-08-25 00:00:00	Mkuu wa TEHAMA	Makao Makuu	2009-07-10 00:00:00	2010-07-10 00:00:00	2036-01-10 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
emp_114	emp_entity_114	Narcotics Inspector Zeinab Hassan	Female	https://placehold.co/150x150.png?text=NI	1973-03-05 21:00:00	Bububu	Kusini Pemba	Tanzania	1906841141	0777-207812	P.O. Box 5644, Mahonda, Zanzibar	ZSSF114	PAY0114	Chief Inspector	ZPS 5.2	MAMLAKA YA KUDHIBITI NA KUPAMBANA NA DAWA ZA KULEVYA ZANZIBAR	Drug Enforcement	Permanent	Full-time	2004-01-15 21:00:00	Director of Drug Enforcement	Head Office	2004-01-15 21:00:00	2005-10-12 08:10:31.249	2033-03-05 21:00:00	Confirmed	https://placehold.co/ardhil-hali-114.pdf	https://placehold.co/confirmation-114.pdf	https://placehold.co/contract-114.pdf	https://placehold.co/birth-cert-114.pdf	cmd06xe45000xe6bqb6qc19ys
emp_115	emp_entity_115	Rehabilitation Officer Ahmed Juma	Male	https://placehold.co/150x150.png?text=RO	1975-08-03 21:00:00	Jambiani	Kusini Pemba	Tanzania	1907891151	0777-220645	P.O. Box 4856, Nungwi, Zanzibar	ZSSF115	PAY0115	Rehabilitation Coordinator	ZPS 4.2	MAMLAKA YA KUDHIBITI NA KUPAMBANA NA DAWA ZA KULEVYA ZANZIBAR	Treatment Programs	Permanent	Full-time	2007-05-13 21:00:00	Director of Treatment Programs	Head Office	2007-05-13 21:00:00	2009-04-26 13:28:51.058	2035-08-03 21:00:00	Confirmed	https://placehold.co/ardhil-hali-115.pdf	https://placehold.co/confirmation-115.pdf	https://placehold.co/contract-115.pdf	https://placehold.co/birth-cert-115.pdf	cmd06xe45000xe6bqb6qc19ys
emp_117	emp_entity_117	Legal Draftsman Omar Hassan Ali	Male	https://placehold.co/150x150.png?text=LD	1961-11-21 21:00:00	Jambiani	Kusini Unguja	Tanzania	1906861171	0777-140653	P.O. Box 5871, Jambiani, Zanzibar	ZSSF117	PAY0117	Chief Legal Draftsman	ZPS 6.2	OFISI YA RAIS - KATIBA SHERIA UTUMISHI NA UTAWALA BORA	Legal Drafting	Permanent	Full-time	1995-12-19 21:00:00	Director of Legal Drafting	Head Office	1995-12-19 21:00:00	1997-09-05 18:19:12.252	2021-11-21 21:00:00	Confirmed	https://placehold.co/ardhil-hali-117.pdf	https://placehold.co/confirmation-117.pdf	https://placehold.co/contract-117.pdf	https://placehold.co/birth-cert-117.pdf	cmd06xe3i000ne6bq2q3y9g2z
emp_118	emp_entity_118	Good Governance Officer Fatma Omar	Female	https://placehold.co/150x150.png?text=GG	1968-08-06 21:00:00	Kiwengwa	Kusini Pemba	Tanzania	1907911181	0777-441244	P.O. Box 3965, Chake Chake, Zanzibar	ZSSF118	PAY0118	Director of Good Governance	ZPS 6.1	OFISI YA RAIS - KATIBA SHERIA UTUMISHI NA UTAWALA BORA	Governance	Permanent	Full-time	1999-01-06 21:00:00	Director of Governance	Head Office	1999-01-06 21:00:00	2000-06-06 07:44:38.936	2028-08-06 21:00:00	Confirmed	https://placehold.co/ardhil-hali-118.pdf	https://placehold.co/confirmation-118.pdf	https://placehold.co/contract-118.pdf	https://placehold.co/birth-cert-118.pdf	cmd06xe3i000ne6bq2q3y9g2z
emp_119	emp_entity_119	Ethics Expert Prof. Said Hassan	Male	https://placehold.co/150x150.png?text=EE	1963-03-07 21:00:00	Jambiani	Kusini Pemba	Tanzania	1905831191	0777-581380	P.O. Box 3704, Wete, Zanzibar	ZSSF119	PAY0119	Chairperson	ZPS 8.1	TUME YA MAADILI YA VIONGOZI WA UMMA	Ethics	Permanent	Full-time	1989-04-30 21:00:00	Minister	Head Office	1989-04-30 21:00:00	1990-08-03 18:47:43.35	2023-03-07 21:00:00	Confirmed	https://placehold.co/ardhil-hali-119.pdf	https://placehold.co/confirmation-119.pdf	https://placehold.co/contract-119.pdf	https://placehold.co/birth-cert-119.pdf	cmd06xe48000ye6bqwhlp0tum
emp_120	emp_entity_120	Investigation Officer Dr. Mwanajuma	Female	https://placehold.co/150x150.png?text=IO	1968-08-23 21:00:00	Wete	Kusini Unguja	Tanzania	1906881201	0777-759673	P.O. Box 5788, Kiwengwa, Zanzibar	ZSSF120	PAY0120	Principal Investigation Officer	ZPS 6.1	TUME YA MAADILI YA VIONGOZI WA UMMA	Investigations	Permanent	Full-time	2005-09-10 21:00:00	Director of Investigations	Head Office	2005-09-10 21:00:00	2007-07-22 04:21:06.397	2028-08-23 21:00:00	Confirmed	https://placehold.co/ardhil-hali-120.pdf	https://placehold.co/confirmation-120.pdf	https://placehold.co/contract-120.pdf	https://placehold.co/birth-cert-120.pdf	cmd06xe48000ye6bqwhlp0tum
emp_121	emp_entity_121	Ethics Officer Ahmed Hassan	Male	https://placehold.co/150x150.png?text=EO	1988-11-05 21:00:00	Kizimbani	Kusini Unguja	Tanzania	1907931211	0777-179318	P.O. Box 8995, Chake Chake, Zanzibar	ZSSF121	PAY0121	Ethics Officer	ZPS 4.2	TUME YA MAADILI YA VIONGOZI WA UMMA	Compliance	Permanent	Full-time	2027-04-07 21:00:00	Director of Compliance	Head Office	2027-04-07 21:00:00	\N	2048-11-05 21:00:00	On Probation	https://placehold.co/ardhil-hali-121.pdf	\N	https://placehold.co/contract-121.pdf	https://placehold.co/birth-cert-121.pdf	cmd06xe48000ye6bqwhlp0tum
emp_122	emp_entity_122	Election Expert Dr. Hassan Omar	Male	https://placehold.co/150x150.png?text=EE	1960-05-15 21:00:00	Wete	Kusini Unguja	Tanzania	1905851221	0777-798039	P.O. Box 3947, Mahonda, Zanzibar	ZSSF122	PAY0122	Chairperson	ZPS 8.1	TUME YA UCHAGUZI YA ZANZIBAR	Elections	Permanent	Full-time	1995-03-04 21:00:00	Minister	Head Office	1995-03-04 21:00:00	1996-09-20 22:50:07.326	2020-05-15 21:00:00	Confirmed	https://placehold.co/ardhil-hali-122.pdf	https://placehold.co/confirmation-122.pdf	https://placehold.co/contract-122.pdf	https://placehold.co/birth-cert-122.pdf	cmd06xe3n000pe6bquce6e6ga
emp_123	emp_entity_123	Election Manager Amina Ali	Female	https://placehold.co/150x150.png?text=EM	1966-08-18 21:00:00	Wete	Kaskazini Unguja	Tanzania	1906901231	0777-716541	P.O. Box 7244, Kizimbani, Zanzibar	ZSSF123	PAY0123	Director of Elections	ZPS 6.2	TUME YA UCHAGUZI YA ZANZIBAR	Election Management	Permanent	Full-time	1999-03-20 21:00:00	Director of Election Management	Head Office	1999-03-20 21:00:00	2001-02-17 12:41:07.995	2026-08-18 21:00:00	Confirmed	https://placehold.co/ardhil-hali-123.pdf	https://placehold.co/confirmation-123.pdf	https://placehold.co/contract-123.pdf	https://placehold.co/birth-cert-123.pdf	cmd06xe3n000pe6bquce6e6ga
emp_124	emp_entity_124	Voter Education Officer Omar Juma	Male	https://placehold.co/150x150.png?text=VE	1975-08-22 21:00:00	Mkoani	Kaskazini Unguja	Tanzania	1907951241	0777-212620	P.O. Box 5181, Wete, Zanzibar	ZSSF124	PAY0124	Voter Education Officer	ZPS 4.1	TUME YA UCHAGUZI YA ZANZIBAR	Civic Education	Permanent	Full-time	2013-08-06 21:00:00	Director of Civic Education	Head Office	2013-08-06 21:00:00	2014-09-01 00:44:24.286	2035-08-22 21:00:00	Confirmed	https://placehold.co/ardhil-hali-124.pdf	https://placehold.co/confirmation-124.pdf	https://placehold.co/contract-124.pdf	https://placehold.co/birth-cert-124.pdf	cmd06xe3n000pe6bquce6e6ga
emp_125	emp_entity_125	Protocol Officer Dr. Fatma Ali	Female	https://placehold.co/150x150.png?text=PO	1970-04-17 21:00:00	Bububu	Mjini Magharibi	Tanzania	1905871251	0777-170073	P.O. Box 8078, Chake Chake, Zanzibar	ZSSF125	PAY0125	Chief Protocol Officer	ZPS 6.2	OFISI YA RAIS - IKULU	Protocol	Permanent	Full-time	2005-02-04 21:00:00	Director of Protocol	Head Office	2005-02-04 21:00:00	2006-03-30 19:13:16.79	2030-04-17 21:00:00	Confirmed	https://placehold.co/ardhil-hali-125.pdf	https://placehold.co/confirmation-125.pdf	https://placehold.co/contract-125.pdf	https://placehold.co/birth-cert-125.pdf	cmd06xe43000we6bqegt3ofa0
emp_126	emp_entity_126	Security Advisor Ahmed Hassan Omar	Male	https://placehold.co/150x150.png?text=SA	1985-06-13 21:00:00	Kiwengwa	Kaskazini Unguja	Tanzania	1906921261	0777-531756	P.O. Box 7677, Mkoani, Zanzibar	ZSSF126	PAY0126	Security Advisor	ZPS 6.1	OFISI YA RAIS - IKULU	Security	Permanent	Full-time	2020-04-21 21:00:00	Director of Security	Head Office	2020-04-21 21:00:00	2021-07-27 04:05:37.393	2045-06-13 21:00:00	Confirmed	https://placehold.co/ardhil-hali-126.pdf	https://placehold.co/confirmation-126.pdf	https://placehold.co/contract-126.pdf	https://placehold.co/birth-cert-126.pdf	cmd06xe43000we6bqegt3ofa0
emp_127	emp_entity_127	Press Secretary Said Ali Hassan	Male	https://placehold.co/150x150.png?text=PS	1982-05-20 21:00:00	Kizimbani	Mjini Magharibi	Tanzania	1907971271	0777-252321	P.O. Box 5330, Chake Chake, Zanzibar	ZSSF127	PAY0127	Press Secretary	ZPS 5.2	OFISI YA RAIS - IKULU	Media Relations	Permanent	Full-time	2012-02-11 21:00:00	Director of Media Relations	Head Office	2012-02-11 21:00:00	2013-08-10 07:21:53.602	2042-05-20 21:00:00	Confirmed	https://placehold.co/ardhil-hali-127.pdf	https://placehold.co/confirmation-127.pdf	https://placehold.co/contract-127.pdf	https://placehold.co/birth-cert-127.pdf	cmd06xe43000we6bqegt3ofa0
emp_130	emp_entity_130	Program Coordinator Amina Hassan	Female	https://placehold.co/150x150.png?text=PC	1975-09-19 21:00:00	Kizimbani	Kusini Unguja	Tanzania	1907991301	0777-121407	P.O. Box 6679, Mkokotoni, Zanzibar	ZSSF130	PAY0130	Program Officer	ZPS 4.2	OFISI YA MAKAMO WA KWANZA WA RAISI	Program Management	Permanent	Full-time	2001-10-10 21:00:00	Director of Program Management	Head Office	2001-10-10 21:00:00	2003-04-26 21:26:13.491	2035-09-19 21:00:00	Confirmed	https://placehold.co/ardhil-hali-130.pdf	https://placehold.co/confirmation-130.pdf	https://placehold.co/contract-130.pdf	https://placehold.co/birth-cert-130.pdf	cmd06xe39000je6bqeouszvrd
emp_131	emp_entity_131	Administration Expert Engineer Omar Hassan	Male	https://placehold.co/150x150.png?text=AE	1959-09-04 21:00:00	Mkoani	Mjini Magharibi	Tanzania	1905911311	0777-230280	P.O. Box 8995, Nungwi, Zanzibar	ZSSF131	PAY0131	Principal Secretary	ZPS 8.1	OFISI YA MAKAMO WA PILI WA RAISI	Administration	Permanent	Full-time	1993-12-22 21:00:00	Minister	Head Office	1993-12-22 21:00:00	1995-06-11 09:22:26.528	2019-09-04 21:00:00	Confirmed	https://placehold.co/ardhil-hali-131.pdf	https://placehold.co/confirmation-131.pdf	https://placehold.co/contract-131.pdf	https://placehold.co/birth-cert-131.pdf	cmd06xe3p000qe6bqwqcuyke1
emp_132	emp_entity_132	Coordination Officer Dr. Fatma Said	Female	https://placehold.co/150x150.png?text=CO	1972-07-04 21:00:00	Chake Chake	Kusini Unguja	Tanzania	1906961321	0777-234800	P.O. Box 5894, Wete, Zanzibar	ZSSF132	PAY0132	Director of Coordination	ZPS 6.1	OFISI YA MAKAMO WA PILI WA RAISI	Inter-ministerial Coordination	Permanent	Full-time	1999-05-14 21:00:00	Director of Inter-ministerial Coordination	Head Office	1999-05-14 21:00:00	2000-08-19 11:02:56.11	2032-07-04 21:00:00	Confirmed	https://placehold.co/ardhil-hali-132.pdf	https://placehold.co/confirmation-132.pdf	https://placehold.co/contract-132.pdf	https://placehold.co/birth-cert-132.pdf	cmd06xe3p000qe6bqwqcuyke1
emp_133	emp_entity_133	Administrative Officer Ahmed Ali	Male	https://placehold.co/150x150.png?text=AO	1979-10-24 21:00:00	Jambiani	Kusini Unguja	Tanzania	1908011331	0777-196337	P.O. Box 6676, Chake Chake, Zanzibar	ZSSF133	PAY0133	Senior Administrative Officer	ZPS 4.2	OFISI YA MAKAMO WA PILI WA RAISI	General Administration	Permanent	Full-time	2007-06-30 21:00:00	Director of General Administration	Head Office	2007-06-30 21:00:00	2009-04-01 03:16:45.753	2039-10-24 21:00:00	Confirmed	https://placehold.co/ardhil-hali-133.pdf	https://placehold.co/confirmation-133.pdf	https://placehold.co/contract-133.pdf	https://placehold.co/birth-cert-133.pdf	cmd06xe3p000qe6bqwqcuyke1
emp_134	emp_entity_134	Islamic Scholar Dr. Hassan Juma Omar	Male	https://placehold.co/150x150.png?text=IS	1979-07-12 21:00:00	Chake Chake	Mjini Magharibi	Tanzania	1905931341	0777-185602	P.O. Box 1071, Kiwengwa, Zanzibar	ZSSF134	PAY0134	Deputy Mufti	ZPS 7.2	OFISI YA MUFTI MKUU WA ZANZIBAR	Islamic Affairs	Permanent	Full-time	2009-12-27 21:00:00	Director of Islamic Affairs	Head Office	2009-12-27 21:00:00	2011-05-21 00:38:03.424	2039-07-12 21:00:00	Confirmed	https://placehold.co/ardhil-hali-134.pdf	https://placehold.co/confirmation-134.pdf	https://placehold.co/contract-134.pdf	https://placehold.co/birth-cert-134.pdf	cmd06xe3t000se6bqknluakbq
emp_135	emp_entity_135	Islamic Education Officer Mwanajuma Hassan	Female	https://placehold.co/150x150.png?text=IE	1975-03-22 21:00:00	Jambiani	Kusini Pemba	Tanzania	1906981351	0777-261663	P.O. Box 6805, Kizimbani, Zanzibar	ZSSF135	PAY0135	Islamic Education Coordinator	ZPS 5.2	OFISI YA MUFTI MKUU WA ZANZIBAR	Religious Education	Permanent	Full-time	2003-06-04 21:00:00	Director of Religious Education	Head Office	2003-06-04 21:00:00	2004-09-04 17:56:42.79	2035-03-22 21:00:00	Confirmed	https://placehold.co/ardhil-hali-135.pdf	https://placehold.co/confirmation-135.pdf	https://placehold.co/contract-135.pdf	https://placehold.co/birth-cert-135.pdf	cmd06xe3t000se6bqknluakbq
emp_136	emp_entity_136	Religious Affairs Officer Said Omar Ali	Male	https://placehold.co/150x150.png?text=RA	1974-01-05 21:00:00	Kiwengwa	Kusini Pemba	Tanzania	1908031361	0777-339627	P.O. Box 6125, Mahonda, Zanzibar	ZSSF136	PAY0136	Religious Affairs Officer	ZPS 4.1	OFISI YA MUFTI MKUU WA ZANZIBAR	Community Outreach	Permanent	Full-time	2000-07-22 21:00:00	Director of Community Outreach	Head Office	2000-07-22 21:00:00	2002-06-25 03:26:55.589	2034-01-05 21:00:00	Confirmed	https://placehold.co/ardhil-hali-136.pdf	https://placehold.co/confirmation-136.pdf	https://placehold.co/contract-136.pdf	https://placehold.co/birth-cert-136.pdf	cmd06xe3t000se6bqknluakbq
emp_137	emp_entity_137	Regional Affairs Expert Prof. Dr. Amina Hassan	Female	https://placehold.co/150x150.png?text=RA	1958-10-22 21:00:00	Vitongoji	Kusini Unguja	Tanzania	1905951371	0777-781753	P.O. Box 5813, Nungwi, Zanzibar	ZSSF137	PAY0137	Principal Secretary	ZPS 8.1	OFISI YA RAIS, TAWALA ZA MIKOA, SERIKALI ZA MITAA NA IDARA MAALUMU ZA SMZ	Regional Affairs	Permanent	Full-time	1996-08-20 21:00:00	Minister	Head Office	1996-08-20 21:00:00	1998-04-13 23:58:59.279	2018-10-22 21:00:00	Confirmed	https://placehold.co/ardhil-hali-137.pdf	https://placehold.co/confirmation-137.pdf	https://placehold.co/contract-137.pdf	https://placehold.co/birth-cert-137.pdf	cmd06xe3g000me6bqh9gabe3e
emp_138	emp_entity_138	Local Government Specialist Dr. Omar Ali	Male	https://placehold.co/150x150.png?text=LG	1971-01-12 21:00:00	Bububu	Mjini Magharibi	Tanzania	1907001381	0777-877593	P.O. Box 6431, Stone Town, Zanzibar	ZSSF138	PAY0138	Director of Local Government	ZPS 6.2	OFISI YA RAIS, TAWALA ZA MIKOA, SERIKALI ZA MITAA NA IDARA MAALUMU ZA SMZ	Local Government	Permanent	Full-time	2003-03-12 21:00:00	Director of Local Government	Head Office	2003-03-12 21:00:00	2004-12-26 20:25:59.274	2031-01-12 21:00:00	Confirmed	https://placehold.co/ardhil-hali-138.pdf	https://placehold.co/confirmation-138.pdf	https://placehold.co/contract-138.pdf	https://placehold.co/birth-cert-138.pdf	cmd06xe3g000me6bqh9gabe3e
emp_139	emp_entity_139	Community Development Officer Dr. Fatma Juma Hassan	Female	https://placehold.co/150x150.png?text=CD	1988-07-13 21:00:00	Vitongoji	Kaskazini Pemba	Tanzania	1908051391	0777-845701	P.O. Box 6331, Mkokotoni, Zanzibar	ZSSF139	PAY0139	Community Development Coordinator	ZPS 5.1	OFISI YA RAIS, TAWALA ZA MIKOA, SERIKALI ZA MITAA NA IDARA MAALUMU ZA SMZ	Community Development	Permanent	Full-time	2019-05-08 21:00:00	Director of Community Development	Head Office	2019-05-08 21:00:00	2020-07-13 16:12:19.067	2048-07-13 21:00:00	Confirmed	https://placehold.co/ardhil-hali-139.pdf	https://placehold.co/confirmation-139.pdf	https://placehold.co/contract-139.pdf	https://placehold.co/birth-cert-139.pdf	cmd06xe3g000me6bqh9gabe3e
emp_140	emp_entity_140	Infrastructure Engineer Ahmed Said	Male	https://placehold.co/150x150.png?text=IE	1976-10-24 21:00:00	Chake Chake	Kusini Unguja	Tanzania	1909101401	0777-193565	P.O. Box 6523, Mahonda, Zanzibar	ZSSF140	PAY0140	Senior Engineer	ZPS 5.2	WIZARA YA UJENZI MAWASILIANO NA UCHUKUZI	Infrastructure	Permanent	Full-time	2002-08-08 21:00:00	Director of Infrastructure	Head Office	2002-08-08 21:00:00	2004-07-06 07:04:23.375	2036-10-24 21:00:00	Confirmed	https://placehold.co/ardhil-hali-140.pdf	https://placehold.co/confirmation-140.pdf	https://placehold.co/contract-140.pdf	https://placehold.co/birth-cert-140.pdf	cmd06xe37000ie6bq43r62ea6
emp1	emp1_id	Ali Juma Ali	Male	https://placehold.co/100x100.png?text=AJA	1980-05-15 00:00:00	Zanzibar City	Mjini Magharibi	Tanzania	221458232	0777-123-456	P.O. Box 123, Migombani, Zanzibar	ZSSF001	PAY001	Administrative Officer	ZPS 4.2	Public Service and Good Governance	Administration	Permanent	Full-time	2023-01-10 00:00:00	Director of Administration	HQ Office	2023-01-10 00:00:00	2025-07-12 23:37:57.134	2040-05-15 00:00:00	Confirmed	https://placehold.co/ardhil-hali.pdf	\N	https://placehold.co/job-contract-ali.pdf	https://placehold.co/birth-cert-ali.pdf	cmd06nn7n0001e67w2h5rf86x
emp_142	emp_entity_142	Energy Expert Zeinab Omar Hassan	Female	https://placehold.co/150x150.png?text=EE	1975-03-07 21:00:00	Vitongoji	Mjini Magharibi	Tanzania	1907021421	0777-763344	P.O. Box 5024, Chake Chake, Zanzibar	ZSSF142	PAY0142	Energy Coordinator	ZPS 5.2	WIZARA YA MAJI NISHATI NA MADINI	Renewable Energy	Permanent	Full-time	2002-05-03 21:00:00	Director of Renewable Energy	Head Office	2002-05-03 21:00:00	2003-08-06 19:14:13.768	2035-03-07 21:00:00	Confirmed	https://placehold.co/ardhil-hali-142.pdf	https://placehold.co/confirmation-142.pdf	https://placehold.co/contract-142.pdf	https://placehold.co/birth-cert-142.pdf	cmd06xe4g0012e6bqou5f9gur
emp_143	emp_entity_143	Trade Promotion Officer Said Omar	Male	https://placehold.co/150x150.png?text=TP	1992-10-06 21:00:00	Wete	Kusini Unguja	Tanzania	1908071431	0777-573965	P.O. Box 6728, Jambiani, Zanzibar	ZSSF143	PAY0143	Trade Development Officer	ZPS 4.2	WIZARA YA BIASHARA NA MAENDELEO YA VIWANDA	Export Promotion	Permanent	Full-time	2028-04-26 21:00:00	Director of Export Promotion	Head Office	2028-04-26 21:00:00	2029-09-08 15:00:51.431	2052-10-06 21:00:00	Confirmed	https://placehold.co/ardhil-hali-143.pdf	https://placehold.co/confirmation-143.pdf	https://placehold.co/contract-143.pdf	https://placehold.co/birth-cert-143.pdf	cmd06xe3b000ke6bqxuwovzub
emp_144	emp_entity_144	Youth Development Coordinator Dr. Amina Ali	Female	https://placehold.co/150x150.png?text=YD	1967-07-03 21:00:00	Jambiani	Kusini Pemba	Tanzania	1905991441	0777-467891	P.O. Box 3887, Wete, Zanzibar	ZSSF144	PAY0144	Youth Programs Director	ZPS 6.1	WIZARA YA HABARI, VIJANA, UTAMADUNI NA MICHEZO	Youth Development	Permanent	Full-time	1994-06-21 21:00:00	Director of Youth Development	Head Office	1994-06-21 21:00:00	1995-11-13 13:56:08.375	2027-07-03 21:00:00	Confirmed	https://placehold.co/ardhil-hali-144.pdf	https://placehold.co/confirmation-144.pdf	https://placehold.co/contract-144.pdf	https://placehold.co/birth-cert-144.pdf	cmd06xe3l000oe6bq5drrocqt
emp_145	emp_entity_145	Sports Development Officer Omar Hassan	Male	https://placehold.co/150x150.png?text=SD	1970-06-02 21:00:00	Chake Chake	Kaskazini Pemba	Tanzania	1907041451	0777-458370	P.O. Box 4261, Wete, Zanzibar	ZSSF145	PAY0145	Sports Coordinator	ZPS 4.2	WIZARA YA HABARI, VIJANA, UTAMADUNI NA MICHEZO	Sports Development	Permanent	Full-time	1998-08-19 21:00:00	Director of Sports Development	Head Office	1998-08-19 21:00:00	1999-12-18 03:49:07.85	2030-06-02 21:00:00	Confirmed	https://placehold.co/ardhil-hali-145.pdf	https://placehold.co/confirmation-145.pdf	https://placehold.co/contract-145.pdf	https://placehold.co/birth-cert-145.pdf	cmd06xe3l000oe6bq5drrocqt
emp_146	emp_entity_146	Employment Services Manager Fatma Ali	Female	https://placehold.co/150x150.png?text=ES	1991-09-20 21:00:00	Mkoani	Kusini Pemba	Tanzania	1908091461	0777-383381	P.O. Box 2985, Mahonda, Zanzibar	ZSSF146	PAY0146	Employment Services Manager	ZPS 5.1	SEKRETARIETI YA AJIRA	Job Placement	Permanent	Full-time	2027-11-02 21:00:00	Director of Job Placement	Head Office	2027-11-02 21:00:00	2029-06-22 16:10:15.583	2051-09-20 21:00:00	Confirmed	https://placehold.co/ardhil-hali-146.pdf	https://placehold.co/confirmation-146.pdf	https://placehold.co/contract-146.pdf	https://placehold.co/birth-cert-146.pdf	cmd06xe3e000le6bqscwfh5be
emp_147	emp_entity_147	Construction Project Manager Dr. Hassan Omar	Male	https://placehold.co/150x150.png?text=CP	1994-12-21 21:00:00	Mahonda	Mjini Magharibi	Tanzania	1906011471	0777-225979	P.O. Box 2555, Jambiani, Zanzibar	ZSSF147	PAY0147	Project Manager	ZPS 6.1	WAKALA WA MAJENGO ZANZIBAR	Infrastructure Projects	Permanent	Full-time	2033-12-14 21:00:00	Director of Infrastructure Projects	Head Office	2033-12-14 21:00:00	2035-07-06 23:07:32.189	2054-12-21 21:00:00	Confirmed	https://placehold.co/ardhil-hali-147.pdf	https://placehold.co/confirmation-147.pdf	https://placehold.co/contract-147.pdf	https://placehold.co/birth-cert-147.pdf	cmd06xe30000fe6bqe6ljiz1v
emp_148	emp_entity_148	Disaster Response Coordinator Amina Hassan	Female	https://placehold.co/150x150.png?text=DR	1993-03-31 21:00:00	Wete	Kusini Unguja	Tanzania	1907061481	0777-385995	P.O. Box 6397, Nungwi, Zanzibar	ZSSF148	PAY0148	Emergency Response Manager	ZPS 5.2	KAMISHENI YA KUKABILIANA NA MAAFA ZANZIBAR	Emergency Management	Permanent	Full-time	2029-03-18 21:00:00	Director of Emergency Management	Head Office	2029-03-18 21:00:00	2030-11-08 12:49:52.562	2053-03-31 21:00:00	Confirmed	https://placehold.co/ardhil-hali-148.pdf	https://placehold.co/confirmation-148.pdf	https://placehold.co/contract-148.pdf	https://placehold.co/birth-cert-148.pdf	cmd06xe2y000ee6bqel875c2s
emp_149	emp_entity_149	Archive Specialist Ahmed Omar	Male	https://placehold.co/150x150.png?text=AS	1986-09-20 21:00:00	Stone Town	Kaskazini Pemba	Tanzania	1908111491	0777-539503	P.O. Box 2599, Bububu, Zanzibar	ZSSF149	PAY0149	Digital Archivist	ZPS 4.2	TAASISI YA NYARAKA NA KUMBUKUMBU	Digital Archives	Permanent	Full-time	2021-07-14 21:00:00	Director of Digital Archives	Head Office	2021-07-14 21:00:00	2022-12-22 15:51:58.677	2046-09-20 21:00:00	Confirmed	https://placehold.co/ardhil-hali-149.pdf	https://placehold.co/confirmation-149.pdf	https://placehold.co/contract-149.pdf	https://placehold.co/birth-cert-149.pdf	cmd06xe2m0009e6bq0ps9u9ut
emp_150	emp_entity_150	Marine Conservation Expert Dr. Zeinab Ali	Female	https://placehold.co/150x150.png?text=MC	1991-04-30 21:00:00	Kizimbani	Kaskazini Unguja	Tanzania	1906031501	0777-685311	P.O. Box 1458, Bububu, Zanzibar	ZSSF150	PAY0150	Marine Biologist	ZPS 6.2	WIZARA YA UCHUMI WA BULUU NA UVUVI	Marine Conservation	Permanent	Full-time	2019-04-03 21:00:00	Director of Marine Conservation	Head Office	2019-04-03 21:00:00	2021-03-07 04:32:37.384	2051-04-30 21:00:00	Confirmed	https://placehold.co/ardhil-hali-150.pdf	https://placehold.co/confirmation-150.pdf	https://placehold.co/contract-150.pdf	https://placehold.co/birth-cert-150.pdf	cmd06xe3r000re6bqum8g62id
emp_151	emp_entity_151	Heritage Conservator Omar Ali Hassan	Male	https://placehold.co/150x150.png?text=HC	1993-03-10 21:00:00	Jambiani	Kaskazini Pemba	Tanzania	1907081511	0777-344531	P.O. Box 1470, Mkokotoni, Zanzibar	ZSSF151	PAY0151	Conservation Specialist	ZPS 5.2	WIZARA YA UTALII NA MAMBO YA KALE	Heritage Protection	Permanent	Full-time	2028-07-20 21:00:00	Director of Heritage Protection	Head Office	2028-07-20 21:00:00	2030-03-25 04:50:14.635	2053-03-10 21:00:00	Confirmed	https://placehold.co/ardhil-hali-151.pdf	https://placehold.co/confirmation-151.pdf	https://placehold.co/contract-151.pdf	https://placehold.co/birth-cert-151.pdf	cmd06xe40000ve6bqrip9e4m6
emp_024	emp_entity_24	Agronomist Fatma Said	Female	https://placehold.co/150x150.png?text=AFS	1989-08-27 21:00:00	Mahonda	Kaskazini Unguja	Tanzania	1906800240	0777-411893	P.O. Box 6643, Bububu, Zanzibar	ZSSF024	PAY0024	Director of Agriculture	ZPS 6.1	WIZARA YA KILIMO UMWAGILIAJI MALIASILI NA MIFUGO	Crop Production	Permanent	Full-time	2014-03-08 21:00:00	Director of Crop Production	Head Office	2014-03-08 21:00:00	2015-03-08 21:00:00	2049-08-27 21:00:00	Confirmed	https://placehold.co/ardhil-hali-24.pdf	https://placehold.co/confirmation-24.pdf	https://placehold.co/contract-24.pdf	https://placehold.co/birth-cert-24.pdf	cmd06xe34000he6bqfdqiw9ll
emp_037	emp_entity_37	Economist Juma Hassan	Male	https://placehold.co/150x150.png?text=EJH	1977-02-19 21:00:00	Bububu	Kaskazini Unguja	Tanzania	1905880370	0777-973886	P.O. Box 5205, Bububu, Zanzibar	ZSSF037	PAY0037	Principal Secretary	ZPS 8.1	WIZARA YA BIASHARA NA MAENDELEO YA VIWANDA	Trade Policy	Permanent	Full-time	2017-02-13 21:00:00	Director of Trade Policy	Head Office	2017-02-13 21:00:00	2018-02-13 21:00:00	2037-02-19 21:00:00	Confirmed	https://placehold.co/ardhil-hali-37.pdf	https://placehold.co/confirmation-37.pdf	https://placehold.co/contract-37.pdf	https://placehold.co/birth-cert-37.pdf	cmd06xe3b000ke6bqxuwovzub
emp_050	emp_entity_50	Gender Specialist Zeinab	Female	https://placehold.co/150x150.png?text=GSZ	1981-12-19 21:00:00	Chake Chake	Kusini Unguja	Tanzania	1907010500	0777-760498	P.O. Box 2208, Stone Town, Zanzibar	ZSSF050	PAY0050	Director of Gender	ZPS 6.1	WIZARA YA MAENDELEO YA JAMII,JINSIA,WAZEE NA WATOTO	Gender Affairs	Permanent	Full-time	2022-09-08 21:00:00	Director of Gender Affairs	Head Office	2022-09-08 21:00:00	2023-09-08 21:00:00	2041-12-19 21:00:00	Confirmed	https://placehold.co/ardhil-hali-50.pdf	https://placehold.co/confirmation-50.pdf	https://placehold.co/contract-50.pdf	https://placehold.co/birth-cert-50.pdf	cmd06xe270003e6bq0wm0v3c7
emp_066	emp_entity_66	Dr. Lawyer Zeinab Hassan	Female	https://placehold.co/150x150.png?text=DL	1957-01-26 21:00:00	Wete	Kaskazini Unguja	Tanzania	1906790660	0777-697138	P.O. Box 5326, Mahonda, Zanzibar	ZSSF066	PAY0066	Commissioner	ZPS 8.1	KAMISHENI YA UTUMISHI WA UMMA	Legal Affairs	Permanent	Full-time	1986-01-15 21:00:00	Director of Legal Affairs	Head Office	1986-01-15 21:00:00	1987-10-04 22:53:29.806	2017-01-26 21:00:00	Confirmed	https://placehold.co/ardhil-hali-66.pdf	https://placehold.co/confirmation-66.pdf	https://placehold.co/contract-66.pdf	https://placehold.co/birth-cert-66.pdf	cmd06xe2a0004e6bqwbtjm4x9
emp_079	emp_entity_79	Digital Archivist Hassan Ali	Male	https://placehold.co/150x150.png?text=DA	1971-03-16 21:00:00	Bububu	Kaskazini Pemba	Tanzania	1907920790	0777-604294	P.O. Box 2664, Mahonda, Zanzibar	ZSSF079	PAY0079	Digital Preservation Officer	ZPS 5.1	TAASISI YA NYARAKA NA KUMBUKUMBU	Digital Archives	Permanent	Full-time	2005-07-13 21:00:00	Director of Digital Archives	Head Office	2005-07-13 21:00:00	2007-01-11 00:54:28.672	2031-03-16 21:00:00	Confirmed	https://placehold.co/ardhil-hali-79.pdf	https://placehold.co/confirmation-79.pdf	https://placehold.co/contract-79.pdf	https://placehold.co/birth-cert-79.pdf	cmd06xe2m0009e6bq0ps9u9ut
emp_092	emp_entity_92	Teacher Trainer Hassan	Male	https://placehold.co/150x150.png?text=TT	1971-05-09 21:00:00	Bububu	Kusini Pemba	Tanzania	1908050920	0777-678256	P.O. Box 2991, Kizimbani, Zanzibar	ZSSF092	PAY0092	Teacher Development Officer	ZPS 5.1	TAASISI YA ELIMU YA ZANZIBAR	Teacher Training	Permanent	Full-time	1997-08-16 21:00:00	Director of Teacher Training	Head Office	1997-08-16 21:00:00	1998-10-28 02:13:39.93	2031-05-09 21:00:00	Confirmed	https://placehold.co/ardhil-hali-92.pdf	https://placehold.co/confirmation-92.pdf	https://placehold.co/contract-92.pdf	https://placehold.co/birth-cert-92.pdf	cmd06xe2w000de6bqzqo9qu3m
emp_104	emp_entity_104	Lawyer Dr. Ali Hassan Mohamed	Male	https://placehold.co/150x150.png?text=LD	1956-12-10 21:00:00	Kiwengwa	Mjini Magharibi	Tanzania	1905731041	0777-494518	P.O. Box 3086, Chake Chake, Zanzibar	ZSSF104	PAY0104	Director General	ZPS 8.1	MAMLAKA YA KUZUIA RUSHWA NA UHUJUMU WA UCHUMI ZANZIBAR	Investigations	Permanent	Full-time	1987-02-26 21:00:00	Minister	Head Office	1987-02-26 21:00:00	1988-10-11 14:13:52.689	2016-12-10 21:00:00	Confirmed	https://placehold.co/ardhil-hali-104.pdf	https://placehold.co/confirmation-104.pdf	https://placehold.co/contract-104.pdf	https://placehold.co/birth-cert-104.pdf	cmd06xe3w000te6bqc44b0xpr
emp_116	emp_entity_116	Constitutional Expert Dr. Amina Said	Female	https://placehold.co/150x150.png?text=CE	1963-09-15 21:00:00	Mkokotoni	Kaskazini Unguja	Tanzania	1905811161	0777-268239	P.O. Box 2794, Kizimbani, Zanzibar	ZSSF116	PAY0116	Principal Secretary	ZPS 8.1	OFISI YA RAIS - KATIBA SHERIA UTUMISHI NA UTAWALA BORA	Constitutional Affairs	Permanent	Full-time	1988-09-10 21:00:00	Minister	Head Office	1988-09-10 21:00:00	1990-03-17 23:01:02.214	2023-09-15 21:00:00	Confirmed	https://placehold.co/ardhil-hali-116.pdf	https://placehold.co/confirmation-116.pdf	https://placehold.co/contract-116.pdf	https://placehold.co/birth-cert-116.pdf	cmd06xe3i000ne6bq2q3y9g2z
emp_129	emp_entity_129	Development Specialist Hassan Ali Juma	Male	https://placehold.co/150x150.png?text=DS	1961-12-21 21:00:00	Chake Chake	Kusini Unguja	Tanzania	1906941291	0777-842365	P.O. Box 7922, Jambiani, Zanzibar	ZSSF129	PAY0129	Director of Development	ZPS 6.1	OFISI YA MAKAMO WA KWANZA WA RAISI	Development Programs	Permanent	Full-time	1994-11-04 21:00:00	Director of Development Programs	Head Office	1994-11-04 21:00:00	1996-04-01 08:06:03.946	2021-12-21 21:00:00	Confirmed	https://placehold.co/ardhil-hali-129.pdf	https://placehold.co/confirmation-129.pdf	https://placehold.co/contract-129.pdf	https://placehold.co/birth-cert-129.pdf	cmd06xe39000je6bqeouszvrd
emp_141	emp_entity_141	Agricultural Specialist Dr. Hassan Ali	Male	https://placehold.co/150x150.png?text=AS	1968-04-26 21:00:00	Stone Town	Kaskazini Unguja	Tanzania	1905971411	0777-874672	P.O. Box 4694, Bububu, Zanzibar	ZSSF141	PAY0141	Chief Agricultural Officer	ZPS 6.1	WIZARA YA KILIMO UMWAGILIAJI MALIASILI NA MIFUGO	Crop Production	Permanent	Full-time	2001-01-03 21:00:00	Director of Crop Production	Head Office	2001-01-03 21:00:00	2002-07-30 10:01:14.236	2028-04-26 21:00:00	Confirmed	https://placehold.co/ardhil-hali-141.pdf	https://placehold.co/confirmation-141.pdf	https://placehold.co/contract-141.pdf	https://placehold.co/birth-cert-141.pdf	cmd06xe34000he6bqfdqiw9ll
emp_020	emp_entity_20	Dr. Mwanajuma Said Ali	Female	https://placehold.co/150x150.png?text=DMSA	1976-07-21 21:00:00	Vitongoji	Kusini Pemba	Tanzania	1906650200	0777-799704	P.O. Box 5753, Bububu, Zanzibar	ZSSF020	PAY0020	daraja la II	ZPS 8.2	TUME YA UTUMISHI SERIKALINI	Administration	Permanent	Full-time	2000-02-26 21:00:00	Director of Administration	Head Office	2000-02-26 21:00:00	2001-02-25 21:00:00	2036-07-21 21:00:00	Confirmed	https://placehold.co/ardhil-hali-20.pdf	https://placehold.co/confirmation-20.pdf	https://placehold.co/contract-20.pdf	https://placehold.co/birth-cert-20.pdf	cmd059ion0000e6d85kexfukl
emp_002	emp_entity_2	Dr. Fatma Ali Mohamed	Female	https://placehold.co/150x150.png?text=DFAM	1984-03-08 21:00:00	Wete	Kaskazini Unguja	Tanzania	1904750020	0777-317972	P.O. Box 1160, Vitongoji, Zanzibar	ZSSF002	PAY0002	Muhudumu daraja la II	ZPS 7.2	OFISI YA RAIS, FEDHA NA MIPANGO	Finance	Permanent	Full-time	2001-08-24 21:00:00	Director of Finance	Head Office	2001-08-24 21:00:00	2002-08-24 21:00:00	2044-03-08 21:00:00	Confirmed	https://placehold.co/ardhil-hali-2.pdf	https://placehold.co/confirmation-2.pdf	https://placehold.co/contract-2.pdf	https://placehold.co/birth-cert-2.pdf	cmd06nn7n0001e67w2h5rf86x
ofisi_emp_003	\N	Salim Abdallah Mgeni	Male	https://placehold.co/150x150.png?text=SAM	1975-11-08 00:00:00	Wete	Kaskazini Pemba	Tanzania	1905751108	0777-456789	S.L.P 3456, Wete, Pemba	ZSSF2003	PAY2003	Katibu	ZPS 8.1	OFISI YA RAIS, FEDHA NA MIPANGO	Utawala	Permanent	Full-time	2014-07-15 00:00:00	Katibu Mkuu	Makao Makuu	2008-05-20 00:00:00	2009-05-20 00:00:00	2035-11-08 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
ofisi_emp_005	\N	Mwinyi Hamad Vuai	Male	https://placehold.co/150x150.png?text=MHV	1977-09-03 00:00:00	Bububu	Mjini Magharibi	Tanzania	1905770903	0777-678901	S.L.P 5678, Bububu, Zanzibar	ZSSF2005	PAY2005	Mkurugenzi Msaidizi	ZPS 6.1	OFISI YA RAIS, FEDHA NA MIPANGO	Uchumi	Permanent	Full-time	2013-12-20 00:00:00	Mkurugenzi Msaidizi	Makao Makuu	2007-10-01 00:00:00	2008-10-01 00:00:00	2037-09-03 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
ofisi_emp_007	\N	Khalid Juma Ali	Male	https://placehold.co/150x150.png?text=KJA	1979-04-18 00:00:00	Mkokotoni	Kaskazini Unguja	Tanzania	1905790418	0777-890123	S.L.P 7890, Mkokotoni, Zanzibar	ZSSF2007	PAY2007	Mkaguzi Mkuu	ZPS 5.1	OFISI YA RAIS, FEDHA NA MIPANGO	Ukaguzi	Permanent	Full-time	2016-11-05 00:00:00	Mkaguzi Mkuu wa Ndani	Makao Makuu	2011-08-15 00:00:00	2012-08-15 00:00:00	2039-04-18 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
ofisi_emp_008	\N	Asha Othman Shaaban	Female	https://placehold.co/150x150.png?text=AOS	1983-07-22 00:00:00	Mkoani	Kaskazini Pemba	Tanzania	1905830722	0777-901234	S.L.P 8901, Mkoani, Pemba	ZSSF2008	PAY2008	Afisa Uhalifu	ZPS 4.1	OFISI YA RAIS, FEDHA NA MIPANGO	Huduma za Wafanyakazi	Permanent	Full-time	2017-05-10 00:00:00	Mkuu wa Huduma za Wafanyakazi	Makao Makuu	2013-04-01 00:00:00	2014-04-01 00:00:00	2043-07-22 00:00:00	On LWOP	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
ofisi_emp_004	\N	Fatma Suleiman Kombo	Female	https://placehold.co/150x150.png?text=FSK	1982-02-14 00:00:00	Kizimkazi	Kusini Unguja	Tanzania	1905820214	0777-567890	S.L.P 4567, Kizimkazi, Zanzibar	ZSSF2004	PAY2004	Afisa Daraja la I	ZPS 5.1	OFISI YA RAIS, FEDHA NA MIPANGO	Bajeti	Permanent	Full-time	2017-09-01 00:00:00	Mkuu wa Kitengo cha Bajeti	Makao Makuu	2014-06-10 00:00:00	2015-06-10 00:00:00	2042-02-14 00:00:00	Resigned	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
ofisi_emp_022	\N	Halima Suleiman Vuai	Female	https://placehold.co/150x150.png?text=HSV	1993-08-05 00:00:00	Konde	Kusini Unguja	Tanzania	1905930805	0777-334567	S.L.P 2022, Konde, Zanzibar	ZSSF2022	PAY2022	Karani Mkuu	ZPS 3.1	OFISI YA RAIS, FEDHA NA MIPANGO	Utawala	Permanent	Full-time	2024-01-25 00:00:00	Karani Mkuu	Makao Makuu	2024-01-25 00:00:00	2025-07-21 07:32:59.174	2053-08-05 00:00:00	Retired	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
ofisi_emp_011	\N	Ibrahim Hassan Mohammed	Male	https://placehold.co/150x150.png?text=IHM	1990-08-12 00:00:00	Paje	Kusini Unguja	Tanzania	1905900812	0777-234567	S.L.P 2011, Paje, Zanzibar	ZSSF2011	PAY2011	Afisa Daraja la II	ZPS 3.1	OFISI YA RAIS, FEDHA NA MIPANGO	Fedha	Permanent	Full-time	2024-01-10 00:00:00	Afisa Fedha	Makao Makuu	2024-01-10 00:00:00	\N	2050-08-12 00:00:00	On Probation	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
ofisi_emp_017	\N	Hamis Mohammed Juma	Male	https://placehold.co/150x150.png?text=HMJ	1994-04-07 00:00:00	Jambiani	Kusini Unguja	Tanzania	1905940407	0777-890123	S.L.P 2017, Jambiani, Zanzibar	ZSSF2017	PAY2017	Afisa Ukaguzi	ZPS 3.1	OFISI YA RAIS, FEDHA NA MIPANGO	Ukaguzi	Permanent	Full-time	2024-03-15 00:00:00	Afisa Ukaguzi	Makao Makuu	2024-03-15 00:00:00	\N	2054-04-07 00:00:00	On Probation	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
ofisi_emp_015	\N	Juma Khamis Makame	Male	https://placehold.co/150x150.png?text=JKM	1991-01-28 00:00:00	Donge	Mjini Magharibi	Tanzania	1905910128	0777-678901	S.L.P 2015, Donge, Zanzibar	ZSSF2015	PAY2015	Afisa TEHAMA	ZPS 3.1	OFISI YA RAIS, FEDHA NA MIPANGO	Teknolojia ya Habari	Permanent	Full-time	2023-11-05 00:00:00	Afisa TEHAMA	Makao Makuu	2023-11-05 00:00:00	2025-07-21 11:23:20.361	2051-01-28 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
ofisi_emp_020	\N	Salma Juma Mwinyi	Female	https://placehold.co/150x150.png?text=SJM	1995-02-11 00:00:00	Matemwe	Kaskazini Unguja	Tanzania	1905950211	0777-112345	S.L.P 2020, Matemwe, Zanzibar	ZSSF2020	PAY2020	Afisa Uhalifu	ZPS 3.1	OFISI YA RAIS, FEDHA NA MIPANGO	Huduma za Wafanyakazi	Permanent	Full-time	2024-04-10 00:00:00	Afisa Uhalifu	Makao Makuu	2024-04-10 00:00:00	2025-07-22 05:13:20.613	2055-02-11 00:00:00	On LWOP	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
ofisi_emp_019	\N	Ali Hassan Haji	Male	https://placehold.co/150x150.png?text=AHH	1987-07-19 00:00:00	Gando	Kaskazini Pemba	Tanzania	1905870719	0777-012345	S.L.P 2019, Gando, Pemba	ZSSF2019	PAY2019	Afisa Uchumi	ZPS 3.1	OFISI YA RAIS, FEDHA NA MIPANGO	Uchumi	Permanent	Full-time	2023-05-25 00:00:00	Afisa Uchumi	Makao Makuu	2023-05-25 00:00:00	\N	2047-07-19 00:00:00	Terminated	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
ofisi_emp_001	\N	Hamza Khamis Maalim	Male	https://placehold.co/150x150.png?text=HKM	1978-03-15 00:00:00	Stone Town	Mjini Magharibi	Tanzania	1905780315	0777-234567	S.L.P 1234, Mjini, Zanzibar	ZSSF2001	PAY2001	Mkurugenzi	ZPS 7.1	OFISI YA RAIS, FEDHA NA MIPANGO	Mipango	Permanent	Full-time	2015-04-01 00:00:00	Mkuu wa Kitengo	Makao Makuu	2010-01-15 00:00:00	2011-01-15 00:00:00	2038-03-15 00:00:00	Dismissed	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
emp_001	emp_entity_1	Mwalimu Hassan Khamis	Male	https://placehold.co/150x150.png?text=MHK	1987-08-02 21:00:00	Kizimbani	Kaskazini Unguja	Tanzania	1905800010	0777-757808	P.O. Box 3445, Wete, Zanzibar	ZSSF001	PAY0001		ZPS 8.1	OFISI YA RAIS, FEDHA NA MIPANGO	Administration	Permanent	Full-time	2022-02-12 21:00:00	Director of Administration	Head Office	2022-02-12 21:00:00	2023-02-12 21:00:00	2026-08-14 00:00:00	Confirmed	https://placehold.co/ardhil-hali-1.pdf	https://placehold.co/confirmation-1.pdf	https://placehold.co/contract-1.pdf	https://placehold.co/birth-cert-1.pdf	cmd06nn7n0001e67w2h5rf86x
ofisi_emp_021	\N	Abdallah Khamis Said	Male	https://placehold.co/150x150.png?text=AKS	1986-10-23 00:00:00	Kangani	Kaskazini Pemba	Tanzania	1905861023	0777-223456	S.L.P 2021, Kangani, Pemba	ZSSF2021	PAY2021	Afisa Miradi	ZPS 3.1	OFISI YA RAIS, FEDHA NA MIPANGO	Mipango ya Maendeleo	Permanent	Full-time	2023-10-30 00:00:00	Afisa Miradi	Makao Makuu	2023-10-30 00:00:00	\N	2046-10-23 00:00:00	Terminated	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
ofisi_emp_012	\N	Rahma Ali Juma	Female	https://placehold.co/150x150.png?text=RAJ	1992-03-25 00:00:00	Mwera	Kaskazini Pemba	Tanzania	1905920325	0777-345678	S.L.P 2012, Mwera, Pemba	ZSSF2012	PAY2012	Afisa Bajeti	ZPS 3.1	OFISI YA RAIS, FEDHA NA MIPANGO	Bajeti	Permanent	Full-time	2023-09-15 00:00:00	Afisa Bajeti	Makao Makuu	2023-09-15 00:00:00	\N	2052-03-25 00:00:00	Terminated	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
ofisi_emp_014	\N	Khadija Mwinyi Vuai	Female	https://placehold.co/150x150.png?text=KMV	1993-06-16 00:00:00	Vitongoji	Kaskazini Pemba	Tanzania	1905930616	0777-567890	S.L.P 2014, Vitongoji, Pemba	ZSSF2014	PAY2014	Afisa Utawala	ZPS 3.1	OFISI YA RAIS, FEDHA NA MIPANGO	Utawala	Permanent	Full-time	2024-02-20 00:00:00	Afisa Utawala	Makao Makuu	2024-02-20 00:00:00	\N	2053-06-16 00:00:00	Terminated	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
ofisi_emp_018	\N	Maryam Othman Khamis	Female	https://placehold.co/150x150.png?text=MOK	1990-12-02 00:00:00	Kiwengwa	Kaskazini Unguja	Tanzania	1905901202	0777-901234	S.L.P 2018, Kiwengwa, Zanzibar	ZSSF2018	PAY2018	Afisa Takwimu	ZPS 3.1	OFISI YA RAIS, FEDHA NA MIPANGO	Takwimu na Utafiti	Permanent	Full-time	2023-08-20 00:00:00	Afisa Takwimu	Makao Makuu	2023-08-20 00:00:00	2025-07-21 00:00:00	2050-12-02 00:00:00	Dismissed	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
ofisi_emp_023	\N	Masoud Ali Mohammed	Male	https://placehold.co/150x150.png?text=MAM	1991-05-17 00:00:00	Mchangani	Kaskazini Unguja	Tanzania	1905910517	0777-445678	S.L.P 2023, Mchangani, Zanzibar	ZSSF2023	PAY2023	Afisa Rasilimali Watu	ZPS 3.1	OFISI YA RAIS, FEDHA NA MIPANGO	Huduma za Wafanyakazi	Permanent	Full-time	2023-12-15 00:00:00	Afisa Rasilimali Watu	Makao Makuu	2023-12-15 00:00:00	\N	2051-05-17 00:00:00	Retired	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
ofisi_emp_016	\N	Zainab Hamad Ali	Female	https://placehold.co/150x150.png?text=ZHA	1989-09-14 00:00:00	Kojani	Kaskazini Pemba	Tanzania	1905890914	0777-789012	S.L.P 2016, Kojani, Pemba	ZSSF2016	PAY2016	Karani	ZPS 2.1	OFISI YA RAIS, FEDHA NA MIPANGO	Huduma za Wafanyakazi	Permanent	Full-time	2023-06-12 00:00:00	Karani	Makao Makuu	2023-06-12 00:00:00	2025-08-05 00:51:03.966	2049-09-14 00:00:00	Retired	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
ofisi_emp_013	\N	Yusuf Suleiman Makame	Male	https://placehold.co/150x150.png?text=YSM	1988-11-30 00:00:00	Tunguu	Mjini Magharibi	Tanzania	1905881130	0777-456789	S.L.P 2013, Tunguu, Zanzibar	ZSSF2013	PAY2013	Afisa Mipango	ZPS 3.1	OFISI YA RAIS, FEDHA NA MIPANGO	Mipango	Permanent	Full-time	2023-07-01 00:00:00	Afisa Mipango	Makao Makuu	2023-07-01 00:00:00	\N	2048-11-30 00:00:00	Terminated	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
ofisi_emp_010	\N	Saada Khamis Hamad	Female	https://placehold.co/150x150.png?text=SKH	1981-05-05 00:00:00	Makunduchi	Kusini Unguja	Tanzania	1905810505	0777-123456	S.L.P 1012, Makunduchi, Zanzibar	ZSSF2010	PAY2010	Afisa Takwimu	ZPS 4.1	OFISI YA RAIS, FEDHA NA MIPANGO	Takwimu na Utafiti	Permanent	Full-time	2016-06-30 00:00:00	Mkuu wa Kitengo cha Takwimu	Makao Makuu	2012-05-15 00:00:00	2013-05-15 00:00:00	2043-05-06 00:00:00	Dismissed	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
cme571jn200003emp009	\N	Maryam Said Kombo	FEMALE	\N	1986-08-07 00:00:00	Kaskazini Pemba	Kaskazini Pemba	Tanzania	1986080709	0712345609	Wete, Pemba	ZSSF001242	WZR009	Afisa Mahakama ya Nidhamu	PS IV	Wizara ya Majaribio ya Mfumo na ukaguzi	Mahakama ya Nidhamu	Permanent	Full Time	\N	Ofisi Kuu - Stone Town	Wizara ya Majaribio ya Mfumo na ukaguzi	2019-12-03 00:00:00	2020-12-03 00:00:00	\N	Confirmed	\N	\N	\N	\N	cme571jn200002bcqa9freppg
cme571jn200003emp012	\N	Ibrahim Maulid Shaaban	MALE	\N	1990-10-20 00:00:00	Kusini Unguja	Kusini Unguja	Tanzania	1990102012	0712345612	Kizimkazi, Zanzibar	ZSSF001245	WZR012	Afisa Mipango Msaidizi	PS V	Wizara ya Majaribio ya Mfumo na ukaguzi	Kitengo cha Mipango	Temporary	Full Time	\N	Ofisi Kuu - Stone Town	Wizara ya Majaribio ya Mfumo na ukaguzi	2023-07-15 00:00:00	\N	\N	On Probation	\N	\N	\N	\N	cme571jn200002bcqa9freppg
cme45s2cw000b2bzwxcdtzm1x	\N	Mwalimu Salim Juma Hassan	Female	\N	1994-04-06 00:00:00	Wilaya ya Mjini Magharibi	Wilaya ya Kusini Pemba	Tanzania	1980234447	+255 358 472 546	P.O. Box 5556, Stone Town, Zanzibar	ZSSF13492967	PAY13492974	Mpishi wa Shule	D1	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Elimu ya Mapema	Temporary	Probationary Contract	\N	\N	\N	2023-04-06 00:00:00	\N	2054-04-06 00:00:00	On Probation	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme458qjz00052bo8vtp5tns2	\N	Mheshimiwa Omar Abdulla	Male	\N	1962-05-23 00:00:00	Wilaya ya Kaskazini Pemba	Wilaya ya Kusini Pemba	Tanzania	1987387146	+255 464 946 431	P.O. Box 9541, Zanzibar	ZSSF2331352	PAY2331352	Afisa Uwongozi	C1	Wizara ya Utumishi wa Umma	Idara ya Uchukuzi	Permanent	Permanent Contract	\N	\N	\N	1985-05-23 00:00:00	1988-05-23 00:00:00	2022-05-23 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme458qk300072bo87hr4hwsr	\N	Mwalimu Rashid Kombo	Female	\N	1962-12-19 00:00:00	Wilaya ya Kaskazini Unguja	Wilaya ya Kaskazini Pemba	Tanzania	1954120746	+255 150 510 983	P.O. Box 2487, Zanzibar	ZSSF2331353	PAY2331353	Afisa Rasilimali	A3	Wizara ya Utumishi wa Umma	Idara ya Elimu	Permanent	Permanent Contract	\N	\N	\N	1982-12-19 00:00:00	1985-12-19 00:00:00	2022-12-19 00:00:00	Confirmed	\N	\N	\N	\N	cmd06xe1x0000e6bqalx28nja
cme458qk700092bo840yv3eqk	\N	Bi. Mwanaisha Said	Female	\N	1962-10-27 00:00:00	Wilaya ya Mjini Magharibi	Wilaya ya Kaskazini Pemba	Tanzania	1932318394	+255 255 915 578	P.O. Box 6489, Zanzibar	ZSSF2331354	PAY2331354	Afisa Mipango	A3	Wizara ya Utumishi wa Umma	Idara ya Uchukuzi	Permanent	Permanent Contract	\N	\N	\N	1987-10-27 00:00:00	1988-10-27 00:00:00	2022-10-27 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
emp_006	emp_entity_6	Zeinab Mohammed Ali	Female	https://placehold.co/150x150.png?text=ZMA	1969-06-16 21:00:00	Mkoani	Kaskazini Pemba	Tanzania	1908920060	0777-450591	P.O. Box 6525, Stone Town, Zanzibar	ZSSF006	PAY0006		ZPS 4.1	OFISI YA RAIS, FEDHA NA MIPANGO	Registry	Permanent	Full-time	2012-10-02 21:00:00	Director of Registry	Head Office	2012-10-02 21:00:00	2013-10-02 21:00:00	2029-06-16 21:00:00	Resigned	https://placehold.co/ardhil-hali-6.pdf	https://placehold.co/confirmation-6.pdf	https://placehold.co/contract-6.pdf	https://placehold.co/birth-cert-6.pdf	cmd06nn7n0001e67w2h5rf86x
cme45oe35000n2bfwil1lx6vb	\N	Muuguzi Saida Hassan Bakari	Male	\N	1982-10-02 00:00:00	Wilaya ya Kaskazini Unguja	Wilaya ya Kusini Unguja	Tanzania	1938678506	+255 992 986 637	P.O. Box 3512, Stone Town, Zanzibar	ZSSF96350189	PAY96350145	Daktari wa Akili	D2	Wizara ya Afya	Idara ya Elimu ya Afya	Permanent	Permanent Contract	\N	\N	\N	2009-10-02 00:00:00	2010-10-02 00:00:00	2042-10-02 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe39000p2bfw9udearzd	\N	Muuguzi Ali Said Hassan	Male	\N	1975-11-23 00:00:00	Wilaya ya Mjini Magharibi	Wilaya ya Kusini Unguja	Tanzania	1950481719	+255 202 413 709	P.O. Box 9855, Stone Town, Zanzibar	ZSSF96350343	PAY96350366	Mkuu wa Idara ya Afya	D1	Wizara ya Afya	Idara ya Elimu ya Afya	Permanent	Permanent Contract	\N	\N	\N	1998-11-23 00:00:00	1999-11-23 00:00:00	2035-11-23 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe3h000t2bfw72unecxi	\N	Muuguzi Omar Bakari Said	Female	\N	1992-10-17 00:00:00	Wilaya ya Mjini Magharibi	Wilaya ya Kusini Pemba	Tanzania	1996756310	+255 710 614 794	P.O. Box 1733, Stone Town, Zanzibar	ZSSF96350740	PAY96350727	Mtaalamu wa Upasuaji	B2	Wizara ya Afya	Idara ya Hospitali za Rufaa	Permanent	Permanent Contract	\N	\N	\N	2021-10-17 00:00:00	2024-10-17 00:00:00	2052-10-17 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe3l000v2bfw4xuwvoip	\N	Muuguzi Fatuma Ali Hassan	Male	\N	1986-04-06 00:00:00	Wilaya ya Kaskazini Pemba	Wilaya ya Kaskazini Pemba	Tanzania	1934953332	+255 146 613 475	P.O. Box 3701, Stone Town, Zanzibar	ZSSF96350980	PAY96350965	Daktari wa Watoto	A1	Wizara ya Afya	Idara ya Elimu ya Afya	Permanent	Permanent Contract	\N	\N	\N	2014-04-06 00:00:00	2016-04-06 00:00:00	2046-04-06 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe1r00012bfwteydxp03	\N	Dkt. Amina Hassan Khamis	Female	\N	1998-08-05 00:00:00	Wilaya ya Mjini Magharibi	Wilaya ya Mjini Magharibi	Tanzania	1922183720	+255 254 187 247	P.O. Box 4815, Stone Town, Zanzibar	ZSSF9634723	PAY96347263	Mtaalamu wa Maabara	B2	Wizara ya Afya	Idara ya Hospitali za Rufaa	Temporary	Probationary Contract	\N	\N	\N	2022-08-05 00:00:00	\N	2058-08-05 00:00:00	On Probation	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe2q000f2bfwpadcd6pr	\N	Dkt. Rashid Omar Khamis	Female	\N	2000-03-15 00:00:00	Wilaya ya Kusini Unguja	Wilaya ya Kaskazini Unguja	Tanzania	1914154706	+255 912 694 446	P.O. Box 8739, Stone Town, Zanzibar	ZSSF96349135	PAY96349199	Katibu Msaidizi	A3	Wizara ya Afya	Idara ya Kudhibiti Magonjwa	Temporary	Probationary Contract	\N	\N	\N	2023-03-15 00:00:00	2025-08-10 09:36:49.073	2060-03-15 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme571jn200003emp016	\N	Omari Abdallah Makame	MALE	\N	1992-09-03 00:00:00	Mjini Magharibi	Mjini Magharibi	Tanzania	1992090316	0712345616	Kikwajuni, Zanzibar	ZSSF001249	WZR016	Msimamizi wa Ofisi	PS VII	Wizara ya Majaribio ya Mfumo na ukaguzi	Ofisi ya Utawala	Temporary	Full Time	\N	Ofisi Kuu - Stone Town	Wizara ya Majaribio ya Mfumo na ukaguzi	2023-09-05 00:00:00	\N	\N	On Probation	\N	\N	\N	\N	cme571jn200002bcqa9freppg
cme45oe3d000r2bfw3vs295u0	\N	Muuguzi Mwanaisha Juma Khamis	Female	\N	1978-09-17 00:00:00	Wilaya ya Kusini Pemba	Wilaya ya Kaskazini Pemba	Tanzania	1982207813	+255 838 968 614	P.O. Box 5535, Stone Town, Zanzibar	ZSSF96350533	PAY96350523	Mfuatiliaji wa Afya	C3	Wizara ya Afya	Idara ya Mipango na Takwimu za Afya	Permanent	Permanent Contract	\N	\N	\N	2002-09-17 00:00:00	2005-09-17 00:00:00	2038-09-17 00:00:00	On LWOP	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe31000l2bfw2kzug3tj	\N	Muuguzi Juma Khamis Omar	Male	\N	1987-05-12 00:00:00	Wilaya ya Kusini Pemba	Wilaya ya Kusini Unguja	Tanzania	1952245147	+255 592 455 638	P.O. Box 4504, Stone Town, Zanzibar	ZSSF96349915	PAY96349981	Afisa Muandamizi Daraja la III	C1	Wizara ya Afya	Idara ya Afya ya Mama na Mtoto	Permanent	Permanent Contract	\N	\N	\N	2013-05-12 00:00:00	2014-05-12 00:00:00	2026-08-24 00:00:00	Retired	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe51001l2bfwkoyni7sc	\N	Katibu Msaidizi Omar Said	Female	\N	1971-12-17 00:00:00	Wilaya ya Kaskazini Unguja	Wilaya ya Kusini Pemba	Tanzania	1940129398	+255 564 335 823	P.O. Box 4358, Stone Town, Zanzibar	ZSSF96353633	PAY96353639	Fundi Maabara	D2	Wizara ya Afya	Idara ya Mipango na Takwimu za Afya	Permanent	Permanent Contract	\N	\N	\N	1993-12-17 00:00:00	1996-12-17 00:00:00	2031-12-17 00:00:00	On LWOP	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
ofisi_emp_006	\N	Zubeda Mohammed Khamis	Female	https://placehold.co/150x150.png?text=ZMK	1985-12-25 00:00:00	Chake Chake	Kaskazini Pemba	Tanzania	1905851225	0777-789012	S.L.P 6789, Chake Chake, Pemba	ZSSF2006	PAY2006	Afisa Sera	ZPS 4.1	OFISI YA RAIS, FEDHA NA MIPANGO	Mipango ya Maendeleo	Permanent	Full-time	2018-03-15 00:00:00	Mratibu wa Miradi	Makao Makuu	2015-01-20 00:00:00	2016-01-20 00:00:00	2026-08-14 00:00:00	Retired	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
cme45oe3u000z2bfw6vafuog9	\N	Muuguzi Rehema Said Ali	Male	\N	1971-11-26 00:00:00	Wilaya ya Kusini Pemba	Wilaya ya Kusini Unguja	Tanzania	1991637119	+255 905 302 810	P.O. Box 6246, Stone Town, Zanzibar	ZSSF96351341	PAY96351341	Daktari Msaidizi	A2	Wizara ya Afya	Idara ya Afya ya Mama na Mtoto	Permanent	Permanent Contract	\N	\N	\N	1993-11-26 00:00:00	1994-11-26 00:00:00	2031-11-26 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe3y00112bfwlug5v4i9	\N	Afisa Afya Bakari Hassan	Male	\N	1978-06-01 00:00:00	Wilaya ya Kusini Unguja	Wilaya ya Mjini Magharibi	Tanzania	1996624191	+255 996 880 450	P.O. Box 9211, Stone Town, Zanzibar	ZSSF9635168	PAY96351650	Mfuatiliaji wa Afya	A3	Wizara ya Afya	Idara ya Utafiti wa Kiafya	Permanent	Permanent Contract	\N	\N	\N	2002-06-01 00:00:00	2005-06-01 00:00:00	2038-06-01 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe4200132bfwq53i4d03	\N	Afisa Afya Amina Said	Female	\N	1995-02-17 00:00:00	Wilaya ya Kaskazini Pemba	Wilaya ya Kaskazini Unguja	Tanzania	1968432654	+255 233 932 357	P.O. Box 7994, Stone Town, Zanzibar	ZSSF96351850	PAY96351854	Mtaalamu wa Pharmacy	D1	Wizara ya Afya	Idara ya Mipango na Takwimu za Afya	Permanent	Permanent Contract	\N	\N	\N	2024-02-17 00:00:00	2026-02-17 00:00:00	2055-02-17 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe4600152bfwhl1pv5cn	\N	Afisa Afya Omar Juma	Female	\N	1992-01-25 00:00:00	Wilaya ya Kusini Unguja	Wilaya ya Kaskazini Pemba	Tanzania	1994156101	+255 591 170 538	P.O. Box 4956, Stone Town, Zanzibar	ZSSF96352073	PAY96352012	Mtaalamu wa Maabara	A1	Wizara ya Afya	Idara ya Mipango na Takwimu za Afya	Permanent	Permanent Contract	\N	\N	\N	2020-01-25 00:00:00	2022-01-25 00:00:00	2052-01-25 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe4900172bfwtcr44czn	\N	Fundi Maabara Salim Hassan	Female	\N	1971-05-11 00:00:00	Wilaya ya Kaskazini Unguja	Wilaya ya Kaskazini Unguja	Tanzania	1978941788	+255 295 670 897	P.O. Box 6239, Stone Town, Zanzibar	ZSSF96352219	PAY9635225	Daktari Msaidizi	B3	Wizara ya Afya	Idara ya Mipango na Takwimu za Afya	Permanent	Permanent Contract	\N	\N	\N	1993-05-11 00:00:00	1994-05-11 00:00:00	2031-05-11 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe4d00192bfw2ca0djpr	\N	Fundi Maabara Fatma Khamis	Male	\N	1979-10-28 00:00:00	Wilaya ya Kaskazini Unguja	Wilaya ya Kaskazini Unguja	Tanzania	1920909665	+255 292 368 168	P.O. Box 2835, Stone Town, Zanzibar	ZSSF96352329	PAY96352392	Fundi Maabara	B2	Wizara ya Afya	Idara ya Dawa na Vifaa vya Matibabu	Permanent	Permanent Contract	\N	\N	\N	2008-10-28 00:00:00	2010-10-28 00:00:00	2039-10-28 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe4h001b2bfwo2py8f65	\N	Fundi Maabara Ali Said	Male	\N	1977-05-16 00:00:00	Wilaya ya Mjini Magharibi	Wilaya ya Kusini Pemba	Tanzania	1975308846	+255 341 251 975	P.O. Box 1956, Stone Town, Zanzibar	ZSSF96352594	PAY9635257	Afisa Afya	A3	Wizara ya Afya	Idara ya Dawa na Vifaa vya Matibabu	Permanent	Permanent Contract	\N	\N	\N	2003-05-16 00:00:00	2004-05-16 00:00:00	2037-05-16 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe4l001d2bfwxb5zowk0	\N	Mhunzi wa Mifumo Hassan Omar	Female	\N	1975-06-04 00:00:00	Wilaya ya Kusini Pemba	Wilaya ya Kaskazini Pemba	Tanzania	1925473855	+255 114 715 793	P.O. Box 5989, Stone Town, Zanzibar	ZSSF96352746	PAY96352791	Daktari wa Akili	A1	Wizara ya Afya	Idara ya Elimu ya Afya	Permanent	Permanent Contract	\N	\N	\N	1996-06-04 00:00:00	1998-06-04 00:00:00	2035-06-04 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe55001n2bfwjxuoygqs	\N	Msimamizi Halima Juma	Female	\N	1978-06-21 00:00:00	Wilaya ya Kaskazini Pemba	Wilaya ya Kusini Pemba	Tanzania	1910837645	+255 148 768 137	P.O. Box 4299, Stone Town, Zanzibar	ZSSF96353853	PAY96353835	Askari Usalama	D1	Wizara ya Afya	Idara ya Afya ya Mazingira	Permanent	Permanent Contract	\N	\N	\N	2006-06-21 00:00:00	2008-06-21 00:00:00	2038-06-21 00:00:00	On LWOP	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe4p001f2bfwwukijc9p	\N	Mhunzi wa Mifumo Zeinab Ali	Female	\N	1987-03-27 00:00:00	Wilaya ya Kaskazini Unguja	Wilaya ya Kusini Pemba	Tanzania	1959755076	+255 492 766 245	P.O. Box 9241, Stone Town, Zanzibar	ZSSF96352924	PAY96352978	Daktari Msaidizi	A2	Wizara ya Afya	Idara ya Afya ya Mama na Mtoto	Permanent	Permanent Contract	\N	\N	\N	2011-03-27 00:00:00	2014-03-27 00:00:00	2047-03-27 00:00:00	On LWOP	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe4t001h2bfwjfjjhfhu	\N	Mhunzi wa Mifumo Said Hassan	Female	\N	1981-04-22 00:00:00	Wilaya ya Kaskazini Unguja	Wilaya ya Kusini Pemba	Tanzania	1951261728	+255 422 578 606	P.O. Box 2469, Stone Town, Zanzibar	ZSSF9635315	PAY96353123	Muuguzi wa Jamii	A1	Wizara ya Afya	Idara ya Kudhibiti Magonjwa	Permanent	Permanent Contract	\N	\N	\N	2009-04-22 00:00:00	2010-04-22 00:00:00	2041-04-22 00:00:00	On LWOP	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe3p000x2bfwotzwnwbe	\N	Muuguzi Hassan Khamis Juma	Male	\N	1989-06-23 00:00:00	Wilaya ya Kaskazini Unguja	Wilaya ya Kusini Pemba	Tanzania	1980599435	+255 873 656 559	P.O. Box 5116, Stone Town, Zanzibar	ZSSF96351170	PAY9635116	Muuguzi Mkuu	A2	Wizara ya Afya	Idara ya Afya ya Mazingira	Permanent	Permanent Contract	\N	\N	\N	2012-06-23 00:00:00	2014-06-23 00:00:00	2049-06-23 00:00:00	Confirmed	/api/files/download/employee-documents/cme45oe3p000x2bfwotzwnwbe/1755485856962_ovf5ck_ardhil-hali_request_status_report_report.pdf	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe58001p2bfwksvkfg99	\N	Msimamizi Ali Hassan	Male	\N	1981-11-11 00:00:00	Wilaya ya Kusini Pemba	Wilaya ya Kusini Unguja	Tanzania	1978354325	+255 363 960 787	P.O. Box 9616, Stone Town, Zanzibar	ZSSF9635401	PAY96354059	Mtaalamu wa Pharmacy	C2	Wizara ya Afya	Idara ya Mipango na Takwimu za Afya	Permanent	Permanent Contract	\N	\N	\N	2004-11-11 00:00:00	2007-11-11 00:00:00	2041-11-11 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe5c001r2bfw49g9mcej	\N	Askari Usalama Hassan Said	Female	\N	1984-08-19 00:00:00	Wilaya ya Kusini Unguja	Wilaya ya Kaskazini Unguja	Tanzania	1973344072	+255 855 587 696	P.O. Box 6248, Stone Town, Zanzibar	ZSSF96354233	PAY96354293	Daktari wa Meno	C3	Wizara ya Afya	Idara ya Dawa na Vifaa vya Matibabu	Permanent	Permanent Contract	\N	\N	\N	2005-08-19 00:00:00	2008-08-19 00:00:00	2044-08-19 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
ofisi_emp_002	\N	Mariam Hassan Juma	Female	https://placehold.co/150x150.png?text=MHJ	1980-06-20 00:00:00	Micheweni	Kaskazini Pemba	Tanzania	1905800620	0777-345678	S.L.P 2345, Micheweni, Pemba	ZSSF2002	PAY2002	Afisa Mkuu Fedha	ZPS 6.1	OFISI YA RAIS, FEDHA NA MIPANGO	Fedha	Permanent	Full-time	2016-02-10 00:00:00	Mkuu wa Idara ya Fedha	Makao Makuu	2012-03-01 00:00:00	2013-03-01 00:00:00	2040-06-20 00:00:00	Retired	\N	\N	\N	\N	cmd06nn7n0001e67w2h5rf86x
cme45s2dc000l2bzw4081l4mb	\N	Mwalimu Mkuu Juma Khamis Omar	Male	\N	1977-05-19 00:00:00	Wilaya ya Kusini Pemba	Wilaya ya Kaskazini Pemba	Tanzania	1987674926	+255 277 767 499	P.O. Box 4647, Stone Town, Zanzibar	ZSSF13494342	PAY13494319	Afisa Mitaala	B1	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Elimu ya Mapema	Permanent	Permanent Contract	\N	\N	\N	2003-05-19 00:00:00	2004-05-19 00:00:00	2037-05-19 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2df000n2bzwbilk7mjt	\N	Mwalimu Mkuu Saida Hassan Bakari	Female	\N	1991-06-04 00:00:00	Wilaya ya Kusini Unguja	Wilaya ya Mjini Magharibi	Tanzania	1947575023	+255 936 683 133	P.O. Box 5639, Stone Town, Zanzibar	ZSSF13494659	PAY13494642	Mkuu wa Shule ya Msingi	A3	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Teknolojia ya Habari Elimu	Permanent	Permanent Contract	\N	\N	\N	2014-06-04 00:00:00	2016-06-04 00:00:00	2051-06-04 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2di000p2bzw5k8dx2g2	\N	Mwalimu Mkuu Ali Said Hassan	Male	\N	1987-06-01 00:00:00	Wilaya ya Kusini Unguja	Wilaya ya Kaskazini Unguja	Tanzania	1961368262	+255 653 328 915	P.O. Box 1523, Stone Town, Zanzibar	ZSSF1349481	PAY1349482	Afisa Fedha wa Elimu	B2	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Mafunzo ya Ujuzi	Permanent	Permanent Contract	\N	\N	\N	2011-06-01 00:00:00	2014-06-01 00:00:00	2047-06-01 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2dl000r2bzw448uqx3x	\N	Mwalimu Mkuu Mwanaisha Juma	Female	\N	1974-11-25 00:00:00	Wilaya ya Kusini Pemba	Wilaya ya Kusini Unguja	Tanzania	1984771053	+255 324 984 267	P.O. Box 8529, Stone Town, Zanzibar	ZSSF13495111	PAY13495182	Mwalimu wa Kiingereza	A3	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Teknolojia ya Habari Elimu	Permanent	Permanent Contract	\N	\N	\N	1996-11-25 00:00:00	1999-11-25 00:00:00	2034-11-25 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2dq000t2bzwxoinjhb8	\N	Mwalimu Mkuu Omar Bakari Said	Male	\N	1994-09-02 00:00:00	Wilaya ya Kaskazini Pemba	Wilaya ya Kusini Unguja	Tanzania	1930674345	+255 383 147 860	P.O. Box 6292, Stone Town, Zanzibar	ZSSF13495343	PAY13495345	Mkuu wa Shule ya Msingi	D1	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Elimu ya Msingi	Permanent	Permanent Contract	\N	\N	\N	2019-09-02 00:00:00	2021-09-02 00:00:00	2054-09-02 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2du000v2bzw3defkrki	\N	Afisa Elimu Bakari Hassan	Male	\N	1984-08-28 00:00:00	Wilaya ya Kaskazini Unguja	Wilaya ya Kusini Pemba	Tanzania	1930779609	+255 903 467 599	P.O. Box 3720, Stone Town, Zanzibar	ZSSF13495654	PAY13495651	Mwalimu wa Kiingereza	C3	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Elimu Maalumu	Permanent	Permanent Contract	\N	\N	\N	2004-08-28 00:00:00	2007-08-28 00:00:00	2044-08-28 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2dy000x2bzw8t7ukwj7	\N	Afisa Elimu Amina Said	Female	\N	1990-04-17 00:00:00	Wilaya ya Kaskazini Unguja	Wilaya ya Kaskazini Unguja	Tanzania	1932506087	+255 640 282 437	P.O. Box 1339, Stone Town, Zanzibar	ZSSF13495979	PAY13495929	Mwalimu Mkuu	B2	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Elimu ya Sekondari	Permanent	Permanent Contract	\N	\N	\N	2010-04-17 00:00:00	2013-04-17 00:00:00	2050-04-17 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2e1000z2bzwhpt0q2qc	\N	Afisa Elimu Omar Juma	Female	\N	1993-06-06 00:00:00	Wilaya ya Kaskazini Pemba	Wilaya ya Mjini Magharibi	Tanzania	1973110939	+255 125 609 732	P.O. Box 2931, Stone Town, Zanzibar	ZSSF1349623	PAY13496225	Mwalimu Mkuu	A1	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Mitaala na Vifaa vya Kufundishia	Permanent	Permanent Contract	\N	\N	\N	2015-06-06 00:00:00	2017-06-06 00:00:00	2053-06-06 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2e500112bzwb0awkq2k	\N	Mkaguzi Elimu Salim Hassan	Male	\N	1986-04-10 00:00:00	Wilaya ya Kaskazini Pemba	Wilaya ya Kusini Pemba	Tanzania	1965114612	+255 582 286 715	P.O. Box 8327, Stone Town, Zanzibar	ZSSF13496560	PAY13496547	Afisa Utafiti wa Elimu	D2	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Takwimu za Elimu	Permanent	Permanent Contract	\N	\N	\N	2008-04-10 00:00:00	2011-04-10 00:00:00	2046-04-10 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2e800132bzwe2yzjq5n	\N	Mkaguzi Elimu Fatma Khamis	Male	\N	1988-02-10 00:00:00	Wilaya ya Kaskazini Unguja	Wilaya ya Kusini Pemba	Tanzania	1930870877	+255 271 160 121	P.O. Box 7983, Stone Town, Zanzibar	ZSSF13496756	PAY13496764	Afisa Elimu	B2	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Utafiti wa Elimu	Permanent	Permanent Contract	\N	\N	\N	2013-02-10 00:00:00	2014-02-10 00:00:00	2048-02-10 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2ec00152bzwh239be0k	\N	Mkaguzi Elimu Ali Said	Female	\N	1975-05-27 00:00:00	Wilaya ya Mjini Magharibi	Wilaya ya Mjini Magharibi	Tanzania	1910369482	+255 677 261 517	P.O. Box 5803, Stone Town, Zanzibar	ZSSF13497098	PAY13497010	Afisa Elimu	A1	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Ukaguzi wa Elimu	Permanent	Permanent Contract	\N	\N	\N	1997-05-27 00:00:00	1999-05-27 00:00:00	2035-05-27 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2d2000f2bzwg3wyatvj	\N	Mwalimu Rashid Omar Khamis	Female	\N	1994-10-14 00:00:00	Wilaya ya Kusini Unguja	Wilaya ya Mjini Magharibi	Tanzania	1991889729	+255 702 253 126	P.O. Box 1717, Stone Town, Zanzibar	ZSSF13493450	PAY13493419	Mwalimu wa Msingi	C3	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Elimu Maalumu	Temporary	Probationary Contract	\N	\N	\N	2023-10-14 00:00:00	\N	2054-10-14 00:00:00	On Probation	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2d5000h2bzwljk4vpm0	\N	Mwalimu Halima Said Mohamed	Male	\N	1998-10-10 00:00:00	Wilaya ya Kusini Pemba	Wilaya ya Mjini Magharibi	Tanzania	1946743549	+255 183 906 887	P.O. Box 8675, Stone Town, Zanzibar	ZSSF13493738	PAY13493720	Makamu Mkuu wa Shule	B1	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Utafiti wa Elimu	Temporary	Probationary Contract	\N	\N	\N	2023-10-10 00:00:00	\N	2058-10-10 00:00:00	On Probation	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45oe5n001x2bfwankd1spr	\N	Mpishi Hospitali Amina Said	Male	\N	1970-10-01 00:00:00	Wilaya ya Kaskazini Unguja	Wilaya ya Mjini Magharibi	Tanzania	1975974352	+255 510 249 203	P.O. Box 1275, Stone Town, Zanzibar	ZSSF9635508	PAY96355045	Daktari Msaidizi	B2	Wizara ya Afya	Idara ya Elimu ya Afya	Permanent	Permanent Contract	\N	\N	\N	1996-10-01 00:00:00	1999-10-01 00:00:00	2030-10-01 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45s2ca00012bzw0qp14g7w	\N	Mwalimu Amina Hassan Khamis	Male	\N	2000-04-23 00:00:00	Wilaya ya Kaskazini Pemba	Wilaya ya Kaskazini Unguja	Tanzania	1946998378	+255 211 272 566	P.O. Box 9559, Stone Town, Zanzibar	ZSSF1349146	PAY13491422	Msafishaji wa Shule	B3	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Mafunzo ya Walimu	Temporary	Probationary Contract	\N	\N	\N	2024-04-23 00:00:00	\N	2060-04-23 00:00:00	On Probation	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2ch00032bzwmqdbwegs	\N	Mwalimu Omar Said Juma	Male	\N	1999-02-25 00:00:00	Wilaya ya Kaskazini Pemba	Wilaya ya Kusini Pemba	Tanzania	1951105532	+255 665 697 312	P.O. Box 8052, Stone Town, Zanzibar	ZSSF13491859	PAY13491876	Mwalimu wa Sekondari	C2	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Mahusiano ya Kimataifa	Temporary	Probationary Contract	\N	\N	\N	2024-02-25 00:00:00	\N	2059-02-25 00:00:00	On Probation	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2ck00052bzwkpr0dc6m	\N	Mwalimu Fatma Ali Bakari	Female	\N	1995-03-13 00:00:00	Wilaya ya Mjini Magharibi	Wilaya ya Kaskazini Pemba	Tanzania	1984493755	+255 825 980 524	P.O. Box 6933, Stone Town, Zanzibar	ZSSF13492154	PAY13492191	Dereva wa Shule	C2	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Majengo ya Shule	Temporary	Probationary Contract	\N	\N	\N	2016-03-13 00:00:00	\N	2055-03-13 00:00:00	On Probation	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2cp00072bzw75svw2hg	\N	Mwalimu Hassan Mohamed Omar	Male	\N	2000-07-26 00:00:00	Wilaya ya Kaskazini Pemba	Wilaya ya Kaskazini Unguja	Tanzania	1958130567	+255 714 245 249	P.O. Box 9608, Stone Town, Zanzibar	ZSSF13492359	PAY1349236	Askari wa Shule	B2	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Elimu ya Mapema	Temporary	Probationary Contract	\N	\N	\N	2024-07-26 00:00:00	\N	2060-07-26 00:00:00	On Probation	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2cs00092bzwdbbhbai2	\N	Mwalimu Zeinab Khamis Said	Female	\N	1999-07-25 00:00:00	Wilaya ya Kusini Pemba	Wilaya ya Mjini Magharibi	Tanzania	1930918226	+255 722 179 941	P.O. Box 6990, Stone Town, Zanzibar	ZSSF13492649	PAY13492680	Mwalimu wa Msingi	B1	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Utafiti wa Elimu	Temporary	Probationary Contract	\N	\N	\N	2022-07-25 00:00:00	\N	2059-07-25 00:00:00	On Probation	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2ef00172bzwpa4hym05	\N	Mtaalamu Mitaala Hassan Omar	Female	\N	1986-05-17 00:00:00	Wilaya ya Kaskazini Unguja	Wilaya ya Kaskazini Unguja	Tanzania	1994998672	+255 814 372 954	P.O. Box 9462, Stone Town, Zanzibar	ZSSF13497224	PAY13497255	Afisa Elimu wa Wilaya	C1	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Utafiti wa Elimu	Permanent	Permanent Contract	\N	\N	\N	2011-05-17 00:00:00	2012-05-17 00:00:00	2046-05-17 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2ei00192bzwjvpb4n51	\N	Mtaalamu Mitaala Zeinab Ali	Male	\N	1978-04-27 00:00:00	Wilaya ya Kusini Pemba	Wilaya ya Kusini Pemba	Tanzania	1940278029	+255 722 554 535	P.O. Box 8022, Stone Town, Zanzibar	ZSSF13497540	PAY13497563	Afisa Mafunzo ya Walimu	B1	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Mafunzo ya Ujuzi	Permanent	Permanent Contract	\N	\N	\N	2003-04-27 00:00:00	2006-04-27 00:00:00	2038-04-27 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2em001b2bzwip78km99	\N	Mtaalamu Mitaala Said Hassan	Male	\N	1970-11-06 00:00:00	Wilaya ya Kaskazini Pemba	Wilaya ya Kaskazini Unguja	Tanzania	1966338086	+255 823 268 933	P.O. Box 7415, Stone Town, Zanzibar	ZSSF13497777	PAY13497791	Afisa Mafunzo ya Walimu	A2	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Mahusiano ya Kimataifa	Permanent	Permanent Contract	\N	\N	\N	1991-11-06 00:00:00	1992-11-06 00:00:00	2030-11-06 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2ep001d2bzwfi2frgvh	\N	Mhadhiri Amina Hassan	Male	\N	1986-02-01 00:00:00	Wilaya ya Kaskazini Pemba	Wilaya ya Kaskazini Unguja	Tanzania	1941133733	+255 888 209 668	P.O. Box 4980, Stone Town, Zanzibar	ZSSF13498078	PAY13498065	Mshauri wa Elimu	D1	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Mitaala na Vifaa vya Kufundishia	Permanent	Permanent Contract	\N	\N	\N	2006-02-01 00:00:00	2009-02-01 00:00:00	2046-02-01 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2f2001l2bzwdlkj5igy	\N	Katibu Shule Omar Said	Male	\N	1981-09-22 00:00:00	Wilaya ya Kaskazini Pemba	Wilaya ya Kaskazini Unguja	Tanzania	1951790871	+255 990 718 453	P.O. Box 7707, Stone Town, Zanzibar	ZSSF13498991	PAY13498932	Msimamizi wa Shule	D2	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Mahusiano ya Kimataifa	Permanent	Permanent Contract	\N	\N	\N	2005-09-22 00:00:00	2007-09-22 00:00:00	2041-09-22 00:00:00	On LWOP	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2f4001n2bzwtqzhk0w9	\N	Msimamizi Shule Halima Juma	Male	\N	1981-03-03 00:00:00	Wilaya ya Kusini Pemba	Wilaya ya Kaskazini Pemba	Tanzania	1959125122	+255 609 641 833	P.O. Box 1042, Stone Town, Zanzibar	ZSSF13499141	PAY13499169	Afisa Elimu Mkuu	C3	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Teknolojia ya Habari Elimu	Permanent	Permanent Contract	\N	\N	\N	2006-03-03 00:00:00	2008-03-03 00:00:00	2041-03-03 00:00:00	On LWOP	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2es001f2bzw2vjekse8	\N	Mhadhiri Omar Said	Female	\N	1975-12-24 00:00:00	Wilaya ya Kaskazini Pemba	Wilaya ya Kaskazini Unguja	Tanzania	1920543756	+255 575 865 643	P.O. Box 4434, Stone Town, Zanzibar	ZSSF13498263	PAY1349825	Afisa Rasilimali wa Elimu	C3	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Elimu Maalumu	Permanent	Permanent Contract	\N	\N	\N	2003-12-24 00:00:00	2006-12-24 00:00:00	2035-12-24 00:00:00	On LWOP	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2ev001h2bzwt3ffpnmn	\N	Mhadhiri Halima Juma	Male	\N	1987-10-04 00:00:00	Wilaya ya Kusini Unguja	Wilaya ya Kusini Unguja	Tanzania	1918310408	+255 144 469 366	P.O. Box 4226, Stone Town, Zanzibar	ZSSF1349841	PAY13498452	Makamu Mkuu wa Shule	B2	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Elimu ya Mapema	Permanent	Permanent Contract	\N	\N	\N	2016-10-04 00:00:00	2017-10-04 00:00:00	2047-10-04 00:00:00	On LWOP	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2ez001j2bzw7phhmilm	\N	Katibu Shule Amina Hassan	Male	\N	1986-11-16 00:00:00	Wilaya ya Kusini Unguja	Wilaya ya Mjini Magharibi	Tanzania	1993535462	+255 400 904 520	P.O. Box 3972, Stone Town, Zanzibar	ZSSF13498683	PAY13498621	Mwalimu wa Kiingereza	D1	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Elimu ya Msingi	Permanent	Permanent Contract	\N	\N	\N	2012-11-16 00:00:00	2013-11-16 00:00:00	2046-11-16 00:00:00	On LWOP	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2fj001x2bzw753fj5dl	\N	Dereva Basi la Shule Amina Said	Male	\N	1973-06-11 00:00:00	Wilaya ya Kaskazini Pemba	Wilaya ya Kusini Unguja	Tanzania	1940807823	+255 290 417 550	P.O. Box 6489, Stone Town, Zanzibar	ZSSF13500032	PAY13500084	Mpishi wa Shule	B2	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Elimu ya Msingi	Permanent	Permanent Contract	\N	\N	\N	1993-06-11 00:00:00	1995-06-11 00:00:00	2033-06-11 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2f7001p2bzwi4tz5ggu	\N	Msimamizi Shule Ali Hassan	Male	\N	1986-04-28 00:00:00	Wilaya ya Kusini Unguja	Wilaya ya Mjini Magharibi	Tanzania	1936579337	+255 751 381 818	P.O. Box 9008, Stone Town, Zanzibar	ZSSF13499365	PAY13499336	Katibu Msaidizi wa Shule	B1	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Elimu ya Mapema	Permanent	Permanent Contract	\N	\N	\N	2011-04-28 00:00:00	2013-04-28 00:00:00	2046-04-28 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2fa001r2bzwjph80d3z	\N	Askari Shule Hassan Said	Female	\N	1989-12-15 00:00:00	Wilaya ya Kusini Pemba	Wilaya ya Mjini Magharibi	Tanzania	1996904258	+255 694 708 792	P.O. Box 2377, Stone Town, Zanzibar	ZSSF13499523	PAY13499593	Katibu Msaidizi wa Shule	D2	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Mitaala na Vifaa vya Kufundishia	Permanent	Permanent Contract	\N	\N	\N	2014-12-15 00:00:00	2016-12-15 00:00:00	2049-12-15 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45s2fd001t2bzwl4e4007x	\N	Mpishi Shule Omar Khamis	Male	\N	1984-12-08 00:00:00	Wilaya ya Kaskazini Unguja	Wilaya ya Kusini Pemba	Tanzania	1967149011	+255 803 429 513	P.O. Box 2010, Stone Town, Zanzibar	ZSSF13499696	PAY13499699	Mwalimu Msaidizi	D1	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Elimu Maalumu	Permanent	Permanent Contract	\N	\N	\N	2006-12-08 00:00:00	2007-12-08 00:00:00	2044-12-08 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme571jn200003emp006	\N	Hassan Juma Msangi	MALE	\N	1984-01-18 00:00:00	Mjini Magharibi	Mjini Magharibi	Tanzania	1984011806	0712345606	Malindi, Zanzibar	ZSSF001239	WZR006	Afisa Takwimu	PS IV	Wizara ya Majaribio ya Mfumo na ukaguzi	Idara ya Takwimu	Permanent	Full Time	\N	Ofisi Kuu - Stone Town	Wizara ya Majaribio ya Mfumo na ukaguzi	2019-07-08 00:00:00	2020-07-08 00:00:00	\N	Confirmed	\N	\N	\N	\N	cme571jn200002bcqa9freppg
cme571jn200003emp010	\N	Khamis Bakari Mfalme	MALE	\N	1981-04-03 00:00:00	Kusini Pemba	Kusini Pemba	Tanzania	1981040310	0712345610	Mkoani, Pemba	ZSSF001243	WZR010	Afisa Utendaji Mkuu	PS II	Wizara ya Majaribio ya Mfumo na ukaguzi	Idara ya Utendaji	Permanent	Full Time	\N	Ofisi Kuu - Stone Town	Wizara ya Majaribio ya Mfumo na ukaguzi	2018-08-16 00:00:00	2019-08-16 00:00:00	\N	Confirmed	\N	\N	\N	\N	cme571jn200002bcqa9freppg
cme571jn200003emp001	\N	Amina Hassan Mohamed	FEMALE	\N	1985-03-15 00:00:00	Mjini Magharibi	Mjini Magharibi	Tanzania	1985031501	0712345601	Vuga, Zanzibar	ZSSF001234	WZR001	Mkuu wa Idara ya Ukaguzi	PS II	Wizara ya Majaribio ya Mfumo na ukaguzi	Idara ya Ukaguzi	Permanent	Full Time	\N	Ofisi Kuu - Stone Town	Wizara ya Majaribio ya Mfumo na ukaguzi	2020-01-15 00:00:00	2021-01-15 00:00:00	\N	Confirmed	\N	\N	\N	\N	cme571jn200002bcqa9freppg
cme571jn200003emp002	\N	John Peter Mwalimu	MALE	\N	1982-07-22 00:00:00	Kusini Unguja	Kusini Unguja	Tanzania	1982072202	0712345602	Dimbani, Zanzibar	ZSSF001235	WZR002	Afisa Ukaguzi Mkuu	PS III	Wizara ya Majaribio ya Mfumo na ukaguzi	Idara ya Ukaguzi	Permanent	Full Time	\N	Ofisi Kuu - Stone Town	Wizara ya Majaribio ya Mfumo na ukaguzi	2019-03-10 00:00:00	2020-03-10 00:00:00	\N	Confirmed	\N	\N	\N	\N	cme571jn200002bcqa9freppg
cme571jn200003emp011	\N	Aisha Hamisi Juma	FEMALE	\N	1992-02-14 00:00:00	Mjini Magharibi	Mjini Magharibi	Tanzania	1992021411	0712345611	Shaurimoyo, Zanzibar	ZSSF001244	WZR011	Afisa Ukaguzi Msaidizi	PS V	Wizara ya Majaribio ya Mfumo na ukaguzi	Idara ya Ukaguzi	Temporary	Full Time	\N	Ofisi Kuu - Stone Town	Wizara ya Majaribio ya Mfumo na ukaguzi	2023-06-01 00:00:00	\N	\N	On Probation	\N	\N	\N	\N	cme571jn200002bcqa9freppg
cme571jn200003emp013	\N	Subira Ally Mrisho	FEMALE	\N	1993-05-08 00:00:00	Kaskazini Unguja	Kaskazini Unguja	Tanzania	1993050813	0712345613	Donge Karange, Zanzibar	ZSSF001246	WZR013	Afisa Takwimu Msaidizi	PS VI	Wizara ya Majaribio ya Mfumo na ukaguzi	Idara ya Takwimu	Temporary	Full Time	\N	Ofisi Kuu - Stone Town	Wizara ya Majaribio ya Mfumo na ukaguzi	2023-04-10 00:00:00	\N	\N	On Probation	\N	\N	\N	\N	cme571jn200002bcqa9freppg
cme571jn200003emp014	\N	Hamad Seif Mwalimu	MALE	\N	1991-11-12 00:00:00	Kaskazini Pemba	Kaskazini Pemba	Tanzania	1991111214	0712345614	Micheweni, Pemba	ZSSF001247	WZR014	Katibu Msaidizi	PS VII	Wizara ya Majaribio ya Mfumo na ukaguzi	Ofisi ya Utawala	Temporary	Full Time	\N	Ofisi Kuu - Stone Town	Wizara ya Majaribio ya Mfumo na ukaguzi	2023-08-22 00:00:00	\N	\N	On Probation	\N	\N	\N	\N	cme571jn200002bcqa9freppg
cme571jn200003emp015	\N	Rehema Vuai Hassan	FEMALE	\N	1994-07-25 00:00:00	Kusini Pemba	Kusini Pemba	Tanzania	1994072515	0712345615	Wingwi, Pemba	ZSSF001248	WZR015	Afisa Mawasiliano Msaidizi	PS VI	Wizara ya Majaribio ya Mfumo na ukaguzi	Idara ya Mawasiliano	Temporary	Full Time	\N	Ofisi Kuu - Stone Town	Wizara ya Majaribio ya Mfumo na ukaguzi	2023-05-18 00:00:00	\N	\N	On Probation	\N	\N	\N	\N	cme571jn200002bcqa9freppg
cme571jn200003emp017	\N	Halima Khamis Ali	FEMALE	\N	1993-12-16 00:00:00	Kusini Unguja	Kusini Unguja	Tanzania	1993121617	0712345617	Bungi, Zanzibar	ZSSF001250	WZR017	Afisa Utafiti Msaidizi	PS VI	Wizara ya Majaribio ya Mfumo na ukaguzi	Idara ya Utafiti	Temporary	Full Time	\N	Ofisi Kuu - Stone Town	Wizara ya Majaribio ya Mfumo na ukaguzi	2023-03-12 00:00:00	\N	\N	On Probation	\N	\N	\N	\N	cme571jn200002bcqa9freppg
cme571jn200003emp018	\N	Mussa Juma Mwalimu	MALE	\N	1990-06-28 00:00:00	Kaskazini Unguja	Kaskazini Unguja	Tanzania	1990062818	0712345618	Mahonda, Zanzibar	ZSSF001251	WZR018	Afisa Rasilimali Msaidizi	PS VI	Wizara ya Majaribio ya Mfumo na ukaguzi	Idara ya Rasilimali	Temporary	Full Time	\N	Ofisi Kuu - Stone Town	Wizara ya Majaribio ya Mfumo na ukaguzi	2023-10-08 00:00:00	\N	\N	On Probation	\N	\N	\N	\N	cme571jn200002bcqa9freppg
cme571jn200003emp019	\N	Rukia Hamad Salum	FEMALE	\N	1995-01-10 00:00:00	Kaskazini Pemba	Kaskazini Pemba	Tanzania	1995011019	0712345619	Tumbe, Pemba	ZSSF001252	WZR019	Katibu wa Idara	PS VII	Wizara ya Majaribio ya Mfumo na ukaguzi	Ofisi ya Utawala	Temporary	Full Time	\N	Ofisi Kuu - Stone Town	Wizara ya Majaribio ya Mfumo na ukaguzi	2023-11-20 00:00:00	\N	\N	On Probation	\N	\N	\N	\N	cme571jn200002bcqa9freppg
cme571jn200003emp003	\N	Fatuma Ali Khamis	FEMALE	\N	1988-11-08 00:00:00	Kaskazini Unguja	Kaskazini Unguja	Tanzania	1988110803	0712345603	Nungwi, Zanzibar	ZSSF001236	WZR003	Afisa Mfumo wa Utawala	PS IV	Wizara ya Majaribio ya Mfumo na ukaguzi	Idara ya Mfumo wa Utawala	Permanent	Full Time	\N	Ofisi Kuu - Stone Town	Wizara ya Majaribio ya Mfumo na ukaguzi	2021-06-20 00:00:00	2022-06-20 00:00:00	\N	Confirmed	\N	\N	\N	\N	cme571jn200002bcqa9freppg
cme571jn200003emp004	\N	Rashid Omar Salum	MALE	\N	1980-05-12 00:00:00	Kaskazini Pemba	Kaskazini Pemba	Tanzania	1980051204	0712345604	Konde, Pemba	ZSSF001237	WZR004	Mkuu wa Kitengo cha Mipango	PS II	Wizara ya Majaribio ya Mfumo na ukaguzi	Kitengo cha Mipango	Permanent	Full Time	\N	Ofisi Kuu - Stone Town	Wizara ya Majaribio ya Mfumo na ukaguzi	2018-09-05 00:00:00	2019-09-05 00:00:00	\N	Confirmed	\N	\N	\N	\N	cme571jn200002bcqa9freppg
cme571jn200003emp005	\N	Mwajuma Abdallah Mtumwa	FEMALE	\N	1987-09-30 00:00:00	Kusini Pemba	Kusini Pemba	Tanzania	1987093005	0712345605	Chake Chake, Pemba	ZSSF001238	WZR005	Afisa Utafiti wa Sera	PS III	Wizara ya Majaribio ya Mfumo na ukaguzi	Idara ya Utafiti wa Sera	Permanent	Full Time	\N	Ofisi Kuu - Stone Town	Wizara ya Majaribio ya Mfumo na ukaguzi	2020-11-12 00:00:00	2021-11-12 00:00:00	\N	Confirmed	\N	\N	\N	\N	cme571jn200002bcqa9freppg
cme571jn200003emp007	\N	Zaina Mohamed Bakari	FEMALE	\N	1989-12-25 00:00:00	Kusini Unguja	Kusini Unguja	Tanzania	1989122507	0712345607	Makunduchi, Zanzibar	ZSSF001240	WZR007	Afisa Mawasiliano	PS V	Wizara ya Majaribio ya Mfumo na ukaguzi	Idara ya Mawasiliano	Permanent	Full Time	\N	Ofisi Kuu - Stone Town	Wizara ya Majaribio ya Mfumo na ukaguzi	2021-02-14 00:00:00	2022-02-14 00:00:00	\N	Confirmed	\N	\N	\N	\N	cme571jn200002bcqa9freppg
cme571jn200003emp008	\N	Salim Hamad Mwinyi	MALE	\N	1983-06-14 00:00:00	Kaskazini Unguja	Kaskazini Unguja	Tanzania	1983061408	0712345608	Mkokotoni, Zanzibar	ZSSF001241	WZR008	Afisa Rasilimali Watu	PS III	Wizara ya Majaribio ya Mfumo na ukaguzi	Idara ya Rasilimali Watu	Permanent	Full Time	\N	Ofisi Kuu - Stone Town	Wizara ya Majaribio ya Mfumo na ukaguzi	2020-04-22 00:00:00	2021-04-22 00:00:00	\N	Confirmed	\N	\N	\N	\N	cme571jn200002bcqa9freppg
emp_014	emp_entity_14	Dr. Khadija Ali Mohamed	Female	https://placehold.co/150x150.png?text=DKAM	1968-09-08 21:00:00	Stone Town	Kusini Pemba	Tanzania	1907750140	0777-952241	P.O. Box 1663, Chake Chake, Zanzibar	ZSSF014	PAY0014	Chief Medical Officer	ZPS 7.1	WIZARA YA AFYA	Clinical Services	Permanent	Full-time	2005-06-26 21:00:00	Director of Clinical Services	Head Office	2005-06-26 21:00:00	2006-06-26 21:00:00	2028-09-08 21:00:00	On LWOP	https://placehold.co/ardhil-hali-14.pdf	https://placehold.co/confirmation-14.pdf	https://placehold.co/contract-14.pdf	https://placehold.co/birth-cert-14.pdf	cmd06nn7u0003e67wa4hiyie7
cme45oe2000032bfwn1zsdqfe	\N	Dkt. Omar Said Juma	Male	\N	1991-08-09 00:00:00	Wilaya ya Kaskazini Unguja	Wilaya ya Kusini Unguja	Tanzania	1967450477	+255 484 782 126	P.O. Box 2108, Stone Town, Zanzibar	ZSSF96347591	PAY96347541	Msafishaji wa Hospitali	A2	Wizara ya Afya	Idara ya Magonjwa Yasiyo ya Kuambukiza	Temporary	Probationary Contract	\N	\N	\N	2011-08-09 00:00:00	\N	2051-08-09 00:00:00	On Probation	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe2500052bfwa4brwe5k	\N	Dkt. Fatma Ali Bakari	Male	\N	1991-04-12 00:00:00	Wilaya ya Kaskazini Pemba	Wilaya ya Kusini Pemba	Tanzania	1942533811	+255 709 595 376	P.O. Box 7763, Stone Town, Zanzibar	ZSSF96347774	PAY96347792	Fundi Maabara	B1	Wizara ya Afya	Idara ya Elimu ya Afya	Temporary	Probationary Contract	\N	\N	\N	2013-04-12 00:00:00	\N	2051-04-12 00:00:00	On Probation	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe2900072bfwwhh9l9wp	\N	Dkt. Hassan Mohamed Omar	Male	\N	1995-02-26 00:00:00	Wilaya ya Kusini Pemba	Wilaya ya Kaskazini Pemba	Tanzania	1951685490	+255 153 701 712	P.O. Box 9358, Stone Town, Zanzibar	ZSSF9634803	PAY96348071	Mpishi wa Hospitali	A3	Wizara ya Afya	Idara ya Mipango na Takwimu za Afya	Temporary	Probationary Contract	\N	\N	\N	2022-02-26 00:00:00	\N	2055-02-26 00:00:00	On Probation	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe2d00092bfw5ycepf00	\N	Dkt. Zeinab Khamis Said	Male	\N	1990-09-10 00:00:00	Wilaya ya Kusini Unguja	Wilaya ya Kusini Unguja	Tanzania	1918143063	+255 153 948 981	P.O. Box 4687, Stone Town, Zanzibar	ZSSF96348382	PAY9634833	Daktari wa Meno	A1	Wizara ya Afya	Idara ya Huduma za Msingi za Afya	Temporary	Probationary Contract	\N	\N	\N	2023-09-10 00:00:00	\N	2050-09-10 00:00:00	On Probation	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe2i000b2bfw155920ro	\N	Dkt. Salim Juma Hassan	Female	\N	1998-12-03 00:00:00	Wilaya ya Kusini Unguja	Wilaya ya Kusini Unguja	Tanzania	1955292142	+255 499 417 707	P.O. Box 5541, Stone Town, Zanzibar	ZSSF96348626	PAY96348631	Daktari wa Watoto	A2	Wizara ya Afya	Idara ya Afya ya Mazingira	Temporary	Probationary Contract	\N	\N	\N	2018-12-03 00:00:00	\N	2058-12-03 00:00:00	On Probation	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe2u000h2bfwmhka9n0f	\N	Dkt. Halima Said Mohamed	Male	\N	1996-06-11 00:00:00	Wilaya ya Kaskazini Unguja	Wilaya ya Kaskazini Unguja	Tanzania	1940135156	+255 665 376 941	P.O. Box 4720, Stone Town, Zanzibar	ZSSF96349456	PAY96349475	Muuguzi wa Jamii	A2	Wizara ya Afya	Idara ya Magonjwa Yasiyo ya Kuambukiza	Temporary	Probationary Contract	\N	\N	\N	2023-06-11 00:00:00	\N	2056-06-11 00:00:00	On Probation	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe2y000j2bfw3nmn43ow	\N	Muuguzi Asha Mohamed Ali	Female	\N	1995-07-27 00:00:00	Wilaya ya Kaskazini Pemba	Wilaya ya Kaskazini Pemba	Tanzania	1952317271	+255 761 754 911	P.O. Box 2004, Stone Town, Zanzibar	ZSSF96349675	PAY96349615	Afisa Rasilimali wa Afya	C3	Wizara ya Afya	Idara ya Huduma za Msingi za Afya	Temporary	Probationary Contract	\N	\N	\N	2021-07-27 00:00:00	\N	2055-07-27 00:00:00	On Probation	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe4y001j2bfw098wdjso	\N	Katibu Msaidizi Amina Hassan	Female	\N	1978-11-16 00:00:00	Wilaya ya Kaskazini Unguja	Wilaya ya Kaskazini Pemba	Tanzania	1982871361	+255 341 912 516	P.O. Box 6512, Stone Town, Zanzibar	ZSSF96353369	PAY96353331	Msafishaji wa Hospitali	B3	Wizara ya Afya	Idara ya Elimu ya Afya	Permanent	Permanent Contract	\N	\N	\N	2001-11-16 00:00:00	2002-11-16 00:00:00	2038-11-16 00:00:00	On LWOP	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45s2cz000d2bzw764s25tv	\N	Mwalimu Mariam Bakari Ali	Male	\N	1993-02-05 00:00:00	Wilaya ya Mjini Magharibi	Wilaya ya Kaskazini Unguja	Tanzania	1922232855	+255 165 270 914	P.O. Box 2914, Stone Town, Zanzibar	ZSSF13493274	PAY13493221	Mkuu wa Shule ya Msingi	A1	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Ukaguzi wa Elimu	Temporary	Probationary Contract	\N	\N	\N	2020-02-05 00:00:00	\N	2053-02-05 00:00:00	On Probation	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45oe2m000d2bfwd3agas2u	\N	Dkt. Mariam Bakari Ali	Male	\N	1991-06-20 00:00:00	Wilaya ya Kaskazini Pemba	Wilaya ya Kusini Unguja	Tanzania	1917336461	+255 596 299 186	P.O. Box 9526, Stone Town, Zanzibar	ZSSF96348866	PAY96348868	Afisa Utendaji wa Afya	B1	Wizara ya Afya	Idara ya Dawa na Vifaa vya Matibabu	Temporary	Probationary Contract	\N	\N	\N	2021-06-20 00:00:00	2025-08-10 11:32:22.426	2051-06-20 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme571jn200003emp020	\N	Bakari Mohamed Khamis	MALE	\N	1991-08-22 00:00:00	Kusini Pemba	Kusini Pemba	Tanzania	1991082220	0712345620	Mtambwe, Pemba	ZSSF001253	WZR020	Afisa Ufuatiliaji	PS VI	Wizara ya Majaribio ya Mfumo na ukaguzi	Idara ya Ufuatiliaji	Temporary	Full Time	\N	Ofisi Kuu - Stone Town	Wizara ya Majaribio ya Mfumo na ukaguzi	2023-12-01 00:00:00	\N	\N	On LWOP	\N	\N	\N	\N	cme571jn200002bcqa9freppg
cme45s2d9000j2bzw5jox7u37	\N	Mwalimu Mkuu Asha Mohamed Ali	Female	\N	1999-06-05 00:00:00	Wilaya ya Mjini Magharibi	Wilaya ya Kaskazini Unguja	Tanzania	1947916786	+255 351 353 139	P.O. Box 9755, Stone Town, Zanzibar	ZSSF13494017	PAY13494054	Afisa Elimu Mkuu	C3	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Teknolojia ya Habari Elimu	Temporary	Probationary Contract	\N	\N	\N	2024-06-05 00:00:00	\N	2059-06-05 00:00:00	On Probation	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme458qjv00032bo8ygt0f3mt	\N	Mwalimu Seif Ali	Female	\N	1964-06-24 00:00:00	Wilaya ya Kaskazini Pemba	Wilaya ya Kusini Pemba	Tanzania	1944279492	+255 618 318 987	P.O. Box 1732, Zanzibar	ZSSF2331351	PAY2331351	Makamu Mkuu wa Idara	A2	Wizara ya Utumishi wa Umma	Idara ya Mazingira	Permanent	Permanent Contract	\N	\N	\N	1992-06-24 00:00:00	1993-06-24 00:00:00	2024-06-24 00:00:00	Confirmed	\N	\N	\N	\N	cmd06xe2c0005e6bqulk6iu8g
cme458qkd000b2bo8h7xdojru	\N	Mheshimiwa Hamza Khamis	Female	\N	1964-09-10 00:00:00	Wilaya ya Kusini Unguja	Wilaya ya Kaskazini Pemba	Tanzania	1955789608	+255 774 203 889	P.O. Box 6521, Zanzibar	ZSSF2331355	PAY2331355	Muhandisi Mkuu	C2	Wizara ya Utumishi wa Umma	Idara ya Uchukuzi	Permanent	Permanent Contract	\N	\N	\N	1990-09-10 00:00:00	1991-09-10 00:00:00	2024-09-10 00:00:00	Confirmed	\N	\N	\N	\N	cmd059ion0000e6d85kexfukl
cme458qkh000d2bo8cm7ahryb	\N	Mheshimiwa Nassor Juma	Male	\N	1964-05-16 00:00:00	Wilaya ya Mjini Magharibi	Wilaya ya Mjini Magharibi	Tanzania	1970365780	+255 334 915 788	P.O. Box 9512, Zanzibar	ZSSF2331356	PAY2331356	Afisa Mkuu	B2	Wizara ya Utumishi wa Umma	Idara ya Mazingira	Permanent	Permanent Contract	\N	\N	\N	1991-05-16 00:00:00	1994-05-16 00:00:00	2024-05-16 00:00:00	Confirmed	\N	\N	\N	\N	cmd059ion0000e6d85kexfukl
cme458qkk000f2bo8zq9xoekk	\N	Mheshimiwa Ali Hassan	Female	\N	1960-10-08 00:00:00	Wilaya ya Kaskazini Pemba	Wilaya ya Mjini Magharibi	Tanzania	1927893750	+255 166 575 221	P.O. Box 4458, Zanzibar	ZSSF2331357	PAY2331357	Mkuu wa Idara	C2	Wizara ya Utumishi wa Umma	Idara ya Rasilimali Watu	Permanent	Permanent Contract	\N	\N	\N	1986-10-08 00:00:00	1988-10-08 00:00:00	2020-10-08 00:00:00	Confirmed	\N	\N	\N	\N	cmd06xe270003e6bq0wm0v3c7
cme458qkp000h2bo8f0mvb00y	\N	Mwalimu Hassan Juma	Female	\N	1964-07-10 00:00:00	Wilaya ya Mjini Magharibi	Wilaya ya Kusini Pemba	Tanzania	1945799286	+255 554 158 660	P.O. Box 2471, Zanzibar	ZSSF2331368	PAY2331368	Afisa Elimu	B3	Wizara ya Utumishi wa Umma	Idara ya Fedha	Permanent	Permanent Contract	\N	\N	\N	1987-07-10 00:00:00	1989-07-10 00:00:00	2024-07-10 00:00:00	Confirmed	\N	\N	\N	\N	cmd06xe2c0005e6bqulk6iu8g
cme458qku000j2bo8j9phu26l	\N	Mwalimu Seif Ali	Male	\N	1963-11-28 00:00:00	Wilaya ya Mjini Magharibi	Wilaya ya Kaskazini Pemba	Tanzania	1953383719	+255 697 170 915	P.O. Box 3214, Zanzibar	ZSSF2331369	PAY2331369	Daktari Mkuu	A2	Wizara ya Utumishi wa Umma	Idara ya Mawasiliano	Permanent	Permanent Contract	\N	\N	\N	1990-11-28 00:00:00	1991-11-28 00:00:00	2023-11-28 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme458qky000l2bo881o42hhj	\N	Bi. Zeinab Hamad	Male	\N	1962-12-03 00:00:00	Wilaya ya Mjini Magharibi	Wilaya ya Kaskazini Unguja	Tanzania	1914465716	+255 103 453 307	P.O. Box 9681, Zanzibar	ZSSF23313610	PAY23313610	Afisa Mkuu	B1	Wizara ya Utumishi wa Umma	Idara ya Fedha	Permanent	Permanent Contract	\N	\N	\N	1991-12-03 00:00:00	1994-12-03 00:00:00	2022-12-03 00:00:00	Confirmed	\N	\N	\N	\N	cmd06xe2a0004e6bqwbtjm4x9
cme458ql2000n2bo81vvdcgbg	\N	Mheshimiwa Juma Maulidi	Female	\N	1960-10-23 00:00:00	Wilaya ya Kaskazini Unguja	Wilaya ya Mjini Magharibi	Tanzania	1990826499	+255 918 685 503	P.O. Box 7445, Zanzibar	ZSSF23313611	PAY23313611	Afisa Afya	A2	Wizara ya Utumishi wa Umma	Idara ya Mawasiliano	Permanent	Permanent Contract	\N	\N	\N	1983-10-23 00:00:00	1984-10-23 00:00:00	2020-10-23 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme458ql6000p2bo81gr7zwli	\N	Bi. Saada Mohamed	Male	\N	1964-04-04 00:00:00	Wilaya ya Kusini Unguja	Wilaya ya Kaskazini Pemba	Tanzania	1925154717	+255 393 961 568	P.O. Box 6634, Zanzibar	ZSSF23313612	PAY23313612	Makamu Mkuu wa Idara	B2	Wizara ya Utumishi wa Umma	Idara ya Fedha	Permanent	Permanent Contract	\N	\N	\N	1992-04-04 00:00:00	1993-04-04 00:00:00	2024-04-04 00:00:00	Confirmed	\N	\N	\N	\N	cmd06xe1x0000e6bqalx28nja
cme458qla000r2bo8v3xjqgdk	\N	Mheshimiwa Nassor Juma	Female	\N	1965-07-27 00:00:00	Wilaya ya Mjini Magharibi	Wilaya ya Mjini Magharibi	Tanzania	1935764932	+255 700 452 284	P.O. Box 8504, Zanzibar	ZSSF23313613	PAY23313613	Afisa Mipango	B3	Wizara ya Utumishi wa Umma	Idara ya Mawasiliano	Permanent	Permanent Contract	\N	\N	\N	1987-07-27 00:00:00	1988-07-27 00:00:00	2025-07-27 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme458qle000t2bo8majrycc4	\N	Mheshimiwa Omar Abdulla	Male	\N	1960-03-18 00:00:00	Wilaya ya Mjini Magharibi	Wilaya ya Kusini Pemba	Tanzania	1997734379	+255 577 450 669	P.O. Box 5112, Zanzibar	ZSSF23313614	PAY23313614	Daktari Mkuu	C2	Wizara ya Utumishi wa Umma	Idara ya Fedha	Permanent	Permanent Contract	\N	\N	\N	1982-03-18 00:00:00	1985-03-18 00:00:00	2020-03-18 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45s2fg001v2bzww0frmw93	\N	Msafishaji Shule Fatma Hassan	Female	\N	1980-09-06 00:00:00	Wilaya ya Kaskazini Unguja	Wilaya ya Kusini Unguja	Tanzania	1984690802	+255 142 579 558	P.O. Box 2916, Stone Town, Zanzibar	ZSSF13499871	PAY13499811	Mwalimu wa Kiswahili	C3	Wizara ya Elimu na Mafunzo ya Amali	Idara ya Mitaala na Vifaa vya Kufundishia	Permanent	Permanent Contract	\N	\N	\N	2008-09-06 00:00:00	2011-09-06 00:00:00	2040-09-06 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7r0002e67w8df8thtn
cme45oe5g001t2bfwbm9cpkjf	\N	Dereva Ambulensi Omar Khamis	Male	\N	1988-11-11 00:00:00	Wilaya ya Mjini Magharibi	Wilaya ya Kaskazini Unguja	Tanzania	1931387620	+255 718 209 382	P.O. Box 3177, Stone Town, Zanzibar	ZSSF96354531	PAY96354515	Afisa Utendaji wa Afya	A2	Wizara ya Afya	Idara ya Elimu ya Afya	Permanent	Permanent Contract	\N	\N	\N	2011-11-11 00:00:00	2014-11-11 00:00:00	2048-11-11 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cme45oe5j001v2bfwwkdblfwk	\N	Msafishaji Fatma Hassan	Female	\N	1988-08-02 00:00:00	Wilaya ya Kusini Unguja	Wilaya ya Kaskazini Pemba	Tanzania	1924235459	+255 232 294 289	P.O. Box 5943, Stone Town, Zanzibar	ZSSF96354735	PAY96354735	Muuguzi Mkuu	B3	Wizara ya Afya	Idara ya Afya ya Mama na Mtoto	Permanent	Permanent Contract	\N	\N	\N	2012-08-02 00:00:00	2015-08-02 00:00:00	2048-08-02 00:00:00	Confirmed	\N	\N	\N	\N	cmd06nn7u0003e67wa4hiyie7
cmef8j8h400012bq9xjzfljvn	\N	John Doe Mwalimu	Male	\N	1990-05-15 00:00:00	Stone Town	Zanzibar Urban	Tanzania	Z123456789	+255777123456	P.O. Box 123, Stone Town, Zanzibar	ZSSF123456	PAY001234	Administrative Officer	PGSS 7	Ministry of Health	Human Resources	Permanent	Full-time	2023-01-01 00:00:00	HR Department	Mnazi Mmoja Hospital	2020-03-01 00:00:00	2021-03-01 00:00:00	2055-05-15 00:00:00	Active	https://example.com/documents/ardhil-hali-123.pdf	https://example.com/documents/confirmation-123.pdf	https://example.com/documents/contract-123.pdf	\N	cmd06nn7u0003e67wa4hiyie7
emp_103	emp_entity_103	Heritage Conservator Omar Ali Hassan	Male	https://placehold.co/150x150.png?text=HC	1991-07-31 21:00:00	Mkokotoni	Kusini Unguja	Tanzania	1907081501	0777-891544	P.O. Box 3983, Stone Town, Zanzibar	ZSSF103	PAY0103	Conservation Specialist	ZPS 5.2	WIZARA YA UTALII NA MAMBO YA KALE	Heritage Protection	Permanent	Full-time	2029-01-15 21:00:00	Director of Heritage Protection	Head Office	2029-01-15 21:00:00	2030-12-15 10:48:00.656	2051-07-31 21:00:00	Confirmed	/api/files/download/employee-documents/emp_103/1755536766603_bf5ksk_ardhil-hali_ripoti_ya_likizo_bila_malipo_report.pdf	https://placehold.co/confirmation-103.pdf	https://placehold.co/contract-103.pdf	https://placehold.co/birth-cert-103.pdf	cmd06xe40000ve6bqrip9e4m6
\.


--
-- Data for Name: EmployeeCertificate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EmployeeCertificate" (id, type, name, url, "employeeId") FROM stdin;
cmd08149n0001e6l8203sdq1u	Bachelor Degree	B.A. Public Administration	https://placehold.co/bachelor-ali.pdf	emp1
cmd08149q0003e6l8rv7relb2	Certificate	Certificate in Office Management	https://placehold.co/cert-ali.pdf	emp1
cmd08149w0005e6l8jbgsbkon	Bachelor Degree	B.Ed. Primary Education	https://placehold.co/bachelor-khadija.pdf	emp8
cmd0814a20007e6l8vcbs0lp8	Diploma	Diploma in Technical Education	https://placehold.co/diploma-yussuf.pdf	emp9
cmd0814a40009e6l8lok43j1g	Certificate	Certificate in Computer Skills	https://placehold.co/cert-yussuf.pdf	emp9
cmd08yb290001e6uriduozlxx	Bachelor Degree	B.Com	https://placehold.co/bachelor-degree-1-1.pdf	emp_001
cmd08yb450003e6urlrjs6hzf	Certificate	Certificate in Leadership	https://placehold.co/certificate-1-2.pdf	emp_001
cmd08yb470005e6urc43v3ysj	Master Degree	MA Education	https://placehold.co/master-degree-1-3.pdf	emp_001
cmd08yb4d0007e6ur5ywlvxxk	Diploma	Diploma in Engineering	https://placehold.co/diploma-2-1.pdf	emp_002
cmd08yb4e0009e6ur2qkbqjvb	Master Degree	MA Education	https://placehold.co/master-degree-2-2.pdf	emp_002
cmd08yb4g000be6ur9wf5nvkc	Diploma	Diploma in Agriculture	https://placehold.co/diploma-2-3.pdf	emp_002
cmd08yb4l000de6urj671m8gs	Diploma	Diploma in Engineering	https://placehold.co/diploma-3-1.pdf	emp_003
cmd08yb4n000fe6ur3449tl8w	PhD	Education	https://placehold.co/phd-3-2.pdf	emp_003
cmd08yb4p000he6urovm6hnrv	Certificate	Certificate in ICT	https://placehold.co/certificate-3-3.pdf	emp_003
cmd08yb4v000je6urjk08ps9u	Certificate	Certificate in ICT	https://placehold.co/certificate-4-1.pdf	emp_004
cmd08yb4w000le6urcj18a926	Diploma	Diploma in Administration	https://placehold.co/diploma-4-2.pdf	emp_004
cmd08yb4y000ne6ur548ox47s	PhD	Agriculture	https://placehold.co/phd-4-3.pdf	emp_004
cmd08yb52000pe6urp8ify0kv	Bachelor Degree	LLB	https://placehold.co/bachelor-degree-5-1.pdf	emp_005
cmd08yb54000re6urecqigs5p	Diploma	Diploma in Education	https://placehold.co/diploma-5-2.pdf	emp_005
cmd08yb5a000te6ur5lb4xcd2	Certificate	Certificate in Leadership	https://placehold.co/certificate-6-1.pdf	emp_006
cmd08yb5c000ve6urz44u1k3u	Diploma	Diploma in Administration	https://placehold.co/diploma-6-2.pdf	emp_006
cmd08yb5g000xe6urkpixe6qg	Diploma	Diploma in Education	https://placehold.co/diploma-7-1.pdf	emp_007
cmd08yb5i000ze6urv6emoili	Certificate	Certificate in Languages	https://placehold.co/certificate-7-2.pdf	emp_007
cmd08yb5n0011e6urx4kp7i38	Diploma	Diploma in Engineering	https://placehold.co/diploma-8-1.pdf	emp_008
cmd08yb5p0013e6urkduzwbcz	Master Degree	MA Education	https://placehold.co/master-degree-8-2.pdf	emp_008
cmd08yb5u0015e6urmitrp2xt	Certificate	Certificate in Leadership	https://placehold.co/certificate-9-1.pdf	emp_009
cmd08yb5v0017e6ur9ljbqir0	Master Degree	MA Public Policy	https://placehold.co/master-degree-9-2.pdf	emp_009
cmd08yb600019e6url0dfa6j7	Certificate	Certificate in Project Management	https://placehold.co/certificate-10-1.pdf	emp_010
cmd08yb62001be6urr6ejzkgd	PhD	Public Administration	https://placehold.co/phd-10-2.pdf	emp_010
cmd08yb67001de6urrtghk04q	Master Degree	MBA	https://placehold.co/master-degree-11-1.pdf	emp_011
cmd08yb69001fe6urnr5a9krc	PhD	Economics	https://placehold.co/phd-11-2.pdf	emp_011
cmd08yb6b001he6urf77oebtj	Master Degree	MA Development Studies	https://placehold.co/master-degree-11-3.pdf	emp_011
cmd08yb6g001je6urio0s0jjk	PhD	Economics	https://placehold.co/phd-12-1.pdf	emp_012
cmd08yb6i001le6urz5npbwnc	Certificate	Certificate in Languages	https://placehold.co/certificate-12-2.pdf	emp_012
cmd08yb6n001ne6urt2vlbm0b	Bachelor Degree	B.Com	https://placehold.co/bachelor-degree-13-1.pdf	emp_013
cmd08yb6o001pe6urteavm3xt	Master Degree	MBA	https://placehold.co/master-degree-13-2.pdf	emp_013
cmd08yb6q001re6ur4b1jypq9	Certificate	Certificate in Leadership	https://placehold.co/certificate-13-3.pdf	emp_013
cmd08yb6v001te6urw8alel5d	Certificate	Certificate in ICT	https://placehold.co/certificate-14-1.pdf	emp_014
cmd08yb6w001ve6urml8116f2	Diploma	Diploma in Engineering	https://placehold.co/diploma-14-2.pdf	emp_014
cmd08yb71001xe6urqb5wsh9m	Master Degree	MSc Agriculture	https://placehold.co/master-degree-15-1.pdf	emp_015
cmd08yb73001ze6urij1wygnw	Master Degree	MBA	https://placehold.co/master-degree-15-2.pdf	emp_015
cmd08yb740021e6urnxfxwmd5	Bachelor Degree	B.Sc. Engineering	https://placehold.co/bachelor-degree-15-3.pdf	emp_015
cmd08yb790023e6ursl7qv4ea	Diploma	Diploma in Agriculture	https://placehold.co/diploma-16-1.pdf	emp_016
cmd08yb7b0025e6ur3pghotd0	Master Degree	MBA	https://placehold.co/master-degree-16-2.pdf	emp_016
cmd08yb7g0027e6urjcuvem08	Diploma	Diploma in Engineering	https://placehold.co/diploma-17-1.pdf	emp_017
cmd08yb7i0029e6urcotol8jf	Diploma	Diploma in Education	https://placehold.co/diploma-17-2.pdf	emp_017
cmd08yb7j002be6urcbbeulxd	Bachelor Degree	B.Sc. Computer Science	https://placehold.co/bachelor-degree-17-3.pdf	emp_017
cmd08yb7l002de6urt3e7liss	Master Degree	MSc Engineering	https://placehold.co/master-degree-17-4.pdf	emp_017
cmd08yb7q002fe6ur7ob1a2f3	Certificate	Certificate in Project Management	https://placehold.co/certificate-18-1.pdf	emp_018
cmd08yb7r002he6ur1p8chtkz	Master Degree	MSc Agriculture	https://placehold.co/master-degree-18-2.pdf	emp_018
cmd08yb7t002je6urgcgheo3e	Diploma	Diploma in Agriculture	https://placehold.co/diploma-18-3.pdf	emp_018
cmd08yb7y002le6uraz2feoz5	Bachelor Degree	LLB	https://placehold.co/bachelor-degree-19-1.pdf	emp_019
cmd08yb80002ne6urmd058k23	Master Degree	MA Education	https://placehold.co/master-degree-19-2.pdf	emp_019
cmd08yb82002pe6ur0vk9597i	Master Degree	MA Public Policy	https://placehold.co/master-degree-19-3.pdf	emp_019
cmd08yb83002re6ur1vtnnmrd	Bachelor Degree	B.Sc. Computer Science	https://placehold.co/bachelor-degree-19-4.pdf	emp_019
cmd08yb88002te6urylnmmvb3	Bachelor Degree	B.Sc. Computer Science	https://placehold.co/bachelor-degree-20-1.pdf	emp_020
cmd08yb8a002ve6urvp4c3zsl	Diploma	Diploma in Administration	https://placehold.co/diploma-20-2.pdf	emp_020
cmd08yb8b002xe6ur9x9s78je	Diploma	Diploma in Agriculture	https://placehold.co/diploma-20-3.pdf	emp_020
cmd08yb8d002ze6urh8dscpe7	Bachelor Degree	B.Com	https://placehold.co/bachelor-degree-20-4.pdf	emp_020
cmd08yb8i0031e6urlk9cvua3	Certificate	Certificate in Leadership	https://placehold.co/certificate-21-1.pdf	emp_021
cmd08yb8k0033e6urxdfenjwu	Master Degree	MA Education	https://placehold.co/master-degree-21-2.pdf	emp_021
cmd08yb8p0035e6urlkn70zg9	Certificate	Certificate in Languages	https://placehold.co/certificate-22-1.pdf	emp_022
cmd08yb8r0037e6urvajlyo6a	Master Degree	MA Development Studies	https://placehold.co/master-degree-22-2.pdf	emp_022
cmd08yb8s0039e6urmut11vcn	PhD	Education	https://placehold.co/phd-22-3.pdf	emp_022
cmd08yb8u003be6urn9thdk2r	Master Degree	MBA	https://placehold.co/master-degree-22-4.pdf	emp_022
cmd08yb8y003de6ur4zbt9efv	PhD	Engineering	https://placehold.co/phd-23-1.pdf	emp_023
cmd08yb90003fe6ur3w18wor0	Master Degree	MA Development Studies	https://placehold.co/master-degree-23-2.pdf	emp_023
cmd08yb92003he6urw30rckn8	Bachelor Degree	LLB	https://placehold.co/bachelor-degree-23-3.pdf	emp_023
cmd08yb97003je6urp7ivgtod	Diploma	Diploma in Agriculture	https://placehold.co/diploma-24-1.pdf	emp_024
cmd08yb98003le6ur4fbew7ht	Certificate	Certificate in ICT	https://placehold.co/certificate-24-2.pdf	emp_024
cmd08yb9a003ne6ur2amdtess	PhD	Public Administration	https://placehold.co/phd-24-3.pdf	emp_024
cmd08yb9c003pe6urpvyvw0j3	Master Degree	MSc Agriculture	https://placehold.co/master-degree-24-4.pdf	emp_024
cmd08yb9h003re6ur2nsu3amd	PhD	Engineering	https://placehold.co/phd-25-1.pdf	emp_025
cmd08yb9i003te6urnfgkucd6	Certificate	Certificate in Languages	https://placehold.co/certificate-25-2.pdf	emp_025
cmd08yb9n003ve6urbm63vivc	Certificate	Certificate in Leadership	https://placehold.co/certificate-26-1.pdf	emp_026
cmd08yb9p003xe6uruxl9rsid	Diploma	Diploma in ICT	https://placehold.co/diploma-26-2.pdf	emp_026
cmd08yb9q003ze6ur9k6kmppz	Bachelor Degree	LLB	https://placehold.co/bachelor-degree-26-3.pdf	emp_026
cmd08yb9w0041e6urpqpg4jpz	Bachelor Degree	B.A. Public Administration	https://placehold.co/bachelor-degree-27-1.pdf	emp_027
cmd08yb9x0043e6uryciqkmfh	Master Degree	MA Education	https://placehold.co/master-degree-27-2.pdf	emp_027
cmd08yb9z0045e6ur7q6pz57m	Diploma	Diploma in Engineering	https://placehold.co/diploma-27-3.pdf	emp_027
cmd08yba00047e6ur2jlwfclq	Diploma	Diploma in Agriculture	https://placehold.co/diploma-27-4.pdf	emp_027
cmd08yba50049e6ur6v0l7vqk	Bachelor Degree	B.Ed.	https://placehold.co/bachelor-degree-28-1.pdf	emp_028
cmd08yba6004be6urgxpg1g7o	Bachelor Degree	B.Sc. Agriculture	https://placehold.co/bachelor-degree-28-2.pdf	emp_028
cmd08yba8004de6ur7hpsbba8	Diploma	Diploma in Education	https://placehold.co/diploma-28-3.pdf	emp_028
cmd08ybad004fe6urvvarr472	Master Degree	MA Development Studies	https://placehold.co/master-degree-29-1.pdf	emp_029
cmd08ybaf004he6urhcjncwsm	Diploma	Diploma in Agriculture	https://placehold.co/diploma-29-2.pdf	emp_029
cmd08ybaj004je6uruquc67b2	Master Degree	MA Public Policy	https://placehold.co/master-degree-30-1.pdf	emp_030
cmd08ybal004le6urh47vyc66	Master Degree	MSc Agriculture	https://placehold.co/master-degree-30-2.pdf	emp_030
cmd08ybaq004ne6urqgq4lcms	Certificate	Certificate in Leadership	https://placehold.co/certificate-31-1.pdf	emp_031
cmd08ybas004pe6urfwv6djis	Bachelor Degree	B.Com	https://placehold.co/bachelor-degree-31-2.pdf	emp_031
cmd08ybau004re6urc7l8n633	Diploma	Diploma in Agriculture	https://placehold.co/diploma-31-3.pdf	emp_031
cmd08ybaz004te6ur1rkyiltx	PhD	Economics	https://placehold.co/phd-32-1.pdf	emp_032
cmd08ybb1004ve6urnem1ce0w	Certificate	Certificate in Leadership	https://placehold.co/certificate-32-2.pdf	emp_032
cmd08ybb2004xe6uri3x14fp8	Bachelor Degree	LLB	https://placehold.co/bachelor-degree-32-3.pdf	emp_032
cmd08ybb7004ze6urcur4r8i4	Bachelor Degree	B.Ed.	https://placehold.co/bachelor-degree-33-1.pdf	emp_033
cmd08ybb90051e6urw8t0oz4y	Certificate	Certificate in Languages	https://placehold.co/certificate-33-2.pdf	emp_033
cmd08ybba0053e6urxp83ejy5	Bachelor Degree	B.Com	https://placehold.co/bachelor-degree-33-3.pdf	emp_033
cmd08ybbf0055e6ur3159zuna	Diploma	Diploma in ICT	https://placehold.co/diploma-34-1.pdf	emp_034
cmd08ybbh0057e6urup8ils6f	PhD	Engineering	https://placehold.co/phd-34-2.pdf	emp_034
cmd08ybbm0059e6urhu1o5gcj	Diploma	Diploma in Engineering	https://placehold.co/diploma-35-1.pdf	emp_035
cmd08ybbo005be6ur7spc8vzt	Diploma	Diploma in Agriculture	https://placehold.co/diploma-35-2.pdf	emp_035
cmd08ybbq005de6urdk6bwler	PhD	Agriculture	https://placehold.co/phd-35-3.pdf	emp_035
cmd08ybbr005fe6ursnwja9vt	PhD	Public Administration	https://placehold.co/phd-35-4.pdf	emp_035
cmd08ybbw005he6ur8ohi42k1	Bachelor Degree	B.Ed.	https://placehold.co/bachelor-degree-36-1.pdf	emp_036
cmd08ybbx005je6urqfgv43w7	PhD	Education	https://placehold.co/phd-36-2.pdf	emp_036
cmd08ybbz005le6urtfdxskq0	Diploma	Diploma in Administration	https://placehold.co/diploma-36-3.pdf	emp_036
cmd08ybc4005ne6urucn4lriv	Certificate	Certificate in Leadership	https://placehold.co/certificate-37-1.pdf	emp_037
cmd08ybc6005pe6urnfxsv3tr	PhD	Economics	https://placehold.co/phd-37-2.pdf	emp_037
cmd08ybca005re6urjl8c2sgh	Certificate	Certificate in Languages	https://placehold.co/certificate-38-1.pdf	emp_038
cmd08ybcc005te6ur2n9ebjq1	Bachelor Degree	LLB	https://placehold.co/bachelor-degree-38-2.pdf	emp_038
cmd08ybcg005ve6urex9dyufz	Master Degree	MA Education	https://placehold.co/master-degree-39-1.pdf	emp_039
cmd08ybci005xe6uraq49g3jj	PhD	Education	https://placehold.co/phd-39-2.pdf	emp_039
cmd08ybck005ze6urf7gfharq	Certificate	Certificate in Project Management	https://placehold.co/certificate-39-3.pdf	emp_039
cmd08ybcm0061e6ur2ghwl1ft	Certificate	Certificate in ICT	https://placehold.co/certificate-39-4.pdf	emp_039
cmd08ybcr0063e6ur0g7oki8q	PhD	Health Sciences	https://placehold.co/phd-40-1.pdf	emp_040
cmd08ybcs0065e6urc82uyhlp	Bachelor Degree	B.A. Public Administration	https://placehold.co/bachelor-degree-40-2.pdf	emp_040
cmd08ybcu0067e6ur21ezzp9z	Diploma	Diploma in Administration	https://placehold.co/diploma-40-3.pdf	emp_040
cmd08ybcv0069e6urc4ohwbhy	Diploma	Diploma in Engineering	https://placehold.co/diploma-40-4.pdf	emp_040
cmd08ybd0006be6urp0dip0g2	Diploma	Diploma in Engineering	https://placehold.co/diploma-41-1.pdf	emp_041
cmd08ybd5006de6ur2ckphc9u	Bachelor Degree	B.Sc. Agriculture	https://placehold.co/bachelor-degree-42-1.pdf	emp_042
cmd08ybd7006fe6urb1xpziqe	Diploma	Diploma in Administration	https://placehold.co/diploma-42-2.pdf	emp_042
cmd08ybd8006he6urgh8l1862	Bachelor Degree	B.Ed.	https://placehold.co/bachelor-degree-42-3.pdf	emp_042
cmd08ybda006je6ur7pkrx9x3	Bachelor Degree	B.Sc. Computer Science	https://placehold.co/bachelor-degree-42-4.pdf	emp_042
cmd08ybdf006le6urih8bc9r9	PhD	Agriculture	https://placehold.co/phd-43-1.pdf	emp_043
cmd08ybdh006ne6urgl67x7sj	Certificate	Certificate in Project Management	https://placehold.co/certificate-43-2.pdf	emp_043
cmd08ybdi006pe6urk9wr7mav	PhD	Health Sciences	https://placehold.co/phd-43-3.pdf	emp_043
cmd08ybdn006re6urzip3fsfd	Diploma	Diploma in Education	https://placehold.co/diploma-44-1.pdf	emp_044
cmd08ybdp006te6ur5li3f1cp	Master Degree	MBA	https://placehold.co/master-degree-44-2.pdf	emp_044
cmd08ybdt006ve6urb5tc2rq3	Diploma	Diploma in ICT	https://placehold.co/diploma-45-1.pdf	emp_045
cmd08ybdv006xe6ur3epn826d	Master Degree	MSc Agriculture	https://placehold.co/master-degree-45-2.pdf	emp_045
cmd08ybdw006ze6ur7jnt8sgc	Certificate	Certificate in Languages	https://placehold.co/certificate-45-3.pdf	emp_045
cmd08ybe10071e6urh7lnuecz	Master Degree	MA Education	https://placehold.co/master-degree-46-1.pdf	emp_046
cmd08ybe20073e6urzx7ixw40	Certificate	Certificate in Project Management	https://placehold.co/certificate-46-2.pdf	emp_046
cmd08ybe40075e6uriix0mz2h	PhD	Education	https://placehold.co/phd-46-3.pdf	emp_046
cmd08ybe90077e6urcl25xeh6	Diploma	Diploma in Agriculture	https://placehold.co/diploma-47-1.pdf	emp_047
cmd08ybeb0079e6ur7nijkdkc	Master Degree	MA Education	https://placehold.co/master-degree-47-2.pdf	emp_047
cmd08ybef007be6urdzl35r0t	Diploma	Diploma in Engineering	https://placehold.co/diploma-48-1.pdf	emp_048
cmd08ybeh007de6ur14ci8dya	PhD	Agriculture	https://placehold.co/phd-48-2.pdf	emp_048
cmd08ybei007fe6ur4yh3owky	Certificate	Certificate in Languages	https://placehold.co/certificate-48-3.pdf	emp_048
cmd08ybek007he6url1er6oeh	Master Degree	MA Public Policy	https://placehold.co/master-degree-48-4.pdf	emp_048
cmd08yber007je6urg5ndb9zt	Certificate	Certificate in Leadership	https://placehold.co/certificate-49-1.pdf	emp_049
cmd08ybet007le6urqras6yvt	Diploma	Diploma in Engineering	https://placehold.co/diploma-49-3.pdf	emp_049
cmd08ybey007ne6urgsp21mi3	PhD	Education	https://placehold.co/phd-50-1.pdf	emp_050
cmd08ybez007pe6urq8zl1lnn	Certificate	Certificate in Project Management	https://placehold.co/certificate-50-2.pdf	emp_050
cmd08ybf5007re6urzn0x3fuc	Master Degree	MA Public Policy	https://placehold.co/master-degree-51-1.pdf	emp_051
cmd08ybf6007te6urcjgvo4yu	PhD	Education	https://placehold.co/phd-51-2.pdf	emp_051
cmd08ybf8007ve6uree0u6fwe	Bachelor Degree	B.Sc. Agriculture	https://placehold.co/bachelor-degree-51-3.pdf	emp_051
cmd08ybfa007xe6urw15hdovz	Master Degree	MA Education	https://placehold.co/master-degree-51-4.pdf	emp_051
cmd08ybfe007ze6uru593jilr	Bachelor Degree	LLB	https://placehold.co/bachelor-degree-52-1.pdf	emp_052
cmd08ybfg0081e6urj0epnbjn	Certificate	Certificate in ICT	https://placehold.co/certificate-52-2.pdf	emp_052
cmd08ybfi0083e6urf48z71jl	Bachelor Degree	B.Sc. Agriculture	https://placehold.co/bachelor-degree-52-3.pdf	emp_052
cmd08ybfn0085e6urx6ugh6o9	Bachelor Degree	B.A. Public Administration	https://placehold.co/bachelor-degree-53-1.pdf	emp_053
cmd08ybfo0087e6urvpwrwhmx	Diploma	Diploma in ICT	https://placehold.co/diploma-53-2.pdf	emp_053
cmd08ybft0089e6ur405wsc8m	Certificate	Certificate in Languages	https://placehold.co/certificate-54-1.pdf	emp_054
cmd08ybfy008be6urq8kos8f4	PhD	Education	https://placehold.co/phd-55-1.pdf	emp_055
cmd08ybg0008de6urhw0d91yh	Master Degree	MBA	https://placehold.co/master-degree-55-2.pdf	emp_055
cmd08ybg2008fe6ur2y6kk5cx	Bachelor Degree	LLB	https://placehold.co/bachelor-degree-55-3.pdf	emp_055
cmd09evmo0001e6zw9u335wmp	Masters	Masters in Accounting	https://placehold.co/masters-in-accounting-59.pdf	emp_059
cmd09evom0003e6zwxtgg5mdz	Bachelor Degree	Bachelor in Accounting	https://placehold.co/bachelor-in-accounting-60.pdf	emp_060
cmd09evoo0005e6zw9o71i86h	PhD	Disaster Management	https://placehold.co/phd-60-2.pdf	emp_060
cmd09evop0007e6zw4uzb3nky	Bachelor Degree	Bachelor in Public Administration	https://placehold.co/bachelor-degree-60-3.pdf	emp_060
cmd09evov0009e6zwtqonofn5	Diploma	Diploma in Auditing	https://placehold.co/diploma-in-auditing-61.pdf	emp_061
cmd09evox000be6zwr2m36868	Diploma	Diploma in Social Work	https://placehold.co/diploma-61-2.pdf	emp_061
cmd09evp3000de6zwiv0f2jia	PhD	PhD Engineering	https://placehold.co/phd-engineering-62.pdf	emp_062
cmd09evp5000fe6zw4pjrazd8	Masters	Masters in Construction Management	https://placehold.co/masters-62-2.pdf	emp_062
cmd09evp6000he6zw1kh7g42p	Masters	Masters in Information Science	https://placehold.co/masters-62-3.pdf	emp_062
cmd09evpb000je6zwu8t3xpom	Masters	Masters in Engineering	https://placehold.co/masters-in-engineering-63.pdf	emp_063
cmd09evpd000le6zwr3xuwlta	Certificate	Certificate in Emergency Response	https://placehold.co/certificate-63-2.pdf	emp_063
cmd09evpi000ne6zwuc0hmp45	Certificate	Certificate in Laboratory Technology	https://placehold.co/certificate-in-laboratory-technology-64.pdf	emp_064
cmd09evpk000pe6zwrgmjmr6j	PhD	Engineering	https://placehold.co/phd-64-2.pdf	emp_064
cmd09evpp000re6zw7b4granq	LLM	LLM Constitutional Law	https://placehold.co/llm-constitutional-law-65.pdf	emp_065
cmd09evpq000te6zwqr0es26g	Masters	Masters in Psychology	https://placehold.co/masters-65-2.pdf	emp_065
cmd09evps000ve6zww9tl89sq	Bachelor Degree	Bachelor in Public Administration	https://placehold.co/bachelor-degree-65-3.pdf	emp_065
cmd09evpu000xe6zwp3wmrnym	Bachelor Degree	Bachelor in Education	https://placehold.co/bachelor-degree-65-4.pdf	emp_065
cmd09evpz000ze6zw01gufdm0	PhD	PhD Law	https://placehold.co/phd-law-66.pdf	emp_066
cmd09evq10011e6zwrfgva10b	Diploma	Diploma in ICT	https://placehold.co/diploma-66-2.pdf	emp_066
cmd09evq30013e6zw7a2qr0sw	Bachelor Degree	Bachelor in Library Science	https://placehold.co/bachelor-degree-66-3.pdf	emp_066
cmd09evuo004fe6zwgwmcl04w	PhD	Public Administration	https://placehold.co/phd-89-2.pdf	emp_089
cmd09evq70015e6zwrpzs0tfw	Masters	Masters in HR Management	https://placehold.co/masters-in-hr-management-67.pdf	emp_067
cmd09evq90017e6zwb26w9ixo	Masters	Masters in Risk Management	https://placehold.co/masters-67-2.pdf	emp_067
cmd09evqe0019e6zwjp435jnz	PhD	PhD Computer Science	https://placehold.co/phd-computer-science-68.pdf	emp_068
cmd09evqg001be6zwyg1s4zvw	Certificate	Certificate in Emergency Response	https://placehold.co/certificate-68-2.pdf	emp_068
cmd09evqi001de6zwral6blaf	Bachelor Degree	Bachelor in Computer Science	https://placehold.co/bachelor-degree-68-3.pdf	emp_068
cmd09evqn001fe6zwspwkmwwz	Masters	Masters in Cyber Security	https://placehold.co/masters-in-cyber-security-69.pdf	emp_069
cmd09evqo001he6zwaanb2cb8	LLM	Human Rights Law	https://placehold.co/llm-69-2.pdf	emp_069
cmd09evqt001je6zwp0ri5u2z	Bachelor Degree	Bachelor in Computer Science	https://placehold.co/bachelor-in-computer-science-70.pdf	emp_070
cmd09evqu001le6zw2ns02fjo	PhD	Engineering	https://placehold.co/phd-70-2.pdf	emp_070
cmd09evqz001ne6zw7z766m5v	Diploma	Diploma in ICT	https://placehold.co/diploma-in-ict-71.pdf	emp_071
cmd09evr1001pe6zw6tm4503t	PhD	Economics	https://placehold.co/phd-71-2.pdf	emp_071
cmd09evr5001re6zw1dzto1ll	Masters	Masters in Land Surveying	https://placehold.co/masters-in-land-surveying-72.pdf	emp_072
cmd09evr7001te6zw37hslwe8	LLM	Constitutional Law	https://placehold.co/llm-72-2.pdf	emp_072
cmd09evra001ve6zwluocxtu7	Masters	Masters in Finance	https://placehold.co/masters-72-3.pdf	emp_072
cmd09evrb001xe6zwgjpmwmow	PhD	Engineering	https://placehold.co/phd-72-4.pdf	emp_072
cmd09evrg001ze6zwkah465rf	LLM	LLM Land Law	https://placehold.co/llm-land-law-73.pdf	emp_073
cmd09evri0021e6zwfqieeile	Diploma	Diploma in Auditing	https://placehold.co/diploma-73-2.pdf	emp_073
cmd09evrm0023e6zw92avgvbv	Bachelor Degree	Bachelor in Geography	https://placehold.co/bachelor-in-geography-74.pdf	emp_074
cmd09evro0025e6zwwpmijfzn	PhD	Political Science	https://placehold.co/phd-74-2.pdf	emp_074
cmd09evrq0027e6zwz8razuo0	PhD	Economics	https://placehold.co/phd-74-3.pdf	emp_074
cmd09evrv0029e6zwy5vd5jh2	PhD	PhD Accounting	https://placehold.co/phd-accounting-75.pdf	emp_075
cmd09evrx002be6zw30yknxe9	Masters	Masters in Engineering	https://placehold.co/masters-75-2.pdf	emp_075
cmd09evs1002de6zw15bqjken	Masters	Masters in Economics	https://placehold.co/masters-in-economics-76.pdf	emp_076
cmd09evs3002fe6zwjtzc0hj8	LLM	Land Law	https://placehold.co/llm-76-2.pdf	emp_076
cmd09evs8002he6zw50p0xpjc	Bachelor Degree	Bachelor in Finance	https://placehold.co/bachelor-in-finance-77.pdf	emp_077
cmd09evs9002je6zw54jf3b8a	Certificate	Certificate in Digital Marketing	https://placehold.co/certificate-77-2.pdf	emp_077
cmd09evse002le6zwob82ch9j	PhD	PhD Library Science	https://placehold.co/phd-library-science-78.pdf	emp_078
cmd09evsg002ne6zwj0fn2hfe	Masters	Masters in Engineering	https://placehold.co/masters-78-2.pdf	emp_078
cmd09evsh002pe6zwt9h6zgu2	Masters	Masters in Risk Management	https://placehold.co/masters-78-3.pdf	emp_078
cmd09evsm002re6zw2phzgqft	Masters	Masters in Information Science	https://placehold.co/masters-in-information-science-79.pdf	emp_079
cmd09evsn002te6zwzjoxxqxj	Diploma	Diploma in Construction	https://placehold.co/diploma-79-2.pdf	emp_079
cmd09evsr002ve6zwkigjfqgd	Bachelor Degree	Bachelor in Library Science	https://placehold.co/bachelor-in-library-science-80.pdf	emp_080
cmd09evst002xe6zw48tdly30	Bachelor Degree	Bachelor in Education	https://placehold.co/bachelor-degree-80-2.pdf	emp_080
cmd09evsy002ze6zwlvikenz6	PhD	PhD Economics	https://placehold.co/phd-economics-81.pdf	emp_081
cmd09evsz0031e6zwyi3sq08h	Certificate	Certificate in Data Analysis	https://placehold.co/certificate-81-2.pdf	emp_081
cmd09evt10033e6zwhjb8hkwf	Masters	Masters in HR Management	https://placehold.co/masters-81-3.pdf	emp_081
cmd09evt50035e6zwhxddkz9b	Masters	Masters in Finance	https://placehold.co/masters-in-finance-82.pdf	emp_082
cmd09evt70037e6zwcwl9976f	Bachelor Degree	Bachelor in Education	https://placehold.co/bachelor-degree-82-2.pdf	emp_082
cmd09evt80039e6zwo8l328p9	Bachelor Degree	Bachelor in Public Administration	https://placehold.co/bachelor-degree-82-3.pdf	emp_082
cmd09evtc003be6zwotdmb7rh	Bachelor Degree	Bachelor in Statistics	https://placehold.co/bachelor-in-statistics-83.pdf	emp_083
cmd09evte003de6zwrcpmnqfi	Masters	Masters in Engineering	https://placehold.co/masters-83-2.pdf	emp_083
cmd09evti003fe6zwuv0t6vw0	PhD	PhD Tourism Management	https://placehold.co/phd-tourism-management-84.pdf	emp_084
cmd09evtk003he6zwlfz89ui9	LLM	International Law	https://placehold.co/llm-84-2.pdf	emp_084
cmd09evtl003je6zw2xz3sf15	Bachelor Degree	Bachelor in Finance	https://placehold.co/bachelor-degree-84-3.pdf	emp_084
cmd09evtm003le6zw3tefktf5	LLM	Land Law	https://placehold.co/llm-84-4.pdf	emp_084
cmd09evtr003ne6zwyf29cu5j	Masters	MBA Marketing	https://placehold.co/mba-marketing-85.pdf	emp_085
cmd09evts003pe6zwhjwredk9	Masters	Masters in Psychology	https://placehold.co/masters-85-2.pdf	emp_085
cmd09evtu003re6zwi2ozrf0t	Diploma	Diploma in ICT	https://placehold.co/diploma-85-3.pdf	emp_085
cmd09evtv003te6zw70ymt9w5	Diploma	Diploma in Laboratory Technology	https://placehold.co/diploma-85-4.pdf	emp_085
cmd09evu0003ve6zwc8kof14v	Diploma	Diploma in Tourism	https://placehold.co/diploma-in-tourism-86.pdf	emp_086
cmd09evu2003xe6zwvokrmhh3	PhD	Computer Science	https://placehold.co/phd-86-2.pdf	emp_086
cmd09evu3003ze6zweupbq20p	Certificate	Certificate in Emergency Response	https://placehold.co/certificate-86-3.pdf	emp_086
cmd09evu70041e6zwnof9rzmy	PhD	PhD Labour Economics	https://placehold.co/phd-labour-economics-87.pdf	emp_087
cmd09evu90043e6zwnrnproyg	LLM	Land Law	https://placehold.co/llm-87-2.pdf	emp_087
cmd09evub0045e6zwqo1pre9g	PhD	Engineering	https://placehold.co/phd-87-3.pdf	emp_087
cmd09evuc0047e6zwme8dj0lg	Bachelor Degree	Bachelor in Geography	https://placehold.co/bachelor-degree-87-4.pdf	emp_087
cmd09evug0049e6zwqxqlfrz2	Masters	Masters in Psychology	https://placehold.co/masters-in-psychology-88.pdf	emp_088
cmd09evui004be6zw391iosiz	Masters	Masters in Risk Management	https://placehold.co/masters-88-2.pdf	emp_088
cmd09evun004de6zwtjqp1fm0	Bachelor Degree	Bachelor in Education	https://placehold.co/bachelor-in-education-89.pdf	emp_089
cmd09evut004he6zwioyqnlrt	PhD	PhD Education	https://placehold.co/phd-education-90.pdf	emp_090
cmd09evuv004je6zw8s99z9m7	LLM	Land Law	https://placehold.co/llm-90-2.pdf	emp_090
cmd09evuw004le6zwmb5jzky0	LLM	Constitutional Law	https://placehold.co/llm-90-3.pdf	emp_090
cmd09evuy004ne6zwmfxxt351	Bachelor Degree	Bachelor in Public Administration	https://placehold.co/bachelor-degree-90-4.pdf	emp_090
cmd09evv2004pe6zwzss8lk2g	PhD	PhD Curriculum Studies	https://placehold.co/phd-curriculum-studies-91.pdf	emp_091
cmd09evv4004re6zwwfxi8zqv	Certificate	Certificate in Project Management	https://placehold.co/certificate-91-2.pdf	emp_091
cmd09evv9004te6zw2w7t8436	Masters	Masters in Education	https://placehold.co/masters-in-education-92.pdf	emp_092
cmd09evvb004ve6zwewnzblc1	LLM	Constitutional Law	https://placehold.co/llm-92-2.pdf	emp_092
cmd09evvf004xe6zwf35hlkbe	PhD	PhD Disaster Management	https://placehold.co/phd-disaster-management-93.pdf	emp_093
cmd09evvh004ze6zwhh8dfke9	Bachelor Degree	Bachelor in Finance	https://placehold.co/bachelor-degree-93-2.pdf	emp_093
cmd09evvj0051e6zwhb9ug7kj	LLM	Constitutional Law	https://placehold.co/llm-93-3.pdf	emp_093
cmd09evvk0053e6zwb3qm56pp	Certificate	Certificate in Emergency Response	https://placehold.co/certificate-93-4.pdf	emp_093
cmd09evvp0055e6zwdecf7bpt	Masters	Masters in Risk Management	https://placehold.co/masters-in-risk-management-94.pdf	emp_094
cmd09evvq0057e6zwq8oy87eu	Certificate	Certificate in Emergency Response	https://placehold.co/certificate-94-2.pdf	emp_094
cmd09evvv0059e6zwctrmlj52	Bachelor Degree	Bachelor in Public Administration	https://placehold.co/bachelor-in-public-administration-95.pdf	emp_095
cmd09evvw005be6zwdbdk2qur	Bachelor Degree	Bachelor in Finance	https://placehold.co/bachelor-degree-95-2.pdf	emp_095
cmd09evw1005de6zwtdniezyy	Masters	Masters in Construction Management	https://placehold.co/masters-in-construction-management-96.pdf	emp_096
cmd09evw2005fe6zwci9x6m71	Bachelor Degree	Bachelor in Education	https://placehold.co/bachelor-degree-96-2.pdf	emp_096
cmd09evw4005he6zwxhbcin3u	PhD	Disaster Management	https://placehold.co/phd-96-3.pdf	emp_096
cmd09evw8005je6zw0cb0dk1l	Bachelor Degree	Bachelor in Quantity Surveying	https://placehold.co/bachelor-in-quantity-surveying-97.pdf	emp_097
cmd09evwa005le6zw5zz3g0qw	Masters	MBA	https://placehold.co/masters-97-2.pdf	emp_097
cmd09evwe005ne6zwcpna1ho7	Diploma	Diploma in Construction	https://placehold.co/diploma-in-construction-98.pdf	emp_098
cmd09evwg005pe6zwm38hytlw	Diploma	Diploma in Tourism	https://placehold.co/diploma-98-2.pdf	emp_098
cmd09h6et0001e63pmajot4vb	PhD	PhD Public Administration	https://placehold.co/phd-public-administration-99.pdf	emp_099
cmd09h6fu0003e63p8d28c9ni	PhD	PhD Political Science	https://placehold.co/phd-political-science-100.pdf	emp_100
cmd09h6fy0005e63p690q9u4o	Diploma	Diploma in Social Work	https://placehold.co/diploma-in-social-work-101.pdf	emp_101
cmd0gxerf0001e6e1rpwv1gnn	PhD	PhD Marine Biology	https://placehold.co/phd-marine-biology-102.pdf	emp_102
cmd0gxeri0003e6e1086xybwu	Bachelor Degree	Broadcasting Technology	https://placehold.co/bachelor-degree-102-2.pdf	emp_102
cmd0gxern0005e6e1it6p1n0f	Masters	Masters in Heritage Conservation	https://placehold.co/masters-in-heritage-conservation-103.pdf	emp_103
cmd0gxerp0007e6e1n8u4nbjd	Bachelor Degree	Security Studies	https://placehold.co/bachelor-degree-103-2.pdf	emp_103
cmd0h0wnt0001e6h6dmpuvdfd	LLM	LLM Criminal Law	https://placehold.co/llm-criminal-law-104.pdf	emp_104
cmd0h0wnw0003e6h6mmy93e1g	PhD	Criminal Law	https://placehold.co/phd-104-2.pdf	emp_104
cmd0h0wny0005e6h69ecbx253	LLM	Human Rights Law	https://placehold.co/llm-104-3.pdf	emp_104
cmd0h0wnz0007e6h6jhqampux	Masters	Urban Planning	https://placehold.co/masters-104-4.pdf	emp_104
cmd0h0wo10009e6h6oygs9e72	Masters	Public Policy	https://placehold.co/masters-104-5.pdf	emp_104
cmd0h0wo7000be6h6hvwjc2u3	Bachelor Degree	Bachelor in Criminology	https://placehold.co/bachelor-in-criminology-105.pdf	emp_105
cmd0h0wo9000de6h6xhq30brg	Bachelor Degree	Business Administration	https://placehold.co/bachelor-degree-105-2.pdf	emp_105
cmd0h0wob000fe6h6duv29x4n	Diploma	Public Administration	https://placehold.co/diploma-105-3.pdf	emp_105
cmd0h0wog000he6h6n3y7many	Masters	Masters in Forensic Accounting	https://placehold.co/masters-in-forensic-accounting-106.pdf	emp_106
cmd0h0woh000je6h62y73er52	Diploma	Public Administration	https://placehold.co/diploma-106-2.pdf	emp_106
cmd0h0wom000le6h665fen5cp	LLM	LLM Criminal Procedure	https://placehold.co/llm-criminal-procedure-107.pdf	emp_107
cmd0h0won000ne6h65ugg9lhh	Masters	Project Management	https://placehold.co/masters-107-2.pdf	emp_107
cmd0h0wop000pe6h61lgiqgbg	Diploma	Laboratory Technology	https://placehold.co/diploma-107-3.pdf	emp_107
cmd0h0wor000re6h6z6uj16d9	LLM	International Law	https://placehold.co/llm-107-4.pdf	emp_107
cmd0h0wov000te6h6gfodcdbh	Certificate	LLB Law	https://placehold.co/llb-law-108.pdf	emp_108
cmd0h0wox000ve6h6x4envau6	Diploma	Electrical Technology	https://placehold.co/diploma-108-2.pdf	emp_108
cmd0h0woz000xe6h6fbt28je2	PhD	Taxation	https://placehold.co/phd-108-3.pdf	emp_108
cmd0h0wp4000ze6h6nzj7qzey	Bachelor Degree	Bachelor in Law	https://placehold.co/bachelor-in-law-109.pdf	emp_109
cmd0h0wp60011e6h6hd1707a1	LLM	Environmental Law	https://placehold.co/llm-109-2.pdf	emp_109
cmd0h0wpb0013e6h6uaj538t1	LLM	LLM Constitutional Law	https://placehold.co/llm-constitutional-law-110.pdf	emp_110
cmd0h0wpc0015e6h6n35hrp76	Certificate	Digital Skills	https://placehold.co/certificate-110-2.pdf	emp_110
cmd0h0wph0017e6h6fpukp5qo	LLM	LLM Public Law	https://placehold.co/llm-public-law-111.pdf	emp_111
cmd0h0wpj0019e6h66ryyv6ui	Diploma	Laboratory Technology	https://placehold.co/diploma-111-2.pdf	emp_111
cmd0h0wpo001be6h6xgbj2bb1	Certificate	LLB Law	https://placehold.co/llb-law-112.pdf	emp_112
cmd0h0wpq001de6h6q2t9wdoc	Certificate	Project Management	https://placehold.co/certificate-112-2.pdf	emp_112
cmd0h0wpr001fe6h6ugq3pq4r	LLM	International Law	https://placehold.co/llm-112-3.pdf	emp_112
cmd0h0wpw001he6h60zkzwefz	PhD	PhD Criminology	https://placehold.co/phd-criminology-113.pdf	emp_113
cmd0h0wpy001je6h6982ro6d4	Bachelor Degree	Education	https://placehold.co/bachelor-degree-113-2.pdf	emp_113
cmd0h0wq0001le6h6rm9kbkaq	Masters	Project Management	https://placehold.co/masters-113-3.pdf	emp_113
cmd0h0wq2001ne6h665fw7o2q	Certificate	Professional Development	https://placehold.co/certificate-113-4.pdf	emp_113
cmd0h0wq4001pe6h6zoz1m5mo	Diploma	ICT	https://placehold.co/diploma-113-5.pdf	emp_113
cmd0h0wq8001re6h6arm8wa8f	Masters	Masters in Criminal Justice	https://placehold.co/masters-in-criminal-justice-114.pdf	emp_114
cmd0h0wqa001te6h68fem996w	LLM	Human Rights Law	https://placehold.co/llm-114-2.pdf	emp_114
cmd0h0wqc001ve6h6hnsu5ku8	Certificate	Project Management	https://placehold.co/certificate-114-3.pdf	emp_114
cmd0h0wqd001xe6h6yvmvrite	Diploma	Laboratory Technology	https://placehold.co/diploma-114-4.pdf	emp_114
cmd0h0wqi001ze6h6y57zeem1	Bachelor Degree	Bachelor in Psychology	https://placehold.co/bachelor-in-psychology-115.pdf	emp_115
cmd0h0wqj0021e6h6tha1jj07	Masters	Public Health	https://placehold.co/masters-115-2.pdf	emp_115
cmd0h0wqo0023e6h6k0ld1qie	PhD	PhD Constitutional Law	https://placehold.co/phd-constitutional-law-116.pdf	emp_116
cmd0h0wqp0025e6h6ww1qiko0	Diploma	Water Technology	https://placehold.co/diploma-116-2.pdf	emp_116
cmd0h0wqr0027e6h66riokydr	Diploma	Electrical Technology	https://placehold.co/diploma-116-3.pdf	emp_116
cmd0h0wqs0029e6h6ufe8zw68	PhD	Marine Biology	https://placehold.co/phd-116-4.pdf	emp_116
cmd0h0wqx002be6h6fw65thpv	LLM	LLM Legislative Drafting	https://placehold.co/llm-legislative-drafting-117.pdf	emp_117
cmd0h0wqy002de6h6j5ybxb5b	Certificate	Quality Management	https://placehold.co/certificate-117-2.pdf	emp_117
cmd0h0wr0002fe6h6dq9alshp	Masters	Project Management	https://placehold.co/masters-117-3.pdf	emp_117
cmd0h0wr2002he6h6ob53mrr3	Masters	Hydrology	https://placehold.co/masters-117-4.pdf	emp_117
cmd0h0wr6002je6h686csz0nq	Masters	Masters in Public Administration	https://placehold.co/masters-in-public-administration-118.pdf	emp_118
cmd0h0wr8002le6h60f8kmqs3	Certificate	Professional Development	https://placehold.co/certificate-118-2.pdf	emp_118
cmd0h0wr9002ne6h6x2lpsfje	Bachelor Degree	Broadcasting Technology	https://placehold.co/bachelor-degree-118-3.pdf	emp_118
cmd0h0wrb002pe6h6hu0z58mb	Certificate	Digital Skills	https://placehold.co/certificate-118-4.pdf	emp_118
cmd0h0wrg002re6h69hwofzab	PhD	PhD Ethics and Governance	https://placehold.co/phd-ethics-and-governance-119.pdf	emp_119
cmd0h0wrh002te6h6zzoslkbs	Certificate	Leadership	https://placehold.co/certificate-119-2.pdf	emp_119
cmd0h0wrj002ve6h6nh14v5ro	Diploma	Community Health	https://placehold.co/diploma-119-3.pdf	emp_119
cmd0h0wrk002xe6h6w11mg29r	PhD	Marine Biology	https://placehold.co/phd-119-4.pdf	emp_119
cmd0h0wrm002ze6h6unuttagi	Certificate	Emergency Response	https://placehold.co/certificate-119-5.pdf	emp_119
cmd0h0wrq0031e6h6nwaq19h5	Masters	Masters in Public Administration	https://placehold.co/masters-in-public-administration-120.pdf	emp_120
cmd0h0wrs0033e6h66gjaxm4i	Bachelor Degree	Human Rights	https://placehold.co/bachelor-degree-120-2.pdf	emp_120
cmd0h0wrt0035e6h6i30qt16d	Diploma	ICT	https://placehold.co/diploma-120-3.pdf	emp_120
cmd0h0wry0037e6h6fbbjaqb5	Bachelor Degree	Bachelor in Law	https://placehold.co/bachelor-in-law-121.pdf	emp_121
cmd0h0wrz0039e6h6844hti3o	PhD	Human Rights Law	https://placehold.co/phd-121-2.pdf	emp_121
cmd0h0ws3003be6h61mhuhewy	PhD	PhD Political Science	https://placehold.co/phd-political-science-122.pdf	emp_122
cmd0h0ws4003de6h6y658kh7i	Masters	Public Health	https://placehold.co/masters-122-2.pdf	emp_122
cmd0h0ws6003fe6h6o9brdbxf	LLM	Human Rights Law	https://placehold.co/llm-122-3.pdf	emp_122
cmd0h0ws8003he6h63knkr24p	Bachelor Degree	Business Administration	https://placehold.co/bachelor-degree-122-4.pdf	emp_122
cmd0h0wsa003je6h6yyjb9898	Masters	Research Methods	https://placehold.co/masters-122-5.pdf	emp_122
cmd0h0wse003le6h6n4lpg0ci	Masters	Masters in Political Science	https://placehold.co/masters-in-political-science-123.pdf	emp_123
cmd0h0wsg003ne6h6i07cc0q7	Diploma	ICT	https://placehold.co/diploma-123-2.pdf	emp_123
cmd0h0wsh003pe6h6pwtxr96f	PhD	Mass Communication	https://placehold.co/phd-123-3.pdf	emp_123
cmd0h0wsj003re6h68j5e3hna	LLM	Environmental Law	https://placehold.co/llm-123-4.pdf	emp_123
cmd0h0wsn003te6h6owrrvxg5	Bachelor Degree	Bachelor in Mass Communication	https://placehold.co/bachelor-in-mass-communication-124.pdf	emp_124
cmd0h0wso003ve6h6gdzi9dq3	Bachelor Degree	Geography	https://placehold.co/bachelor-degree-124-2.pdf	emp_124
cmd0h0wst003xe6h6lpb1x307	Masters	Masters in International Relations	https://placehold.co/masters-in-international-relations-125.pdf	emp_125
cmd0h0wsu003ze6h63udvk5jk	Bachelor Degree	Human Rights	https://placehold.co/bachelor-degree-125-2.pdf	emp_125
cmd0h0wsw0041e6h67rm6l9rl	Diploma	Public Administration	https://placehold.co/diploma-125-3.pdf	emp_125
cmd0h0wsx0043e6h6zkee4vkk	Bachelor Degree	Security Studies	https://placehold.co/bachelor-degree-125-4.pdf	emp_125
cmd0h0wt10045e6h6ouj3aok7	Masters	Masters in Security Studies	https://placehold.co/masters-in-security-studies-126.pdf	emp_126
cmd0h0wt30047e6h62gjvmc0w	Bachelor Degree	Business Administration	https://placehold.co/bachelor-degree-126-2.pdf	emp_126
cmd0h0wt70049e6h6pv1cq2wk	Bachelor Degree	Bachelor in Journalism	https://placehold.co/bachelor-in-journalism-127.pdf	emp_127
cmd0h0wt9004be6h6nsrhcqo3	LLM	Criminal Procedure	https://placehold.co/llm-127-2.pdf	emp_127
cmd0h0wtd004de6h6vdrgbpoa	PhD	PhD Public Policy	https://placehold.co/phd-public-policy-128.pdf	emp_128
cmd0h0wtf004fe6h6s9cztxem	Masters	Food Science	https://placehold.co/masters-128-2.pdf	emp_128
cmd0h0wtg004he6h67ll72y1l	LLM	Environmental Law	https://placehold.co/llm-128-3.pdf	emp_128
cmd0h0wti004je6h6bqygylth	Diploma	Community Health	https://placehold.co/diploma-128-4.pdf	emp_128
cmd0h0wtj004le6h6pzfe7tkv	PhD	Electrical Engineering	https://placehold.co/phd-128-5.pdf	emp_128
cmd0h0wto004ne6h6icrrsgen	Masters	Masters in Development Studies	https://placehold.co/masters-in-development-studies-129.pdf	emp_129
cmd0h0wtp004pe6h69aocfirw	Certificate	Project Management	https://placehold.co/certificate-129-2.pdf	emp_129
cmd0h0wtr004re6h6wtvh5unu	LLM	Human Rights Law	https://placehold.co/llm-129-3.pdf	emp_129
cmd0h0wtt004te6h69uyfjxc2	Masters	Public Policy	https://placehold.co/masters-129-4.pdf	emp_129
cmd0h0wtx004ve6h69jze4x7a	Bachelor Degree	Bachelor in Public Administration	https://placehold.co/bachelor-in-public-administration-130.pdf	emp_130
cmd0h0wtz004xe6h6vf8hto8f	Diploma	Community Health	https://placehold.co/diploma-130-2.pdf	emp_130
cmd0h0wu3004ze6h6qm3goom7	Masters	Masters in Public Administration	https://placehold.co/masters-in-public-administration-131.pdf	emp_131
cmd0h0wu40051e6h66q1br4bj	PhD	Public Health	https://placehold.co/phd-131-2.pdf	emp_131
cmd0h0wu60053e6h6n6599bp5	Masters	Forensic Accounting	https://placehold.co/masters-131-3.pdf	emp_131
cmd0h0wu70055e6h6yba10ooe	Diploma	Laboratory Technology	https://placehold.co/diploma-131-4.pdf	emp_131
cmd0h0wu90057e6h64tvr70m8	PhD	Marine Biology	https://placehold.co/phd-131-5.pdf	emp_131
cmd0h0wud0059e6h625m98e8c	PhD	PhD Public Administration	https://placehold.co/phd-public-administration-132.pdf	emp_132
cmd0h0wue005be6h6wl9q2m2n	LLM	International Law	https://placehold.co/llm-132-2.pdf	emp_132
cmd0h0wug005de6h6nf3qt2g1	Diploma	Electrical Technology	https://placehold.co/diploma-132-3.pdf	emp_132
cmd0h0wuh005fe6h6dx7e3rxo	Masters	Hydrology	https://placehold.co/masters-132-4.pdf	emp_132
cmd0h0wum005he6h6w1rtjth3	Bachelor Degree	Bachelor in Administration	https://placehold.co/bachelor-in-administration-133.pdf	emp_133
cmd0h0wun005je6h6o3j03547	PhD	Maritime Engineering	https://placehold.co/phd-133-2.pdf	emp_133
cmd0h0wup005le6h67fknhmj1	Diploma	Community Health	https://placehold.co/diploma-133-3.pdf	emp_133
cmd0h0wut005ne6h6twmvgv2d	PhD	PhD Islamic Studies	https://placehold.co/phd-islamic-studies-134.pdf	emp_134
cmd0h0wuv005pe6h6qobidgq3	LLM	Environmental Law	https://placehold.co/llm-134-2.pdf	emp_134
cmd0h0wuz005re6h6uuudnb49	Masters	Masters in Islamic Education	https://placehold.co/masters-in-islamic-education-135.pdf	emp_135
cmd0h0wv0005te6h6agd7diy4	Bachelor Degree	Human Rights	https://placehold.co/bachelor-degree-135-2.pdf	emp_135
cmd0h0wv4005ve6h60m7ztf8u	Bachelor Degree	Bachelor in Islamic Studies	https://placehold.co/bachelor-in-islamic-studies-136.pdf	emp_136
cmd0h0wv6005xe6h6c2ip5rq6	Masters	Heritage Conservation	https://placehold.co/masters-136-2.pdf	emp_136
cmd0h0wva005ze6h6waqrjdd2	PhD	PhD Regional Development	https://placehold.co/phd-regional-development-137.pdf	emp_137
cmd0h0wvc0061e6h67a5rbz9g	Certificate	Leadership	https://placehold.co/certificate-137-2.pdf	emp_137
cmd0h0wvd0063e6h6yaxmws03	Bachelor Degree	Geography	https://placehold.co/bachelor-degree-137-3.pdf	emp_137
cmd0h0wve0065e6h6y5c4m8q4	LLM	Criminal Procedure	https://placehold.co/llm-137-4.pdf	emp_137
cmd0h0wvg0067e6h6magnijvk	Masters	Research Methods	https://placehold.co/masters-137-5.pdf	emp_137
cmd0h0wvk0069e6h6dki246hy	PhD	PhD Local Government	https://placehold.co/phd-local-government-138.pdf	emp_138
cmd0h0wvm006be6h6d5f2z9go	Certificate	Professional Development	https://placehold.co/certificate-138-2.pdf	emp_138
cmd0h0wvo006de6h6kw5b9ilz	Diploma	ICT	https://placehold.co/diploma-138-3.pdf	emp_138
cmd0h0wvp006fe6h65lpkc3vi	Certificate	Digital Skills	https://placehold.co/certificate-138-4.pdf	emp_138
cmd0h0wvu006he6h690pum8yb	Masters	Masters in Community Development	https://placehold.co/masters-in-community-development-139.pdf	emp_139
cmd0h0wvv006je6h6vpb6f67j	Certificate	Emergency Response	https://placehold.co/certificate-139-2.pdf	emp_139
cmd0h0ww0006le6h657ui251v	Masters	Masters in Civil Engineering	https://placehold.co/masters-in-civil-engineering-140.pdf	emp_140
cmd0h0ww1006ne6h6349hz8sv	Bachelor Degree	Broadcasting Technology	https://placehold.co/bachelor-degree-140-2.pdf	emp_140
cmd0h0ww3006pe6h6dxisjqp1	Diploma	Water Technology	https://placehold.co/diploma-140-3.pdf	emp_140
cmd0h0ww7006re6h6itct4xcb	PhD	PhD Agronomy	https://placehold.co/phd-agronomy-141.pdf	emp_141
cmd0h0ww9006te6h630c2ih8s	LLM	Criminal Procedure	https://placehold.co/llm-141-2.pdf	emp_141
cmd0h0wwa006ve6h6ctz977ko	Masters	International Trade	https://placehold.co/masters-141-3.pdf	emp_141
cmd0h0wwe006xe6h6z4jykh9k	Masters	Masters in Energy Engineering	https://placehold.co/masters-in-energy-engineering-142.pdf	emp_142
cmd0h0wwg006ze6h6eep6hyjx	LLM	Maritime Law	https://placehold.co/llm-142-2.pdf	emp_142
cmd0h0wwk0071e6h6i5oxma1j	Bachelor Degree	Bachelor in International Business	https://placehold.co/bachelor-in-international-business-143.pdf	emp_143
cmd0h0wwm0073e6h68645syjs	Certificate	Emergency Response	https://placehold.co/certificate-143-2.pdf	emp_143
cmd0h0wwq0075e6h6c6l4qmhf	PhD	PhD Youth Development	https://placehold.co/phd-youth-development-144.pdf	emp_144
cmd0h0wws0077e6h6ztbd5u1n	Diploma	Public Administration	https://placehold.co/diploma-144-2.pdf	emp_144
cmd0h0wwt0079e6h68cqdmydj	Certificate	Project Management	https://placehold.co/certificate-144-3.pdf	emp_144
cmd0h0wwv007be6h6p1yieq9e	Bachelor Degree	Law	https://placehold.co/bachelor-degree-144-4.pdf	emp_144
cmd0h0wwz007de6h604il2t64	Bachelor Degree	Bachelor in Sports Science	https://placehold.co/bachelor-in-sports-science-145.pdf	emp_145
cmd0h0wx0007fe6h64087x156	LLM	Human Rights Law	https://placehold.co/llm-145-2.pdf	emp_145
cmd0h0wx5007he6h6de2jfsa9	Masters	Masters in Human Resource Management	https://placehold.co/masters-in-human-resource-management-146.pdf	emp_146
cmd0h0wx6007je6h6ebgtrgjn	PhD	Marine Biology	https://placehold.co/phd-146-2.pdf	emp_146
cmd0h0wxa007le6h6oiclmzpe	Masters	Masters in Construction Management	https://placehold.co/masters-in-construction-management-147.pdf	emp_147
cmd0h0wxc007ne6h695dj8uyi	Diploma	Public Administration	https://placehold.co/diploma-147-2.pdf	emp_147
cmd0h0wxg007pe6h6sqxtgjdd	Masters	Masters in Disaster Management	https://placehold.co/masters-in-disaster-management-148.pdf	emp_148
cmd0h0wxh007re6h6xdwmug3f	Certificate	Emergency Response	https://placehold.co/certificate-148-2.pdf	emp_148
cmd0h0wxm007te6h6lsm5qtil	Masters	Masters in Information Science	https://placehold.co/masters-in-information-science-149.pdf	emp_149
cmd0h0wxn007ve6h6paqkwfgd	Certificate	Project Management	https://placehold.co/certificate-149-2.pdf	emp_149
cmd0h0wxr007xe6h65fpr8utn	PhD	PhD Marine Biology	https://placehold.co/phd-marine-biology-150.pdf	emp_150
cmd0h0wxt007ze6h6ucurfimf	Bachelor Degree	Accounting	https://placehold.co/bachelor-degree-150-2.pdf	emp_150
cmd0h0wxy0081e6h6hlp9p3kc	Masters	Masters in Heritage Conservation	https://placehold.co/masters-in-heritage-conservation-151.pdf	emp_151
cmd0h0wxz0083e6h6ukfoubxg	Bachelor Degree	Geography	https://placehold.co/bachelor-degree-151-2.pdf	emp_151
cmef8j8hv00022bq9ksatxk2o	Bachelor Degree	Bachelor of Arts in Administration	https://example.com/certificates/bachelor-123.pdf	cmef8j8h400012bq9xjzfljvn
cmef8j8hv00032bq9k0rrqvd6	Certificate	Public Administration Certificate	https://example.com/certificates/cert-123.pdf	cmef8j8h400012bq9xjzfljvn
cmegwfeef00012bp5gzm0fq83	Certificate of primary education	primary	/api/files/download/employee-certificates/cme571jn200003emp006/1755508487770_53kbbi_Certificate_of_primary_education_ripoti_ya_nyongeza_ya_utumishi_report__1_.pdf	cme571jn200003emp006
\.


--
-- Data for Name: Institution; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Institution" (id, name, email, "phoneNumber", "voteNumber") FROM stdin;
cmd06xe2c0005e6bqulk6iu8g	WAKALA WA SERIKALI MTANDAO (eGAZ)	\N	\N	\N
cmd06xe2t000ce6bq2jxl6o5e	SEKRETARIETI YA AJIRA .	\N	\N	\N
cmd06xe3e000le6bqscwfh5be	SEKRETARIETI YA AJIRA	\N	\N	\N
inst_1753108793068	Updated Test Institution	\N	\N	\N
cme571jn200002bcqa9freppg	5 Wizara ya Majaribio ya Mfumo na ukaguzi	\N	\N	\N
cme6s7yqe000m2bgx708j9uly	Tume ya kusimamia Nidhamu	\N	\N	\N
cmd06nn7u0003e67wa4hiyie7	WIZARA YA AFYA	info@mohz.go.tz	+255242231614	H01
cmd06nn7r0002e67w8df8thtn	WIZARA YA ELIMU NA MAFUNZO YA AMALI	info@moez.go.tz	+255777458878	K01
cmd06xe4g0012e6bqou5f9gur	WIZARA YA MAJI NISHATI NA MADINI	info@majismz.go.tz	0242232695	N03
cmd06xe4e0011e6bqv8eg0b16	AFISI YA MWANASHERIA MKUU	info@agcz.go.tz	0242232502	G03
cmd06xe4b0010e6bqt54zkblq	AFISI YA MKURUGENZI WA MASHTAKA	dppznz@dppznz.go.tz	+255-24-2235564	G04
cmd059ion0000e6d85kexfukl	TUME YA UTUMISHI SERIKALINI	info@zanajira.go.tz	0773101012	E08
cmd06xe48000ye6bqwhlp0tum	TUME YA MAADILI YA VIONGOZI WA UMMA	info@ethicscommission.go.tz	+255242235535	G15
cmd06xe45000xe6bqb6qc19ys	MAMLAKA YA KUDHIBITI NA KUPAMBANA NA DAWA ZA KULEVYA ZANZIBAR	info@zdcea.go.tz	+255242233403	C04
cmd06xe43000we6bqegt3ofa0	OFISI YA RAIS - IKULU	info@ikuluzanzibar.go.tz	+2252230814#5	A01
cmd06xe40000ve6bqrip9e4m6	WIZARA YA UTALII NA MAMBO YA KALE	info@utaliismz.go.tz	0242231250	J04
cmd06xe3y000ue6bqzqkztrsa	WIZARA YA ARDHI NA MAENDELEO YA MAKAAZI ZANZIBAR	info@ardhismz.go.tz	0242941193	N02
cmd06xe3w000te6bqc44b0xpr	MAMLAKA YA KUZUIA RUSHWA NA UHUJUMU WA UCHUMI ZANZIBAR	info@zaeca.go.tz	0774824242	E05
cmd06xe3t000se6bqknluakbq	OFISI YA MUFTI MKUU WA ZANZIBAR	info@muftizanzibar.go.tz	0777483627	G14
cmd06xe3r000re6bqum8g62id	WIZARA YA UCHUMI WA BULUU NA UVUVI	info@blueeconomy.go.tz	242941195	L02
cmd06xe3p000qe6bqwqcuyke1	OFISI YA MAKAMO WA PILI WA RAISI	info@ompr.go.tz	0242231826	C01
cmd06xe3n000pe6bquce6e6ga	TUME YA UCHAGUZI YA ZANZIBAR	info@zec.go.tz	242231489	C03
cmd06xe3l000oe6bq5drrocqt	WIZARA YA HABARI, VIJANA, UTAMADUNI NA MICHEZO	info@habarismz.go.tz	0242231202	J03
cmd06xe3i000ne6bq2q3y9g2z	OFISI YA RAIS - KATIBA SHERIA UTUMISHI NA UTAWALA BORA	info@utumishismz.go.tz	+255242230034	G01
cmd06xe3g000me6bqh9gabe3e	OFISI YA RAIS, TAWALA ZA MIKOA, SERIKALI ZA MITAA NA IDARA MAALUMU ZA SMZ	info@tamisemim.go.tz	+255242230034	D01
cmd06xe3b000ke6bqxuwovzub	WIZARA YA BIASHARA NA MAENDELEO YA VIWANDA	info@tradesmz.go.tz	024-2941140	R01
cmd06xe39000je6bqeouszvrd	OFISI YA MAKAMO WA KWANZA WA RAISI	info@omkr.go.tz	+255 242232475	B01
cmd06xe37000ie6bq43r62ea6	WIZARA YA UJENZI MAWASILIANO NA UCHUKUZI	info@moic.go.tz	0242941138	P01
cmd06xe34000he6bqfdqiw9ll	WIZARA YA KILIMO UMWAGILIAJI MALIASILI NA MIFUGO	ps@kilimoznz.go.tz	0777868306	L01
cmd06nn7n0001e67w2h5rf86x	OFISI YA RAIS, FEDHA NA MIPANGO	info@mofzanzibar.go.tz	+255 2477666664/5	F01
cmd06xe30000fe6bqe6ljiz1v	WAKALA WA MAJENGO ZANZIBAR	info@zba.go.tz	0242232695	Z01
cmd06xe2y000ee6bqel875c2s	KAMISHENI YA KUKABILIANA NA MAAFA ZANZIBAR	zdmc@maafaznz.go.tz	+255242234755	Z02
cmd06xe2w000de6bqzqo9qu3m	TAASISI YA ELIMU YA ZANZIBAR	info@zie.go.tz	+255242230193	Z03
cmd06xe2r000be6bqrqhwhbq1	KAMISHENI YA UTALII ZANZIBAR	info@zanzibartourism.go.tz	+255 24 2233485	J02
cmd06xe2o000ae6bquqbkbg4z	AFISI YA RAISI KAZI, UCHUMI NA UWEKEZAJI	info@arkuusmz.go.tz	0242230061	A07
cmd06xe2m0009e6bq0ps9u9ut	TAASISI YA NYARAKA NA KUMBUKUMBU	info@ziar.go.tz	11111111111	A10
cmd06xe2j0008e6bqqpmbs9bv	Ofisi ya Mhasibu Mkuu wa Serikali	info@mofzanzibar.go.tz	024776666	F05
cmd06xe2h0007e6bqta680e3b	KAMISHENI YA ARDHI ZANZIBAR	info@kamisheniardhi.go.tz	0774776619	N04
cmd06xe2e0006e6bqvjfhq32c	OFISI YA MKAGUZI MKUU WA NDANI WA SERIKALI	info@oiagsmz.go.tz	255743600320	x06
cmd06xe2a0004e6bqwbtjm4x9	KAMISHENI YA UTUMISHI WA UMMA	kamisheni.utumishi@zpsc.go.tz	+255242230872	E07
cmd06xe270003e6bq0wm0v3c7	WIZARA YA MAENDELEO YA JAMII,JINSIA,WAZEE NA WATOTO	info@jamiismz.go.tz	+255242231413	H04
cmd06xe250002e6bqp8aabk92	Wakala wa Vipimo Zanzibar	info@zawemasmz.go.tz	0778586654	\N
cmd06xe220001e6bqj26tnlsj	Ofisi ya Mkuu wa Mkoa wa Kusini Unguja	info@southunguja.go.tz	0777433124	D08
cmd06xe1x0000e6bqalx28nja	Ofisi ya Msajili wa Hazina	info@trosmz.go.tz	111111111111	F07
\.


--
-- Data for Name: LwopRequest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."LwopRequest" (id, status, "reviewStage", duration, reason, documents, "rejectionReason", "employeeId", "submittedById", "reviewedById", "createdAt", "updatedAt", "endDate", "startDate") FROM stdin;
cmd08nehs0011e6qkmkjvhr1x	APPROVED	FINAL_APPROVAL	1 year	Personal study	{https://placehold.co/lwop-application.pdf,https://placehold.co/supporting-documents.pdf}	\N	emp9	cmd06nnbx000te67ww4cbaug7	cmd06nnbn000le67wtg41s3su	2025-06-13 12:45:09.279	2025-06-30 12:45:09.279	\N	\N
cmd08nehu0013e6qknl185vph	APPROVED	COMMISSION_REVIEW	3 months	Personal study	{https://placehold.co/lwop-application.pdf,https://placehold.co/supporting-documents.pdf}	\N	emp1	cmd06nnbx000te67ww4cbaug7	cmd06nnbq000ne67wwmiwxuo8	2025-06-28 12:45:09.282	2025-07-01 12:45:09.282	\N	\N
cmd08nehx0015e6qkmekftdzl	PENDING	HR_REVIEW	1 year	Family emergency	{https://placehold.co/lwop-application.pdf,https://placehold.co/supporting-documents.pdf}	\N	emp1	cmd06nnbz000ve67wncnv4etg	\N	2025-05-08 12:45:09.284	2025-06-15 12:45:09.284	\N	\N
cmd08nehz0017e6qklpfxsdun	REJECTED	FINAL_APPROVAL	6 months	Further education	{https://placehold.co/lwop-application.pdf,https://placehold.co/supporting-documents.pdf}	Request period conflicts with operational needs	emp1	cmd06nnbx000te67ww4cbaug7	\N	2025-06-30 12:45:09.287	2025-06-29 12:45:09.287	\N	\N
cmd08nei10019e6qk54d8ut5c	APPROVED	INITIAL	6 months	Personal study	{https://placehold.co/lwop-application.pdf,https://placehold.co/supporting-documents.pdf}	\N	emp1	cmd06nnbx000te67ww4cbaug7	\N	2025-06-08 12:45:09.289	2025-07-05 12:45:09.289	\N	\N
cmd08nei3001be6qk5ogon7kb	PENDING	HR_REVIEW	3 months	Family emergency	{https://placehold.co/lwop-application.pdf,https://placehold.co/supporting-documents.pdf}	\N	emp1	cmd06nnbu000re67wdeax0fwp	cmd06nnbn000le67wtg41s3su	2025-04-27 12:45:09.291	2025-06-21 12:45:09.291	\N	\N
cmdd8qf030001e62o8en01fpa	Pending HRMO Review	Initial Review	25	sasasa	{"Letter of Request","Employee Consent Letter"}	\N	ofisi_emp_008	cmd06nnbn000le67wtg41s3su	\N	2025-07-21 15:08:30.08	2025-07-21 15:08:30.08	\N	\N
cmddajprl0003e67kmjefbd26	Approved by Commission	completed	2 months	fgsddgd	{"Letter of Request","Employee Consent Letter"}	\N	ofisi_emp_002	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-21 15:59:16.785	2025-07-21 16:45:10.887	2025-08-10 00:00:00	2025-07-01 00:00:00
cmde308w80003e6jo3d1aiwyc	Approved by Commission	completed	23 months	kukagua ndugu na jamaa	{cheti.pdf,sababu.pdf}	\N	ofisi_emp_020	cmd06nnbn000le67wtg41s3su	cmd06nnbb000be67wwgil78yv	2025-07-22 05:15:57.225	2025-07-22 05:18:01.883	2027-06-10 00:00:00	2025-08-09 00:00:00
cmdgmuh080001e6uwgwzfr754	Pending HRMO/HHRMD Review	initial	1 month	anasafiri	{"Letter of Request","Employee Consent Letter"}	\N	ofisi_emp_010	cmd06nnbn000le67wtg41s3su	\N	2025-07-24 00:06:52.566	2025-07-24 00:06:52.566	2025-08-07 00:00:00	2025-07-26 00:00:00
cmddcj44m0009e67kaw89ifs6	Approved by Commission	completed	19 months	majaribu	{"Letter of Request","Employee Consent Letter"}	\N	ofisi_emp_008	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-21 16:54:47.974	2025-07-21 16:55:39.531	2027-02-10 00:00:00	2025-07-23 00:00:00
cmdgpkkxf0001e6lws4c0qecl	Pending HRMO/HHRMD Review	initial	16 months	kachoka kazi	{"Letter of Request","Employee Consent Letter"}	\N	ofisi_emp_007	cmd06nnbn000le67wtg41s3su	\N	2025-07-24 01:23:09.939	2025-07-24 01:23:09.939	2026-10-23 00:00:00	2025-07-25 00:00:00
cmddcvqxy000be67kxujuevjv	Rejected by Commission - Awaiting HRO Correction	initial	11 months	kutembea	{"Letter of Request","Employee Consent Letter"}	\N	ofisi_emp_004	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-21 17:04:37.414	2025-07-21 17:05:06.094	2025-10-31 00:00:00	2024-12-12 00:00:00
cmdiag88w0001e6rwmtybkf8k	Pending HRMO/HHRMD Review	initial	5 months	sawa	{lwop/letters/20250725_065512_9090fb83.pdf,lwop/consents/20250725_065520_f023110a.pdf}	\N	ofisi_emp_007	cmd06nnbn000le67wtg41s3su	\N	2025-07-25 03:55:24.992	2025-07-25 03:55:24.992	2025-11-29 00:00:00	2025-07-26 00:00:00
cmdib3tzd0003e6rw4heiduqs	Pending HRMO/HHRMD Review	initial	11 months	sawa	{lwop/letters/20250725_071305_7f9eb5d3.pdf,lwop/consents/20250725_071343_3d29979e.pdf}	\N	ofisi_emp_002	cmd06nnbn000le67wtg41s3su	\N	2025-07-25 04:13:46.132	2025-07-25 04:13:46.132	2026-06-05 00:00:00	2025-08-08 00:00:00
cmddd8w9t000de67klodwi74p	Rejected by Commission - Request Concluded	completed	2 months	gjh	{mfano.pdf,sababu.pdf}	\N	ofisi_emp_004	cmd06nnbn000le67wtg41s3su	cmd06nnbb000be67wwgil78yv	2025-07-21 17:14:50.849	2025-07-21 17:16:11.138	2025-08-10 00:00:00	2025-07-02 00:00:00
cmdzmynq400092bgq56pf1kpq	Pending HRMO/HHRMD Review	initial	11 months	utalii	{lwop/letters/1754465721056_shfu17_mfano__1_.pdf,lwop/consents/1754465724138_clhnd2_kuacha_kazi_report__1_.pdf}	\N	ofisi_emp_015	cmd06nnbn000le67wtg41s3su	\N	2025-08-06 07:17:45.244	2025-08-06 07:35:26.12	2026-07-08 00:00:00	2025-09-08 00:00:00
cmdzumwsv00012bfh4hvid031	Pending HRMO/HHRMD Review	initial	5 months	sawa	{lwop/letters/1754477548677_2lnh0a_Employee_Profile_Analysis.pdf,lwop/consents/1754477551363_dx4lsq_mfano.pdf}	\N	emp_003	cmd06nnbn000le67wtg41s3su	\N	2025-08-06 10:52:34.063	2025-08-06 10:52:34.063	2026-01-03 00:00:00	2025-08-08 00:00:00
cmdyoyqg900012bl7ezxr09rb	Rejected by Commission - Request Concluded	completed	6 months	kushiriki siasa	{lwop/letters/1754407707200_lko681_Employee_Profile_Analysis.pdf,lwop/consents/1754407710281_6i3lbz_sababu.pdf}	\N	ofisi_emp_002	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-05 15:26:01.833	2025-08-05 15:29:24.106	2026-01-11 00:00:00	2025-08-07 00:00:00
cmdytsy4v00032b7kqj1vw54s	Pending HRMO/HHRMD Review	initial	10 months	KUSHIRIKI SIASA	{lwop/letters/1754415679936_c4r910_mfano.pdf,lwop/consents/1754415685549_p4zd4o_sababu.pdf}	\N	ofisi_emp_008	cmd06nnbn000le67wtg41s3su	\N	2025-08-05 17:41:29.935	2025-08-05 17:41:29.935	2026-05-09 00:00:00	2025-08-08 00:00:00
cmdzuzn4d00032bfhjymbhe7o	Rejected by Commission - Request Concluded	completed	11 months	siasa	{lwop/letters/1754479223081_1i960v_mfano__1_.pdf,lwop/consents/1754479227057_hvdrfd_Profile_Analysis.pdf}	\N	emp_017	cmd06nnbs000pe67woh62ey8r	cmd06nnbb000be67wwgil78yv	2025-08-06 11:02:28.045	2025-08-06 11:22:01.423	2026-07-03 00:00:00	2025-08-08 00:00:00
cme4jt1p5000b2btjr5vy3853	Pending HRMO/HHRMD Review	initial	12 months	kutembea ulaya	{lwop/letters/1754761687532_l2epao_request_status_report_report.pdf,lwop/consents/1754761693225_9yqy5j_20250802_094101_02331ce1.pdf}	\N	emp_013	cme471pqo00032bidhttxmboj	\N	2025-08-09 17:48:15.449	2025-08-09 17:48:15.449	2026-08-09 00:00:00	2025-08-16 00:00:00
cmdzv5nqx00052bfht1rrvak3	Approved by Commission	completed	14 months	siasa	{lwop/letters/1754478412047_w3nnl4_ya_kustaafu_kwa_hiar....pdf,lwop/consents/1754478425971_wht7ty_mfano__1_.pdf}	\N	emp_014	cmd06nnbs000pe67woh62ey8r	cmd06nnbb000be67wwgil78yv	2025-08-06 11:07:08.793	2025-08-06 11:29:17.206	2026-09-26 00:00:00	2025-08-06 00:00:00
cme487gq500012btj3kb5djnh	Approved by Commission	completed	6 months	utalii	{lwop/letters/1754742198246_v25fvt_request_status_report_report.pdf,lwop/consents/1754742207404_gqvd6s_1754407554728_bj7hik_sababu.pdf}	\N	cme45oe3d000r2bfw3vs295u0	cme471pqo00032bidhttxmboj	cmd059ir10002e6d86l802ljc	2025-08-09 12:23:32.717	2025-08-09 12:27:09.393	2026-02-14 00:00:00	2025-08-23 00:00:00
cme4jui1y000f2btj2gd59qv8	Pending HRMO/HHRMD Review	initial	22 months	kushiriki siasa	{lwop/letters/1754761751649_iqv851_1754407554728_bj7hik_sababu.pdf,lwop/consents/1754761757969_yobc4z_ripoti_ya_kupandishwa_cheo_report.pdf}	\N	cme45oe31000l2bfw2kzug3tj	cme471pqo00032bidhttxmboj	\N	2025-08-09 17:49:23.302	2025-08-09 17:49:23.302	2027-06-09 00:00:00	2025-08-23 00:00:00
cme5jj92q00032bhegl61crei	Approved by Commission	completed	15 months	kutembea ulaya	{lwop/letters/1754821698946_dciext_ripoti_ya_kupandishwa_cheo_report__2_.pdf,lwop/consents/1754821702862_7bcykl_ripoti_ya_nyongeza_ya_utumishi_report.pdf}	\N	cme571jn200003emp020	cme577oj300022bcqm9dhpzy8	cmd059ir10002e6d86l802ljc	2025-08-10 10:28:24.626	2025-08-10 12:50:14.188	2026-10-30 00:00:00	2025-08-23 00:00:00
cme6ls5ov00032bgxwhk2x3og	Pending HRMO/HHRMD Review	initial	14 months	kutembea ulaya	{lwop/letters/1754885939403_t8f5kw_1754324616644_6r2ulr_cheti__1_.pdf,lwop/consents/1754885943445_ajx5dt_20250725_100627_d2b91848__2_.pdf}	\N	cme571jn200003emp008	cme577oj300022bcqm9dhpzy8	\N	2025-08-11 04:19:05.551	2025-08-11 04:19:05.551	2026-10-08 00:00:00	2025-08-21 00:00:00
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Notification" (id, message, link, "isRead", "userId", "createdAt") FROM stdin;
cmd08nejx002te6qki3rnhq0y	LWOP request submitted successfully	/dashboard	f	cmd06nnbs000pe67woh62ey8r	2025-06-22 12:45:09.356
cmd08nejz002ve6qkgwu1jlz9	Retirement request pending commission approval	/dashboard	t	cmd059ir10002e6d86l802ljc	2025-07-07 12:45:09.359
cmd08nek2002ze6qkozdu6go4	Service extension request approved	/dashboard	t	cmd06nnbs000pe67woh62ey8r	2025-07-01 12:45:09.362
cmd08nek40031e6qksgxhushl	Service extension request approved	/dashboard	f	cmd06nnbi000he67wz9doivi6	2025-07-10 12:45:09.364
cmd08nek60033e6qk5s8kx9if	Service extension request approved	/dashboard	f	cmd06nnbs000pe67woh62ey8r	2025-07-03 12:45:09.366
cmd08nek80035e6qkl6ec2uga	LWOP request submitted successfully	/dashboard	t	cmd06nnbd000de67wb6e6ild5	2025-06-29 12:45:09.368
cmd08nek90037e6qk6qc17cha	Service extension request approved	/dashboard	t	cmd06nnbb000be67wwgil78yv	2025-06-24 12:45:09.369
cmd08nekb0039e6qkzv9so9xz	Complaint investigation update available	/dashboard	f	cmd06nnbi000he67wz9doivi6	2025-07-10 12:45:09.371
cmd08nekd003be6qkjebpyubb	Service extension request approved	/dashboard	t	cmd06nnbz000ve67wncnv4etg	2025-07-11 12:45:09.373
cmd08nekg003fe6qknn3dwy44	New promotion request requires your review	/dashboard	f	cmd06nnbi000he67wz9doivi6	2025-06-17 12:45:09.376
cmd08neki003he6qkwstuiw2r	New promotion request requires your review	/dashboard	t	cmd06nnbi000he67wz9doivi6	2025-07-04 12:45:09.378
cmd08nejs002re6qk654ttmj8	Service extension request approved	/dashboard	t	cmd06nnbb000be67wwgil78yv	2025-07-12 12:45:09.352
cmd08nekr003re6qk66wj2yk5	Service extension request approved	/dashboard	t	cmd06nnbb000be67wwgil78yv	2025-07-04 12:45:09.387
cmd08nekk003je6qk8i4zinha	New promotion request requires your review	/dashboard	t	cmd06nnbx000te67ww4cbaug7	2025-07-10 12:45:09.38
cmd08nekq003pe6qkef7cdjcr	LWOP request submitted successfully	/dashboard	t	cmd06nnbl000je67wtl28pk42	2025-06-30 12:45:09.385
cmd5tw8qk00032bgt9tx0voec	Your complaint "Kutopandishwa Daraja" has been updated to: Rejected by HHRMD - Awaiting HRO/Submitter Action.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-16 10:38:44.54
cmd5tzr6000072bgtxu6lsdn3	Your complaint "Kutopandishwa daraja" has been updated to: Awaiting More Information.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-16 10:41:28.392
cmd5u0grn00092bgtq94et8j6	Your complaint "Kutopandishwa daraja" has been updated to: Under Review - Additional Information Provided.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-16 10:42:01.571
cmd5u2a82000b2bgtpz916adx	Your complaint "Kutopandishwa daraja" has been updated to: Resolved - Pending Employee Confirmation.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-16 10:43:26.402
cmd5u2vvu000d2bgtqfq8t9eh	Your complaint "Kutopandishwa daraja" has been updated to: Closed - Satisfied.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-16 10:43:54.474
cmd5u4e65000h2bgtngn3tayo	Your complaint "Kazini" has been updated to: Awaiting Commission Review.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-16 10:45:04.829
cmd5u4s19000j2bgt24f162ms	Your complaint "Kazini" has been updated to: Awaiting Commission Review.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-16 10:45:22.797
cmd5u5szb000l2bgtequnbpu4	Your complaint "Kazini" has been updated to: Resolved - Rejected by Commission.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-16 10:46:10.679
cmd5u8o16000p2bgtxk4ceunn	Your complaint "zxzcxcvc " has been updated to: Awaiting Commission Review.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-16 10:48:24.234
cmd5u90xc000r2bgtsppshvuh	Your complaint "zxzcxcvc " has been updated to: Awaiting Commission Review.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-16 10:48:40.944
cmd5ubbg8000t2bgt7jktis0o	Your complaint "zxzcxcvc " has been updated to: Resolved - Approved by Commission.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-16 10:50:27.896
cmd767tj3000z2bgtargns86n	Your complaint "Ubaguzi" has been updated to: Rejected by DO - Awaiting HRO/Submitter Action.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-17 09:11:26.271
cmd76f3lu00152bgtjxs1q48q	Your complaint "uamuzi" has been updated to: Awaiting Commission Review.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-17 09:17:05.922
cmd76f3m200172bgtpnugfq6e	Your complaint "uamuzi" has been updated to: Awaiting Commission Review.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-17 09:17:05.913
cmd76f3m300192bgt3b5knbj1	Your complaint "uamuzi" has been updated to: Awaiting Commission Review.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-17 09:17:05.931
cmd76f3m7001b2bgtpvnat9mt	Your complaint "uamuzi" has been updated to: Awaiting Commission Review.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-17 09:17:05.918
cmd76f3mb001d2bgtk2x8jk8r	Your complaint "uamuzi" has been updated to: Awaiting Commission Review.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-17 09:17:05.939
cmd76f3mf001f2bgth8qbj9aj	Your complaint "uamuzi" has been updated to: Awaiting Commission Review.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-17 09:17:05.943
cmd76f3mi001h2bgtym3eyv94	Your complaint "uamuzi" has been updated to: Awaiting Commission Review.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-17 09:17:05.947
cmd76f3mz001j2bgtnu6mu9ms	Your complaint "uamuzi" has been updated to: Awaiting Commission Review.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-17 09:17:05.964
cmd76f4qt001l2bgtipc6we3d	Your complaint "uamuzi" has been updated to: Awaiting Commission Review.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-17 09:17:07.397
cmd78zx12001p2bgtfcgasl08	Your complaint "uamuzi" has been updated to: Resolved - Rejected by Commission.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-17 10:29:16.406
cmd79v4sr001r2bgtab5zbgz4	Your complaint "qweqeqwerw" has been updated to: Resolved - Pending Employee Confirmation.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-17 10:53:32.811
cmd7ac45k001t2bgt65n7v2bt	Your complaint "qweqeqwerw" has been updated to: Closed - Satisfied.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-17 11:06:45.129
cmd8h4fn100212bgt22wdskqa	Your Change of Cadre request to "Afisa Utawala" has been updated to: Pending HHRMD Review.	/dashboard/cadre-change	f	cmd5a9ybq00072bt6fk4ixogc	2025-07-18 07:04:30.254
cmd8h6spd00232bgtr5r0h6wu	Your Change of Cadre request to "Afisa Ushauri nasaha" has been updated to: Pending HHRMD Review.	/dashboard/cadre-change	f	cmd5a9ydp00152bt6q3ms10z1	2025-07-18 07:06:20.497
cmd08neko003ne6qk1fyzffeu	Complaint investigation update available	/dashboard	t	cmd06nnb50007e67wa5491lw5	2025-06-25 12:45:09.383
cmd8hfg3300252bgtsw1rgznk	Your Change of Cadre request to "Afisa Sheria" has been updated to: Rejected by HRMO - Awaiting HRO Correction.	/dashboard/cadre-change	f	cmd5a9ydh00112bt6x1qstl3w	2025-07-18 07:13:04.048
cmd8higsd00272bgtvp9edko9	Your Change of Cadre request to "Afisa Utawala" has been updated to: Rejected by HHRMD - Awaiting HRO Correction.	/dashboard/cadre-change	f	cmd5a9ybq00072bt6fk4ixogc	2025-07-18 07:15:24.925
cmd8hwh0600292bgtzulihr5b	Your Change of Cadre request to "Afisa Rasilimali watu" has been updated to: Pending HRMO/HHRMD Review.	/dashboard/cadre-change	f	cmd5a9ybq00072bt6fk4ixogc	2025-07-18 07:26:18.39
cmd8hx27h002b2bgt34md3r96	Your Change of Cadre request to "Afisa Rasilimali watu" has been updated to: Pending HHRMD Review.	/dashboard/cadre-change	f	cmd5a9ybq00072bt6fk4ixogc	2025-07-18 07:26:45.869
cmd8hxn59002d2bgt85d0ilss	Your Change of Cadre request to "Afisa Rasilimali watu" has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/cadre-change	f	cmd5a9ybq00072bt6fk4ixogc	2025-07-18 07:27:13.006
cmd8hxqo3002f2bgt7w6fdkhp	Your Change of Cadre request to "Afisa Rasilimali watu" has been updated to: Pending HHRMD Review.	/dashboard/cadre-change	f	cmd5a9ybq00072bt6fk4ixogc	2025-07-18 07:27:17.572
cmd8hypfa002h2bgtlbb7izkm	Your Change of Cadre request to "Afisa Rasilimali watu" has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/cadre-change	f	cmd5a9ybq00072bt6fk4ixogc	2025-07-18 07:28:02.615
cmd8hyr1z002j2bgtydyiiao5	Your Change of Cadre request to "Afisa Rasilimali watu" has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/cadre-change	f	cmd5a9ybq00072bt6fk4ixogc	2025-07-18 07:28:04.727
cmd8hyrpu002l2bgtunmfx18r	Your Change of Cadre request to "Afisa Rasilimali watu" has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/cadre-change	f	cmd5a9ybq00072bt6fk4ixogc	2025-07-18 07:28:05.586
cmd8hz667002n2bgtc4mvans7	Your Change of Cadre request to "Afisa Rasilimali watu" has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/cadre-change	f	cmd5a9ybq00072bt6fk4ixogc	2025-07-18 07:28:24.319
cmd8hz6ld002p2bgtbdwb2euo	Your Change of Cadre request to "Afisa Rasilimali watu" has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/cadre-change	f	cmd5a9ybq00072bt6fk4ixogc	2025-07-18 07:28:24.865
cmd8hz6vr002r2bgtf4cy69ve	Your Change of Cadre request to "Afisa Rasilimali watu" has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/cadre-change	f	cmd5a9ybq00072bt6fk4ixogc	2025-07-18 07:28:25.239
cmd8hz6y4002t2bgt90g393mb	Your Change of Cadre request to "Afisa Rasilimali watu" has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/cadre-change	f	cmd5a9ybq00072bt6fk4ixogc	2025-07-18 07:28:25.324
cmd8hz75i002v2bgtoj2g3w3t	Your Change of Cadre request to "Afisa Rasilimali watu" has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/cadre-change	f	cmd5a9ybq00072bt6fk4ixogc	2025-07-18 07:28:25.59
cmd8hz7ef002x2bgtac8pv5g2	Your Change of Cadre request to "Afisa Rasilimali watu" has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/cadre-change	f	cmd5a9ybq00072bt6fk4ixogc	2025-07-18 07:28:25.911
cmd8hz7j3002z2bgt42kxrm66	Your Change of Cadre request to "Afisa Rasilimali watu" has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/cadre-change	f	cmd5a9ybq00072bt6fk4ixogc	2025-07-18 07:28:26.079
cmd8hz9gl00312bgtg7we6olu	Your Change of Cadre request to "Afisa Rasilimali watu" has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/cadre-change	f	cmd5a9ybq00072bt6fk4ixogc	2025-07-18 07:28:28.582
cmd8i0fc800332bgt98atzebh	Your Change of Cadre request to "Afisa Ushauri nasaha" has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/cadre-change	f	cmd5a9ydp00152bt6q3ms10z1	2025-07-18 07:29:22.856
cmd8i12r600352bgty4abzk1w	Your Change of Cadre request to "Afisa Rasilimali watu" has been updated to: Rejected by Commission.	/dashboard/cadre-change	f	cmd5a9ybq00072bt6fk4ixogc	2025-07-18 07:29:53.203
cmd8i17jf00372bgts2nk5vj8	Your Change of Cadre request to "Afisa Rasilimali watu" has been updated to: Rejected by Commission.	/dashboard/cadre-change	f	cmd5a9ybq00072bt6fk4ixogc	2025-07-18 07:29:59.403
cmd8i1q2f00392bgtpll3yeul	Your Change of Cadre request to "Afisa Ushauri nasaha" has been updated to: Approved by Commission.	/dashboard/cadre-change	f	cmd5a9ydp00152bt6q3ms10z1	2025-07-18 07:30:23.416
cmd8isgo3003h2bgtv7dhh5wj	Your voluntary Retirement request has been updated to: Rejected by HRMO - Awaiting HRO Correction.	/dashboard/retirement	f	cmd5a9ydb000z2bt6u03i5p63	2025-07-18 07:51:10.948
cmd8iu8jm003j2bgtb1d5csjr	Your voluntary Retirement request has been updated to: Pending HRMO/HHRMD Review.	/dashboard/retirement	f	cmd5a9ydb000z2bt6u03i5p63	2025-07-18 07:52:33.73
cmd8ius8h003l2bgttix31gbd	Your voluntary Retirement request has been updated to: Pending HHRMD Review.	/dashboard/retirement	f	cmd5a9ydb000z2bt6u03i5p63	2025-07-18 07:52:59.249
cmd8iw6p6003n2bgt3ehxvpx1	Your voluntary Retirement request has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/retirement	f	cmd5a9ydb000z2bt6u03i5p63	2025-07-18 07:54:04.65
cmd8ix1s3003p2bgtbrng17a0	Your voluntary Retirement request has been updated to: Rejected by Commission.	/dashboard/retirement	f	cmd5a9ydb000z2bt6u03i5p63	2025-07-18 07:54:44.931
cmd8ixi30003r2bgte8kvbrnc	Your voluntary Retirement request has been updated to: Rejected by Commission.	/dashboard/retirement	f	cmd5a9ydb000z2bt6u03i5p63	2025-07-18 07:55:06.06
cmd8izpla003t2bgt2y1aat0e	Your compulsory Retirement request has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/retirement	f	cmd5a9ydb000z2bt6u03i5p63	2025-07-18 07:56:49.102
cmd8j04h7003v2bgtimphpnth	Your compulsory Retirement request has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/retirement	f	cmd5a9ydb000z2bt6u03i5p63	2025-07-18 07:57:08.396
cmd8j06b6003x2bgtb0rdb00k	Your compulsory Retirement request has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/retirement	f	cmd5a9ydb000z2bt6u03i5p63	2025-07-18 07:57:10.77
cmd8j06u2003z2bgtc5vqaycx	Your compulsory Retirement request has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/retirement	f	cmd5a9ydb000z2bt6u03i5p63	2025-07-18 07:57:11.45
cmd8j07cf00412bgtaqgqme84	Your compulsory Retirement request has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/retirement	f	cmd5a9ydb000z2bt6u03i5p63	2025-07-18 07:57:12.111
cmd8j07wd00432bgtwqqhe34q	Your compulsory Retirement request has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/retirement	f	cmd5a9ydb000z2bt6u03i5p63	2025-07-18 07:57:12.83
cmd8j08ay00452bgt0h00yj1b	Your compulsory Retirement request has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/retirement	f	cmd5a9ydb000z2bt6u03i5p63	2025-07-18 07:57:13.354
cmd8j08m400472bgtngz7u0sm	Your compulsory Retirement request has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/retirement	f	cmd5a9ydb000z2bt6u03i5p63	2025-07-18 07:57:13.756
cmd8j08td00492bgt0ex3qx09	Your compulsory Retirement request has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/retirement	f	cmd5a9ydb000z2bt6u03i5p63	2025-07-18 07:57:14.017
cmd8j08zw004b2bgtmq3yzlrq	Your compulsory Retirement request has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/retirement	f	cmd5a9ydb000z2bt6u03i5p63	2025-07-18 07:57:14.253
cmd8j097z004d2bgt4cmweso5	Your compulsory Retirement request has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/retirement	f	cmd5a9ydb000z2bt6u03i5p63	2025-07-18 07:57:14.543
cmd8j1a5h004f2bgtr5bagq4b	Your compulsory Retirement request has been updated to: Approved by Commission.	/dashboard/retirement	f	cmd5a9ydb000z2bt6u03i5p63	2025-07-18 07:58:02.405
cmd8jgvib004l2bgtw99d2vmz	Your illness Retirement request has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/retirement	f	cmd5a9ydb000z2bt6u03i5p63	2025-07-18 08:10:09.923
cmd8jhgaj004n2bgt03me8px9	Your illness Retirement request has been updated to: Pending HHRMD Review.	/dashboard/retirement	f	cmd5a9ydh00112bt6x1qstl3w	2025-07-18 08:10:36.86
cmd8jyasy004p2bgt458u0tiy	Your illness Retirement request has been updated to: Rejected by Commission.	/dashboard/retirement	f	cmd5a9ydb000z2bt6u03i5p63	2025-07-18 08:23:42.898
cmd8kclye004t2bgt83241fii	Your Resignation request with effective date July 25th, 2025 has been updated to: Pending HHRMD Acknowledgement.	/dashboard/resignation	f	cmd5a9ybv00092bt6wp2ybul7	2025-07-18 08:34:50.534
cmd8kdx4t004v2bgtc3q2jn5f	Your Resignation request with effective date July 25th, 2025 has been updated to: Forwarded to Commission for Acknowledgment.	/dashboard/resignation	f	cmd5a9ybv00092bt6wp2ybul7	2025-07-18 08:35:51.678
cmd8kf7w5004x2bgtdgn5ryrm	Your Resignation request with effective date July 25th, 2025 has been updated to: Approved by Commission.	/dashboard/resignation	f	cmd5a9ybv00092bt6wp2ybul7	2025-07-18 08:36:52.278
cmd8khuhc00512bgtefhrqzh9	Your Resignation request with effective date August 2nd, 2025 has been updated to: Forwarded to Commission for Acknowledgment.	/dashboard/resignation	f	cmd5a9yce000j2bt65eqmtcdp	2025-07-18 08:38:54.864
cmd8khv7l00532bgt3l7tdszd	Your Resignation request with effective date August 2nd, 2025 has been updated to: Forwarded to Commission for Acknowledgment.	/dashboard/resignation	f	cmd5a9yce000j2bt65eqmtcdp	2025-07-18 08:38:55.809
cmd8khvht00552bgt9039cro9	Your Resignation request with effective date August 2nd, 2025 has been updated to: Forwarded to Commission for Acknowledgment.	/dashboard/resignation	f	cmd5a9yce000j2bt65eqmtcdp	2025-07-18 08:38:56.177
cmd8khvr500572bgtt4ge855q	Your Resignation request with effective date August 2nd, 2025 has been updated to: Forwarded to Commission for Acknowledgment.	/dashboard/resignation	f	cmd5a9yce000j2bt65eqmtcdp	2025-07-18 08:38:56.513
cmd8khvzc00592bgt3cbhbd38	Your Resignation request with effective date August 2nd, 2025 has been updated to: Forwarded to Commission for Acknowledgment.	/dashboard/resignation	f	cmd5a9yce000j2bt65eqmtcdp	2025-07-18 08:38:56.808
cmd8khw69005b2bgtg187fgcb	Your Resignation request with effective date August 2nd, 2025 has been updated to: Forwarded to Commission for Acknowledgment.	/dashboard/resignation	f	cmd5a9yce000j2bt65eqmtcdp	2025-07-18 08:38:57.057
cmd8khwcj005d2bgtta2yvrfy	Your Resignation request with effective date August 2nd, 2025 has been updated to: Forwarded to Commission for Acknowledgment.	/dashboard/resignation	f	cmd5a9yce000j2bt65eqmtcdp	2025-07-18 08:38:57.283
cmd8khwjj005f2bgthbo1fo7e	Your Resignation request with effective date August 2nd, 2025 has been updated to: Forwarded to Commission for Acknowledgment.	/dashboard/resignation	f	cmd5a9yce000j2bt65eqmtcdp	2025-07-18 08:38:57.535
cmd8khwq9005h2bgtoz6hfrko	Your Resignation request with effective date August 2nd, 2025 has been updated to: Forwarded to Commission for Acknowledgment.	/dashboard/resignation	f	cmd5a9yce000j2bt65eqmtcdp	2025-07-18 08:38:57.777
cmd8khwxp005j2bgt1mmcm7ba	Your Resignation request with effective date August 2nd, 2025 has been updated to: Forwarded to Commission for Acknowledgment.	/dashboard/resignation	f	cmd5a9yce000j2bt65eqmtcdp	2025-07-18 08:38:58.046
cmd8khxjr005l2bgt9jizuehy	Your Resignation request with effective date August 2nd, 2025 has been updated to: Forwarded to Commission for Acknowledgment.	/dashboard/resignation	f	cmd5a9yce000j2bt65eqmtcdp	2025-07-18 08:38:58.84
cmd8khxx3005n2bgtp3n4t0ra	Your Resignation request with effective date August 2nd, 2025 has been updated to: Forwarded to Commission for Acknowledgment.	/dashboard/resignation	f	cmd5a9yce000j2bt65eqmtcdp	2025-07-18 08:38:59.319
cmd8kife4005p2bgto8i83t7w	Your Resignation request with effective date August 2nd, 2025 has been updated to: Rejected by Commission.	/dashboard/resignation	f	cmd5a9yce000j2bt65eqmtcdp	2025-07-18 08:39:21.964
cmda6j60j005v2bgtizb6vdwb	Your Change of Cadre request to "Afisa Mkuu Msaidizi" has been updated to: Request Received – Awaiting Commission Decision.	/dashboard/cadre-change	f	cmd5a9ybb00012bt6m2oxl3li	2025-07-19 11:43:34.195
cmdexj5kz0001e6eceyw5x4b2	Your complaint "kuchelewa kuthibitishwa kazi" has been updated to: Awaiting More Information.	/dashboard/complaints	f	cmd5a9yee001h2bt6fubd8gt2	2025-07-22 19:30:27.972
cmdexkwh70003e6ecu6n5cp4w	Your complaint "kuchelewa kuthibitishwa kazi" has been updated to: Under Review - Additional Information Provided.	/dashboard/complaints	f	cmd5a9yee001h2bt6fubd8gt2	2025-07-22 19:31:49.484
cmdexmdfn0005e6ecbakhrr07	Your complaint "kuchelewa kuthibitishwa kazi" has been updated to: Awaiting Commission Review.	/dashboard/complaints	f	cmd5a9yee001h2bt6fubd8gt2	2025-07-22 19:32:58.115
cmdey2mxe0007e6ec6hxm0ctq	Your complaint "uongozi" has been updated to: Resolved - Pending Employee Confirmation.	/dashboard/complaints	f	cmd5a9ybm00052bt65vf6eel7	2025-07-22 19:45:36.914
cmdeytrqk0009e6ecwzdn04ir	Your complaint "nimekosa kupandishwa cheo kwa miaka mingi" has been updated to: Rejected by DO - Awaiting HRO/Submitter Action.	/dashboard/complaints	f	cmd06nnbx000te67ww4cbaug7	2025-07-22 20:06:42.86
cmdeznjft000de6ecicdpfbs5	Your complaint "tunafanya kazi katika mazingira hatarishi" has been updated to: lalamiko lako limepokelewa, linafanyiwa kazi.	/dashboard/complaints	f	cmd06nnbx000te67ww4cbaug7	2025-07-22 20:29:51.786
cmdezslhh000fe6ecy4ptaznh	Your complaint "tunafanya kazi katika mazingira hatarishi" has been updated to: Awaiting More Information.	/dashboard/complaints	f	cmd5a9yrw007j2bt6jshonn46	2025-07-22 20:33:47.717
cmdf17zlp000he6eci3qm8n7z	Your complaint "tunafanya kazi katika mazingira hatarishi" has been updated to: Closed - Commission Decision (Resolved).	/dashboard/complaints	f	cmd06nnbx000te67ww4cbaug7	2025-07-22 21:13:45.469
cmdf1a78d000le6ec7vy92zqf	Your complaint "sijapata haki zangu za msingi" has been updated to: lalamiko lako limepokelewa, linafanyiwa kazi.	/dashboard/complaints	f	cmd06nnbx000te67ww4cbaug7	2025-07-22 21:15:28.669
cme35k5rg00032basqkxz9lv8	Your complaint "tunafanya kazi katika mazingira hatarishi" has been updated to: lalamiko lako limepokelewa, linafanyiwa kazi.	/dashboard/complaints	t	cmd06nnbz000ve67wncnv4etg	2025-08-08 18:21:40.012
cme36e7sq00052basq1uc58sq	Your complaint "tunafanya kazi katika mazingira hatarishi" has been updated to: Awaiting More Information.	/dashboard/complaints	f	cmd06nnbz000ve67wncnv4etg	2025-08-08 18:45:02.331
cme36g4cm00072basdpajx0cg	Your complaint "tunafanya kazi katika mazingira hatarishi" has been updated to: Under Review - Additional Information Provided.	/dashboard/complaints	f	cmd06nnbz000ve67wncnv4etg	2025-08-08 18:46:31.174
cme36iop300092basxx6jsbh8	Your complaint "tunafanya kazi katika mazingira hatarishi" has been updated to: Resolved - Pending Employee Confirmation.	/dashboard/complaints	f	cmd06nnbz000ve67wncnv4etg	2025-08-08 18:48:30.855
cme36j4k2000b2bas4qfo5iy2	Your complaint "tunafanya kazi katika mazingira hatarishi" has been updated to: Mtumishi ameridhika na hatua.	/dashboard/complaints	f	cmd06nnbz000ve67wncnv4etg	2025-08-08 18:48:51.41
cme37jxi900012bj1ylpv3xtt	Your complaint "sijapata haki zangu za msingi" has been updated to: Rejected by HHRMD – Waiting submitter reaction.	/dashboard/complaints	f	cmd06nnbx000te67ww4cbaug7	2025-08-08 19:17:28.545
cme37kwua00032bj1lkjuevx2	Your complaint "sijapata haki zangu za msingi" has been updated to: Closed - Commission Decision (Resolved).	/dashboard/complaints	f	cmd5a9yrw007j2bt6jshonn46	2025-08-08 19:18:14.338
cme382n2v00072bj175biy4oh	Your complaint "sijapata haki zangu za msingi" has been updated to: lalamiko lako limepokelewa, linafanyiwa kazi.	/dashboard/complaints	t	cmd5a9yci000l2bt67nmav3dd	2025-08-08 19:32:01.495
cme3a7zfv00092bj1xos326m0	Your complaint "sijapata haki zangu za msingi" has been updated to: Closed - Commission Decision (Resolved).	/dashboard/complaints	t	cmd5a9yci000l2bt67nmav3dd	2025-08-08 20:32:10.027
cme3d5f6300032b5r2usxlfd0	Your complaint "nimebaguliwa kazini" has been updated to: Awaiting More Information.	/dashboard/complaints	t	cmd5a9yci000l2bt67nmav3dd	2025-08-08 21:54:09.291
cme3d65kw00052b5rrrfw2se2	Your complaint "nimebaguliwa kazini" has been updated to: Under Review - Additional Information Provided.	/dashboard/complaints	t	cmd5a9yci000l2bt67nmav3dd	2025-08-08 21:54:43.52
cme3d7woj00072b5rypvnhddg	Your complaint "nimebaguliwa kazini" has been updated to: Resolved - Pending Employee Confirmation.	/dashboard/complaints	t	cmd5a9yci000l2bt67nmav3dd	2025-08-08 21:56:05.299
cme3d8hsq00092b5rpbn6f38i	Your complaint "nimebaguliwa kazini" has been updated to: Mtumishi ameridhika na hatua.	/dashboard/complaints	t	cmd5a9yci000l2bt67nmav3dd	2025-08-08 21:56:32.666
cme3f0zvf00012b86lbd3kg18	Karibu katika Mfumo wa Usimamizi wa Huduma za Kiraia (CSMS). Mfumo huu utakusaidia kusimamia maombi yako ya kiutendaji.	/dashboard	t	cmd06nnbn000le67wtg41s3su	2025-08-08 22:46:42.075
cme473rh700052bidazuz5mfo	Welcome to the Civil Service Management System (CSMS). This system will help you manage your employment requests.	/dashboard	t	cme471pqo00032bidhttxmboj	2025-08-09 11:52:40.411
cme487gqs00032btj2vii7gzc	New leave without pay request submitted by Muuguzi Mwanaisha Juma Khamis (cme487gq500012btj3kb5djnh). Requires your review.	/dashboard/lwop	f	cmd06nnbd000de67wb6e6ild5	2025-08-09 12:23:32.741
cme46vyqq00012bidh7j9jxhe	Welcome to the Civil Service Management System (CSMS). This system will help you manage your employment requests.	/dashboard	t	cmd06nn9p0005e67wgvz3pd6c	2025-08-09 11:46:36.578
cme59lizw00012bobixxkz2xa	Welcome to the Civil Service Management System (CSMS). This system will help you manage your employment requests.	/dashboard	t	cme57cciu00082bcqnbw9sjm9	2025-08-10 05:50:14.636
cme487gql00022btjg48hvwwb	New leave without pay request submitted by Muuguzi Mwanaisha Juma Khamis (cme487gq500012btj3kb5djnh). Requires your review.	/dashboard/lwop	t	cmd059ir10002e6d86l802ljc	2025-08-09 12:23:32.733
cme4jt1q9000d2btjolqmapfs	New leave without pay request submitted by Dr. Mwalimu Hassan Omar (cme4jt1p5000b2btjr5vy3853). Requires your review.	/dashboard/lwop	f	cmd06nnbd000de67wb6e6ild5	2025-08-09 17:48:15.489
cme4jui2a000h2btj4alc6xrn	New leave without pay request submitted by Muuguzi Juma Khamis Omar (cme4jui1y000f2btj2gd59qv8). Requires your review.	/dashboard/lwop	f	cmd06nnbd000de67wb6e6ild5	2025-08-09 17:49:23.314
cme4jvdns000l2btj2zrec2ff	New promotion request submitted by Muuguzi Juma Khamis Omar (cme4jvdnb000j2btj777rf0xk). Requires your review.	/dashboard/promotion	f	cmd06nnbd000de67wb6e6ild5	2025-08-09 17:50:04.265
cme5jj93800052bheciyds81j	New leave without pay request submitted by Bakari Mohamed Khamis (cme5jj92q00032bhegl61crei). Requires your review.	/dashboard/lwop	f	cme57api100042bcqhbkg91r8	2025-08-10 10:28:24.645
cme4jt1pk000c2btjb3c0pkr4	New leave without pay request submitted by Dr. Mwalimu Hassan Omar (cme4jt1p5000b2btjr5vy3853). Requires your review.	/dashboard/lwop	t	cmd059ir10002e6d86l802ljc	2025-08-09 17:48:15.464
cme4jui25000g2btjtbn3ggfg	New leave without pay request submitted by Muuguzi Juma Khamis Omar (cme4jui1y000f2btj2gd59qv8). Requires your review.	/dashboard/lwop	t	cmd059ir10002e6d86l802ljc	2025-08-09 17:49:23.309
cme4jvdno000k2btj8a87awde	New promotion request submitted by Muuguzi Juma Khamis Omar (cme4jvdnb000j2btj777rf0xk). Requires your review.	/dashboard/promotion	t	cmd059ir10002e6d86l802ljc	2025-08-09 17:50:04.26
cme56ms8t000z2btjhnrdywta	Welcome to the Civil Service Management System (CSMS). This system will help you manage your employment requests.	/dashboard	t	cme56ma17000x2btjnpvgr0kg	2025-08-10 04:27:14.429
cme57m51w000a2bcqa9t95i1f	Welcome to the Civil Service Management System (CSMS). This system will help you manage your employment requests.	/dashboard	t	cme577oj300022bcqm9dhpzy8	2025-08-10 04:54:43.988
cme5jj93e00062bhe8wo8i03f	New leave without pay request submitted by Bakari Mohamed Khamis (cme5jj92q00032bhegl61crei). Requires your review.	/dashboard/lwop	f	cmd06nnbd000de67wb6e6ild5	2025-08-10 10:28:24.65
cme5jj93800042bheocu9tw9y	New leave without pay request submitted by Bakari Mohamed Khamis (cme5jj92q00032bhegl61crei). Requires your review.	/dashboard/lwop	t	cmd059ir10002e6d86l802ljc	2025-08-10 10:28:24.645
cme5jj93e00072bhebcsj7snk	New leave without pay request submitted by Bakari Mohamed Khamis (cme5jj92q00032bhegl61crei). Requires your review.	/dashboard/lwop	t	cme57bm9600062bcqtlkj9wcx	2025-08-10 10:28:24.65
cme6ls5p500052bgxw0908vhi	New leave without pay request submitted by Salim Hamad Mwinyi (cme6ls5ov00032bgxwhk2x3og). Requires your review.	/dashboard/lwop	f	cme57api100042bcqhbkg91r8	2025-08-11 04:19:05.561
cme6ls5pc00062bgxjqjef9jt	New leave without pay request submitted by Salim Hamad Mwinyi (cme6ls5ov00032bgxwhk2x3og). Requires your review.	/dashboard/lwop	f	cmd06nnbd000de67wb6e6ild5	2025-08-11 04:19:05.569
cme6ls5pc00072bgxdlpu8tr4	New leave without pay request submitted by Salim Hamad Mwinyi (cme6ls5ov00032bgxwhk2x3og). Requires your review.	/dashboard/lwop	f	cme57bm9600062bcqtlkj9wcx	2025-08-11 04:19:05.569
cme6lu3g8000b2bgxt096pvd4	New promotion request submitted by Salim Hamad Mwinyi (cme6lu3fz00092bgxhcmrgmnk). Requires your review.	/dashboard/promotion	f	cme57api100042bcqhbkg91r8	2025-08-11 04:20:35.96
cme6lu3gd000c2bgxosmc8hdx	New promotion request submitted by Salim Hamad Mwinyi (cme6lu3fz00092bgxhcmrgmnk). Requires your review.	/dashboard/promotion	f	cmd06nnbd000de67wb6e6ild5	2025-08-11 04:20:35.965
cme6lu3gd000d2bgxpjledcow	New promotion request submitted by Salim Hamad Mwinyi (cme6lu3fz00092bgxhcmrgmnk). Requires your review.	/dashboard/promotion	f	cme57bm9600062bcqtlkj9wcx	2025-08-11 04:20:35.965
cme6tbpun000q2bgxsj429amg	Welcome to the Civil Service Management System (CSMS). This system will help you manage your employment requests.	/dashboard	f	cme6sts42000o2bgxfjax08co	2025-08-11 07:50:15.455
cme6x2bzf000s2bgx2qe0kkd5	Welcome to the Civil Service Management System (CSMS). This system will help you manage your employment requests.	/dashboard	f	cmd06nnbq000ne67wwmiwxuo8	2025-08-11 09:34:56.044
cme6ls5p500042bgx7m8xb4ig	New leave without pay request submitted by Salim Hamad Mwinyi (cme6ls5ov00032bgxwhk2x3og). Requires your review.	/dashboard/lwop	t	cmd059ir10002e6d86l802ljc	2025-08-11 04:19:05.561
cme6lu3g8000a2bgxbftjrokb	New promotion request submitted by Salim Hamad Mwinyi (cme6lu3fz00092bgxhcmrgmnk). Requires your review.	/dashboard/promotion	t	cmd059ir10002e6d86l802ljc	2025-08-11 04:20:35.96
cme8w4rks00032b9t5kteoqk8	Welcome to the Civil Service Management System (CSMS). This system will help you manage your employment requests.	/dashboard	t	cme8w3n2k00012b9tld8ti2t0	2025-08-12 18:44:22.301
cmecjpr4d00012bhu7s0gfjre	Welcome to the Civil Service Management System (CSMS). This system will help you manage your employment requests.	/dashboard	f	cmd06nnbu000re67wdeax0fwp	2025-08-15 08:07:51.179
cmeck04e100052bhu7rawvm1a	Welcome to the Civil Service Management System (CSMS). This system will help you manage your employment requests.	/dashboard	t	cmecjzkmi00032bhu3ts6wi8y	2025-08-15 08:15:54.938
\.


--
-- Data for Name: PromotionRequest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PromotionRequest" (id, status, "reviewStage", "proposedCadre", "promotionType", "studiedOutsideCountry", documents, "rejectionReason", "employeeId", "submittedById", "reviewedById", "createdAt", "updatedAt", "commissionDecisionReason") FROM stdin;
cmd08neh4000he6qkbpsewsvw	APPROVED	COMMISSION_REVIEW	Education Officer	EducationAdvancement	f	{https://placehold.co/promotion-application.pdf,https://placehold.co/certificates.pdf,https://placehold.co/performance-evaluation.pdf}	\N	emp8	cmd06nnbz000ve67wncnv4etg	\N	2025-06-22 12:45:09.255	2025-06-13 12:45:09.255	\N
cmd08neh6000je6qkinyddcfc	UNDER_REVIEW	COMMISSION_REVIEW	Education Officer	EducationAdvancement	f	{https://placehold.co/promotion-application.pdf,https://placehold.co/certificates.pdf,https://placehold.co/performance-evaluation.pdf}	\N	emp1	cmd06nnbx000te67ww4cbaug7	cmd06nnbn000le67wtg41s3su	2025-05-30 12:45:09.258	2025-06-25 12:45:09.258	\N
cmd08neh8000le6qkplwwgysk	UNDER_REVIEW	HR_REVIEW	Senior Administrative Officer	Experience	\N	{https://placehold.co/promotion-application.pdf,https://placehold.co/certificates.pdf,https://placehold.co/performance-evaluation.pdf}	\N	emp1	cmd06nnbu000re67wdeax0fwp	cmd06nnb50007e67wa5491lw5	2025-02-02 12:45:09.26	2025-07-07 12:45:09.26	\N
cmd08neha000ne6qk3rgcyayt	REJECTED	COMMISSION_REVIEW	Education Officer	Experience	\N	{https://placehold.co/promotion-application.pdf,https://placehold.co/certificates.pdf,https://placehold.co/performance-evaluation.pdf}	Does not meet minimum experience requirements	emp1	cmd06nnbx000te67ww4cbaug7	cmd06nnb50007e67wa5491lw5	2025-03-22 12:45:09.262	2025-07-10 12:45:09.262	\N
cmd08nehc000pe6qkqewkapax	PENDING	INITIAL	Senior Education Officer	EducationAdvancement	f	{https://placehold.co/promotion-application.pdf,https://placehold.co/certificates.pdf,https://placehold.co/performance-evaluation.pdf}	\N	emp9	cmd06nnbx000te67ww4cbaug7	\N	2025-01-10 12:45:09.264	2025-06-20 12:45:09.264	\N
cmd08nehf000re6qkmx0hg1vs	APPROVED	FINAL_APPROVAL	Administrative Officer	Experience	\N	{https://placehold.co/promotion-application.pdf,https://placehold.co/certificates.pdf,https://placehold.co/performance-evaluation.pdf}	\N	emp8	cmd06nnbu000re67wdeax0fwp	cmd06nnbq000ne67wwmiwxuo8	2025-04-01 12:45:09.266	2025-06-28 12:45:09.266	\N
cmd08nehj000te6qky2c8qhyl	APPROVED	HR_REVIEW	Principal Administrative Officer	EducationAdvancement	t	{https://placehold.co/promotion-application.pdf,https://placehold.co/certificates.pdf,https://placehold.co/performance-evaluation.pdf}	\N	emp9	cmd06nnbz000ve67wncnv4etg	cmd06nnbn000le67wtg41s3su	2025-05-05 12:45:09.271	2025-07-04 12:45:09.271	\N
cmd08nehm000ve6qk51oyijxo	APPROVED	INITIAL	Senior Administrative Officer	EducationAdvancement	t	{https://placehold.co/promotion-application.pdf,https://placehold.co/certificates.pdf,https://placehold.co/performance-evaluation.pdf}	\N	emp8	cmd06nnbx000te67ww4cbaug7	cmd06nnbn000le67wtg41s3su	2025-01-24 12:45:09.273	2025-07-04 12:45:09.273	\N
cmd08neho000xe6qkoir8piid	PENDING	COMMISSION_REVIEW	Principal Administrative Officer	EducationAdvancement	f	{https://placehold.co/promotion-application.pdf,https://placehold.co/certificates.pdf,https://placehold.co/performance-evaluation.pdf}	\N	emp9	cmd06nnbu000re67wdeax0fwp	\N	2025-01-26 12:45:09.276	2025-07-11 12:45:09.276	\N
cmd08nehq000ze6qk2jhu7giy	REJECTED	FINAL_APPROVAL	Senior Administrative Officer	EducationAdvancement	t	{https://placehold.co/promotion-application.pdf,https://placehold.co/certificates.pdf,https://placehold.co/performance-evaluation.pdf}	Does not meet minimum experience requirements	emp1	cmd06nnbu000re67wdeax0fwp	cmd059ir10002e6d86l802ljc	2025-01-01 12:45:09.278	2025-06-14 12:45:09.278	\N
cmd0xp0h80001e6j41vq5b8z3	Approved by Commission	completed	Grade 1	Experience	\N	{"Letter of Request","Performance Appraisal (Y1)","Performance Appraisal (Y2)","Performance Appraisal (Y3)","CSC Promotion Form"}	\N	emp_002	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-13 00:26:14.828	2025-07-13 00:26:59.15	\N
cmd1hhwy40003e6yudjugtg2c	Pending HRMO Review	initial	Afisa Mkuu Daraja la II	Experience	\N	{"Letter of Request","Performance Appraisal (Y1)","Performance Appraisal (Y2)","Performance Appraisal (Y3)","CSC Promotion Form"}	\N	emp_033	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-13 09:40:35.98	2025-07-13 09:59:25.111	\N
cmd0wqoye0001e6xfhxw3i2po	Approved by Commission	completed	Senior Manager	Experience	\N	{performance-appraisal-y1.pdf,performance-appraisal-y2.pdf,performance-appraisal-y3.pdf,csc-form.pdf,letter-of-request.pdf}	\N	emp8	cmd06nnbl000je67wtl28pk42	cmd059ir10002e6d86l802ljc	2025-07-12 23:59:33.59	2025-07-13 00:27:44.997	\N
cmd0wc5vh0003e6m4xfwzv41c	Approved by Commission	completed	daraja la 2	Experience	\N	{"Letter of Request","Performance Appraisal (Y1)","Performance Appraisal (Y2)","Performance Appraisal (Y3)","CSC Promotion Form"}	\N	emp_002	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-12 23:48:15.677	2025-07-12 23:51:30.437	\N
cmd1gw8jp0001e6yu3jk0u6ok	Approved by Commission	completed	Afisa Muandamizi	Experience	\N	{"Letter of Request","Performance Appraisal (Y1)","Performance Appraisal (Y2)","Performance Appraisal (Y3)","CSC Promotion Form"}	\N	emp_004	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-13 09:23:44.57	2025-07-13 09:32:26.999	\N
cmd4c9jd20001e6tc8gu4hzfk	Rejected by Commission	completed	Afisa Muandamizi	Experience	\N	{"Letter of Request","Performance Appraisal (Y1)","Performance Appraisal (Y2)","Performance Appraisal (Y3)","CSC Promotion Form"}	umekosea kuweka document sahihi 	emp_001	cmd06nnbn000le67wtg41s3su	cmd06nnbb000be67wwgil78yv	2025-07-15 09:37:25.574	2025-07-15 10:55:29.104	\N
cmd1ibta10005e6yu6mvfoxr0	Rejected by Commission	completed	Afisa Mkuu Daraja la I	Experience	\N	{"Letter of Request","Performance Appraisal (Y1)","Performance Appraisal (Y2)","Performance Appraisal (Y3)","CSC Promotion Form"}	\N	emp_003	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-13 10:03:50.905	2025-07-13 11:07:41.459	\N
cmd4edi1k0001e6gpvy0exb17	Approved by Commission	completed	Afisa Mkuu Daraja la II	Experience	\N	{"Letter of Request","Performance Appraisal (Y1)","Performance Appraisal (Y2)","Performance Appraisal (Y3)","CSC Promotion Form"}	\N	emp_006	cmd06nnbn000le67wtg41s3su	cmd06nnbb000be67wwgil78yv	2025-07-15 10:36:29.72	2025-07-15 10:56:37.132	\N
cmd5qh4xz00052btwsc4wp1ch	Approved by Commission	completed	Muhudumu daraja la II	Experience	\N	{"Letter of Request","Performance Appraisal (Y1)","Performance Appraisal (Y2)","Performance Appraisal (Y3)","CSC Promotion Form"}	\N	emp_002	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-16 09:03:00.934	2025-07-16 09:26:36.642	\N
cmd5ro8jy00072btwyj24lefo	Approved by Commission	completed	Muhudumu daraja la II	Experience	\N	{"Letter of Request","Performance Appraisal (Y1)","Performance Appraisal (Y2)","Performance Appraisal (Y3)","CSC Promotion Form"}	\N	emp_002	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-16 09:36:31.822	2025-07-16 09:46:49.159	\N
cmd5rvrk300092btwl0wi5471	Approved by Commission	completed	daraja la II	Experience	\N	{"Letter of Request","Performance Appraisal (Y1)","Performance Appraisal (Y2)","Performance Appraisal (Y3)","CSC Promotion Form"}	\N	emp_020	cmd06nnbl000je67wtl28pk42	cmd059ir10002e6d86l802ljc	2025-07-16 09:42:23.042	2025-07-16 09:46:42.103	\N
cmdbg8ixw0001e6acwpxxoljc	Draft - Pending Review	HRO Review	Afisa Muandamizi	Experience	f	{"Letter of Request","Performance Appraisal (Y1)","Performance Appraisal (Y2)","Performance Appraisal (Y3)","CSC Promotion Form"}	\N	emp_006	cmd06nnbn000le67wtg41s3su	\N	2025-07-20 09:03:00.067	2025-07-20 09:03:00.067	\N
cmddazj020005e67k238btjy0	Draft - Pending Review	HRO Review	Afisa Muandamizi	Experience	f	{"Letter of Request","Performance Appraisal (Y1)","Performance Appraisal (Y2)","Performance Appraisal (Y3)","CSC Promotion Form"}	\N	emp_006	cmd06nnbn000le67wtg41s3su	\N	2025-07-21 16:11:34.514	2025-07-21 16:11:34.514	\N
cmddbigkx0007e67kctnbe35k	Approved by Commission	completed	daraja la 2	Experience	f	{"Letter of Request","Performance Appraisal (Y1)","Performance Appraisal (Y2)","Performance Appraisal (Y3)","CSC Promotion Form"}	\N	ofisi_emp_008	cmd06nnbn000le67wtg41s3su	cmd06nnbb000be67wwgil78yv	2025-07-21 16:26:17.841	2025-07-21 16:37:32.736	ombi limekubaliwa
cmde3bpgq0005e6jop6vocgzw	Approved by Commission	completed	Afisa Mkuu Daraja la I	Experience	f	{"Letter of Request","Performance Appraisal (Y1)","Performance Appraisal (Y2)","Performance Appraisal (Y3)","CSC Promotion Form"}	\N	emp_001	cmd06nnbn000le67wtg41s3su	cmd06nnbb000be67wwgil78yv	2025-07-22 05:24:52.009	2025-07-22 05:27:19.177	amekubaliwa na tume
cmde3noh20007e6jot1wnox0m	Pending HRMO/HHRMD Review	initial	Afisa Muandamizi	Experience	f	{"Letter of Request","Performance Appraisal (Y1)","Performance Appraisal (Y2)","Performance Appraisal (Y3)","CSC Promotion Form"}	\N	emp_001	cmd06nnbn000le67wtg41s3su	\N	2025-07-22 05:34:10.598	2025-07-22 05:34:10.598	\N
cmdieh2ox0007e6rwbuwwewy6	Pending HRMO/HHRMD Review	initial	Afisa Mkuu Daraja la II	Experience	f	{promotion/letters/20250725_084801_1f7f3e0d.pdf,promotion/performance-appraisals/20250725_084749_9d2bb5c0.pdf,promotion/performance-appraisals/20250725_084752_d88f5862.pdf,promotion/performance-appraisals/20250725_084755_27d245db.pdf,promotion/csc-forms/20250725_084758_ee2bca45.pdf}	\N	ofisi_emp_005	cmd06nnbn000le67wtg41s3su	\N	2025-07-25 05:48:02.913	2025-07-25 05:48:02.913	\N
cmdy7vw1y00092bd8yq0ehmq2	Pending HRMO/HHRMD Review	initial	Afisa Hesabu Mkuu daraja la I	Experience	f	{promotion/letters/1754378869208_sg3nv8_ripoti_ya_kustaafu_kwa_hiari_report.pdf,promotion/performance-appraisals/1754378838914_on06vn_ripoti_ya_kupandishwa_cheo_report.pdf,promotion/performance-appraisals/1754378839575_kx3f4o_ripoti_ya_likizo_bila_malipo_report.pdf,promotion/performance-appraisals/1754378863903_2scjih_ripoti_ya_kustaafu_kwa_ugonjwa_report.pdf,promotion/csc-forms/1754378869061_bkb9wi_ripoti_ya_kustaafu_kwa_hiari_report.pdf}	\N	emp_001	cmd06nnbn000le67wtg41s3su	\N	2025-08-05 07:27:55.622	2025-08-05 07:27:55.622	\N
cmdymbuym00032bghh6eo28ja	Pending HRMO/HHRMD Review	initial		EducationAdvancement	f	{promotion/letters/1754403133334_0koo3s_sababu.pdf,promotion/certificates/1754403129220_bq91hk_Employee_Profile_Analysis.pdf}	\N	emp_003	cmd06nnbn000le67wtg41s3su	\N	2025-08-05 14:12:15.358	2025-08-05 14:12:15.358	\N
cmdys0peu00012bdng16iaf2c	Pending HRMO/HHRMD Review	initial		EducationAdvancement	f	{promotion/letters/1754412689895_yd9rdy_sababu.pdf,promotion/certificates/1754412680917_nlvnev_Employee_Profile_Analysis.pdf}	\N	emp_003	cmd06nnbn000le67wtg41s3su	\N	2025-08-05 16:51:32.646	2025-08-05 16:51:32.646	\N
cmdymhs0n00052bgh1yx3x8as	Pending HRMO/HHRMD Review	initial	senior officer grade II	EducationAdvancement	f	{promotion/letters/1754405348803_1fevx3_mfano.pdf}	\N	emp_006	cmd06nnbn000le67wtg41s3su	cmd06nnbn000le67wtg41s3su	2025-08-05 14:16:51.478	2025-08-05 14:49:21.444	\N
cmdyf42zy000h2b41v5humh4r	Request Received – Awaiting Commission Decision	commission_review	Afisa Mkuu Daraja la VI	Experience	f	{promotion/letters/1754391261539_8wk5l9_ripoti_ya_kustaafu_kwa_ugonjwa_report.pdf,promotion/performance-appraisals/1754391243219_fhpuzr_ya_kuacha_kazi_report.pdf,promotion/performance-appraisals/1754391246376_pikn6t_1754384852415_9af7qo_ripoti_ya_kustaafu_kwa_ugonjwa_report.pdf,promotion/performance-appraisals/1754391249184_4dphvo_ya_kuacha_kazi_report.pdf,promotion/csc-forms/1754391257921_7xbd61_1754386247723_17ukwm_ripoti_ya_kuacha_kazi_report.pdf}	\N	emp_001	cmd06nnbn000le67wtg41s3su	cmd06nnbb000be67wwgil78yv	2025-08-05 10:50:15.214	2025-08-05 11:10:01.454	daraja la VIII
cmdymalck00012bgh9yppnjw1	Pending HRMO/HHRMD Review	initial		EducationAdvancement	f	{promotion/letters/1754402810374_0xpvw6_Employee_Profile_Analysis.pdf,promotion/certificates/1754402800552_8un9ye_mfano.pdf}	\N	ofisi_emp_005	cmd06nnbn000le67wtg41s3su	\N	2025-08-05 14:11:16.244	2025-08-05 14:11:16.244	\N
cmdzlc88c00012bgqqs31thc3	Approved by Commission	completed		EducationAdvancement	t	{promotion/letters/1754461930733_mwheg6_ya_kuacha_kazi_report.pdf,promotion/certificates/1754461927501_1aa62t_ripoti_ya_kuacha_kazi_report.pdf,promotion/tcu-forms/1754461936307_d8x94h_ripoti_ya_kuacha_kazi_report.pdf}	\N	emp_001	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-06 06:32:19.114	2025-08-06 06:33:39.477	kakubaliwa
cmdyo8h6900012bfivk1fhgu3	Approved by Commission	completed	Afisa Mkuu daraja la II	EducationAdvancement	t	{promotion/letters/1754407244845_u7lok7_mfano.pdf,promotion/certificates/1754407241090_a6o5nt_cheti.pdf,promotion/tcu-forms/1754407254984_s8khof_sababu.pdf}	\N	emp_004	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-05 15:05:36.753	2025-08-05 15:22:50.011	amekubaliwa
cmdzlpilt00032bgqs9fn8ami	Pending HRMO/HHRMD Review	initial	Grade IV	Experience	f	{promotion/letters/1754462556325_moxl5v_ripoti_ya_kustaafu_kwa_ugonjwa_report.pdf,promotion/performance-appraisals/1754462518565_k4hxb5_ripoti_ya_likizo_bila_malipo_report.pdf,promotion/performance-appraisals/1754462523647_k360cj_ya_kuacha_kazi_report.pdf,promotion/performance-appraisals/1754462528719_plakme_ripoti_ya_kupandishwa_cheo_report.pdf,promotion/csc-forms/1754462553076_6z94h0_ripoti_ya_kustaafu_kwa_ugonjwa_report.pdf}	\N	emp_001	cmd06nnbn000le67wtg41s3su	\N	2025-08-06 06:42:39.09	2025-08-06 06:42:39.09	\N
cmdzlq44100052bgq2q8o7z46	Pending HRMO/HHRMD Review	initial		EducationAdvancement	t	{promotion/letters/1754462578890_p3xjr8_ya_kuacha_kazi_report.pdf,promotion/certificates/1754462575191_c9whhw_ripoti_ya_kuacha_kazi_report.pdf,promotion/tcu-forms/1754462583939_rsfqlc_ripoti_ya_kustaafu_kwa_hiari_report.pdf}	\N	emp_001	cmd06nnbn000le67wtg41s3su	\N	2025-08-06 06:43:06.961	2025-08-06 06:43:06.961	\N
cmdytdro300012b7kjj9yuuln	Approved by Commission	completed		EducationAdvancement	f	{promotion/letters/1754414128269_suj0o5_mfano.pdf,promotion/certificates/1754414119925_i94dxr_mfano.pdf}	\N	emp_006	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-05 17:29:41.716	2025-08-06 06:33:55.049	kakubaliwa
cme4jvdnb000j2btj777rf0xk	Approved by Commission	completed	Afisa Mkuu Daraja la II	Experience	f	{promotion/letters/1754761802267_t0rn80_ripoti_ya_kupandishwa_cheo_report__1_.pdf,promotion/performance-appraisals/1754761786871_3ml15t_1754407554728_bj7hik_sababu.pdf,promotion/performance-appraisals/1754761789629_r9sxrm_1754676807327_mfbgv3_ripoti_ya_kupandishwa_cheo_report__2_.pdf,promotion/performance-appraisals/1754761793018_ikdugv_20250802_081604_d8a23939.pdf,promotion/csc-forms/1754761798763_1rct2d_20250802_094101_02331ce1.pdf}	\N	cme45oe31000l2bfw2kzug3tj	cme471pqo00032bidhttxmboj	cmd059ir10002e6d86l802ljc	2025-08-09 17:50:04.247	2025-08-10 12:51:38.948	umekubaliwa
cme6lu3fz00092bgxhcmrgmnk	Pending HRMO/HHRMD Review	initial	Afisa rasilimaliwatu daraja la II	Experience	f	{promotion/letters/1754886033714_qj6x4e_20250727_072131_627b1cda.pdf,promotion/performance-appraisals/1754886017412_v2gvke_1754324616644_6r2ulr_cheti__1_.pdf,promotion/performance-appraisals/1754886022746_luk1qq_1754407554728_bj7hik_sababu.pdf,promotion/performance-appraisals/1754886023455_e2ag34_ripoti_ya_kupandishwa_cheo_report__2_.pdf,promotion/csc-forms/1754886027010_o1zpwt_20250802_094101_02331ce1.pdf}	\N	cme571jn200003emp008	cme577oj300022bcqm9dhpzy8	\N	2025-08-11 04:20:35.951	2025-08-11 04:20:35.951	\N
\.


--
-- Data for Name: ResignationRequest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ResignationRequest" (id, status, "reviewStage", "effectiveDate", reason, documents, "rejectionReason", "employeeId", "submittedById", "reviewedById", "createdAt", "updatedAt") FROM stdin;
cmd08neir001ve6qkwtv3he8d	UNDER_REVIEW	HR_REVIEW	2025-10-26 12:45:09.314	Better opportunity	{https://placehold.co/resignation-letter.pdf,https://placehold.co/handover-plan.pdf}	\N	emp8	cmd06nnbu000re67wdeax0fwp	cmd06nnbn000le67wtg41s3su	2025-07-10 12:45:09.314	2025-07-07 12:45:09.314
cmd08neit001xe6qkt6mh4rha	APPROVED	DIRECTOR_REVIEW	2025-10-20 12:45:09.317	Better opportunity	{https://placehold.co/resignation-letter.pdf,https://placehold.co/handover-plan.pdf}	\N	emp9	cmd06nnbu000re67wdeax0fwp	cmd059ir10002e6d86l802ljc	2025-07-11 12:45:09.317	2025-06-26 12:45:09.317
cmd08neiw001ze6qkxdo0hjsz	APPROVED	FINAL_APPROVAL	2025-08-22 12:45:09.319	Relocation	{https://placehold.co/resignation-letter.pdf,https://placehold.co/handover-plan.pdf}	\N	emp8	cmd06nnbx000te67ww4cbaug7	\N	2025-06-29 12:45:09.319	2025-06-27 12:45:09.319
cmd4kah670003e609jq4fhj7l	Rejected by Commission	completed	2025-07-31 00:00:00	hataki kazi	{"Letter of Request","3 Month Notice/Receipt"}	\N	emp_001	cmd06nnbn000le67wtg41s3su	cmd06nnbb000be67wwgil78yv	2025-07-15 13:22:06.32	2025-07-15 13:26:31.535
cmd8k4o6s004r2bgty2fconfm	Approved by Commission	completed	2025-07-25 00:00:00	Amepata kazi nje ya nchi	{"Letter of Request","3 Month Notice/Receipt"}	\N	emp_005	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-18 08:28:40.179	2025-07-18 08:36:52.27
cmd8khiaz004z2bgt6pbfmc0g	Rejected by Commission	completed	2025-08-02 00:00:00	sdfdhhgffffff	{"Letter of Request","3 Month Notice/Receipt"}	\N	emp_002	cmd06nnbl000je67wtl28pk42	cmd06nnbb000be67wwgil78yv	2025-07-18 08:38:39.083	2025-07-18 08:39:21.955
cmddfihpu000ne67kmzio1x14	Rejected by HHRMD - Awaiting HRO Action	initial	2025-07-24 00:00:00	hataki kazi	{"Letter of Request","3 Month Notice/Receipt"}	hujaeka  ddocument . nasema 	ofisi_emp_007	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-21 18:18:17.778	2025-07-22 21:35:31.624
cmdf2n6i60003e6lonqa65v28	Rejected by Commission - Request Concluded	completed	2025-08-09 00:00:00	sawaa	{"Letter of Request","3 Month Notice/Receipt"}	\N	ofisi_emp_018	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-22 21:53:33.87	2025-07-22 21:54:18.579
cmdf1sjya0001e6ikkxd4343h	Forwarded to Commission for Acknowledgment	commission_review	2025-07-31 00:00:00	hataki kazi	{"Letter of Request","3 Month Notice/Receipt"}	\N	ofisi_emp_007	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-22 21:29:44.962	2025-07-22 21:36:01.726
cmdbgqsj20009e6ac5yegqa2o	Forwarded to Commission for Acknowledgment	commission_review	2025-07-25 00:00:00	kazi basi	{"Letter of Request","3 Month Notice/Receipt"}	\N	emp_003	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-20 09:17:12.302	2025-07-22 21:36:24.593
cmdbgiji10007e6acgxt50iln	Forwarded to Commission for Acknowledgment	commission_review	2025-07-31 00:00:00	kazi basi	{"Letter of Request","3 Month Notice/Receipt"}	\N	emp_006	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-20 09:10:47.353	2025-07-22 21:37:48.018
cmd1y4a2z0007e60yqt4rschk	Forwarded to Commission for Acknowledgment	commission_review	2025-08-01 00:00:00	\N	{"Letter of Request","3 Month Notice/Receipt"}	\N	emp_003	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-13 17:25:53.291	2025-07-22 21:37:55.217
cmd1xkh870005e60yqmzidokb	Forwarded to Commission for Acknowledgment	commission_review	2025-07-26 00:00:00	amechoka kazi	{"Letter of Request","3 Month Notice/Receipt"}	\N	emp_003	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-13 17:10:29.432	2025-07-22 21:38:02.352
cmdhorx9n0003e65kmuh4fx62	Pending HRMO/HHRMD Review	initial	2025-07-26 00:00:00	sawaa	{"Letter of Request","3 Month Notice/Receipt"}	\N	ofisi_emp_005	cmd06nnbn000le67wtg41s3su	\N	2025-07-24 17:48:39.083	2025-07-24 17:48:39.083
cmdifp4o7000fe6rwvhqv56u8	Pending HRMO/HHRMD Review	initial	2025-08-09 00:00:00	rrr	{resignation/20250725_092210_c6cd62da.pdf,resignation/20250725_092216_fe824371.pdf}	\N	ofisi_emp_005	cmd06nnbn000le67wtg41s3su	\N	2025-07-25 06:22:18.343	2025-07-25 06:22:18.343
cmdifvrnx000he6rwr80qytt5	Pending HRMO/HHRMD Review	initial	2025-08-08 00:00:00	ggfff	{resignation/20250725_092722_93a4e0d6.pdf,resignation/20250725_092725_77cb9ea9.pdf}	\N	ofisi_emp_005	cmd06nnbn000le67wtg41s3su	\N	2025-07-25 06:27:28.078	2025-07-25 06:27:28.078
cmdf2cimc0001e6loca2rnb5l	Approved by Commission	completed	2025-08-08 00:00:00	kazi basi	{"Letter of Request","3 Month Notice/Receipt"}	\N	ofisi_emp_004	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-22 21:45:16.356	2025-07-22 21:51:52.325
cmdig1e3x000je6rwu3bfjl8t	Pending HRMO/HHRMD Review	initial	2025-08-01 00:00:00	sdfsdf	{resignation/20250725_093141_805b88ea.pdf,resignation/20250725_093147_a4863740.pdf}	\N	emp_003	cmd06nnbn000le67wtg41s3su	\N	2025-07-25 06:31:50.445	2025-07-25 06:31:50.445
cmdis9twz0005e6z0fm8eeuj7	Pending HRMO/HHRMD Review	initial	2025-08-08 00:00:00	sidfjsdf fdf sdfsdfsd fsd fds fsdf	{resignation/20250725_151413_ae98547e.pdf,resignation/20250725_151416_ca9a6ec9.pdf}	\N	ofisi_emp_007	cmd06nnbn000le67wtg41s3su	\N	2025-07-25 12:14:19.572	2025-07-25 12:14:19.572
cmdisigwk0007e6z0vus4r8zy	Pending HRMO/HHRMD Review	initial	2025-08-08 00:00:00	safs ffef  fe	{resignation/20250725_152055_e3963333.pdf,resignation/20250725_152059_f97cc54a.pdf}	\N	ofisi_emp_007	cmd06nnbn000le67wtg41s3su	\N	2025-07-25 12:21:02.612	2025-07-25 12:21:02.612
cme6lwo0r000h2bgx7au4hjar	Pending HRMO/HHRMD Review	initial	2025-08-22 00:00:00	amechoka	{resignation/1754886149028_wjd2d7_1754324616644_6r2ulr_cheti.pdf,resignation/1754886153659_sz86nh_20250725_085101_a60b988b.pdf}	\N	cme571jn200003emp006	cme577oj300022bcqm9dhpzy8	\N	2025-08-11 04:22:35.932	2025-08-11 04:22:35.932
cme4jzxlx000r2btj9u9sutxw	Approved by Commission	completed	2025-08-22 00:00:00	kuchoka	{resignation/1754761973300_lgjc3l_20250802_094101_02331ce1.pdf,resignation/1754761978374_7j7ch5_20250727_075904_4497516f__1_.pdf}	\N	cme45oe31000l2bfw2kzug3tj	cme471pqo00032bidhttxmboj	cmd059ir10002e6d86l802ljc	2025-08-09 17:53:36.741	2025-08-10 13:25:16.713
cmdybtsl000052b417qqm83s5	Approved by Commission	completed	2025-08-06 00:00:00	kaacha kazi sasa	{resignation/1754385630327_pu3pqn_ripoti_ya_kupandishwa_cheo_report.pdf,resignation/1754385636454_p9y5vr_ripoti_ya_kustaafu_kwa_ugonjwa_report.pdf}	\N	emp_006	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-05 09:18:16.307	2025-08-05 09:22:59.78
\.


--
-- Data for Name: RetirementRequest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RetirementRequest" (id, status, "reviewStage", "retirementType", "illnessDescription", "proposedDate", "delayReason", documents, "rejectionReason", "employeeId", "submittedById", "reviewedById", "createdAt", "updatedAt") FROM stdin;
cmd08neih001ne6qkhk4nrulr	PENDING	INITIAL	illness	Chronic medical condition affecting work performance	2026-05-29 12:45:09.304	\N	{https://placehold.co/retirement-application.pdf,https://placehold.co/medical-report.pdf}	\N	emp8	cmd06nnbx000te67ww4cbaug7	cmd06nnbn000le67wtg41s3su	2025-05-14 12:45:09.304	2025-07-01 12:45:09.304
cmd08neik001pe6qk9h3bcyji	REJECTED	INITIAL	compulsory	\N	2025-09-02 12:45:09.308	\N	{https://placehold.co/retirement-application.pdf,https://placehold.co/service-record.pdf}	Retirement date does not meet service requirements	emp9	cmd06nnbx000te67ww4cbaug7	\N	2025-06-13 12:45:09.308	2025-07-11 12:45:09.308
cmd08neim001re6qkuubvcrzy	PENDING	FINAL_APPROVAL	compulsory	\N	2025-08-29 12:45:09.31	\N	{https://placehold.co/retirement-application.pdf,https://placehold.co/service-record.pdf}	\N	emp9	cmd06nnbz000ve67wncnv4etg	\N	2025-05-22 12:45:09.31	2025-06-23 12:45:09.31
cmd08neio001te6qkvci4itnj	REJECTED	INITIAL	illness	Chronic medical condition affecting work performance	2026-04-21 12:45:09.312	\N	{https://placehold.co/retirement-application.pdf,https://placehold.co/medical-report.pdf}	Retirement date does not meet service requirements	emp1	cmd06nnbz000ve67wncnv4etg	cmd06nnbq000ne67wwmiwxuo8	2025-07-07 12:45:09.312	2025-06-23 12:45:09.312
cmd1wvn0d0001e6jfo0kn9zbe	Pending HRMO Review	initial	compulsory	\N	2046-10-08 00:00:00	\N	{"Letter of Request","Birth Certificate Copy (or equivalent)"}	\N	emp_004	cmd06nnbn000le67wtg41s3su	\N	2025-07-13 16:51:10.525	2025-07-13 16:51:10.525
cmd1xggf30001e60yfrzv82fj	Pending HRMO/HHRMD Review	initial	voluntary	\N	2042-08-13 00:00:00	\N	{"Letter of Request","Service Record Summary"}	\N	emp_001	cmd06nnbn000le67wtg41s3su	\N	2025-07-13 17:07:21.76	2025-07-13 17:07:21.76
cmd1xinoe0003e60yjd1svxu0	Pending HRMO/HHRMD Review	initial	illness	ugonjwa wa stroke	2027-06-18 00:00:00	\N	{"Letter of Request","Medical Form","Leave Due to Illness Letter"}	\N	emp_003	cmd06nnbn000le67wtg41s3su	\N	2025-07-13 17:09:04.479	2025-07-13 17:09:04.479
cmd4k2k5g0001e6097aq1c9uk	Approved by Commission	completed	compulsory	\N	2049-06-09 00:00:00	alipata uteuzi	{"Letter of Request","Delay Document"}	\N	emp_001	cmd06nnbn000le67wtg41s3su	cmd06nnbb000be67wwgil78yv	2025-07-15 13:15:56.932	2025-07-15 14:45:08.916
cmd8icsly003b2bgtotgbbrh7	Pending HRMO/HHRMD Review	initial	compulsory	\N	2031-11-10 00:00:00	\N	{"Letter of Request","Birth Certificate Copy (or equivalent)"}	\N	emp_022	cmd06nnbl000je67wtl28pk42	\N	2025-07-18 07:38:59.927	2025-07-18 07:38:59.927
cmd8if8gu003d2bgt6w80nimo	Approved by Commission	completed	compulsory	\N	2039-05-18 00:00:00	\N	{"Letter of Request","Birth Certificate Copy (or equivalent)"}	\N	emp_019	cmd06nnbl000je67wtl28pk42	cmd059ir10002e6d86l802ljc	2025-07-18 07:40:53.79	2025-07-18 07:58:02.393
cmd8igazj003f2bgtabwi5ctu	Rejected by Commission	completed	voluntary	\N	2033-06-18 00:00:00	\N	{"Letter of Request"}	\N	emp_019	cmd06nnbl000je67wtl28pk42	cmd06nnbb000be67wwgil78yv	2025-07-18 07:41:43.711	2025-07-18 07:55:06.048
cmd8j8kw3004j2bgtxdw7mn9v	Pending HHRMD Review	HHRMD_review	illness	Strock	2026-01-31 00:00:00	\N	{"Letter of Request","Medical Form","Leave Due to Illness Letter"}	\N	emp_020	cmd06nnbl000je67wtl28pk42	cmd06nnbb000be67wwgil78yv	2025-07-18 08:03:42.915	2025-07-18 08:10:36.85
cmd8j69lv004h2bgt012z02jn	Rejected by Commission	completed	illness	anasumbuliwa na Sukari ya muda mrefu	2026-11-18 00:00:00	\N	{"Letter of Request","Medical Form","Leave Due to Illness Letter"}	\N	emp_019	cmd06nnbl000je67wtl28pk42	cmd06nnbb000be67wwgil78yv	2025-07-18 08:01:54.979	2025-07-18 08:23:42.869
cmddfdclq000he67k3er06bhd	Pending HRMO/HHRMD Review	initial	compulsory	\N	2039-04-19 00:00:00	\N	{"Letter of Request","Birth Certificate Copy (or equivalent)"}	\N	ofisi_emp_007	cmd06nnbn000le67wtg41s3su	\N	2025-07-21 18:14:17.87	2025-07-21 18:14:17.87
cmddfgkw4000je67kvceuud0n	Pending HRMO/HHRMD Review	initial	voluntary	\N	2034-04-19 00:00:00	\N	{"Letter of Request","Service Record Summary"}	\N	ofisi_emp_007	cmd06nnbn000le67wtg41s3su	\N	2025-07-21 18:16:48.547	2025-07-21 18:16:48.547
cmddfhspt000le67kvj10ibha	Rejected by HHRMD - Awaiting HRO Correction	initial	illness	saikolojia	2026-01-23 00:00:00	\N	{"Letter of Request","Medical Form","Leave Due to Illness Letter"}	sawa. lakini hamna hilo jambo	ofisi_emp_007	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-21 18:17:45.377	2025-07-22 21:27:16
cmdelwsqb0009e6johf0mtf7r	Approved by Commission	completed	compulsory	\N	2054-01-01 00:00:00	\N	{"Letter of Request","Birth Certificate Copy (or equivalent)"}	\N	ofisi_emp_022	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-22 14:05:09.107	2025-07-22 21:27:48.803
cmdgx16ok0001e6xob4uvjprz	Pending HRMO/HHRMD Review	initial	illness	saddryfg	2026-01-30 00:00:00	\N	{"Letter of Request","Medical Form","Leave Due to Illness Letter"}	\N	ofisi_emp_007	cmd06nnbn000le67wtg41s3su	\N	2025-07-24 04:52:01.896	2025-07-24 04:52:01.896
cmdiex7c1000de6rwr1623llg	Pending HRMO/HHRMD Review	initial	compulsory	\N	2060-09-14 00:00:00	sawa	{"Letter of Request","Birth Certificate Copy (or equivalent)","Delay Justification Document"}	\N	ofisi_emp_007	cmd06nnbn000le67wtg41s3su	\N	2025-07-25 06:00:35.425	2025-07-25 06:00:35.425
cmditcq2x000be6z0gv7zi7jc	Pending HRMO/HHRMD Review	initial	compulsory	\N	2047-10-16 00:00:00	hg uguiu  uiuhu	{retirement/20250725_154428_bfdd9bac.pdf,retirement/20250725_154419_a73adf0b.pdf}	\N	ofisi_emp_007	cmd06nnbn000le67wtg41s3su	\N	2025-07-25 12:44:34.185	2025-07-25 12:44:34.185
cmdyeel5v000d2b41hjyrv61z	Approved by Commission	completed	voluntary	\N	2041-01-18 00:00:00	\N	{retirement/1754389956732_r5hu1r_ripoti_ya_kupandishwa_cheo_report.pdf}	\N	ofisi_emp_006	cmd06nnbn000le67wtg41s3su	cmd06nnbb000be67wwgil78yv	2025-08-05 10:30:25.698	2025-08-05 10:34:05.875
cmdyepb9i000f2b418y9bolks	Approved by Commission	completed	illness	homa	2026-02-01 00:00:00	\N	{retirement/1754390323477_leakb1_ya_kuacha_kazi_report.pdf,retirement/1754390288814_u6b0y4_ya_kuacha_kazi_report.pdf,retirement/1754390289597_y5f11x_ripoti_ya_kustaafu_kwa_hiari_report.pdf}	\N	ofisi_emp_016	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-05 10:38:46.086	2025-08-05 10:42:34.168
cmdyc9yq700072b41iktn5ptk	Approved by Commission	completed	compulsory	\N	2051-08-25 00:00:00	\N	{retirement/1754386518177_2bubos_ya_kuacha_kazi_report.pdf}	\N	ofisi_emp_023	cmd06nnbn000le67wtg41s3su	cmd06nnbb000be67wwgil78yv	2025-08-05 09:30:50.767	2025-08-05 09:36:48.143
cme2wb4zn00012bjvi11a1bsh	Pending HRMO/HHRMD Review	initial	illness	kifafa	2025-08-08 14:02:42.525	\N	{retirement/1754661109482_pzemw5_Employee_Profile_Analysis.pdf,retirement/1754661097999_duccoi_cheti.pdf,retirement/1754661104381_6uvnif_sababu.pdf}	\N	emp_005	cmd06nnbn000le67wtg41s3su	\N	2025-08-08 14:02:42.527	2025-08-08 14:02:42.527
cmditpbu4000de6z021tx46ca	Rejected by HHRMD - Awaiting HRO Correction	initial	compulsory	\N	2049-10-13 00:00:00	hg hfhfy yf	{retirement/20250725_155420_1b09e784.pdf,retirement/20250725_155417_c0051a50.pdf}	haipo sahihi	ofisi_emp_007	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-25 12:54:22.253	2025-08-10 13:31:23.979
cme2wcwfo00032bjvb0hf1loe	Approved by Commission	completed	illness	homa ya mdudu	2025-08-08 14:04:04.786	\N	{retirement/1754661840537_s46ycb_sababu.pdf,retirement/1754661833171_6tp38c_cheti.pdf,retirement/1754661836857_v0btoz_Employee_Profile_Analysis.pdf}	\N	ofisi_emp_002	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-08 14:04:04.787	2025-08-08 14:13:13.154
cme4297s300012bqgqt6s5ems	Approved by Commission	completed	illness	kifafa	2025-08-09 09:36:56.737	\N	{retirement/1754732212130_6zluzs_ripoti_ya_kupandishwa_cheo_report__1_.pdf,retirement/1754732176812_dmj8ks_request_status_report_report.pdf,retirement/1754732192073_972lo6_1754407554728_bj7hik_sababu.pdf}	\N	emp_005	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-09 09:36:56.739	2025-08-10 13:32:20.943
cme3innw700012bpoqzo3xu3y	Rejected by Commission - Request Concluded	completed	illness	homa	2025-08-09 00:28:18.484	\N	{retirement/1754699295150_akhlcq_cheti.pdf,retirement/1754699279435_kuq3jw_1754403408864_8f2228_Employee_Profile_Analysis.pdf,retirement/1754699288995_7otdo1_request_status_report_report.pdf}	\N	emp_003	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-09 00:28:18.485	2025-08-10 13:32:51.104
cme6065fb00032boivlznv5zh	Pending HRMO/HHRMD Review	initial	illness	kifafa	2025-08-10 18:14:06.836	\N	{retirement/1754849644180_0stbr2_20250725_071305_7f9eb5d3__2_.pdf,retirement/1754849627689_hqzsb5_cheti.pdf,retirement/1754849633905_bgsvyd_1754407554728_bj7hik_sababu.pdf}	\N	cme45oe2u000h2bfwmhka9n0f	cme471pqo00032bidhttxmboj	\N	2025-08-10 18:14:06.838	2025-08-10 18:14:06.838
cmeda4fir00012bs3alg7rqb4	Pending HRMO/HHRMD Review	initial	illness	homa kali	2025-08-15 20:27:06.001	\N	{retirement/1755289618717_j57jzw_Mozilla-Recovery-Key_2025-07-12_yussufrajab_gmail.com.pdf,retirement/1755289601703_9toiki_request_status_report_report.pdf,retirement/1755289610242_0v088l_20250725_071305_7f9eb5d3__2_.pdf}	\N	cme571jn200003emp006	cme577oj300022bcqm9dhpzy8	\N	2025-08-15 20:27:06.003	2025-08-15 20:27:06.003
cme4jxrnr000p2btjwgatstbv	Approved by Commission	completed	illness	kifaduru	2025-08-09 17:51:55.717	\N	{retirement/1754761911701_kk823u_20250725_100627_d2b91848__2_.pdf,retirement/1754761904336_bxmpko_1754403408864_8f2228_Employee_Profile_Analysis.pdf,retirement/1754761907725_a4gxkc_request_status_report_report.pdf}	\N	cme45oe31000l2bfw2kzug3tj	cme471pqo00032bidhttxmboj	cmd059ir10002e6d86l802ljc	2025-08-09 17:51:55.718	2025-08-10 13:25:56.275
\.


--
-- Data for Name: SeparationRequest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SeparationRequest" (id, type, status, "reviewStage", reason, documents, "rejectionReason", "employeeId", "submittedById", "reviewedById", "createdAt", "updatedAt") FROM stdin;
cmd08nej50027e6qkjewf103l	DISMISSAL	APPROVED	FINAL_APPROVAL	Misconduct	{https://placehold.co/separation-notice.pdf,https://placehold.co/investigation-report.pdf}	\N	emp8	cmd06nnbs000pe67woh62ey8r	cmd06nnbq000ne67wwmiwxuo8	2025-06-18 12:45:09.329	2025-07-04 12:45:09.329
cmd08nej90029e6qka900uy17	DISMISSAL	PENDING	DIRECTOR_REVIEW	Redundancy	{https://placehold.co/separation-notice.pdf,https://placehold.co/investigation-report.pdf}	\N	emp8	cmd06nnbn000le67wtg41s3su	cmd06nnbs000pe67woh62ey8r	2025-07-11 12:45:09.332	2025-07-12 12:45:09.332
cmd1yzff20001e64rye8l1b40	TERMINATION	Pending DO/HHRMD Review	initial	Performance issues leading to termination	{"Letter of Request"}	\N	emp_003	cmd06nnbn000le67wtg41s3su	\N	2025-07-13 17:50:06.542	2025-07-13 17:50:06.542
cmd1z9w5s0001e6o733qfcck0	DISMISSAL	Pending DO/HHRMD Review	initial	hapendi kazi	{"Letter of Request","Supporting Document for Dismissal"}	\N	emp_005	cmd06nnbn000le67wtg41s3su	\N	2025-07-13 17:58:14.8	2025-07-13 17:58:14.8
cmd1zj0bs0003e6o720c9i7ny	TERMINATION	Pending DO/HHRMD Review	initial	Poor performance during probation period	{"Letter of Request","Supporting Document for Termination"}	\N	emp_003	cmd06nnbn000le67wtg41s3su	\N	2025-07-13 18:05:20.104	2025-07-13 18:05:20.104
cmd1zlcvx0005e6o7eye8ukb7	DISMISSAL	Pending DO/HHRMD Review	initial	Serious misconduct and violation of company policies leading to dismissal	{"Letter of Request","Misconduct Evidence & Investigation Report","Summon Notice/Invitation Letter","Suspension Letter"}	\N	emp_001	cmd06nnbn000le67wtg41s3su	\N	2025-07-13 18:07:09.694	2025-07-13 18:07:09.694
cmddftc0z000re67komb81fh8	DISMISSAL	Pending DO/HHRMD Review	initial	mtoro kazini	{"Letter of Request","Misconduct Evidence & Investigation Report","Summon Notice/Invitation Letter","Suspension Letter","Warning Letter(s)","Employee Explanation Letter","Other Additional Document(s)"}	\N	emp_003	cmd06nnbn000le67wtg41s3su	\N	2025-07-21 18:26:43.619	2025-07-21 18:26:43.619
cmdihaci1000ne6rwr9nidetj	DISMISSAL	Pending DO/HHRMD Review	initial	ysertsertyretre	{termination/20250725_100627_d2b91848.pdf,termination/20250725_100630_ec200737.pdf,termination/20250725_100633_806c45e6.pdf,termination/20250725_100635_0212cff2.pdf,termination/20250725_100638_6787fe45.pdf,termination/20250725_100641_a033e545.pdf,termination/20250725_100646_810f8703.pdf}	\N	ofisi_emp_001	cmd06nnbn000le67wtg41s3su	\N	2025-07-25 07:06:47.881	2025-07-25 07:06:47.881
cmdf365yd0003e6lc3gzcs74w	DISMISSAL	Approved by Commission	completed	hana nidhamu	{"Letter of Request","Misconduct Evidence & Investigation Report","Summon Notice/Invitation Letter","Suspension Letter","Warning Letter(s)","Employee Explanation Letter","Other Additional Document(s)"}	\N	ofisi_emp_007	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-22 22:08:19.621	2025-07-22 22:08:57.983
cmdis0clw0001e6z0k205q7z6	DISMISSAL	Pending DO/HHRMD Review	initial	sawa	{termination/20250725_150625_5e421f84.pdf,termination/20250725_150629_4e8ba9a4.pdf,termination/20250725_150634_d05ba9db.pdf,termination/20250725_150638_c3adea6c.pdf,termination/20250725_150642_fb3610ac.pdf,termination/20250725_150648_987ecd29.pdf,termination/20250725_150655_2e165091.pdf}	\N	emp_003	cmd06nnbn000le67wtg41s3su	\N	2025-07-25 12:06:57.236	2025-07-25 12:06:57.236
cmdf3jyjk0005e6lcqhdswe06	TERMINATION	Approved by Commission	completed	hana nidhamu ata kidogo	{"Letter of Request","Supporting Document"}	\N	ofisi_emp_019	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-22 22:19:03.2	2025-07-22 22:20:57.635
cmdf3opqb0007e6lcw1etegn1	DISMISSAL	Approved by Commission	completed	utoro kazini\\n mwezi wa tatu hajaja kazini	{"Letter of Request","Misconduct Evidence"}	\N	ofisi_emp_001	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-22 22:22:45.023	2025-07-22 22:23:47.722
cmdih5zbd000le6rw3nhbziss	DISMISSAL	Pending DO/HHRMD Review	initial	dddggdg	{termination/20250725_100304_91a10b05.pdf,termination/20250725_100306_5a59b7ef.pdf,termination/20250725_100309_1208a56c.pdf,termination/20250725_100312_4cf1940a.pdf,termination/20250725_100316_aa1639fe.pdf,termination/20250725_100318_76b1d1ff.pdf,termination/20250725_100321_54def8cc.pdf}	\N	ofisi_emp_001	cmd06nnbn000le67wtg41s3su	\N	2025-07-25 07:03:24.169	2025-07-25 07:03:24.169
cmdxwm5gi00012b4is9eqnkkm	TERMINATION	Approved by Commission	completed	sawa	{termination/1754359928455_xzyuz2_Employee_Profile_Analysis.pdf,termination/1754359939672_pl5ppa_mfano.pdf}	\N	ofisi_emp_021	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-05 02:12:25.492	2025-08-05 02:16:29.446
cmdw6gm9m00032b0nrfk1p5ti	TERMINATION	Pending DO/HHRMD Review	initial	MTORO  sana tu 	{"Letter of Request","Supporting Document"}	\N	ofisi_emp_016	cmd06nnbn000le67wtg41s3su	cmd06nnbn000le67wtg41s3su	2025-08-03 21:12:31.162	2025-08-03 21:14:05.925
cmdxua45900052bgt5kbuh0l0	TERMINATION	Rejected by HHRMD - Awaiting HRO Correction	initial	mtoro kazini	{"Letter of Request","Supporting Document"}	sawa weka marekebisho ya mwisho	ofisi_emp_011	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-05 01:07:04.701	2025-08-05 01:54:44.862
cmdxg9v0k00012bgty7c5swt6	TERMINATION	Pending DO/HHRMD Review	initial	utoro kazini	{"Letter of Request","Supporting Document"}	\N	ofisi_emp_017	cmd06nnbn000le67wtg41s3su	cmd06nnbn000le67wtg41s3su	2025-08-04 18:34:58.242	2025-08-04 18:42:13.77
cmdy5lupz00012bd8otg922me	TERMINATION	Rejected by Commission - Request Concluded	completed	utoro kazini kwa muda mrefu	{termination/1754376102191_mivl2n_server_raf.pdf,termination/1754376107119_2ye2zs_lenovo_specs.pdf}	\N	ofisi_emp_014	cmd06nnbn000le67wtg41s3su	cmd06nnbd000de67wb6e6ild5	2025-08-05 06:24:08.111	2025-08-05 06:43:41.72
cmdy6e6zj00032bd8bp0lprlf	TERMINATION	Approved by Commission	completed	ukosefu wa nidhamu ya kazi	{termination/1754376363017_tymjvk_vitambulisho_tus_Billing.pdf,termination/1754376367828_nwrk6w_wma.pdf}	\N	ofisi_emp_014	cmd06nnbn000le67wtg41s3su	cmd06nnbd000de67wb6e6ild5	2025-08-05 06:46:10.398	2025-08-05 06:46:33.224
cmdxt4dm000032bgthsl85kby	TERMINATION	Approved by Commission	completed	mwizi	{termination/1754354061559_ekhtlc_Employee_Profile_Analysis.pdf,termination/1754354067796_pfkspp_sababu.pdf}	\N	ofisi_emp_012	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-05 00:34:37.415	2025-08-08 14:18:13.382
cme3iw5gt00012bubujbq9b0r	TERMINATION	Pending DO/HHRMD Review	initial	mtoro	{termination/1754699682997_tqld23_request_status_report_report.pdf,termination/1754699691979_lljhd8_1754407554728_bj7hik_sababu.pdf}	\N	ofisi_emp_011	cmd06nnbn000le67wtg41s3su	\N	2025-08-09 00:34:54.508	2025-08-09 00:34:54.508
cme4k2iel000v2btje0hid2zu	DISMISSAL	Pending DO/HHRMD Review	initial	tabia mbaya	{termination/1754762111255_u41m6m_ripoti_ya_kupandishwa_cheo_report__2_.pdf,termination/1754762115484_gm3pvg_request_status_report_report.pdf,termination/1754762118150_ubhljx_1754407554728_bj7hik_sababu.pdf,termination/1754762122238_uysr14_mfano.pdf,termination/1754762126459_1t3er8_20250802_094101_02331ce1.pdf,termination/1754762130488_ffryxx_ripoti_ya_nyongeza_ya_utumishi_report.pdf,termination/1754762135014_r235s0_1754676807327_mfbgv3_ripoti_ya_kupandishwa_cheo_report__2_.pdf}	\N	cme45oe31000l2bfw2kzug3tj	cme471pqo00032bidhttxmboj	\N	2025-08-09 17:55:37.004	2025-08-09 17:55:37.004
cmdy6ny4300052bd84v309zwu	DISMISSAL	Approved by Commission	completed	utoro kazini	{termination/1754377052672_968nmi_S0272_0013_2022ctrl-no-receipt.pdf,termination/1754377068928_14539a_ripoti_ya_kuthibitishwa_kazini_report.pdf}	\N	ofisi_emp_018	cmd06nnbn000le67wtg41s3su	cmd06nnbd000de67wb6e6ild5	2025-08-05 06:53:45.459	2025-08-05 07:02:41.172
cme60v68800052boipz2im84i	TERMINATION	Pending DO/HHRMD Review	initial	utoro kazini	{termination/1754850806473_ja8wdg_1754324616644_6r2ulr_cheti.pdf,termination/1754850811772_faa3ja_ripoti_ya_nyongeza_ya_utumishi_report.pdf}	\N	cme45oe2900072bfwwhh9l9wp	cme471pqo00032bidhttxmboj	\N	2025-08-10 18:33:34.279	2025-08-10 18:33:34.279
cmdyarxpa00012b410v8yykcr	DISMISSAL	Approved by Commission	completed	utoro kazini	{termination/1754383987109_ppz607_ripoti_ya_kuacha_kazi_report.pdf,termination/1754384014534_lob2ku_ripoti_ya_likizo_bila_malipo_report.pdf,termination/1754384021713_z43kjb_ripoti_ya_nyongeza_ya_utumishi_report.pdf,termination/1754384032297_cuz0zg_ripoti_ya_nyongeza_ya_utumishi_report.pdf,termination/1754384037952_yx7yzj_ripoti_ya_kustaafu_kwa_hiari_report.pdf,termination/1754384045308_8paxhl_ripoti_ya_kustaafu_kwa_lazima_report.pdf}	\N	ofisi_emp_010	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-05 08:48:50.014	2025-08-05 08:59:32.409
cme60yz9b00072boico1jxy1h	DISMISSAL	Approved by Commission	completed	mchelewaji kazini	{termination/1754850954646_zeaahe_mfano.pdf,termination/1754850958608_kpdi50_request_status_report_report.pdf,termination/1754850962824_b1zkzb_ripoti_ya_nyongeza_ya_utumishi_report.pdf,termination/1754850966223_cz2rfv_1754241939359_p95qlf_cheti.pdf,termination/1754850974556_azbuxq_1754241939359_p95qlf_cheti.pdf,termination/1754850978439_3kswa7_20250725_085101_a60b988b.pdf,termination/1754850982459_4gb66q_mfano.pdf}	\N	emp_013	cme471pqo00032bidhttxmboj	cmd059ir10002e6d86l802ljc	2025-08-10 18:36:31.871	2025-08-11 03:56:11.384
cmdy6ysrc00072bd8snffavt0	DISMISSAL	Approved by Commission	completed	mwizi  ana tabia mbaya	{termination/1754377292958_7yvbk9_2.pdf,termination/1754377292949_77styy_261-Ticket_with_NO_PRICE-2612A632.pdf,termination/1754377307462_pppx2s_2.pdf,termination/1754377293687_6mrdmq_lenovo_specs.pdf,termination/1754377314203_d70qpc_server_raf.pdf,termination/1754377321243_utik8x_261-Ticket_with_NO_PRICE-2612A632.pdf,termination/1754377330102_evx7rd_Concept_Note_and_appraisal_for_TUS_1_.pdf}	\N	ofisi_emp_010	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-05 07:02:11.736	2025-08-08 14:17:35.802
cme3efnac00012b06mlnpm7qs	DISMISSAL	Pending DO/HHRMD Review	initial	utoro kazini	{termination/1754692179413_vivutp_cheti.pdf,termination/1754692183495_u3arqf_cheti.pdf,termination/1754692187297_3mkghm_cheti.pdf,termination/1754692191970_wj3dgd_20250725_085101_a60b988b.pdf,termination/1754692195119_tjjh8q_1754324616644_6r2ulr_cheti.pdf,termination/1754692198237_h7ujif_1754324616644_6r2ulr_cheti__1_.pdf,termination/1754692204419_s6mse5_request_status_report_report.pdf}	\N	emp_003	cmd06nnbn000le67wtg41s3su	\N	2025-08-08 22:30:05.988	2025-08-08 22:30:05.988
cme6lyr8v000l2bgxu5lhtnbu	DISMISSAL	Pending DO/HHRMD Review	initial	utoro kazini	{termination/1754886221510_5frfy6_1754324616644_6r2ulr_cheti__1_.pdf,termination/1754886225902_y7mt5n_1754407554728_bj7hik_sababu.pdf,termination/1754886227782_ie20ew_ripoti_ya_nyongeza_ya_utumishi_report.pdf,termination/1754886232923_ufq66r_ripoti_ya_kubadilishwa_kada_report.pdf,termination/1754886238149_kw42jn_Mozilla-Recovery-Key_2025-07-12_yussufrajab_gmail.com.pdf,termination/1754886245941_2eqro2_ripoti_ya_kupandishwa_cheo_report.pdf,termination/1754886251104_qaao2s_ripoti_ya_kustaafu_kwa_hiari_report.pdf}	\N	cme571jn200003emp006	cme577oj300022bcqm9dhpzy8	\N	2025-08-11 04:24:13.423	2025-08-11 04:24:13.423
cme7l61ya00012bku0abi5805	TERMINATION	Approved by Commission	completed	utoro kazini	{termination/1754945345580_e3k64k_20250727_085642_76b47a49.pdf,termination/1754945374848_lau26x_1754324616644_6r2ulr_cheti__1_.pdf}	\N	ofisi_emp_013	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-11 20:49:40.45	2025-08-11 20:52:27.764
\.


--
-- Data for Name: ServiceExtensionRequest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ServiceExtensionRequest" (id, status, "reviewStage", "currentRetirementDate", "requestedExtensionPeriod", justification, documents, "rejectionReason", "employeeId", "submittedById", "reviewedById", "createdAt", "updatedAt") FROM stdin;
cmd08neiy0021e6qkih2j9cxo	REJECTED	INITIAL	2025-12-24 12:45:09.322	6 months	Expertise shortage	{https://placehold.co/extension-application.pdf,https://placehold.co/justification-report.pdf}	Extension not supported by institutional policy	emp1	cmd06nnbu000re67wdeax0fwp	\N	2025-06-02 12:45:09.322	2025-06-28 12:45:09.322
cmd08nej10023e6qkp5874720	UNDER_REVIEW	COMMISSION_REVIEW	2026-01-10 12:45:09.324	6 months	Expertise shortage	{https://placehold.co/extension-application.pdf,https://placehold.co/justification-report.pdf}	\N	emp1	cmd06nnbx000te67ww4cbaug7	\N	2025-06-08 12:45:09.324	2025-07-02 12:45:09.324
cmd08nej30025e6qkyocw002b	REJECTED	DIRECTOR_REVIEW	2025-09-16 12:45:09.326	1 year	Knowledge transfer requirements	{https://placehold.co/extension-application.pdf,https://placehold.co/justification-report.pdf}	Extension not supported by institutional policy	emp1	cmd06nnbu000re67wdeax0fwp	cmd06nnbn000le67wtg41s3su	2025-06-21 12:45:09.326	2025-07-06 12:45:09.326
cmd1y7rt50009e60yo3cjaeu3	Pending HRMO/HHRMD Review	initial	2025-07-19 00:00:00	1 year	kuna uhitaji	{"Letter of Request","Employee Consent Letter"}	\N	emp_003	cmd06nnbn000le67wtg41s3su	\N	2025-07-13 17:28:36.233	2025-07-13 17:34:20.329
cmd8kpux0005r2bgtwl3xgvk4	Pending HRMO/HHRMD Review	initial	2026-10-18 00:00:00	1 year	Utaaalamu bado unahitajika	{"Letter of Request","Employee Consent Letter"}	\N	emp_022	cmd06nnbl000je67wtl28pk42	\N	2025-07-18 08:45:08.675	2025-07-18 08:45:08.675
cmd8kr7q2005t2bgtrcij6k5k	Pending HRMO/HHRMD Review	initial	2025-08-23 00:00:00	1 year	qsfgffdbgf ghjgjgtjjgjjghj fhtrhhehh	{"Letter of Request","Employee Consent Letter"}	\N	emp_020	cmd06nnbl000je67wtl28pk42	\N	2025-07-18 08:46:11.93	2025-07-18 08:46:11.93
cmddfjoqt000pe67ksj3vnypn	Pending HRMO/HHRMD Review	initial	2025-07-24 00:00:00	1 year	kuna uhitaji	{"Letter of Request","Employee Consent Letter"}	\N	ofisi_emp_007	cmd06nnbn000le67wtg41s3su	\N	2025-07-21 18:19:13.541	2025-07-21 18:19:13.541
cmdf32bir0001e6lcaq6m1i6s	Approved by Commission	completed	2025-07-31 00:00:00	1 year	sawa	{"Letter of Request","Employee Consent Letter"}	\N	ofisi_emp_007	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-07-22 22:05:20.211	2025-07-22 22:07:04.5
cmdis8v5h0003e6z0hs6aq0xd	Pending HRMO/HHRMD Review	initial	2025-08-08 00:00:00	1 year	gfdgdfgdf f fgdfgds gfdggdfdf	{service-extension/20250725_151327_ae788ffe.pdf,service-extension/20250725_151332_89b62975.pdf}	\N	ofisi_emp_007	cmd06nnbn000le67wtg41s3su	\N	2025-07-25 12:13:34.481	2025-07-25 12:13:34.481
cmdw6lco500052b0nwl0skq4x	Pending HRMO/HHRMD Review	initial	2025-08-16 00:00:00	1 year	sawa	{service-extension/1754255765472_nofexn_sababu.pdf,service-extension/1754255768686_zvalqd_cheti.pdf}	\N	ofisi_emp_018	cmd06nnbn000le67wtg41s3su	\N	2025-08-03 21:16:12.005	2025-08-03 21:16:12.005
cmdw9swi800012bwmvk9hbgeg	Pending HRMO/HHRMD Review	initial	2025-08-08 00:00:00	1 year	waa	{service-extension/1754261314174_6o29hi_Employee_Profile_Analysis.pdf,service-extension/1754261324406_el8uhd_sababu.pdf}	\N	ofisi_emp_007	cmd06nnbn000le67wtg41s3su	\N	2025-08-03 22:46:03.152	2025-08-03 22:48:46.948
cmdw6mont00072b0n61d124gt	Request Received – Awaiting Commission Decision	commission_review	2025-08-22 00:00:00	1 year	saw  lote	{service-extension/1754255948347_s7nar4_mfano.pdf,service-extension/1754255952178_8ds7rh_sababu.pdf}	\N	emp_006	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-03 21:17:14.201	2025-08-03 21:19:44.762
cme3e5l14000b2b5ratysofi0	Pending HRMO/HHRMD Review	initial	2025-08-23 00:00:00	1 year	kuna uhitaji	{service-extension/1754691731332_eopdad_1754403408864_8f2228_Employee_Profile_Analysis.pdf,service-extension/1754691734508_0uzo0v_mfano.pdf}	\N	emp_001	cmd06nnbn000le67wtg41s3su	\N	2025-08-08 22:22:16.504	2025-08-08 22:22:16.504
cme42h17r00012bw1krrqjqm4	Pending HRMO/HHRMD Review	initial	2025-08-23 00:00:00	1 year	kuna uhitaji	{service-extension/1754732551051_8pnmtk_1754676807327_mfbgv3_ripoti_ya_kupandishwa_cheo_report__2_.pdf,service-extension/1754732578566_akrdmo_request_status_report_report.pdf}	\N	emp_001	cmd06nnbn000le67wtg41s3su	\N	2025-08-09 09:43:01.479	2025-08-09 09:43:01.479
cmdw779u000092b0nrfvkgjff	Approved by Commission	completed	2025-08-14 00:00:00	1 year	uko	{service-extension/1754257509217_0ezpz9_mfano.pdf,service-extension/1754257513164_06piby_sababu.pdf}	\N	emp_001	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-03 21:33:14.759	2025-08-03 21:47:09.78
cmdw86w5k00012bwjcp4v7tyf	Rejected by HHRMD - Awaiting HRO Correction	hro_correction	2025-08-31 00:00:00	1 year	now shoe	{service-extension/1754258446076_xloh0b_Employee_Profile_Analysis.pdf,service-extension/1754258454061_8a0cz5_sababu.pdf}	ongeza maelezo zaidi	ofisi_emp_003	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-03 22:00:56.649	2025-08-03 22:01:40.666
cmdybg8tl00032b41z4faeaiq	Approved by Commission	completed	2041-05-06 00:00:00	2 years	uzoefu	{service-extension/1754385003021_tw09wj_ripoti_ya_kuacha_kazi_report.pdf,service-extension/1754385005725_62vd66_ripoti_ya_kustaafu_kwa_lazima_report.pdf}	\N	ofisi_emp_010	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-05 09:07:44.139	2025-08-05 09:12:16.903
cme4k1906000t2btjkubx5fdm	Approved by Commission	completed	2025-08-24 00:00:00	1 year	kuna uhitaji	{service-extension/1754762071504_gxba0m_1754324616644_6r2ulr_cheti__1_.pdf,service-extension/1754762076362_o5n1r9_1754324616644_6r2ulr_cheti__1_.pdf}	\N	cme45oe31000l2bfw2kzug3tj	cme471pqo00032bidhttxmboj	cmd059ir10002e6d86l802ljc	2025-08-09 17:54:38.166	2025-08-10 12:58:41.589
cmdxcb8tv00052bwmr80gj6sm	Approved by Commission	completed	2025-08-10 00:00:00	1 year	sawa nimerekebisha	{service-extension/1754326931072_hog5k7_cheti.pdf,service-extension/1754326934993_4tbvvz_sababu.pdf}	\N	ofisi_emp_010	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-04 16:44:04.338	2025-08-04 18:21:50.75
cmdxbl5sy00032bwmfi6bt6li	Rejected by Commission - Request Concluded	completed	2025-08-14 00:00:00	1 year	kuna uhitaji	{service-extension/1754325257729_setcht_cheti.pdf,service-extension/1754325261889_q3pu1q_Employee_Profile_Analysis.pdf}	\N	ofisi_emp_006	cmd06nnbn000le67wtg41s3su	cmd059ir10002e6d86l802ljc	2025-08-04 16:23:47.358	2025-08-08 12:01:26.514
cme6lxjtc000j2bgxoz2e9cn4	Pending HRMO/HHRMD Review	initial	2025-08-15 00:00:00	1 year	kuna uhitaji	{service-extension/1754886189218_84t0td_1754324616644_6r2ulr_cheti__1_.pdf,service-extension/1754886194629_vv5og6_ripoti_ya_kustaafu_kwa_hiari_report.pdf}	\N	cme571jn200003emp006	cme577oj300022bcqm9dhpzy8	\N	2025-08-11 04:23:17.136	2025-08-11 04:23:17.136
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, name, username, password, role, active, "employeeId", "institutionId", "createdAt", "updatedAt", "phoneNumber", email) FROM stdin;
cmecjzkmi00032bhu3ts6wi8y	Shaibu Nassor Juma	snjuma	$2a$10$6DRPqfw6bxMZ3Nmp84Y8IOURcSe1GLjApM5A24//FI2Y2Cqfcwnke	HRO	t	\N	cmd06xe2o000ae6bquqbkbg4z	2025-08-15 08:15:29.322	2025-08-15 08:15:29.322	0987654321	shaibu.juma@gmail.local
cmd06nn9p0005e67wgvz3pd6c	Amina Kassim	akassim	$2a$10$UcJJU0rS2PEzokX626tjgeDGRDgDp899RYtW94UOkq5.8frYzwl9S	Admin	t	\N	cmd059ion0000e6d85kexfukl	2025-07-12 11:49:21.421	2025-08-03 03:39:26.051	\N	akassim@mock.local
cmd06nnb50007e67wa5491lw5	Zaituni Haji	zhaji	$2a$10$UcJJU0rS2PEzokX626tjgeDGRDgDp899RYtW94UOkq5.8frYzwl9S	CSCS	t	\N	cmd059ion0000e6d85kexfukl	2025-07-12 11:49:21.473	2025-08-03 03:39:26.052	\N	zhaji@mock.local
cmd06nnbb000be67wwgil78yv	Fauzia Iddi	fiddi	$2a$10$TCRDCczcivs/N6gYCYeqmO66o7Z2kjeFKbHvCzR5vq8JaJS4vXbMe	HRMO	t	\N	cmd059ion0000e6d85kexfukl	2025-07-12 11:49:21.479	2025-07-20 05:28:54.194	\N	fiddi@mock.local
cmd06nnbd000de67wb6e6ild5	Maimuna Ussi	mussi	$2a$10$TCRDCczcivs/N6gYCYeqmO66o7Z2kjeFKbHvCzR5vq8JaJS4vXbMe	DO	t	\N	cmd059ion0000e6d85kexfukl	2025-07-12 11:49:21.482	2025-07-20 05:28:54.195	\N	mussi@mock.local
cmd06nnbg000fe67wdbus4imu	Mwanakombo Is-hak	mishak	$2a$10$TCRDCczcivs/N6gYCYeqmO66o7Z2kjeFKbHvCzR5vq8JaJS4vXbMe	PO	t	\N	cmd059ion0000e6d85kexfukl	2025-07-12 11:49:21.484	2025-07-20 05:28:54.196	\N	mishak@mock.local
cmd06nnbi000he67wz9doivi6	Khamis Hamadi	khamadi	$2a$10$TCRDCczcivs/N6gYCYeqmO66o7Z2kjeFKbHvCzR5vq8JaJS4vXbMe	HRRP	t	\N	cmd059ion0000e6d85kexfukl	2025-07-12 11:49:21.487	2025-07-20 05:28:54.197	\N	khamadi@mock.local
cmd06nnbl000je67wtl28pk42	HRO (Tume)	hro_commission	$2a$10$TCRDCczcivs/N6gYCYeqmO66o7Z2kjeFKbHvCzR5vq8JaJS4vXbMe	HRO	t	\N	cmd059ion0000e6d85kexfukl	2025-07-12 11:49:21.489	2025-07-20 05:28:54.198	\N	hro_commission@mock.local
cmd06nnbn000le67wtg41s3su	Khamis Mnyonge	kmnyonge	$2a$10$TCRDCczcivs/N6gYCYeqmO66o7Z2kjeFKbHvCzR5vq8JaJS4vXbMe	HRO	t	\N	cmd06nn7n0001e67w2h5rf86x	2025-07-12 11:49:21.492	2025-07-20 05:28:54.199	\N	kmnyonge@mock.local
cmd06nnbq000ne67wwmiwxuo8	Ahmed Mohammed	ahmedm	$2a$10$TCRDCczcivs/N6gYCYeqmO66o7Z2kjeFKbHvCzR5vq8JaJS4vXbMe	HRO	t	\N	cmd06nn7r0002e67w8df8thtn	2025-07-12 11:49:21.494	2025-07-20 05:28:54.2	\N	ahmedm@mock.local
cmd06nnbs000pe67woh62ey8r	Mariam Juma	mariamj	$2a$10$TCRDCczcivs/N6gYCYeqmO66o7Z2kjeFKbHvCzR5vq8JaJS4vXbMe	HRO	t	\N	cmd06nn7u0003e67wa4hiyie7	2025-07-12 11:49:21.497	2025-07-20 05:28:54.202	\N	mariamj@mock.local
cmd059ir10002e6d86l802ljc	Safia Khamis	skhamis	$2a$10$UcJJU0rS2PEzokX626tjgeDGRDgDp899RYtW94UOkq5.8frYzwl9S	HHRMD	t	\N	cmd059ion0000e6d85kexfukl	2025-07-12 11:10:22.766	2025-08-03 03:39:26.045	\N	skhamis@mock.local
cmd5a9yrb007b2bt6ee32v0ze	Employment Services Manager Fatma Ali	employmentservicesma	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_146	cmd06xe3e000le6bqscwfh5be	2025-07-16 01:29:32.471	2025-07-16 01:29:32.471	\N	employmentservicesma@mock.local
admin-backend-id	System Administrator	admin	$2a$10$UcJJU0rS2PEzokX626tjgeDGRDgDp899RYtW94UOkq5.8frYzwl9S	ADMIN	t	\N	cmd059ion0000e6d85kexfukl	2025-07-20 22:03:33.497	2025-08-03 03:39:26.05	\N	admin@mock.local
user_1753044141852	Test User	testuser	defaultpassword	EMPLOYEE	t	\N	cmd059ion0000e6d85kexfukl	2025-07-20 23:42:21.853	2025-07-20 23:42:21.853	\N	testuser@mock.local
user_1753046780450	Test User Updated	4hhrmd	defaultpassword	HHRMD	f	\N	cmd059ion0000e6d85kexfukl	2025-07-21 00:26:20.451	2025-07-21 17:14:36.713	\N	4hhrmd@mock.local
cmd5a9ybb00012bt6m2oxl3li	Mwanasha Saleh Omar	mwanashasalehomar	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_004	cmd06nn7n0001e67w2h5rf86x	2025-07-16 01:29:31.895	2025-07-16 01:29:31.895	\N	mwanashasalehomar@mock.local
cmd5a9ybi00032bt60sbzycha	Zeinab Mohammed Ali	zeinabmohammedali	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_006	cmd06nn7n0001e67w2h5rf86x	2025-07-16 01:29:31.902	2025-07-16 01:29:31.902	\N	zeinabmohammedali@mock.local
cmd5a9ybm00052bt65vf6eel7	Mwalimu Hassan Khamis	mwalimuhassankhamis	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_001	cmd06nn7n0001e67w2h5rf86x	2025-07-16 01:29:31.906	2025-07-16 01:29:31.906	\N	mwalimuhassankhamis@mock.local
cmd5a9ybq00072bt6fk4ixogc	Said Juma Nassor	saidjumanassor	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_003	cmd06nn7n0001e67w2h5rf86x	2025-07-16 01:29:31.911	2025-07-16 01:29:31.911	\N	saidjumanassor@mock.local
cmd5a9ybv00092bt6wp2ybul7	Ahmed Khamis Vuai	ahmedkhamisvuai	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_005	cmd06nn7n0001e67w2h5rf86x	2025-07-16 01:29:31.915	2025-07-16 01:29:31.915	\N	ahmedkhamisvuai@mock.local
cmd5a9ybz000b2bt6aslk4abk	Prof. Omar Juma Khamis	profomarjumakhamis	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_007	cmd06nn7r0002e67w8df8thtn	2025-07-16 01:29:31.919	2025-07-16 01:29:31.919	\N	profomarjumakhamis@mock.local
cmd5a9yc3000d2bt6ptv4b80p	Dr. Amina Hassan Said	draminahassansaid	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_008	cmd06nn7r0002e67w8df8thtn	2025-07-16 01:29:31.923	2025-07-16 01:29:31.923	\N	draminahassansaid@mock.local
cmd5a9yc7000f2bt6k3z7fpcx	Hamad Ali Khamis	hamadalikhamis	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_009	cmd06nn7r0002e67w8df8thtn	2025-07-16 01:29:31.927	2025-07-16 01:29:31.927	\N	hamadalikhamis@mock.local
cmd5a9ycb000h2bt6n20bjds6	Mwalimu Fatuma Juma	mwalimufatumajuma	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_010	cmd06nn7r0002e67w8df8thtn	2025-07-16 01:29:31.931	2025-07-16 01:29:31.931	\N	mwalimufatumajuma@mock.local
cmd5a9yce000j2bt65eqmtcdp	Dr. Fatma Ali Mohamed	drfatmaalimohamed	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_002	cmd06nn7n0001e67w2h5rf86x	2025-07-16 01:29:31.934	2025-07-16 01:29:31.934	\N	drfatmaalimohamed@mock.local
cmd5a9yci000l2bt67nmav3dd	Halima Said Ali	halimasaidali	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_012	cmd06nn7r0002e67w8df8thtn	2025-07-16 01:29:31.938	2025-07-16 01:29:31.938	\N	halimasaidali@mock.local
cmd5a9ycm000n2bt6xzmixcgp	Dr. Mwalimu Hassan Omar	drmwalimuhassanomar	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_013	cmd06nn7u0003e67wa4hiyie7	2025-07-16 01:29:31.942	2025-07-16 01:29:31.942	\N	drmwalimuhassanomar@mock.local
cmd5a9ycq000p2bt6x06ollw8	Dr. Khadija Ali Mohamed	drkhadijaalimohamed	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_014	cmd06nn7u0003e67wa4hiyie7	2025-07-16 01:29:31.946	2025-07-16 01:29:31.946	\N	drkhadijaalimohamed@mock.local
cmd5a9ycu000r2bt64139fgb0	Daktari Salim Juma Said	daktarisalimjumasaid	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_015	cmd06nn7u0003e67wa4hiyie7	2025-07-16 01:29:31.95	2025-07-16 01:29:31.95	\N	daktarisalimjumasaid@mock.local
cmd5a9ycy000t2bt64mu7gxpc	Nurse Mwanasha Hassan	nursemwanashahassan	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_016	cmd06nn7u0003e67wa4hiyie7	2025-07-16 01:29:31.954	2025-07-16 01:29:31.954	\N	nursemwanashahassan@mock.local
cmd5a9yd2000v2bt6ujmk31n9	Pharmacist Ahmed Ali	pharmacistahmedali	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_017	cmd06nn7u0003e67wa4hiyie7	2025-07-16 01:29:31.958	2025-07-16 01:29:31.958	\N	pharmacistahmedali@mock.local
cmd5a9yd6000x2bt6mh8tqmsf	Fatma Khamis Omar	fatmakhamisomar	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_018	cmd06nn7u0003e67wa4hiyie7	2025-07-16 01:29:31.962	2025-07-16 01:29:31.962	\N	fatmakhamisomar@mock.local
cmd5a9ydb000z2bt6u03i5p63	Mhe. Ali Mohamed Khamis	mhealimohamedkhamis	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_019	cmd059ion0000e6d85kexfukl	2025-07-16 01:29:31.967	2025-07-16 01:29:31.967	\N	mhealimohamedkhamis@mock.local
cmd5a9ydh00112bt6x1qstl3w	Dr. Mwanajuma Said Ali	drmwanajumasaidali	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_020	cmd059ion0000e6d85kexfukl	2025-07-16 01:29:31.973	2025-07-16 01:29:31.973	\N	drmwanajumasaidali@mock.local
cmd5a9ydl00132bt6dm40hcav	Mwalimu Hassan Juma	mwalimuhassanjuma	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_021	cmd059ion0000e6d85kexfukl	2025-07-16 01:29:31.977	2025-07-16 01:29:31.977	\N	mwalimuhassanjuma@mock.local
cmd5a9ydp00152bt6q3ms10z1	Zeinab Ali Hassan	zeinabalihassan	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_022	cmd059ion0000e6d85kexfukl	2025-07-16 01:29:31.982	2025-07-16 01:29:31.982	\N	zeinabalihassan@mock.local
cmd5a9ydt00172bt6fptzcn58	Dr. Juma Ali Khamis	drjumaalikhamis	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_023	cmd06xe34000he6bqfdqiw9ll	2025-07-16 01:29:31.986	2025-07-16 01:29:31.986	\N	drjumaalikhamis@mock.local
cmd5a9ydx00192bt6orfmqpf7	Veterinarian Ahmed Hassan	veterinarianahmedhas	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_025	cmd06xe34000he6bqfdqiw9ll	2025-07-16 01:29:31.989	2025-07-16 01:29:31.989	\N	veterinarianahmedhas@mock.local
cmd5a9ye1001b2bt6hcr48oj2	Mwanasha Juma Omar	mwanashajumaomar	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_026	cmd06xe34000he6bqfdqiw9ll	2025-07-16 01:29:31.993	2025-07-16 01:29:31.993	\N	mwanashajumaomar@mock.local
cmd06nnbu000re67wdeax0fwp	Ali Juma Ali	alijuma	$2a$10$TCRDCczcivs/N6gYCYeqmO66o7Z2kjeFKbHvCzR5vq8JaJS4vXbMe	EMPLOYEE	t	emp1	cmd06nn7n0001e67w2h5rf86x	2025-07-12 11:49:21.499	2025-07-20 05:28:54.202	\N	alijuma@mock.local
cmd06nnbx000te67ww4cbaug7	Khadija Nassor	khadijanassor	$2a$10$TCRDCczcivs/N6gYCYeqmO66o7Z2kjeFKbHvCzR5vq8JaJS4vXbMe	EMPLOYEE	t	emp8	cmd06nn7r0002e67w8df8thtn	2025-07-12 11:49:21.501	2025-07-20 05:28:54.203	\N	khadijanassor@mock.local
cmd06nnbz000ve67wncnv4etg	Yussuf Makame	yussufmakame	$2a$10$TCRDCczcivs/N6gYCYeqmO66o7Z2kjeFKbHvCzR5vq8JaJS4vXbMe	EMPLOYEE	t	emp9	cmd06nn7r0002e67w8df8thtn	2025-07-12 11:49:21.504	2025-07-20 05:28:54.204	\N	yussufmakame@mock.local
cmd5a9ye6001d2bt6bccrik2i	Engineer Said Hassan	engineersaidhassan	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_027	cmd06xe37000ie6bq43r62ea6	2025-07-16 01:29:31.998	2025-07-16 01:29:31.998	\N	engineersaidhassan@mock.local
cmd5a9yea001f2bt6ga3t8xai	Engineer Amina Ali	engineeraminaali	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_028	cmd06xe37000ie6bq43r62ea6	2025-07-16 01:29:32.002	2025-07-16 01:29:32.002	\N	engineeraminaali@mock.local
cmd5a9yee001h2bt6fubd8gt2	Architect Omar Juma	architectomarjuma	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_029	cmd06xe37000ie6bq43r62ea6	2025-07-16 01:29:32.007	2025-07-16 01:29:32.007	\N	architectomarjuma@mock.local
cmd5a9yej001j2bt6fy0ff0ga	Surveyor Mwanajuma Hassan	surveyormwanajumahas	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_030	cmd06xe37000ie6bq43r62ea6	2025-07-16 01:29:32.011	2025-07-16 01:29:32.011	\N	surveyormwanajumahas@mock.local
cmd5a9yeo001l2bt6eqlxvvbs	Mwalimu Hassan Said	mwalimuhassansaid	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_031	cmd06xe40000ve6bqrip9e4m6	2025-07-16 01:29:32.016	2025-07-16 01:29:32.016	\N	mwalimuhassansaid@mock.local
cmd5a9yes001n2bt6pkv7c2ca	Dr. Fatma Juma Ali	drfatmajumaali	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_032	cmd06xe40000ve6bqrip9e4m6	2025-07-16 01:29:32.02	2025-07-16 01:29:32.02	\N	drfatmajumaali@mock.local
cmd5a9yf0001r2bt6k5mfy0g1	Engineer Ali Hassan	engineeralihassan	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_034	cmd06xe4g0012e6bqou5f9gur	2025-07-16 01:29:32.029	2025-07-16 01:29:32.029	\N	engineeralihassan@mock.local
cmd5a9yf5001t2bt6wpo8k9av	Engineer Zeinab Omar	engineerzeinabomar	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_035	cmd06xe4g0012e6bqou5f9gur	2025-07-16 01:29:32.033	2025-07-16 01:29:32.033	\N	engineerzeinabomar@mock.local
cmd5a9yfa001v2bt6rudyi19t	Technician Said Ali	techniciansaidali	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_036	cmd06xe4g0012e6bqou5f9gur	2025-07-16 01:29:32.038	2025-07-16 01:29:32.038	\N	techniciansaidali@mock.local
cmd5a9yfe001x2bt62nr23oeq	MBA Mwanasha Said	mbamwanashasaid	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_038	cmd06xe3b000ke6bqxuwovzub	2025-07-16 01:29:32.042	2025-07-16 01:29:32.042	\N	mbamwanashasaid@mock.local
cmd5a9yfj001z2bt6rs1wkh2g	Trade Officer Ahmed	tradeofficerahmed	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_039	cmd06xe3b000ke6bqxuwovzub	2025-07-16 01:29:32.047	2025-07-16 01:29:32.047	\N	tradeofficerahmed@mock.local
cmd5a9yfn00212bt6ng83u3h3	Surveyor Hassan Ali	surveyorhassanali	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_040	cmd06xe3y000ue6bqzqkztrsa	2025-07-16 01:29:32.051	2025-07-16 01:29:32.051	\N	surveyorhassanali@mock.local
cmd5a9yfr00232bt6mr0d9gf4	Architect Fatma Hassan	architectfatmahassan	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_041	cmd06xe3y000ue6bqzqkztrsa	2025-07-16 01:29:32.055	2025-07-16 01:29:32.055	\N	architectfatmahassan@mock.local
cmd5a9yfw00252bt6j7ora5rb	Land Officer Omar Said	landofficeromarsaid	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_042	cmd06xe3y000ue6bqzqkztrsa	2025-07-16 01:29:32.06	2025-07-16 01:29:32.06	\N	landofficeromarsaid@mock.local
cmd5a9yg000272bt6osdb3yt9	Journalist Ali Omar	journalistaliomar	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_043	cmd06xe3l000oe6bq5drrocqt	2025-07-16 01:29:32.064	2025-07-16 01:29:32.064	\N	journalistaliomar@mock.local
cmd5a9yg500292bt6aelcn756	Dr. Mwanajuma Ali	drmwanajumaali	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_044	cmd06xe3l000oe6bq5drrocqt	2025-07-16 01:29:32.069	2025-07-16 01:29:32.069	\N	drmwanajumaali@mock.local
cmd5a9yg9002b2bt6nfdb8rab	Sports Officer Hassan	sportsofficerhassan	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_045	cmd06xe3l000oe6bq5drrocqt	2025-07-16 01:29:32.073	2025-07-16 01:29:32.073	\N	sportsofficerhassan@mock.local
cmd5a9ygd002d2bt6d3vhx6z5	Marine Biologist Said	marinebiologistsaid	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_046	cmd06xe3r000re6bqum8g62id	2025-07-16 01:29:32.077	2025-07-16 01:29:32.077	\N	marinebiologistsaid@mock.local
cmd5a9ygh002f2bt6090rznm6	Dr. Amina Juma	draminajuma	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_047	cmd06xe3r000re6bqum8g62id	2025-07-16 01:29:32.081	2025-07-16 01:29:32.081	\N	draminajuma@mock.local
cmd5a9ygk002h2bt6m9j9hq9r	Fisheries Officer Omar	fisheriesofficeromar	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_048	cmd06xe3r000re6bqum8g62id	2025-07-16 01:29:32.085	2025-07-16 01:29:32.085	\N	fisheriesofficeromar@mock.local
cmd5a9ygp002j2bt6bs8rties	Social Worker Fatma	socialworkerfatma	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_049	cmd06xe270003e6bq0wm0v3c7	2025-07-16 01:29:32.089	2025-07-16 01:29:32.089	\N	socialworkerfatma@mock.local
cmd5a9ygx002l2bt6a6x3t2a9	Child Protection Officer	childprotectionoffic	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_051	cmd06xe270003e6bq0wm0v3c7	2025-07-16 01:29:32.097	2025-07-16 01:29:32.097	\N	childprotectionoffic@mock.local
cmd5a9yh1002n2bt6zn3l6zz6	Auditor General Hassan	auditorgeneralhassan	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_052	cmd06xe2e0006e6bqvjfhq32c	2025-07-16 01:29:32.101	2025-07-16 01:29:32.101	\N	auditorgeneralhassan@mock.local
cmd5a9yh6002p2bt6nxjylqgb	Senior Auditor Amina	seniorauditoramina	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_053	cmd06xe2e0006e6bqvjfhq32c	2025-07-16 01:29:32.106	2025-07-16 01:29:32.106	\N	seniorauditoramina@mock.local
cmd5a9yha002r2bt6jykbtonc	IT Manager Omar Ali	itmanageromarali	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_054	cmd06xe2c0005e6bqulk6iu8g	2025-07-16 01:29:32.11	2025-07-16 01:29:32.11	\N	itmanageromarali@mock.local
cmd5a9yhe002t2bt6yd4tij4y	Records Manager Fatma	recordsmanagerfatma	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_055	cmd06xe2m0009e6bq0ps9u9ut	2025-07-16 01:29:32.114	2025-07-16 01:29:32.114	\N	recordsmanagerfatma@mock.local
cmd5a9yhj002v2bt65br99otf	CPA Amina Juma Hassan	cpaaminajumahassan	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_059	cmd06xe1x0000e6bqalx28nja	2025-07-16 01:29:32.119	2025-07-16 01:29:32.119	\N	cpaaminajumahassan@mock.local
cmd5a9yhn002x2bt6n0ao0lbl	Accountant Said Ali Khamis	accountantsaidalikha	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_060	cmd06xe1x0000e6bqalx28nja	2025-07-16 01:29:32.123	2025-07-16 01:29:32.123	\N	accountantsaidalikha@mock.local
cmd5a9yhs002z2bt6k3cobl2l	Auditor Mwanajuma Omar	auditormwanajumaomar	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_061	cmd06xe1x0000e6bqalx28nja	2025-07-16 01:29:32.128	2025-07-16 01:29:32.128	\N	auditormwanajumaomar@mock.local
cmd5a9yhw00312bt6nf4amgdl	Metrologist Dr. Hassan Ali	metrologistdrhassana	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_062	cmd06xe250002e6bqp8aabk92	2025-07-16 01:29:32.132	2025-07-16 01:29:32.132	\N	metrologistdrhassana@mock.local
cmd5a9yi100332bt62sgr5ysk	Engineer Fatma Said Omar	engineerfatmasaidoma	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_063	cmd06xe250002e6bqp8aabk92	2025-07-16 01:29:32.138	2025-07-16 01:29:32.138	\N	engineerfatmasaidoma@mock.local
cmd5a9yi600352bt6okit1az6	Technician Ahmed Hassan	technicianahmedhassa	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_064	cmd06xe250002e6bqp8aabk92	2025-07-16 01:29:32.142	2025-07-16 01:29:32.142	\N	technicianahmedhassa@mock.local
cmd5a9yib00372bt677md29kl	Judge (Rtd) Ali Mohamed	judgertdalimohamed	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_065	cmd06xe2a0004e6bqwbtjm4x9	2025-07-16 01:29:32.147	2025-07-16 01:29:32.147	\N	judgertdalimohamed@mock.local
cmd5a9yif00392bt69sywfpzq	HR Specialist Juma Ali	hrspecialistjumaali	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_067	cmd06xe2a0004e6bqwbtjm4x9	2025-07-16 01:29:32.151	2025-07-16 01:29:32.151	\N	hrspecialistjumaali@mock.local
cmd5a9yij003b2bt6vqi5jlqa	IT Director Dr. Omar Hassan	itdirectordromarhass	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_068	cmd06xe2c0005e6bqulk6iu8g	2025-07-16 01:29:32.155	2025-07-16 01:29:32.155	\N	itdirectordromarhass@mock.local
cmd5a9yin003d2bt6qpc68hew	Cyber Security Expert Amina	cybersecurityexperta	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_069	cmd06xe2c0005e6bqulk6iu8g	2025-07-16 01:29:32.159	2025-07-16 01:29:32.159	\N	cybersecurityexperta@mock.local
cmd5a9yir003f2bt6ehmd8pw8	Web Developer Said Omar	webdevelopersaidomar	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_070	cmd06xe2c0005e6bqulk6iu8g	2025-07-16 01:29:32.164	2025-07-16 01:29:32.164	\N	webdevelopersaidomar@mock.local
cmd5a9yiv003h2bt6l4j4vif9	Database Admin Fatma Ali	databaseadminfatmaal	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_071	cmd06xe2c0005e6bqulk6iu8g	2025-07-16 01:29:32.168	2025-07-16 01:29:32.168	\N	databaseadminfatmaal@mock.local
cmd5a9yj0003j2bt6af8bv72y	Surveyor General Hassan	surveyorgeneralhassa	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_072	cmd06xe2h0007e6bqta680e3b	2025-07-16 01:29:32.172	2025-07-16 01:29:32.172	\N	surveyorgeneralhassa@mock.local
cmd5a9yj4003l2bt6hjjbsqas	Land Lawyer Dr. Mwanajuma	landlawyerdrmwanajum	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_073	cmd06xe2h0007e6bqta680e3b	2025-07-16 01:29:32.176	2025-07-16 01:29:32.176	\N	landlawyerdrmwanajum@mock.local
cmd5a9yj8003n2bt6j71cia6i	Cartographer Ahmed Said	cartographerahmedsai	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_074	cmd06xe2h0007e6bqta680e3b	2025-07-16 01:29:32.18	2025-07-16 01:29:32.18	\N	cartographerahmedsai@mock.local
cmd5a9yjd003p2bt6xo2yqbhj	CPA Dr. Ali Hassan Omar	cpadralihassanomar	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_075	cmd06xe2j0008e6bqqpmbs9bv	2025-07-16 01:29:32.185	2025-07-16 01:29:32.185	\N	cpadralihassanomar@mock.local
cmd5a9yjh003r2bt62irv8ozy	Budget Analyst Fatma Juma	budgetanalystfatmaju	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_076	cmd06xe2j0008e6bqqpmbs9bv	2025-07-16 01:29:32.189	2025-07-16 01:29:32.189	\N	budgetanalystfatmaju@mock.local
cmd5a9yjl003t2bt61d6gpj0t	Financial Controller Said	financialcontrollers	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_077	cmd06xe2j0008e6bqqpmbs9bv	2025-07-16 01:29:32.193	2025-07-16 01:29:32.193	\N	financialcontrollers@mock.local
cmd5a9yjp003v2bt66gi7gvf9	Chief Archivist Dr. Mwanajuma	chiefarchivistdrmwan	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_078	cmd06xe2m0009e6bq0ps9u9ut	2025-07-16 01:29:32.197	2025-07-16 01:29:32.197	\N	chiefarchivistdrmwan@mock.local
cmd5a9yjt003x2bt65r1wy2u6	Librarian Amina Omar	librarianaminaomar	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_080	cmd06xe2m0009e6bq0ps9u9ut	2025-07-16 01:29:32.201	2025-07-16 01:29:32.201	\N	librarianaminaomar@mock.local
cmd5a9yjy003z2bt6pxcut0n9	Economist Dr. Omar Juma	economistdromarjuma	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_081	cmd06xe2o000ae6bquqbkbg4z	2025-07-16 01:29:32.206	2025-07-16 01:29:32.206	\N	economistdromarjuma@mock.local
cmd5a9yk200412bt6vomd2ank	Investment Analyst Zeinab	investmentanalystzei	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_082	cmd06xe2o000ae6bquqbkbg4z	2025-07-16 01:29:32.21	2025-07-16 01:29:32.21	\N	investmentanalystzei@mock.local
cmd5a9yk700432bt6umm6zmtx	Statistics Officer Ahmed	statisticsofficerahm	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_083	cmd06xe2o000ae6bquqbkbg4z	2025-07-16 01:29:32.215	2025-07-16 01:29:32.215	\N	statisticsofficerahm@mock.local
cmd5a9ykb00452bt6jyy4e15l	Tourism Expert Dr. Hassan	tourismexpertdrhassa	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_084	cmd06xe2r000be6bqrqhwhbq1	2025-07-16 01:29:32.219	2025-07-16 01:29:32.219	\N	tourismexpertdrhassa@mock.local
cmd5a9ykg00472bt6tkq70vp4	Marketing Manager Fatma	marketingmanagerfatm	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_085	cmd06xe2r000be6bqrqhwhbq1	2025-07-16 01:29:32.224	2025-07-16 01:29:32.224	\N	marketingmanagerfatm@mock.local
cmd5a9ykl00492bt6xpeyen8g	Tour Guide Coordinator Said	tourguidecoordinator	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_086	cmd06xe2r000be6bqrqhwhbq1	2025-07-16 01:29:32.229	2025-07-16 01:29:32.229	\N	tourguidecoordinator@mock.local
cmd5a9ykq004b2bt6oo985b5y	Labour Economist Dr. Ali	laboureconomistdrali	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_087	cmd06xe3e000le6bqscwfh5be	2025-07-16 01:29:32.234	2025-07-16 01:29:32.234	\N	laboureconomistdrali@mock.local
cmd5a9yku004d2bt6vgkrfmnq	Career Counselor Amina	careercounseloramina	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_088	cmd06xe3e000le6bqscwfh5be	2025-07-16 01:29:32.238	2025-07-16 01:29:32.238	\N	careercounseloramina@mock.local
cmd5a9yky004f2bt6vfy3fvmk	Skills Development Officer	skillsdevelopmentoff	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_089	cmd06xe3e000le6bqscwfh5be	2025-07-16 01:29:32.242	2025-07-16 01:29:32.242	\N	skillsdevelopmentoff@mock.local
cmd5a9yl3004h2bt62m3tadt5	Education Researcher Prof. Omar	educationresearcherp	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_090	cmd06xe2w000de6bqzqo9qu3m	2025-07-16 01:29:32.247	2025-07-16 01:29:32.247	\N	educationresearcherp@mock.local
cmd5a9yl7004j2bt6fl4b7ys6	Curriculum Developer Dr. Fatma	curriculumdeveloperd	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_091	cmd06xe2w000de6bqzqo9qu3m	2025-07-16 01:29:32.251	2025-07-16 01:29:32.251	\N	curriculumdeveloperd@mock.local
cmd5a9ylb004l2bt6w8j4u61o	Rashid Mohammed Omar	rashidmohammedomar	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_011	cmd06nn7r0002e67w8df8thtn	2025-07-16 01:29:32.256	2025-07-16 01:29:32.256	\N	rashidmohammedomar@mock.local
cmd5a9ylf004n2bt6uyvqo6or	Emergency Manager Dr. Said	emergencymanagerdrsa	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_093	cmd06xe2y000ee6bqel875c2s	2025-07-16 01:29:32.259	2025-07-16 01:29:32.259	\N	emergencymanagerdrsa@mock.local
cmd5a9ylj004p2bt6vurcjfmo	Risk Assessment Expert Zeinab	riskassessmentexpert	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_094	cmd06xe2y000ee6bqel875c2s	2025-07-16 01:29:32.263	2025-07-16 01:29:32.263	\N	riskassessmentexpert@mock.local
cmd5a9yln004r2bt6zelrp56z	Emergency Response Coordinator	emergencyresponsecoo	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_095	cmd06xe2y000ee6bqel875c2s	2025-07-16 01:29:32.267	2025-07-16 01:29:32.267	\N	emergencyresponsecoo@mock.local
cmd5a9ylr004t2bt6rweomswj	Construction Manager Eng. Ali	constructionmanagere	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_096	cmd06xe30000fe6bqe6ljiz1v	2025-07-16 01:29:32.271	2025-07-16 01:29:32.271	\N	constructionmanagere@mock.local
cmd5a9ylv004v2bt634q1clak	Quantity Surveyor Amina	quantitysurveyoramin	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_097	cmd06xe30000fe6bqe6ljiz1v	2025-07-16 01:29:32.276	2025-07-16 01:29:32.276	\N	quantitysurveyoramin@mock.local
cmd5a9ym0004x2bt63w4e2xxd	Site Supervisor Hassan	sitesupervisorhassan	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_098	cmd06xe30000fe6bqe6ljiz1v	2025-07-16 01:29:32.28	2025-07-16 01:29:32.28	\N	sitesupervisorhassan@mock.local
cmd5a9ym4004z2bt6ymck572i	Mhe. Dr. Seif Sharif Hamad	mhedrseifsharifhamad	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_099	cmd06xe220001e6bqj26tnlsj	2025-07-16 01:29:32.284	2025-07-16 01:29:32.284	\N	mhedrseifsharifhamad@mock.local
cmd5a9ym900512bt6xavf3l0b	Dkt. Mwalimu Fatma Khamis	dktmwalimufatmakhami	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_100	cmd06xe220001e6bqj26tnlsj	2025-07-16 01:29:32.289	2025-07-16 01:29:32.289	\N	dktmwalimufatmakhami@mock.local
cmd5a9ymd00532bt6zev4c6fl	Mwanakijiji Hassan Omar	mwanakijijihassanoma	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_101	cmd06xe220001e6bqj26tnlsj	2025-07-16 01:29:32.293	2025-07-16 01:29:32.293	\N	mwanakijijihassanoma@mock.local
cmd5a9ymi00552bt64xemdvls	Marine Conservation Expert Dr. Zeinab	marineconservationex	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_102	cmd06xe3r000re6bqum8g62id	2025-07-16 01:29:32.298	2025-07-16 01:29:32.298	\N	marineconservationex@mock.local
cmd5a9ymm00572bt6g8elg89t	Heritage Conservator Omar Ali Hassan	heritageconservatoro	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_103	cmd06xe40000ve6bqrip9e4m6	2025-07-16 01:29:32.302	2025-07-16 01:29:32.302	\N	heritageconservatoro@mock.local
cmd5a9ymq00592bt6dpde686w	Investigation Officer Zeinab Omar	investigationofficer	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_105	cmd06xe3w000te6bqc44b0xpr	2025-07-16 01:29:32.307	2025-07-16 01:29:32.307	\N	investigationofficer@mock.local
cmd5a9ymv005b2bt6pljdjia8	Forensic Accountant Said Ali	forensicaccountantsa	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_106	cmd06xe3w000te6bqc44b0xpr	2025-07-16 01:29:32.311	2025-07-16 01:29:32.311	\N	forensicaccountantsa@mock.local
cmd5a9ymz005d2bt6zyt8nosg	Chief Prosecutor Dr. Mwalimu Hassan	chiefprosecutordrmwa	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_107	cmd06xe4b0010e6bqt54zkblq	2025-07-16 01:29:32.315	2025-07-16 01:29:32.315	\N	chiefprosecutordrmwa@mock.local
cmd5a9yn3005f2bt6sr992pbu	State Attorney Amina Juma Ali	stateattorneyaminaju	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_108	cmd06xe4b0010e6bqt54zkblq	2025-07-16 01:29:32.319	2025-07-16 01:29:32.319	\N	stateattorneyaminaju@mock.local
cmd5a9yn8005h2bt6vgeek2ih	Legal Research Officer Omar Said	legalresearchofficer	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_109	cmd06xe4b0010e6bqt54zkblq	2025-07-16 01:29:32.324	2025-07-16 01:29:32.324	\N	legalresearchofficer@mock.local
cmd5a9ync005j2bt6og7oqk1p	Attorney General Prof. Fatma Hassan	attorneygeneralproff	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_110	cmd06xe4e0011e6bqv8eg0b16	2025-07-16 01:29:32.328	2025-07-16 01:29:32.328	\N	attorneygeneralproff@mock.local
cmd5a9yng005l2bt6twt3ibxr	Deputy Attorney General Dr. Ahmed Omar	deputyattorneygenera	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_111	cmd06xe4e0011e6bqv8eg0b16	2025-07-16 01:29:32.332	2025-07-16 01:29:32.332	\N	deputyattorneygenera@mock.local
cmd5a9ynk005n2bt6yizrd26z	Legal Advisor Mwanasha Ali	legaladvisormwanasha	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_112	cmd06xe4e0011e6bqv8eg0b16	2025-07-16 01:29:32.336	2025-07-16 01:29:32.336	\N	legaladvisormwanasha@mock.local
cmd5a9yno005p2bt6nbjlh99p	Drug Control Expert Dr. Hassan Ali Omar	drugcontrolexpertdrh	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_113	cmd06xe45000xe6bqb6qc19ys	2025-07-16 01:29:32.34	2025-07-16 01:29:32.34	\N	drugcontrolexpertdrh@mock.local
cmd5a9ynt005r2bt69ibyopcs	Narcotics Inspector Zeinab Hassan	narcoticsinspectorze	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_114	cmd06xe45000xe6bqb6qc19ys	2025-07-16 01:29:32.345	2025-07-16 01:29:32.345	\N	narcoticsinspectorze@mock.local
cmd5a9ynx005t2bt64bgse0qw	Rehabilitation Officer Ahmed Juma	rehabilitationoffice	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_115	cmd06xe45000xe6bqb6qc19ys	2025-07-16 01:29:32.349	2025-07-16 01:29:32.349	\N	rehabilitationoffice@mock.local
cmd5a9yo2005v2bt6580sd3cg	Legal Draftsman Omar Hassan Ali	legaldraftsmanomarha	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_117	cmd06xe3i000ne6bq2q3y9g2z	2025-07-16 01:29:32.354	2025-07-16 01:29:32.354	\N	legaldraftsmanomarha@mock.local
cmd5a9yo6005x2bt6h6lhugmk	Good Governance Officer Fatma Omar	goodgovernanceoffice	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_118	cmd06xe3i000ne6bq2q3y9g2z	2025-07-16 01:29:32.359	2025-07-16 01:29:32.359	\N	goodgovernanceoffice@mock.local
cmd5a9yob005z2bt6q0ie83g6	Ethics Expert Prof. Said Hassan	ethicsexpertprofsaid	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_119	cmd06xe48000ye6bqwhlp0tum	2025-07-16 01:29:32.363	2025-07-16 01:29:32.363	\N	ethicsexpertprofsaid@mock.local
cmd5a9yoh00612bt6eitx7vht	Ethics Officer Ahmed Hassan	ethicsofficerahmedha	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_121	cmd06xe48000ye6bqwhlp0tum	2025-07-16 01:29:32.37	2025-07-16 01:29:32.37	\N	ethicsofficerahmedha@mock.local
cmd5a9yom00632bt6gcmuup7r	Election Expert Dr. Hassan Omar	electionexpertdrhass	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_122	cmd06xe3n000pe6bquce6e6ga	2025-07-16 01:29:32.374	2025-07-16 01:29:32.374	\N	electionexpertdrhass@mock.local
cmd5a9yoq00652bt6cylh041i	Election Manager Amina Ali	electionmanageramina	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_123	cmd06xe3n000pe6bquce6e6ga	2025-07-16 01:29:32.378	2025-07-16 01:29:32.378	\N	electionmanageramina@mock.local
cmd5a9you00672bt6py6cy7y2	Voter Education Officer Omar Juma	votereducationoffice	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_124	cmd06xe3n000pe6bquce6e6ga	2025-07-16 01:29:32.382	2025-07-16 01:29:32.382	\N	votereducationoffice@mock.local
cmd5a9yoz00692bt629n1ebl8	Protocol Officer Dr. Fatma Ali	protocolofficerdrfat	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_125	cmd06xe43000we6bqegt3ofa0	2025-07-16 01:29:32.387	2025-07-16 01:29:32.387	\N	protocolofficerdrfat@mock.local
cmd5a9yp3006b2bt6stnq1q6z	Security Advisor Ahmed Hassan Omar	securityadvisorahmed	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_126	cmd06xe43000we6bqegt3ofa0	2025-07-16 01:29:32.391	2025-07-16 01:29:32.391	\N	securityadvisorahmed@mock.local
cmd5a9yp7006d2bt66ws4a1mb	Press Secretary Said Ali Hassan	presssecretarysaidal	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_127	cmd06xe43000we6bqegt3ofa0	2025-07-16 01:29:32.396	2025-07-16 01:29:32.396	\N	presssecretarysaidal@mock.local
cmd5a9ypc006f2bt6z3s9o2mo	Policy Advisor Dr. Zeinab Omar	policyadvisordrzeina	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_128	cmd06xe39000je6bqeouszvrd	2025-07-16 01:29:32.4	2025-07-16 01:29:32.4	\N	policyadvisordrzeina@mock.local
cmd5a9yph006h2bt6om91ing2	Program Coordinator Amina Hassan	programcoordinatoram	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_130	cmd06xe39000je6bqeouszvrd	2025-07-16 01:29:32.405	2025-07-16 01:29:32.405	\N	programcoordinatoram@mock.local
cmd5a9ypp006l2bt6fynxlfeu	Coordination Officer Dr. Fatma Said	coordinationofficerd	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_132	cmd06xe3p000qe6bqwqcuyke1	2025-07-16 01:29:32.413	2025-07-16 01:29:32.413	\N	coordinationofficerd@mock.local
cmd5a9ypu006n2bt6y8wmji0c	Administrative Officer Ahmed Ali	administrativeoffice	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_133	cmd06xe3p000qe6bqwqcuyke1	2025-07-16 01:29:32.418	2025-07-16 01:29:32.418	\N	administrativeoffice@mock.local
cmd5a9ypy006p2bt6hxhy7q0o	Islamic Scholar Dr. Hassan Juma Omar	islamicscholardrhass	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_134	cmd06xe3t000se6bqknluakbq	2025-07-16 01:29:32.422	2025-07-16 01:29:32.422	\N	islamicscholardrhass@mock.local
cmd5a9yq3006r2bt6prscw2yv	Islamic Education Officer Mwanajuma Hassan	islamiceducationoffi	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_135	cmd06xe3t000se6bqknluakbq	2025-07-16 01:29:32.427	2025-07-16 01:29:32.427	\N	islamiceducationoffi@mock.local
cmd5a9yq8006t2bt6ktirfj8k	Religious Affairs Officer Said Omar Ali	religiousaffairsoffi	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_136	cmd06xe3t000se6bqknluakbq	2025-07-16 01:29:32.432	2025-07-16 01:29:32.432	\N	religiousaffairsoffi@mock.local
cmd5a9yqc006v2bt66y8gd557	Regional Affairs Expert Prof. Dr. Amina Hassan	regionalaffairsexper	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_137	cmd06xe3g000me6bqh9gabe3e	2025-07-16 01:29:32.436	2025-07-16 01:29:32.436	\N	regionalaffairsexper@mock.local
cmd5a9yqg006x2bt6506f18ul	Local Government Specialist Dr. Omar Ali	localgovernmentspeci	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_138	cmd06xe3g000me6bqh9gabe3e	2025-07-16 01:29:32.44	2025-07-16 01:29:32.44	\N	localgovernmentspeci@mock.local
cmd5a9yqk006z2bt6qsw7m8na	Community Development Officer Dr. Fatma Juma Hassan	communitydevelopment	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_139	cmd06xe3g000me6bqh9gabe3e	2025-07-16 01:29:32.445	2025-07-16 01:29:32.445	\N	communitydevelopment@mock.local
cmd5a9yqp00712bt68t8h3w8r	Infrastructure Engineer Ahmed Said	infrastructureengine	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_140	cmd06xe37000ie6bq43r62ea6	2025-07-16 01:29:32.449	2025-07-16 01:29:32.449	\N	infrastructureengine@mock.local
cmd5a9yqt00732bt6ih1ifet3	Energy Expert Zeinab Omar Hassan	energyexpertzeinabom	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_142	cmd06xe4g0012e6bqou5f9gur	2025-07-16 01:29:32.453	2025-07-16 01:29:32.453	\N	energyexpertzeinabom@mock.local
cmd5a9yqy00752bt67ud7jt2z	Trade Promotion Officer Said Omar	tradepromotionoffice	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_143	cmd06xe3b000ke6bqxuwovzub	2025-07-16 01:29:32.458	2025-07-16 01:29:32.458	\N	tradepromotionoffice@mock.local
cmd5a9yr200772bt62y7uz79j	Youth Development Coordinator Dr. Amina Ali	youthdevelopmentcoor	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_144	cmd06xe3l000oe6bq5drrocqt	2025-07-16 01:29:32.463	2025-07-16 01:29:32.463	\N	youthdevelopmentcoor@mock.local
cmd5a9yr700792bt6z1irt2ig	Sports Development Officer Omar Hassan	sportsdevelopmentoff	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_145	cmd06xe3l000oe6bq5drrocqt	2025-07-16 01:29:32.467	2025-07-16 01:29:32.467	\N	sportsdevelopmentoff@mock.local
cmd5a9yrf007d2bt6mg8wax9d	Construction Project Manager Dr. Hassan Omar	constructionprojectm	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_147	cmd06xe30000fe6bqe6ljiz1v	2025-07-16 01:29:32.475	2025-07-16 01:29:32.475	\N	constructionprojectm@mock.local
cmd5a9yrj007f2bt65zdhsezr	Disaster Response Coordinator Amina Hassan	disasterresponsecoor	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_148	cmd06xe2y000ee6bqel875c2s	2025-07-16 01:29:32.479	2025-07-16 01:29:32.479	\N	disasterresponsecoor@mock.local
cmd5a9yro007h2bt6svip2kq6	Archive Specialist Ahmed Omar	archivespecialistahm	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_149	cmd06xe2m0009e6bq0ps9u9ut	2025-07-16 01:29:32.484	2025-07-16 01:29:32.484	\N	archivespecialistahm@mock.local
cmd5a9yrw007j2bt6jshonn46	Agronomist Fatma Said	agronomistfatmasaid	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_024	cmd06xe34000he6bqfdqiw9ll	2025-07-16 01:29:32.492	2025-07-16 01:29:32.492	\N	agronomistfatmasaid@mock.local
cmd5a9ys0007l2bt6qs1xahb4	Economist Juma Hassan	economistjumahassan	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_037	cmd06xe3b000ke6bqxuwovzub	2025-07-16 01:29:32.497	2025-07-16 01:29:32.497	\N	economistjumahassan@mock.local
cmd5a9ys5007n2bt6e28gdi7d	Gender Specialist Zeinab	genderspecialistzein	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_050	cmd06xe270003e6bq0wm0v3c7	2025-07-16 01:29:32.501	2025-07-16 01:29:32.501	\N	genderspecialistzein@mock.local
cmd5a9ys9007p2bt6hh5a6j4f	Dr. Lawyer Zeinab Hassan	drlawyerzeinabhassan	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_066	cmd06xe2a0004e6bqwbtjm4x9	2025-07-16 01:29:32.505	2025-07-16 01:29:32.505	\N	drlawyerzeinabhassan@mock.local
cmd5a9ysd007r2bt6tgb96c7j	Digital Archivist Hassan Ali	digitalarchivisthass	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_079	cmd06xe2m0009e6bq0ps9u9ut	2025-07-16 01:29:32.509	2025-07-16 01:29:32.509	\N	digitalarchivisthass@mock.local
cmd5a9ysi007t2bt625ilihqi	Teacher Trainer Hassan	teachertrainerhassan	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_092	cmd06xe2w000de6bqzqo9qu3m	2025-07-16 01:29:32.514	2025-07-16 01:29:32.514	\N	teachertrainerhassan@mock.local
cmd5a9ysn007v2bt65itm5qkb	Lawyer Dr. Ali Hassan Mohamed	lawyerdralihassanmoh	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_104	cmd06xe3w000te6bqc44b0xpr	2025-07-16 01:29:32.519	2025-07-16 01:29:32.519	\N	lawyerdralihassanmoh@mock.local
cmd5a9yss007x2bt6wnjij1uz	Constitutional Expert Dr. Amina Said	constitutionalexpert	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_116	cmd06xe3i000ne6bq2q3y9g2z	2025-07-16 01:29:32.524	2025-07-16 01:29:32.524	\N	constitutionalexpert@mock.local
cmd5a9ysx007z2bt68algn9gq	Development Specialist Hassan Ali Juma	developmentspecialis	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_129	cmd06xe39000je6bqeouszvrd	2025-07-16 01:29:32.529	2025-07-16 01:29:32.529	\N	developmentspecialis@mock.local
cmd5a9yt200812bt6pbqfayyh	Agricultural Specialist Dr. Hassan Ali	agriculturalspeciali	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_141	cmd06xe34000he6bqfdqiw9ll	2025-07-16 01:29:32.534	2025-07-16 01:29:32.534	\N	agriculturalspeciali@mock.local
cmd5a9yew001p2bt6hcn7qujs	Ahmed Omar Hassan	ahmedomarhassan	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_033	cmd06xe40000ve6bqrip9e4m6	2025-07-16 01:29:32.024	2025-07-21 17:51:19.505	\N	ahmedomarhassan@mock.local
cmd5a9ypl006j2bt6nxnq6nwn	Administration Expert Engineer Omar Hassan	administrationexpert	$2a$10$UeCqePP2DQPDQkpwhOjH5uj0/BWa0Ol6dEIBa1qdzcU.bimYPapu6	EMPLOYEE	t	emp_131	cmd06xe3p000qe6bqwqcuyke1	2025-07-16 01:29:32.409	2025-07-21 17:51:34.941	\N	administrationexpert@mock.local
cme471pqo00032bidhttxmboj	Yassir Haji Zubeir	yhzubeir	$2a$10$RC7M40AM.F/rT7lD/0gfEu3Vobdi1kNcJFwa8WwbyboVe5twn39X2	HRO	t	\N	cmd06nn7u0003e67wa4hiyie7	2025-08-09 11:51:04.847	2025-08-09 11:53:40.935	\N	yhzubeir@mock.local
cme56ma17000x2btjnpvgr0kg	Yussuf Mzee Rajab	ymrajab	$2a$10$d7GxHTx8ZGjqYAmyhWtk8ezoC./BjFDAweFQ86NecSyhfJMJCD7Cm	Admin	t	\N	cmd059ion0000e6d85kexfukl	2025-08-10 04:26:50.826	2025-08-10 04:26:50.826	\N	ymrajab@mock.local
cme577oj300022bcqm9dhpzy8	hussein suleiman abjed	hsabjed	$2a$10$t74jjGDD8tGTTmFCbCOVK.VgYzvfSkBYV/AaZoIathDQ7ktlqOVyS	HRO	t	\N	cme571jn200002bcqa9freppg	2025-08-10 04:43:29.391	2025-08-10 04:43:29.391	\N	hsabjed@mock.local
cme57api100042bcqhbkg91r8	sophy majaribio	safiatest	$2a$10$358txTTZ/4JutwHfTxbT1./z0yFTqbkCoCUMtaDWXMsI0BSz5irG6	HHRMD	t	\N	cmd059ion0000e6d85kexfukl	2025-08-10 04:45:50.616	2025-08-10 04:45:50.616	\N	safiatest@mock.local
cme57bm9600062bcqtlkj9wcx	Maimuna Majaribio	maitest	$2a$10$logSYVyjw8nccvm12H72huhbLpQ89UWgmyfeVvjIpscRo.hPp9ACa	DO	t	\N	cmd059ion0000e6d85kexfukl	2025-08-10 04:46:33.066	2025-08-10 04:46:33.066	\N	maitest@mock.local
cme57cciu00082bcqnbw9sjm9	Fauzia Majaribo	fautest	$2a$10$Hw29S3kizuE1Sl205UtwouNarFkFqybH28HfXwbMFtQbJ4SHpMxhu	HRMO	t	\N	cmd059ion0000e6d85kexfukl	2025-08-10 04:47:07.075	2025-08-10 04:47:07.075	\N	fautest@mock.local
cme6sts42000o2bgxfjax08co	Abdalla Juma Abdalla	ajabdalla	$2a$10$c25cE7dGWhdP9xsO7o04mueaGkwgb2adEeelffsH55QILrKArmQn.	HRO	t	\N	cme6s7yqe000m2bgx708j9uly	2025-08-11 07:36:18.578	2025-08-11 07:36:18.578	0987654321	ajabdalla@mock.local
cme8w3n2k00012b9tld8ti2t0	khamis makame haji	kmhaji	$2a$10$6Ru4nbux0w/k.AlzfsjmbeNReiBafEp0dPImU0HmlWLDJqApwoCzq	HRRP	t	\N	cme571jn200002bcqa9freppg	2025-08-12 18:43:29.803	2025-08-12 18:43:29.803	0777412496	kmhaji@mock.local
\.


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
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

