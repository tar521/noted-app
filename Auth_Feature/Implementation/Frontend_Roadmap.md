# Frontend Implementation Roadmap

## Phase 1: State Management & API
1.  **Auth Context**: Create a `src/context/AuthContext.jsx` to store the `user` object and `isAuthenticated` status.
2.  **API Client**: Update `src/api.js` to:
    *   Include credentials (cookies) in requests.
    *   Handle `401 Unauthorized` errors by redirecting to login.
    *   Add methods for `login`, `register`, `logout`, and `getMe`.

## Phase 2: Landing Page
1.  Create `src/components/Login.jsx`:
    *   Form for Email/Password.
    *   "Login with Google" button (links to `/api/auth/google`).
    *   Toggle between Login and Register modes.
2.  Style with Tailwind to match the "Noted" dark/minimal aesthetic.

## Phase 3: Protected Routes
1.  Modify `src/App.jsx` to check auth status on load.
2.  Implement conditional rendering:
    *   If NOT authenticated: Show `Login` component.
    *   If authenticated: Show main `Sidebar` and `Dashboard`.

## Phase 4: UI Updates
1.  **Sidebar**: Add a user profile section with:
    *   Avatar/Name.
    *   Logout button.
2.  **Settings**: Allow users to update their profile or delete their account.
3.  **Error Handling**: Show friendly toasts for failed login attempts.
