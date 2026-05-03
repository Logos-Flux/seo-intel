-- SEO Intel schema, ported from D1 (SQLite) → Fly Postgres.
-- Original sources: 52L-SEO/worker/migrations/0001_schema.sql + 0002_clusters.sql
--
-- Translations:
--   TEXT                         → text
--   DATETIME DEFAULT CURRENT_TIMESTAMP → timestamptz DEFAULT now()
--   DATETIME (nullable)          → timestamptz
--   REAL                         → double precision
--   INTEGER                      → integer  (kept as-is; pseudo-booleans like
--                                  is_question stay int to match query semantics)

CREATE TABLE IF NOT EXISTS profiles (
    id text PRIMARY KEY,
    name text NOT NULL,
    domain text NOT NULL,
    logo_url text,
    competitors_json text,
    seed_keywords_json text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_domain ON profiles(domain);

CREATE TABLE IF NOT EXISTS keywords (
    id text PRIMARY KEY,
    profile_id text NOT NULL REFERENCES profiles(id),
    keyword text NOT NULL,
    cluster text,
    search_volume integer,
    difficulty integer,
    intent text,
    competition_level text,
    cpc double precision,
    monthly_json text,
    fetched_at timestamptz,
    UNIQUE(profile_id, keyword)
);
CREATE INDEX IF NOT EXISTS idx_keywords_profile ON keywords(profile_id);
CREATE INDEX IF NOT EXISTS idx_keywords_cluster ON keywords(profile_id, cluster);

CREATE TABLE IF NOT EXISTS competitor_snapshots (
    id text PRIMARY KEY,
    profile_id text NOT NULL REFERENCES profiles(id),
    domain text NOT NULL,
    organic_traffic integer,
    organic_keywords integer,
    paid_traffic integer,
    paid_keywords integer,
    backlinks integer,
    referring_domains integer,
    snapshotted_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comp_profile ON competitor_snapshots(profile_id);
CREATE INDEX IF NOT EXISTS idx_comp_domain ON competitor_snapshots(profile_id, domain);

CREATE TABLE IF NOT EXISTS keyword_gaps (
    id text PRIMARY KEY,
    profile_id text NOT NULL REFERENCES profiles(id),
    competitor_domain text NOT NULL,
    keyword text NOT NULL,
    competitor_position integer,
    our_position integer,
    search_volume integer,
    competition_level text,
    analyzed_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gaps_profile ON keyword_gaps(profile_id);
CREATE INDEX IF NOT EXISTS idx_gaps_competitor ON keyword_gaps(profile_id, competitor_domain);

CREATE TABLE IF NOT EXISTS serp_results (
    id text PRIMARY KEY,
    profile_id text NOT NULL REFERENCES profiles(id),
    keyword text NOT NULL,
    position integer,
    url text,
    title text,
    domain text,
    fetched_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_serp_profile ON serp_results(profile_id);
CREATE INDEX IF NOT EXISTS idx_serp_keyword ON serp_results(profile_id, keyword);

CREATE TABLE IF NOT EXISTS ranked_keywords (
    id text PRIMARY KEY,
    profile_id text NOT NULL REFERENCES profiles(id),
    keyword text NOT NULL,
    position integer,
    url text,
    search_volume integer,
    difficulty integer,
    intent text,
    fetched_at timestamptz DEFAULT now(),
    UNIQUE(profile_id, keyword)
);
CREATE INDEX IF NOT EXISTS idx_ranked_profile ON ranked_keywords(profile_id);

CREATE TABLE IF NOT EXISTS reports (
    id text PRIMARY KEY,
    profile_id text NOT NULL REFERENCES profiles(id),
    token text NOT NULL UNIQUE,
    title text,
    sections_json text,
    pdf_url text,
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_reports_profile ON reports(profile_id);
CREATE INDEX IF NOT EXISTS idx_reports_token ON reports(token);

CREATE TABLE IF NOT EXISTS intake_sessions (
    id text PRIMARY KEY,
    profile_id text NOT NULL REFERENCES profiles(id),
    step text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    discovered_keywords_json text,
    discovered_competitors_json text,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_intake_profile ON intake_sessions(profile_id);

CREATE TABLE IF NOT EXISTS keyword_clusters (
    id text PRIMARY KEY,
    profile_id text NOT NULL REFERENCES profiles(id),
    seed_keyword text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    error_message text,
    similarity_threshold double precision DEFAULT 0.75,
    created_at timestamptz DEFAULT now(),
    completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_kc_profile ON keyword_clusters(profile_id);

CREATE TABLE IF NOT EXISTS keyword_cluster_groups (
    id text PRIMARY KEY,
    cluster_id text NOT NULL REFERENCES keyword_clusters(id),
    main_keyword text NOT NULL,
    total_volume integer,
    avg_difficulty double precision,
    avg_cpc double precision,
    term_count integer
);
CREATE INDEX IF NOT EXISTS idx_kcg_cluster ON keyword_cluster_groups(cluster_id);

CREATE TABLE IF NOT EXISTS keyword_cluster_terms (
    id text PRIMARY KEY,
    group_id text NOT NULL REFERENCES keyword_cluster_groups(id),
    cluster_id text NOT NULL REFERENCES keyword_clusters(id),
    keyword text NOT NULL,
    tier text NOT NULL,
    search_volume integer,
    cpc double precision,
    competition_level text,
    keyword_difficulty integer,
    search_intent text,
    word_count integer,
    is_question integer DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_kct_group ON keyword_cluster_terms(group_id);
CREATE INDEX IF NOT EXISTS idx_kct_cluster ON keyword_cluster_terms(cluster_id);
