# Google OAuth Setup: Step-by-Step Guide

This guide walks you through the manual process of registering your application with Google so that "Login with Google" works.

## 1. Create a Google Cloud Project
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Sign in with your Google Account.
3.  Click the **Select a project** dropdown (top left) and click **New Project**.
4.  Name it `Noted Home Server` and click **Create**.

## 2. Configure the "Consent Screen"
This is what users see when the popup asks "Allow Noted to access your email?".
1.  In the left sidebar, go to **APIs & Services > OAuth consent screen**.
2.  Choose **User Type: External** (this allows you and your wife to use it without needing a Google Workspace organization).
3.  **App Information**:
    *   App name: `Noted`
    *   User support email: (Select your email)
4.  **Developer contact info**: (Enter your email again)
5.  Click **Save and Continue**.
6.  **Scopes**: Click **Add or Remove Scopes**. Check the boxes for:
    *   `.../auth/userinfo.email`
    *   `.../auth/userinfo.profile`
    *   `openid`
7.  Click **Save and Continue** until you reach the dashboard.

## 3. Add "Test Users"
Since your app will be in "Testing" mode (not public on the internet), Google will only allow specific people to log in.
1.  Under the "Test users" section, click **Add Users**.
2.  Add your email and your wife's email.
3.  Click **Save**.

## 4. Create your Secret Keys (Credentials)
This is the most important step for the code.
1.  In the left sidebar, click **Credentials**.
2.  Click **+ Create Credentials** at the top and select **OAuth client ID**.
3.  Select **Application type: Web application**.
4.  **Authorized JavaScript origins**: 
    *   Add `http://localhost:5173` (your React dev server)
    *   Add `http://notes-app` (if you use the local domain script)
5.  **Authorized redirect URIs**: (This is where Google sends the "Handshake Code")
    *   Add `http://localhost:3001/api/auth/google/callback`
6.  Click **Create**.
7.  A popup will show your **Client ID** and **Client Secret**. 
    *   **CRITICAL**: Copy these and save them. We will put them in your `.env` file later.

## 5. Summary of Secret Keys
Once you have the keys, we will create a `.env` file in your `backend` folder:
```env
GOOGLE_CLIENT_ID=your_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret_here
JWT_SECRET=pick_a_random_long_string
```
