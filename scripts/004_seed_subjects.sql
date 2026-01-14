-- Seed the 10 subjects
INSERT INTO public.subjects (name, description, icon, color, display_order) VALUES
  ('English (Early Literacy)', 'Reading, writing, phonics, and language development', 'book-open', '#EC4899', 1),
  ('Mathematics (Early Numeracy)', 'Numbers, counting, basic operations, and problem solving', 'calculator', '#8B5CF6', 2),
  ('Science (General Awareness)', 'Exploring nature, experiments, and scientific thinking', 'flask', '#10B981', 3),
  ('Social Studies (My World)', 'Community, geography, history, and global awareness', 'globe', '#3B82F6', 4),
  ('Self-Awareness (Core Life Skill)', 'Understanding emotions, strengths, and personal growth', 'heart', '#F43F5E', 5),
  ('Etiquettes & Manners', 'Social skills, respect, and proper behavior', 'users', '#F59E0B', 6),
  ('Emotional Management', 'Handling feelings, coping strategies, and resilience', 'smile', '#06B6D4', 7),
  ('Health & Hygiene', 'Body care, nutrition, exercise, and wellness', 'activity', '#22C55E', 8),
  ('Financial Education (Money Awareness)', 'Saving, spending wisely, and understanding money', 'piggy-bank', '#EAB308', 9),
  ('Islamic Studies (Foundation)', 'Core values, ethics, and spiritual foundations', 'star', '#6366F1', 10)
ON CONFLICT DO NOTHING;
