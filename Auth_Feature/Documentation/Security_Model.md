# Security Model & Auth Strategy

## 1. Authentication Methods

### Local Authentication
*   **Registration**: Users provide email, name, and password. Passwords are hashed using `bcrypt` (12 rounds) before storage.
*   **Login**: Validates credentials and issues a JWT.

### Google OAuth 2.0
*   **Flow**: 
    1. Frontend redirects to Google Auth URL.
    2. Google redirects back to backend with an authorization code.
    3. Backend exchanges code for user profile.
    4. Backend finds or creates a user record and issues a JWT.
*   **Benefits**: No password management for the user; leverages Google's security.

## 2. Session Management (JWT)
*   **Token Content**: `user_id`, `email`, and `exp` (expiration).
*   **Storage**: 
    *   *Option A (Preferred)*: HTTP-Only, Secure Cookies. This prevents XSS-based token theft.
    *   *Option B*: LocalStorage + Authorization Header. Easier to implement but requires stricter XSS prevention.
*   **Verification**: A middleware (`authenticateToken`) will run on all protected routes to decode the JWT and attach the `user_id` to the request object.

## 3. CSRF Protection
*   **Strategy**: If using cookies for JWT, we will implement a Double Submit Cookie pattern or use a custom header (e.g., `X-Requested-With`) that browser-based cross-site requests cannot easily forge.
*   **Implementation**: A CSRF token is generated on login/init and must be sent back with every mutation (POST, PATCH, DELETE) request.

## 4. Authorization (Data Isolation)
*   **Row-Level Security (Application Level)**: Every SQL query will include a `WHERE user_id = ?` clause.
*   **Middleware**: Ensure that the `user_id` retrieved from the token is used for all database operations, never trusting a `user_id` sent in the request body unless it matches the token.
