-- ========================================
-- DAILY WEIGHT TRACKING FOR DEFINICION
-- ========================================
-- Allows daily weigh-ins for better weekly averages

CREATE TABLE IF NOT EXISTS definicion_daily_weights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week INTEGER NOT NULL CHECK (week >= 1 AND week <= 22),
  day TEXT NOT NULL CHECK (day IN ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo')),
  peso DECIMAL(5,2) NOT NULL CHECK (peso > 0 AND peso < 300),
  date TIMESTAMPTZ DEFAULT NOW(),
  notas TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week, day)
);

-- RLS policies (public, no auth)
ALTER TABLE definicion_daily_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on definicion_daily_weights"
  ON definicion_daily_weights FOR SELECT USING (true);

CREATE POLICY "Allow public insert on definicion_daily_weights"
  ON definicion_daily_weights FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on definicion_daily_weights"
  ON definicion_daily_weights FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on definicion_daily_weights"
  ON definicion_daily_weights FOR DELETE USING (true);

-- Index for fast lookups by week
CREATE INDEX idx_definicion_daily_weights_week ON definicion_daily_weights (week, day);
