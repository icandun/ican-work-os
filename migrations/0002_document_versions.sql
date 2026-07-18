CREATE TABLE IF NOT EXISTS app_document_versions (
  user_id TEXT NOT NULL,
  app_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, app_id, revision),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (app_id IN ('habit-ican', 'ican-work-os'))
);

CREATE INDEX IF NOT EXISTS idx_app_document_versions_recent
  ON app_document_versions(user_id, app_id, revision DESC);

INSERT OR IGNORE INTO app_document_versions (user_id, app_id, revision, data, created_at)
SELECT user_id, app_id, revision, data, updated_at
FROM app_documents;
