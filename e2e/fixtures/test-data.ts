// Test data fixtures for E2E tests
export const TEST_INSTITUTION = {
  id: 'test-institution-1',
  name: 'Test Ministry of Health',
  email: 'test@moh.go.tz',
  phoneNumber: '+255123456789',
  voteNumber: 'TEST-001',
  tinNumber: '100-000-001',
};

export const ELIGIBLE_EMPLOYEES = [
  {
    id: 'test-employee-eligible-1',
    name: 'Eligible Employee 1',
    zanId: 'ELIG-00000001',
    payrollNumber: 'PAY-ELIG-1',
    cadre: 'Officer Grade III',
    salaryScale: 'PGSS 8',
  },
  {
    id: 'test-employee-eligible-2',
    name: 'Eligible Employee 2',
    zanId: 'ELIG-00000002',
    payrollNumber: 'PAY-ELIG-2',
    cadre: 'Officer Grade III',
    salaryScale: 'PGSS 8',
  },
  {
    id: 'test-employee-eligible-3',
    name: 'Eligible Employee 3',
    zanId: 'ELIG-00000003',
    payrollNumber: 'PAY-ELIG-3',
    cadre: 'Officer Grade III',
    salaryScale: 'PGSS 8',
  },
];

export const PROBATION_EMPLOYEE = {
  id: 'test-employee-probation',
  name: 'John Doe',
  zanId: 'TEST-12345678',
  payrollNumber: 'PAY-001',
  cadre: 'Assistant Officer Grade II',
  salaryScale: 'PGSS 7',
  status: 'On Probation',
};
