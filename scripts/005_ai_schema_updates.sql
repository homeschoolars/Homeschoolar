-- AI Features Schema Updates
-- Run this after the initial schema scripts

-- Add AI-related columns to children table
ALTER TABLE children ADD COLUMN IF NOT EXISTS current_level TEXT DEFAULT 'beginner' CHECK (current_level IN ('beginner', 'intermediate', 'advanced'));
ALTER TABLE children ADD COLUMN IF NOT EXISTS learning_style TEXT;
ALTER TABLE children ADD COLUMN IF NOT EXISTS interests TEXT[];
ALTER TABLE children ADD COLUMN IF NOT EXISTS assessment_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE children ADD COLUMN IF NOT EXISTS last_quiz_at TIMESTAMPTZ;

-- Add AI-related columns to worksheets table
ALTER TABLE worksheets ADD COLUMN IF NOT EXISTS answer_key JSONB;
ALTER TABLE worksheets ADD COLUMN IF NOT EXISTS explanations JSONB;
ALTER TABLE worksheets ADD COLUMN IF NOT EXISTS ai_prompt TEXT;

-- Create assessments table for initial enrollment assessments
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  questions JSONB NOT NULL,
  answers JSONB,
  score INTEGER,
  recommended_level TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create surprise_quizzes table
CREATE TABLE IF NOT EXISTS surprise_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  questions JSONB NOT NULL,
  answers JSONB,
  score INTEGER,
  max_score INTEGER,
  feedback TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ai_recommendations table
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('subject', 'topic', 'worksheet', 'activity')),
  title TEXT NOT NULL,
  description TEXT,
  reason TEXT,
  priority INTEGER DEFAULT 0,
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create curriculum_paths table for personalized learning paths
CREATE TABLE IF NOT EXISTS curriculum_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  current_topic TEXT,
  completed_topics TEXT[],
  next_topics TEXT[],
  mastery_level INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, subject_id)
);

-- Enable RLS on new tables
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE surprise_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_paths ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessments
CREATE POLICY "Parents can view their children's assessments"
  ON assessments FOR SELECT
  USING (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));

CREATE POLICY "Children can view own assessments"
  ON assessments FOR SELECT
  USING (child_id IN (SELECT id FROM children WHERE id = child_id));

CREATE POLICY "System can insert assessments"
  ON assessments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update assessments"
  ON assessments FOR UPDATE
  USING (true);

-- RLS Policies for surprise_quizzes
CREATE POLICY "Parents can view their children's quizzes"
  ON surprise_quizzes FOR SELECT
  USING (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));

CREATE POLICY "Children can manage own quizzes"
  ON surprise_quizzes FOR ALL
  USING (true);

-- RLS Policies for ai_recommendations
CREATE POLICY "Parents can view their children's recommendations"
  ON ai_recommendations FOR SELECT
  USING (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));

CREATE POLICY "System can manage recommendations"
  ON ai_recommendations FOR ALL
  USING (true);

-- RLS Policies for curriculum_paths
CREATE POLICY "Parents can view their children's curriculum"
  ON curriculum_paths FOR SELECT
  USING (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));

CREATE POLICY "System can manage curriculum"
  ON curriculum_paths FOR ALL
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assessments_child_id ON assessments(child_id);
CREATE INDEX IF NOT EXISTS idx_surprise_quizzes_child_id ON surprise_quizzes(child_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_child_id ON ai_recommendations(child_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_paths_child_id ON curriculum_paths(child_id);
