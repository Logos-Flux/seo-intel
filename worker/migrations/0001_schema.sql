-- SEO Intel Schema
-- All tables scoped by profile_id

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  logo_url TEXT,
  competitors_json TEXT,
  seed_keywords_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_domain ON profiles(domain);

CREATE TABLE IF NOT EXISTS keywords (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  keyword TEXT NOT NULL,
  cluster TEXT,
  search_volume INTEGER,
  difficulty INTEGER,
  intent TEXT,
  competition_level TEXT,
  cpc REAL,
  monthly_json TEXT,
  fetched_at DATETIME,
  UNIQUE(profile_id, keyword)
);
CREATE INDEX IF NOT EXISTS idx_keywords_profile ON keywords(profile_id);
CREATE INDEX IF NOT EXISTS idx_keywords_cluster ON keywords(profile_id, cluster);

CREATE TABLE IF NOT EXISTS competitor_snapshots (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  domain TEXT NOT NULL,
  organic_traffic INTEGER,
  organic_keywords INTEGER,
  paid_traffic INTEGER,
  paid_keywords INTEGER,
  backlinks INTEGER,
  referring_domains INTEGER,
  snapshotted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_comp_profile ON competitor_snapshots(profile_id);
CREATE INDEX IF NOT EXISTS idx_comp_domain ON competitor_snapshots(profile_id, domain);

CREATE TABLE IF NOT EXISTS keyword_gaps (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  competitor_domain TEXT NOT NULL,
  keyword TEXT NOT NULL,
  competitor_position INTEGER,
  our_position INTEGER,
  search_volume INTEGER,
  competition_level TEXT,
  analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gaps_profile ON keyword_gaps(profile_id);
CREATE INDEX IF NOT EXISTS idx_gaps_competitor ON keyword_gaps(profile_id, competitor_domain);

CREATE TABLE IF NOT EXISTS serp_results (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  keyword TEXT NOT NULL,
  position INTEGER,
  url TEXT,
  title TEXT,
  domain TEXT,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_serp_profile ON serp_results(profile_id);
CREATE INDEX IF NOT EXISTS idx_serp_keyword ON serp_results(profile_id, keyword);

CREATE TABLE IF NOT EXISTS ranked_keywords (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  keyword TEXT NOT NULL,
  position INTEGER,
  url TEXT,
  search_volume INTEGER,
  difficulty INTEGER,
  intent TEXT,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(profile_id, keyword)
);
CREATE INDEX IF NOT EXISTS idx_ranked_profile ON ranked_keywords(profile_id);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  token TEXT NOT NULL UNIQUE,
  title TEXT,
  sections_json TEXT,
  pdf_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_reports_profile ON reports(profile_id);
CREATE INDEX IF NOT EXISTS idx_reports_token ON reports(token);

CREATE TABLE IF NOT EXISTS intake_sessions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  step TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  discovered_keywords_json TEXT,
  discovered_competitors_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_intake_profile ON intake_sessions(profile_id);
