# Database Schema Updates

To support multiple users, we must introduce a `users` table and update all existing tables to include a `user_id` foreign key.

## 1. New Table: `users`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER | Primary Key (Auto-increment) |
| `email` | TEXT | Unique. User's primary email. |
| `password_hash` | TEXT | Nullable (for OAuth users). Bcrypt hashed password. |
| `google_id` | TEXT | Nullable. Unique identifier from Google profile. |
| `name` | TEXT | User's display name. |
| `avatar_url` | TEXT | Profile picture URL. |
| `created_at` | DATETIME | Default: `now` |

## 2. Updated Tables
All existing tables must be modified to include a `user_id` column.

### `folders`
*   Add `user_id` (INTEGER, NOT NULL)
*   Unique constraint on `(user_id, name)` (optional, but recommended)

### `notes`
*   Add `user_id` (INTEGER, NOT NULL)
*   Ensure indexing on `user_id` for performance.

### `todos`
*   Add `user_id` (INTEGER, NOT NULL)
*   Ensure indexing on `user_id`.

### `activity_log`
*   Add `user_id` (INTEGER, NOT NULL)
*   Logs will now be user-specific.

### `configuration_data`
*   Add `user_id` (INTEGER, NOT NULL)
*   This allows per-user customization of priorities and colors.

## Migration Strategy
1.  Create `users` table.
2.  Add `user_id` column to all tables (allow null initially).
3.  Create a "Default User" and assign all existing records to them.
4.  Modify columns to be `NOT NULL`.
