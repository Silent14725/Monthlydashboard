
-- datasets: metadata + serialized dashboard for fast loading
CREATE TABLE IF NOT EXISTS datasets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_name TEXT NOT NULL,
  uploaded_file_name TEXT,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by TEXT DEFAULT 'anonymous',
  total_records INTEGER DEFAULT 0,
  active_dataset BOOLEAN DEFAULT FALSE,
  dashboard_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "datasets_select_anon" ON datasets FOR SELECT TO anon USING (true);
CREATE POLICY "datasets_insert_anon" ON datasets FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "datasets_update_anon" ON datasets FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "datasets_delete_anon" ON datasets FOR DELETE TO anon USING (true);

-- raw_data: original uploaded rows stored as JSONB (one row per source row)
CREATE TABLE IF NOT EXISTS raw_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  row_data_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE raw_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "raw_data_select_anon" ON raw_data FOR SELECT TO anon USING (true);
CREATE POLICY "raw_data_insert_anon" ON raw_data FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "raw_data_update_anon" ON raw_data FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "raw_data_delete_anon" ON raw_data FOR DELETE TO anon USING (true);

-- processed_data: normalised metric rows (one metric per row) for querying/auditing
CREATE TABLE IF NOT EXISTS processed_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  customer TEXT,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE processed_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "processed_data_select_anon" ON processed_data FOR SELECT TO anon USING (true);
CREATE POLICY "processed_data_insert_anon" ON processed_data FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "processed_data_update_anon" ON processed_data FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "processed_data_delete_anon" ON processed_data FOR DELETE TO anon USING (true);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_datasets_active ON datasets(active_dataset) WHERE active_dataset = true;
CREATE INDEX IF NOT EXISTS idx_datasets_created ON datasets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_data_dataset ON raw_data(dataset_id);
CREATE INDEX IF NOT EXISTS idx_processed_data_dataset ON processed_data(dataset_id);
CREATE INDEX IF NOT EXISTS idx_processed_data_location_month ON processed_data(dataset_id, location, month);
