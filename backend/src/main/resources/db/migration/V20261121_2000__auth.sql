-- =====================================================================
--  Auth (owner: Zaid) — account state on top of the shared users table (V1)
--  CdC §5.1: an administrator manages users and roles; a disabled account
--  can no longer log in and its existing tokens stop working.
-- =====================================================================

ALTER TABLE users
    ADD COLUMN enabled       BOOLEAN     NOT NULL DEFAULT TRUE,
    ADD COLUMN last_login_at TIMESTAMPTZ;

-- Logins and the JWT filter look users up by email, case-insensitively
CREATE UNIQUE INDEX idx_users_email_lower ON users (lower(email));
CREATE INDEX idx_users_role ON users (role);
