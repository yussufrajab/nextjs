const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

const REQUEST_STATUSES = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];
const REVIEW_STAGES = ['INITIAL', 'HR_REVIEW', 'DIRECTOR_REVIEW', 'COMMISSION_REVIEW', 'FINAL_APPROVAL'];

async function main() {
    console.log('Starting comprehensive request data seeding...');
    
    // Get all users and employees
    const users = await db.user.findMany();
    const employees = await db.employee.findMany();
    const institutions = await db.institution.findMany();
    
    console.log(`Found ${users.length} users, ${employees.length} employees, ${institutions.length} institutions`);
    
    // Helper function to get random item from array
    const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    
    // Helper function to get random date in the past year
    const getRandomDate = (daysAgo = 365) => {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
        return date;
    };
    
    // Get HRO and admin users for reviewers
    const reviewers = users.filter(u => ['HRO', 'HHRMD', 'ADMIN', 'CSCS'].includes(u.role));
    const employeeUsers = users.filter(u => u.employeeId);
    
    console.log(`Found ${reviewers.length} reviewers, ${employeeUsers.length} employee users`);
    
    // 1. CONFIRMATION REQUESTS
    console.log('\nSeeding ConfirmationRequests...');
    for (let i = 0; i < 8; i++) {
        const employee = getRandom(employees);
        const submitter = getRandom(employeeUsers);
        const reviewer = Math.random() > 0.5 ? getRandom(reviewers) : null;
        const status = getRandom(REQUEST_STATUSES);
        
        try {
            await db.confirmationRequest.create({
                data: {
                    status: status,
                    reviewStage: getRandom(REVIEW_STAGES),
                    documents: [
                        'https://placehold.co/confirmation-letter.pdf',
                        'https://placehold.co/performance-report.pdf'
                    ],
                    rejectionReason: status === 'REJECTED' ? 'Insufficient documentation provided' : null,
                    employeeId: employee.id,
                    submittedById: submitter.id,
                    reviewedById: reviewer?.id || null,
                    decisionDate: status === 'APPROVED' || status === 'REJECTED' ? getRandomDate(30) : null,
                    commissionDecisionDate: status === 'APPROVED' ? getRandomDate(15) : null,
                    createdAt: getRandomDate(180),
                    updatedAt: getRandomDate(30),
                },
            });
            console.log(`✓ Created confirmation request for ${employee.name}`);
        } catch (error) {
            console.error(`✗ Error creating confirmation request:`, error.message);
        }
    }
    
    // 2. PROMOTION REQUESTS
    console.log('\nSeeding PromotionRequests...');
    const cadres = ['Administrative Officer', 'Senior Administrative Officer', 'Principal Administrative Officer', 'Education Officer', 'Senior Education Officer'];
    const promotionTypes = ['Experience', 'EducationAdvancement'];
    
    for (let i = 0; i < 10; i++) {
        const employee = getRandom(employees);
        const submitter = getRandom(employeeUsers);
        const reviewer = Math.random() > 0.5 ? getRandom(reviewers) : null;
        const status = getRandom(REQUEST_STATUSES);
        const promotionType = getRandom(promotionTypes);
        
        try {
            await db.promotionRequest.create({
                data: {
                    status: status,
                    reviewStage: getRandom(REVIEW_STAGES),
                    proposedCadre: getRandom(cadres),
                    promotionType: promotionType,
                    studiedOutsideCountry: promotionType === 'EducationAdvancement' ? Math.random() > 0.5 : null,
                    documents: [
                        'https://placehold.co/promotion-application.pdf',
                        'https://placehold.co/certificates.pdf',
                        'https://placehold.co/performance-evaluation.pdf'
                    ],
                    rejectionReason: status === 'REJECTED' ? 'Does not meet minimum experience requirements' : null,
                    employeeId: employee.id,
                    submittedById: submitter.id,
                    reviewedById: reviewer?.id || null,
                    createdAt: getRandomDate(200),
                    updatedAt: getRandomDate(30),
                },
            });
            console.log(`✓ Created promotion request for ${employee.name}`);
        } catch (error) {
            console.error(`✗ Error creating promotion request:`, error.message);
        }
    }
    
    // 3. LWOP REQUESTS (Leave Without Pay)
    console.log('\nSeeding LwopRequests...');
    const lwopReasons = ['Personal study', 'Medical treatment', 'Family emergency', 'Further education'];
    const durations = ['3 months', '6 months', '1 year', '2 years'];
    
    for (let i = 0; i < 6; i++) {
        const employee = getRandom(employees);
        const submitter = getRandom(employeeUsers);
        const reviewer = Math.random() > 0.5 ? getRandom(reviewers) : null;
        const status = getRandom(REQUEST_STATUSES);
        
        try {
            await db.lwopRequest.create({
                data: {
                    status: status,
                    reviewStage: getRandom(REVIEW_STAGES),
                    duration: getRandom(durations),
                    reason: getRandom(lwopReasons),
                    documents: [
                        'https://placehold.co/lwop-application.pdf',
                        'https://placehold.co/supporting-documents.pdf'
                    ],
                    rejectionReason: status === 'REJECTED' ? 'Request period conflicts with operational needs' : null,
                    employeeId: employee.id,
                    submittedById: submitter.id,
                    reviewedById: reviewer?.id || null,
                    createdAt: getRandomDate(150),
                    updatedAt: getRandomDate(30),
                },
            });
            console.log(`✓ Created LWOP request for ${employee.name}`);
        } catch (error) {
            console.error(`✗ Error creating LWOP request:`, error.message);
        }
    }
    
    // 4. CADRE CHANGE REQUESTS
    console.log('\nSeeding CadreChangeRequests...');
    const reasons = ['Career advancement', 'Skills alignment', 'Department reorganization', 'Professional development'];
    
    for (let i = 0; i < 5; i++) {
        const employee = getRandom(employees);
        const submitter = getRandom(employeeUsers);
        const reviewer = Math.random() > 0.5 ? getRandom(reviewers) : null;
        const status = getRandom(REQUEST_STATUSES);
        
        try {
            await db.cadreChangeRequest.create({
                data: {
                    status: status,
                    reviewStage: getRandom(REVIEW_STAGES),
                    newCadre: getRandom(cadres),
                    reason: getRandom(reasons),
                    studiedOutsideCountry: Math.random() > 0.7,
                    documents: [
                        'https://placehold.co/cadre-change-application.pdf',
                        'https://placehold.co/qualifications.pdf'
                    ],
                    rejectionReason: status === 'REJECTED' ? 'Insufficient qualifications for requested cadre' : null,
                    employeeId: employee.id,
                    submittedById: submitter.id,
                    reviewedById: reviewer?.id || null,
                    createdAt: getRandomDate(120),
                    updatedAt: getRandomDate(30),
                },
            });
            console.log(`✓ Created cadre change request for ${employee.name}`);
        } catch (error) {
            console.error(`✗ Error creating cadre change request:`, error.message);
        }
    }
    
    // 5. RETIREMENT REQUESTS
    console.log('\nSeeding RetirementRequests...');
    const retirementTypes = ['compulsory', 'voluntary', 'illness'];
    
    for (let i = 0; i < 4; i++) {
        const employee = getRandom(employees);
        const submitter = getRandom(employeeUsers);
        const reviewer = Math.random() > 0.5 ? getRandom(reviewers) : null;
        const status = getRandom(REQUEST_STATUSES);
        const retirementType = getRandom(retirementTypes);
        
        // Generate future retirement date
        const proposedDate = new Date();
        proposedDate.setDate(proposedDate.getDate() + Math.floor(Math.random() * 365) + 30);
        
        try {
            await db.retirementRequest.create({
                data: {
                    status: status,
                    reviewStage: getRandom(REVIEW_STAGES),
                    retirementType: retirementType,
                    illnessDescription: retirementType === 'illness' ? 'Chronic medical condition affecting work performance' : null,
                    proposedDate: proposedDate,
                    delayReason: Math.random() > 0.8 ? 'Project completion required' : null,
                    documents: [
                        'https://placehold.co/retirement-application.pdf',
                        retirementType === 'illness' ? 'https://placehold.co/medical-report.pdf' : 'https://placehold.co/service-record.pdf'
                    ],
                    rejectionReason: status === 'REJECTED' ? 'Retirement date does not meet service requirements' : null,
                    employeeId: employee.id,
                    submittedById: submitter.id,
                    reviewedById: reviewer?.id || null,
                    createdAt: getRandomDate(90),
                    updatedAt: getRandomDate(30),
                },
            });
            console.log(`✓ Created retirement request for ${employee.name}`);
        } catch (error) {
            console.error(`✗ Error creating retirement request:`, error.message);
        }
    }
    
    // 6. RESIGNATION REQUESTS
    console.log('\nSeeding ResignationRequests...');
    const resignationReasons = ['Better opportunity', 'Personal reasons', 'Relocation', 'Career change'];
    
    for (let i = 0; i < 3; i++) {
        const employee = getRandom(employees);
        const submitter = getRandom(employeeUsers);
        const reviewer = Math.random() > 0.5 ? getRandom(reviewers) : null;
        const status = getRandom(REQUEST_STATUSES);
        
        // Generate future effective date
        const effectiveDate = new Date();
        effectiveDate.setDate(effectiveDate.getDate() + Math.floor(Math.random() * 90) + 30);
        
        try {
            await db.resignationRequest.create({
                data: {
                    status: status,
                    reviewStage: getRandom(REVIEW_STAGES),
                    effectiveDate: effectiveDate,
                    reason: getRandom(resignationReasons),
                    documents: [
                        'https://placehold.co/resignation-letter.pdf',
                        'https://placehold.co/handover-plan.pdf'
                    ],
                    rejectionReason: status === 'REJECTED' ? 'Insufficient notice period provided' : null,
                    employeeId: employee.id,
                    submittedById: submitter.id,
                    reviewedById: reviewer?.id || null,
                    createdAt: getRandomDate(60),
                    updatedAt: getRandomDate(20),
                },
            });
            console.log(`✓ Created resignation request for ${employee.name}`);
        } catch (error) {
            console.error(`✗ Error creating resignation request:`, error.message);
        }
    }
    
    // 7. SERVICE EXTENSION REQUESTS
    console.log('\nSeeding ServiceExtensionRequests...');
    const extensionPeriods = ['6 months', '1 year', '2 years'];
    const justifications = ['Critical project completion', 'Knowledge transfer requirements', 'Institutional needs', 'Expertise shortage'];
    
    for (let i = 0; i < 3; i++) {
        const employee = getRandom(employees);
        const submitter = getRandom(employeeUsers);
        const reviewer = Math.random() > 0.5 ? getRandom(reviewers) : null;
        const status = getRandom(REQUEST_STATUSES);
        
        // Generate current retirement date (past)
        const currentRetirementDate = new Date();
        currentRetirementDate.setDate(currentRetirementDate.getDate() + Math.floor(Math.random() * 180) + 30);
        
        try {
            await db.serviceExtensionRequest.create({
                data: {
                    status: status,
                    reviewStage: getRandom(REVIEW_STAGES),
                    currentRetirementDate: currentRetirementDate,
                    requestedExtensionPeriod: getRandom(extensionPeriods),
                    justification: getRandom(justifications),
                    documents: [
                        'https://placehold.co/extension-application.pdf',
                        'https://placehold.co/justification-report.pdf'
                    ],
                    rejectionReason: status === 'REJECTED' ? 'Extension not supported by institutional policy' : null,
                    employeeId: employee.id,
                    submittedById: submitter.id,
                    reviewedById: reviewer?.id || null,
                    createdAt: getRandomDate(45),
                    updatedAt: getRandomDate(15),
                },
            });
            console.log(`✓ Created service extension request for ${employee.name}`);
        } catch (error) {
            console.error(`✗ Error creating service extension request:`, error.message);
        }
    }
    
    // 8. SEPARATION REQUESTS (Termination/Dismissal)
    console.log('\nSeeding SeparationRequests...');
    const separationTypes = ['TERMINATION', 'DISMISSAL'];
    const separationReasons = ['Misconduct', 'Poor performance', 'Policy violation', 'Redundancy'];
    
    for (let i = 0; i < 2; i++) {
        const employee = getRandom(employees);
        const submitter = getRandom(reviewers); // Only reviewers can submit separation requests
        const reviewer = getRandom(reviewers.filter(r => r.id !== submitter.id));
        const status = getRandom(REQUEST_STATUSES);
        
        try {
            await db.separationRequest.create({
                data: {
                    type: getRandom(separationTypes),
                    status: status,
                    reviewStage: getRandom(REVIEW_STAGES),
                    reason: getRandom(separationReasons),
                    documents: [
                        'https://placehold.co/separation-notice.pdf',
                        'https://placehold.co/investigation-report.pdf'
                    ],
                    rejectionReason: status === 'REJECTED' ? 'Insufficient evidence for separation action' : null,
                    employeeId: employee.id,
                    submittedById: submitter.id,
                    reviewedById: reviewer?.id || null,
                    createdAt: getRandomDate(30),
                    updatedAt: getRandomDate(10),
                },
            });
            console.log(`✓ Created separation request for ${employee.name}`);
        } catch (error) {
            console.error(`✗ Error creating separation request:`, error.message);
        }
    }
    
    // 9. COMPLAINTS
    console.log('\nSeeding Complaints...');
    const complaintTypes = ['Workplace harassment', 'Discrimination', 'Unfair treatment', 'Policy violation', 'Service delivery'];
    const assignedOfficerRoles = ['HRO', 'HHRMD', 'DO'];
    
    for (let i = 0; i < 7; i++) {
        const complainant = getRandom(employeeUsers);
        const reviewer = Math.random() > 0.5 ? getRandom(reviewers) : null;
        const status = getRandom(REQUEST_STATUSES);
        
        try {
            await db.complaint.create({
                data: {
                    complaintType: getRandom(complaintTypes),
                    subject: `Formal complaint regarding ${getRandom(complaintTypes).toLowerCase()}`,
                    details: `This is a detailed description of the complaint. The complainant has experienced issues related to ${getRandom(complaintTypes).toLowerCase()} and is seeking appropriate action and resolution. The incident occurred during regular working hours and has affected the complainant's work environment and productivity.`,
                    complainantPhoneNumber: '0777-' + Math.floor(Math.random() * 900000 + 100000),
                    nextOfKinPhoneNumber: '0778-' + Math.floor(Math.random() * 900000 + 100000),
                    attachments: [
                        'https://placehold.co/complaint-evidence.pdf',
                        'https://placehold.co/witness-statement.pdf'
                    ],
                    status: status,
                    reviewStage: getRandom(REVIEW_STAGES),
                    officerComments: reviewer ? 'Initial review completed. Further investigation required.' : null,
                    internalNotes: reviewer ? 'Case assigned to investigating officer. Priority: Medium' : null,
                    rejectionReason: status === 'REJECTED' ? 'Insufficient evidence to proceed with investigation' : null,
                    complainantId: complainant.id,
                    assignedOfficerRole: getRandom(assignedOfficerRoles),
                    reviewedById: reviewer?.id || null,
                    createdAt: getRandomDate(100),
                    updatedAt: getRandomDate(20),
                },
            });
            console.log(`✓ Created complaint by ${complainant.name}`);
        } catch (error) {
            console.error(`✗ Error creating complaint:`, error.message);
        }
    }
    
    // 10. NOTIFICATIONS
    console.log('\nSeeding Notifications...');
    const notificationMessages = [
        'Your confirmation request has been approved',
        'New promotion request requires your review',
        'LWOP request submitted successfully',
        'Retirement request pending commission approval',
        'Complaint investigation update available',
        'Service extension request approved',
        'Document submission deadline approaching',
        'Performance review scheduled',
    ];
    
    for (let i = 0; i < 20; i++) {
        const user = getRandom(users);
        const isRead = Math.random() > 0.6; // 40% chance to be unread
        
        try {
            await db.notification.create({
                data: {
                    message: getRandom(notificationMessages),
                    link: '/dashboard',
                    isRead: isRead,
                    userId: user.id,
                    createdAt: getRandomDate(30),
                },
            });
            console.log(`✓ Created notification for ${user.name}`);
        } catch (error) {
            console.error(`✗ Error creating notification:`, error.message);
        }
    }
    
    // Show final summary
    console.log('\n=== COMPREHENSIVE SEEDING SUMMARY ===');
    const confirmationCount = await db.confirmationRequest.count();
    const promotionCount = await db.promotionRequest.count();
    const lwopCount = await db.lwopRequest.count();
    const cadreChangeCount = await db.cadreChangeRequest.count();
    const retirementCount = await db.retirementRequest.count();
    const resignationCount = await db.resignationRequest.count();
    const extensionCount = await db.serviceExtensionRequest.count();
    const separationCount = await db.separationRequest.count();
    const complaintCount = await db.complaint.count();
    const notificationCount = await db.notification.count();
    
    console.log(`📋 Confirmation Requests: ${confirmationCount}`);
    console.log(`🎯 Promotion Requests: ${promotionCount}`);
    console.log(`🏖️ LWOP Requests: ${lwopCount}`);
    console.log(`🔄 Cadre Change Requests: ${cadreChangeCount}`);
    console.log(`🏁 Retirement Requests: ${retirementCount}`);
    console.log(`👋 Resignation Requests: ${resignationCount}`);
    console.log(`⏰ Service Extension Requests: ${extensionCount}`);
    console.log(`⚠️ Separation Requests: ${separationCount}`);
    console.log(`📢 Complaints: ${complaintCount}`);
    console.log(`🔔 Notifications: ${notificationCount}`);
    
    const totalRequests = confirmationCount + promotionCount + lwopCount + cadreChangeCount + 
                         retirementCount + resignationCount + extensionCount + separationCount + complaintCount;
    
    console.log(`\n✅ Total Requests/Complaints: ${totalRequests}`);
    console.log(`🔔 Total Notifications: ${notificationCount}`);
    console.log('\n🎉 Complete database seeding finished successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });