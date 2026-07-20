-- Add study_materials_description to exam_contexts
ALTER TABLE public.exam_contexts ADD COLUMN study_materials_description TEXT;

-- Add new columns to topics table
ALTER TABLE public.topics ADD COLUMN priority_order INTEGER;
ALTER TABLE public.topics ADD COLUMN marks_impact INTEGER;
ALTER TABLE public.topics ADD COLUMN study_content TEXT;
ALTER TABLE public.topics ADD COLUMN quiz_data JSONB;
