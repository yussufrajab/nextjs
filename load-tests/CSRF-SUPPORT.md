# CSRF Token Support in k6 Load Tests

This document explains how CSRF (Cross-Site Request Forgery) protection is implemented in the k6 load tests for the CSMS application.

## Overview

The application uses CSRF tokens to protect against cross-site request forgery attacks. Every authenticated request (except GET in some cases) requires a valid CSRF token to be sent in the request headers.

## How CSRF Tokens Work in CSMS

1. **Login Response**: When a user logs in successfully, the server returns both a `sessionToken` and a `csrfToken` in the JSON response
2. **CSRF Cookie**: The server also sets a `csrf-token` cookie
3. **Subsequent Requests**: All authenticated requests must include the CSRF token in the `X-CSRF-Token` header

### Example Login Response

```json
{
  "success": true,
  "data": {
    "token": null,
    "user": { ... }
  },
  "sessionToken": "a667db35629e466ad86a455a13bc281b1cb05ff51926d1028a108fbd9e55ded1",
  "csrfToken": "kVJrlrcJYtslTt5mjaWoAFCNMZ/g5easG509O5Ls1Yc=.+KnqeQO/i5i3QNUEd7shnutqTr7Xl9mEA6dNSWYrX+0=",
  "message": "Login successful"
}
```

## Implementation in k6 Tests

### 1. Login Helper Function

The `login()` function in `load-tests/utils/helpers.js` was updated to:
- Extract both `sessionToken` and `csrfToken` from the login response
- Return an object containing both tokens instead of just the session token

**Before:**
```javascript
return response.json('sessionToken');
```

**After:**
```javascript
return {
  sessionToken: response.json('sessionToken'),
  csrfToken: response.json('csrfToken'),
};
```

### 2. Authenticated Request Helper

The `authenticatedRequest()` function signature was changed to accept both tokens:

**Before:**
```javascript
export function authenticatedRequest(method, url, token, body = null, params = {})
```

**After:**
```javascript
export function authenticatedRequest(method, url, sessionToken, csrfToken, body = null, params = {})
```

The function now includes the CSRF token in request headers:

```javascript
const headers = {
  'Authorization': `Bearer ${sessionToken}`,
  'Content-Type': 'application/json',
  'X-CSRF-Token': csrfToken,  // Added CSRF token
};
```

### 3. Test Scenario Updates

All test scenarios were updated to:
1. Destructure both tokens from the login response
2. Pass both tokens to `authenticatedRequest()`

**Example - Before:**
```javascript
const token = login(BASE_URL, user);
if (token) {
  const response = authenticatedRequest('GET', url, token);
}
```

**Example - After:**
```javascript
const authTokens = login(BASE_URL, user);
if (authTokens) {
  const { sessionToken, csrfToken } = authTokens;
  const response = authenticatedRequest('GET', url, sessionToken, csrfToken);
}
```

## Files Modified

1. **`load-tests/utils/helpers.js`**
   - Updated `login()` to return both tokens
   - Updated `authenticatedRequest()` to accept and use CSRF token

2. **`load-tests/scenarios/auth.test.js`**
   - Updated to destructure and pass both tokens
   - Direct `http.get()` and `http.post()` calls updated to include `X-CSRF-Token` header

3. **`load-tests/scenarios/hr-workflows.test.js`**
   - All `authenticatedRequest()` calls updated

4. **`load-tests/scenarios/file-operations.test.js`**
   - File upload requests include CSRF token in headers
   - All authenticated endpoints updated

5. **`load-tests/stress-test.js`**
   - All three scenario functions updated:
     - `authScenario()`
     - `hrWorkflowScenario()`
     - `fileOpsScenario()`

## Verification

You can verify CSRF tokens are being sent correctly by:

1. **Enable HTTP Debug Logging**:
   ```bash
   # k6 shows full HTTP requests/responses when running
   k6 run --http-debug load-tests/scenarios/auth.test.js
   ```

2. **Check Request Headers**:
   Look for `X-CSRF-Token` in the request headers:
   ```
   X-Csrf-Token: kVJrlrcJYtslTt5mjaWoAFCNMZ/g5easG509O5Ls1Yc=.+KnqeQO/i5i3QNUEd7shnutqTr7Xl9mEA6dNSWYrX+0=
   ```

3. **Monitor Login Response**:
   Confirm the login response includes both tokens:
   ```json
   {
     "sessionToken": "...",
     "csrfToken": "..."
   }
   ```

## Testing CSRF Protection

To test that CSRF protection is working:

1. **Valid CSRF Token**: All requests should succeed when CSRF token is included
2. **Missing CSRF Token**: Requests should fail with 403 Forbidden (if you comment out the CSRF header)
3. **Invalid CSRF Token**: Requests should fail with 403 Forbidden (if you modify the token)

## Best Practices

1. **Always Extract Both Tokens**: After login, always extract both `sessionToken` and `csrfToken`
2. **Pass Both to Helper Functions**: When using `authenticatedRequest()`, always pass both tokens
3. **Include in All Mutating Requests**: POST, PUT, DELETE requests must include CSRF token
4. **GET Requests**: Even GET requests include CSRF token for consistency

## Common Issues

### Issue: "has csrf token" check failing
**Solution**: Ensure the login endpoint returns `csrfToken` in the response

### Issue: 403 Forbidden on authenticated requests
**Solution**: Verify the `X-CSRF-Token` header is being sent with the correct token value

### Issue: Token mismatch errors
**Solution**: Ensure you're using the same CSRF token that was returned in the login response

## Example: Complete Flow

```javascript
// 1. Login and get both tokens
const authTokens = login(BASE_URL, { username: 'user', password: 'pass' });

if (authTokens) {
  const { sessionToken, csrfToken } = authTokens;

  // 2. Make authenticated request with both tokens
  const response = authenticatedRequest(
    'POST',
    `${BASE_URL}/api/promotions`,
    sessionToken,
    csrfToken,
    { /* request body */ }
  );

  // 3. Check response
  checkResponse(response, {
    'request successful': (r) => r.status === 200,
  });
}
```

## Additional Notes

- The application also sets a `csrf-token` cookie, but k6 automatically handles cookies
- The CSRF token format is base64-encoded and includes a signature for validation
- CSRF tokens are typically valid for the duration of the session
- The token must match between the cookie and the header for requests to succeed
