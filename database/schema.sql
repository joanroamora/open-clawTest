-- Database schema for Houston Off-Market Deal Machine
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS raw_properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL,
    address TEXT NOT NULL,
    zip TEXT NOT NULL,
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
    offer NUMERIC(12, 2),
    comps JSONB,
    status TEXT NOT NULL DEFAULT 'NEW', -- NEW, CONTACTED, QUALIFIED, APPOINTMENT, CLOSED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS outreach_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enriched_id UUID REFERENCES enriched_properties(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'SENT',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_raw_zip ON raw_properties(zip);
CREATE INDEX IF NOT EXISTS idx_enriched_status ON enriched_properties(status);
