-- Create User accounts for all employees who don't have them
-- This enables employee login functionality

INSERT INTO "User" (
    id, 
    name, 
    username, 
    password, 
    role, 
    active, 
    "employeeId", 
    "institutionId", 
    "createdAt", 
    "updatedAt"
)
SELECT 
    'user_' || e.id as id,
    e.name,
    'employee_' || SUBSTRING(e.id, 5) as username,  -- Use employee ID for unique username
    '$2b$10$dummyhashedpasswordnotused' as password,  -- Dummy password since employees use credential-based login
    'EMPLOYEE' as role,
    true as active,
    e.id as "employeeId",
    e."institutionId",
    NOW() as "createdAt",
    NOW() as "updatedAt"
FROM "Employee" e
LEFT JOIN "User" u ON u."employeeId" = e.id
WHERE u.id IS NULL;

-- Verify the results
SELECT 
    'Created user accounts for employees without them' as message,
    COUNT(*) as accounts_created
FROM "User" u
WHERE u.id LIKE 'user_emp_%' 
    AND u."createdAt" >= NOW() - INTERVAL '1 minute';