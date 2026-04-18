# Auth Feature Overview

## Goal
Transform **Noted** from a single-user local application into a multi-user platform suitable for deployment on a home network. This allows multiple users (e.g., family members) to maintain their own private notes, todos, and activity logs on a shared server.

## Core Objectives
1.  **Identity Management**: Establish a `users` table to manage local and OAuth-based identities.
2.  **Resource Ownership**: Migrate the database schema to associate every folder, note, and todo with a specific `user_id`.
3.  **Secure Authentication**: Implement a robust login system using:
    *   **Local Auth**: Email/Password with bcrypt hashing.
    *   **Google OAuth**: Streamlined registration and login via Google accounts.
4.  **Session Security**: Use JSON Web Tokens (JWT) for stateless session management and implement CSRF protection.
5.  **Multi-Tenant API**: Update all backend routes to enforce authorization, ensuring users can only access their own data.

## User Flow
1.  **Landing Page**: Unauthenticated users are greeted with a minimal login/register landing page.
2.  **Authentication**: User chooses to log in via email or Google.
3.  **App Access**: Upon successful auth, the server issues a JWT. The frontend stores this (or uses an HTTP-only cookie) to authenticate subsequent API requests.
4.  **Data Isolation**: All operations (fetching notes, creating todos) are automatically filtered by the authenticated `user_id`.
