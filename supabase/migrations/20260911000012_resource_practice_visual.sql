ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS practice_questions JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_practice_questions_array;
ALTER TABLE public.resources ADD CONSTRAINT resources_practice_questions_array CHECK (jsonb_typeof(practice_questions) = 'array');
ALTER TABLE public.assignments DROP CONSTRAINT IF EXISTS assignments_execution_environment_check;
ALTER TABLE public.assignments ADD CONSTRAINT assignments_execution_environment_check CHECK (execution_environment IN ('runner', 'external', 'visual'));
ALTER TABLE public.users ALTER COLUMN college SET DEFAULT 'AsterLab';

