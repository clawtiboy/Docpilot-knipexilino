CREATE TABLE IF NOT EXISTS organization_contact_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER,
    organization_name TEXT NOT NULL,
    email TEXT,
    website TEXT,
    postal_address TEXT,
    portal_url TEXT,
    preferred_channel TEXT CHECK(preferred_channel IN ('email','brief','portal','both','unknown')) DEFAULT 'unknown',
    evidence_required_default INTEGER DEFAULT 0,
    source TEXT,
    confidence REAL DEFAULT 0.0,
    last_checked_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS communication_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER,
    case_id INTEGER,
    organization_name TEXT,
    found_emails TEXT,
    email_suitability TEXT CHECK(email_suitability IN ('yes','no','uncertain')) DEFAULT 'uncertain',
    recommended_channel TEXT CHECK(recommended_channel IN ('email','brief','both','portal','unclear')) DEFAULT 'unclear',
    reason TEXT,
    risk_level TEXT CHECK(risk_level IN ('low','medium','high','critical')) DEFAULT 'medium',
    evidence_required INTEGER DEFAULT 0,
    source_basis TEXT,
    confidence REAL DEFAULT 0.0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
