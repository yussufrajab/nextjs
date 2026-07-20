### **Security Domain:** Authentication & Identity Assurance

### **Test Case No.: 1** — Requirement 1: Authentication & Identity Assurance

**Process/Function Name:** User Authentication, Login Security & MFA

**Function Description:** Tests authentication mechanisms including login, password verification, account lockout, brute-force protection, MFA, and employee self-service login.

| **Case ID** | **Test Case Scenario** | **Test Steps**                                               | **Expected Results**                                         | **Implementation Status**   | **Actual Results**                                           | **PASS/FAIL** | **Remarks** |
| ----------- | ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | --------------------------- | ------------------------------------------------------------ | ------------- | ----------- |
| 1.1         | Valid User Login       | 1. Navigate to login page<br>2. Enter valid username/email<br>3. Enter correct password<br>4. Submit login form | - User authenticated<br>- Session created<br>- Redirected to dashboard<br>- User object contains correct role<br>- No sensitive data in response | ✅ `api-auth.ts:86-161`      | - User authenticated<br/>- Session created<br/>- Redirected to dashboard<br/>- User object contains correct role<br/>- No sensitive data in response | PASS          | OK          |
| 1.2         | Invalid Username/Email | 1. Navigate to login page<br>2. Enter non-existent username/email<br>3. Enter any password<br>4. Submit | - Login fails<br>- Generic error: "Invalid username/email or password"<br>- No account enumeration<br>- Failed attempt logged | ✅ `audit-logger.ts:216-244` | Login fails<br/>- Generic error: "Invalid username/email or password"<br/> | PASS          | OK          |
| 1.3         | Invalid Password       | 1. Valid username<br>2. Wrong password<br>3. Submit          | - Same generic error<br>- No indication which field is wrong<br>- Account not locked after single attempt<br>- Attempt logged | ✅ `audit-logger.ts:216-244` | - Same generic error<br/>- No indication which field is wrong<br/> | PASS          | OK          |