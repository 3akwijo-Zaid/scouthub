-- =====================================================================
--  Datasets (owner: Aymen) — CSV import, column profiles, rows
--  CdC §5.3: title, description, category, source, import date, owner.
-- =====================================================================

CREATE TABLE datasets (
    id              BIGSERIAL PRIMARY KEY,
    title           VARCHAR(200)     NOT NULL,
    description     TEXT,
    category        VARCHAR(80),
    source          VARCHAR(300),
    file_name       VARCHAR(255),
    owner_id        UUID REFERENCES users (id) ON DELETE SET NULL,
    owner_email     VARCHAR(255),
    imported_at     TIMESTAMPTZ      NOT NULL DEFAULT now(),
    row_count       INTEGER          NOT NULL,
    column_count    INTEGER          NOT NULL,
    duplicate_rows  INTEGER          NOT NULL DEFAULT 0,
    delimiter       VARCHAR(2)       NOT NULL,
    quality_score   DOUBLE PRECISION NOT NULL,
    quality_grade   CHAR(1)          NOT NULL,
    quality         JSONB            NOT NULL,   -- QualityReport
    recommendations JSONB            NOT NULL,   -- List<VizRecommendation>
    correlations    JSONB            NOT NULL    -- List<Correlation>
);

CREATE INDEX idx_datasets_category ON datasets (category);
CREATE INDEX idx_datasets_owner    ON datasets (owner_id);

-- One row per column, with its inferred type and statistics (ColumnProfile)
CREATE TABLE dataset_columns (
    id         BIGSERIAL PRIMARY KEY,
    dataset_id BIGINT       NOT NULL REFERENCES datasets (id) ON DELETE CASCADE,
    position   INTEGER      NOT NULL,
    name       VARCHAR(255) NOT NULL,
    type       VARCHAR(20)  NOT NULL,
    profile    JSONB        NOT NULL,
    UNIQUE (dataset_id, position)
);

-- Rows stored as JSON objects { "column": value } — numbers, booleans and ISO dates are typed
CREATE TABLE dataset_rows (
    id         BIGSERIAL PRIMARY KEY,
    dataset_id BIGINT  NOT NULL REFERENCES datasets (id) ON DELETE CASCADE,
    row_index  INTEGER NOT NULL,
    data       JSONB   NOT NULL
);

CREATE INDEX idx_dataset_rows_dataset ON dataset_rows (dataset_id, row_index);
