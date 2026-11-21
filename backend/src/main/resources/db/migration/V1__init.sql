-- =====================================================================
--  V1 — shared tables (users, clubs, players)
--  DRAFT to validate together (Aymen + Zaid) before merging into develop.
--  After V1, each person adds his own migrations named with a timestamp
--  (V20261121_1800__xxx.sql) so two branches never claim the same version.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ── Users and roles (CdC §5.1: Visiteur = not logged in, Utilisateur = SCOUT / RECRUITER) ──
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(150),
    role          VARCHAR(20)  NOT NULL DEFAULT 'SCOUT'
                  CHECK (role IN ('ADMIN', 'ANALYST', 'SCOUT', 'RECRUITER')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── Clubs (id = Transfermarkt club_id) ──
CREATE TABLE clubs (
    id      BIGINT PRIMARY KEY,
    name    VARCHAR(150) NOT NULL,
    league  VARCHAR(100),
    country VARCHAR(100)
);

-- ── Players (id = Transfermarkt player_id; columns follow Saad's players_clean.csv) ──
CREATE TABLE players (
    id                  BIGINT PRIMARY KEY,
    fbref_id            VARCHAR(20),
    name                VARCHAR(150) NOT NULL,
    birth_date          DATE,
    position            VARCHAR(30),
    sub_position        VARCHAR(50),
    foot                VARCHAR(10),
    height_cm           INTEGER,
    nationality         VARCHAR(100),
    country_of_birth    VARCHAR(100),
    club_id             BIGINT REFERENCES clubs (id),
    league              VARCHAR(100),
    contract_expiration DATE,
    market_value_eur    BIGINT,
    minutes             INTEGER,
    goals_p90           DOUBLE PRECISION,
    assists_p90         DOUBLE PRECISION,
    xg_p90              DOUBLE PRECISION,
    prog_passes_p90     DOUBLE PRECISION,
    prog_carries_p90    DOUBLE PRECISION,
    tackles_p90         DOUBLE PRECISION,
    interceptions_p90   DOUBLE PRECISION,
    dribbles_p90        DOUBLE PRECISION,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_players_name     ON players (lower(name));
CREATE INDEX idx_players_position ON players (position);
CREATE INDEX idx_players_club     ON players (club_id);
