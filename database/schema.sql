-- Database schema for Houston Off-Market Deal Machine (Free-First MVP v0.1)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS raw_properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL DEFAULT 'hcad_free',
    address TEXT NOT NULL,
    zip TEXT NOT NULL,
    owner_name_from_file TEXT,
    legal_description TEXT,
    year_built INT,
    market_value NUMERIC(12, 2),
    assessed_value NUMERIC(12, 2),
    condition_code TEXT,
    tax_delinquent_years INT DEFAULT 0,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enriched_properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_id UUID REFERENCES raw_properties(id) ON DELETE SET NULL,
    address TEXT NOT NULL,
    zip TEXT NOT NULL,
    owner_name TEXT,
    owner_email TEXT,
    owner_phone TEXT,
    arv NUMERIC(12, 2),
    rehab_estimate NUMERIC(12, 2),
    rehab_level TEXT DEFAULT 'medium', -- low, medium, high
    offer NUMERIC(12, 2),
    motivation_score INT DEFAULT 5, -- 1-10
    gemini_reason TEXT,
    tax_delinquent_years INT DEFAULT 0,
    market_value NUMERIC(12, 2),
    legal_description TEXT,
    comps JSONB,
    status TEXT NOT NULL DEFAULT 'NEW', -- NEW, AI_FILTERED, CONTACTED, REPLIED, APPOINTMENT, SOLD, SKIP_FAILED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS outreach_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enriched_id UUID REFERENCES enriched_properties(id) ON DELETE CASCADE,
    channel TEXT NOT NULL DEFAULT 'SES_EMAIL',
    content TEXT NOT NULL,
    status TEXT DEFAULT 'SENT',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_raw_zip ON raw_properties(zip);
CREATE INDEX IF NOT EXISTS idx_enriched_status ON enriched_properties(status);
CREATE INDEX IF NOT EXISTS idx_enriched_zip ON enriched_properties(zip);
CREATE INDEX IF NOT EXISTS idx_enriched_motivation ON enriched_properties(motivation_score);

