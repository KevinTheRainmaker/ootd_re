-- mood: passion/happy/calm/cozy/creative
ALTER TABLE ootd_records
  ADD COLUMN IF NOT EXISTS mood text DEFAULT 'happy'
  CHECK (mood IN ('passion','happy','calm','cozy','creative'));

-- weather_snapshot: 저장 시점 날씨
ALTER TABLE ootd_records
  ADD COLUMN IF NOT EXISTS weather_snapshot jsonb;
