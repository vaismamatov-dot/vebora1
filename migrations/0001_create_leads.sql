CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  business TEXT NOT NULL DEFAULT '',
  site_type TEXT NOT NULL,
  budget TEXT NOT NULL DEFAULT '',
  task TEXT NOT NULL,
  contact TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
