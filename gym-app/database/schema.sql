-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workout_progress table
CREATE TABLE IF NOT EXISTS workout_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  day TEXT NOT NULL,
  week INTEGER NOT NULL,
  weights DECIMAL[] NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shopping_lists table
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  selected_weeks INTEGER[] NOT NULL,
  selected_days TEXT[] NOT NULL,
  items JSONB NOT NULL,
  generated_date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, setting_key)
);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can read their own data" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own data" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (true);

-- Create policies for workout_progress table
CREATE POLICY "Users can read their own workout progress" ON workout_progress
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE session_id = current_setting('app.current_user_session', true)
    )
  );

CREATE POLICY "Users can insert their own workout progress" ON workout_progress
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE session_id = current_setting('app.current_user_session', true)
    )
  );

CREATE POLICY "Users can update their own workout progress" ON workout_progress
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM users WHERE session_id = current_setting('app.current_user_session', true)
    )
  );

CREATE POLICY "Users can delete their own workout progress" ON workout_progress
  FOR DELETE USING (
    user_id IN (
      SELECT id FROM users WHERE session_id = current_setting('app.current_user_session', true)
    )
  );

-- Create policies for shopping_lists table
CREATE POLICY "Users can read their own shopping lists" ON shopping_lists
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE session_id = current_setting('app.current_user_session', true)
    )
  );

CREATE POLICY "Users can insert their own shopping lists" ON shopping_lists
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE session_id = current_setting('app.current_user_session', true)
    )
  );

CREATE POLICY "Users can update their own shopping lists" ON shopping_lists
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM users WHERE session_id = current_setting('app.current_user_session', true)
    )
  );

CREATE POLICY "Users can delete their own shopping lists" ON shopping_lists
  FOR DELETE USING (
    user_id IN (
      SELECT id FROM users WHERE session_id = current_setting('app.current_user_session', true)
    )
  );

-- Create policies for user_settings table
CREATE POLICY "Users can read their own settings" ON user_settings
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE session_id = current_setting('app.current_user_session', true)
    )
  );

CREATE POLICY "Users can insert their own settings" ON user_settings
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE session_id = current_setting('app.current_user_session', true)
    )
  );

CREATE POLICY "Users can update their own settings" ON user_settings
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM users WHERE session_id = current_setting('app.current_user_session', true)
    )
  );

CREATE POLICY "Users can delete their own settings" ON user_settings
  FOR DELETE USING (
    user_id IN (
      SELECT id FROM users WHERE session_id = current_setting('app.current_user_session', true)
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workout_progress_user_exercise ON workout_progress(user_id, exercise_id, day, week);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user ON shopping_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_key ON user_settings(user_id, setting_key);
CREATE INDEX IF NOT EXISTS idx_users_session ON users(session_id);