-- Create topics table
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  importance INTEGER CHECK (importance >= 1 AND importance <= 10),
  effort TEXT CHECK (effort IN ('low', 'medium', 'high')),
  pyq_frequency INTEGER,
  proficiency INTEGER CHECK (proficiency >= 0 AND proficiency <= 100),
  explanation TEXT,
  rank INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create previous_year_questions table
CREATE TABLE public.previous_year_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  topic_name TEXT NOT NULL,
  appearances INTEGER DEFAULT 0,
  years TEXT[] DEFAULT '{}',
  trend TEXT CHECK (trend IN ('rising', 'stable', 'declining')),
  weightage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_performance table
CREATE TABLE public.user_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  topic_name TEXT NOT NULL,
  coverage_percentage INTEGER DEFAULT 0 CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100),
  status TEXT CHECK (status IN ('strong', 'good', 'needs-work', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, topic_id)
);

-- Enable RLS
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.previous_year_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_performance ENABLE ROW LEVEL SECURITY;

-- Topics policies
CREATE POLICY "Users can view their own topics"
  ON public.topics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own topics"
  ON public.topics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own topics"
  ON public.topics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own topics"
  ON public.topics FOR DELETE
  USING (auth.uid() = user_id);

-- Previous year questions policies
-- Note: users can view pyqs for their own topics
CREATE POLICY "Users can view pyqs for their topics"
  ON public.previous_year_questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.topics
    WHERE topics.id = previous_year_questions.topic_id
    AND topics.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert pyqs for their topics"
  ON public.previous_year_questions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.topics
    WHERE topics.id = previous_year_questions.topic_id
    AND topics.user_id = auth.uid()
  ));

CREATE POLICY "Users can update pyqs for their topics"
  ON public.previous_year_questions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.topics
    WHERE topics.id = previous_year_questions.topic_id
    AND topics.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete pyqs for their topics"
  ON public.previous_year_questions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.topics
    WHERE topics.id = previous_year_questions.topic_id
    AND topics.user_id = auth.uid()
  ));

-- User performance policies
CREATE POLICY "Users can view their own performance"
  ON public.user_performance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own performance"
  ON public.user_performance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own performance"
  ON public.user_performance FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own performance"
  ON public.user_performance FOR DELETE
  USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_topics_updated_at
  BEFORE UPDATE ON public.topics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_performance_updated_at
  BEFORE UPDATE ON public.user_performance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
