# Backend Implementation Roadmap

## Phase 1: Dependencies & Environment
1.  Install required packages:
    ```bash
    cd backend
    npm install jsonwebtoken bcryptjs cookie-parser passport passport-google-oauth20
    ```
2.  Update `.env` (or config) with:
    *   `JWT_SECRET`
    *   `GOOGLE_CLIENT_ID`
    *   `GOOGLE_CLIENT_SECRET`

## Phase 2: Database Layer
1.  Modify `backend/db.js` to create the `users` table on initialization.
2.  Implement migration logic to add `user_id` to existing tables.
3.  Update database helper functions (`all`, `get`, `run`) to handle `user_id` context if necessary, or ensure route-level queries are updated.

## Phase 3: Auth Routes & Middleware
1.  **Middleware**: Create `backend/middleware/auth.js` to verify JWTs.
2.  **Local Auth**:
    *   `POST /api/auth/register`: Create user + hash password.
    *   `POST /api/auth/login`: Verify password + issue JWT.
3.  **Google OAuth**:
    *   `GET /api/auth/google`: Trigger OAuth flow.
    *   `GET /api/auth/google/callback`: Handle redirect + issue JWT.
4.  **Session**:
    *   `GET /api/auth/me`: Return current user profile based on token.
    *   `POST /api/auth/logout`: Clear session cookies.

## Phase 4: Route Refactoring
Systematically update all route files (`notes.js`, `todos.js`, etc.):
1.  Apply `authenticateToken` middleware to all routes.
2.  Inject `req.user.id` into every database query.
    *   Example: `SELECT * FROM notes WHERE user_id = ?`
    *   Example: `INSERT INTO todos (title, user_id, ...) VALUES (?, ?, ...)`
