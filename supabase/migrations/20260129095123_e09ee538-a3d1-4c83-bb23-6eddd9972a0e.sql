-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create exam_contexts table for storing user exam setup
CREATE TABLE public.exam_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  exam_name TEXT NOT NULL,
  exam_date DATE NOT NULL,
  subjects TEXT[] NOT NULL DEFAULT '{}',
  daily_study_hours INTEGER DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create subject_confidence table for storing user confidence per subject
CREATE TABLE public.subject_confidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  confidence_level INTEGER DEFAULT 5 CHECK (confidence_level >= 1 AND confidence_level <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, subject)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_confidence ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Exam contexts policies
CREATE POLICY "Users can view their own exam context"
  ON public.exam_contexts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exam context"
  ON public.exam_contexts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exam context"
  ON public.exam_contexts FOR UPDATE
  USING (auth.uid() = user_id);

-- Subject confidence policies
CREATE POLICY "Users can view their own subject confidence"
  ON public.subject_confidence FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subject confidence"
  ON public.subject_confidence FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subject confidence"
  ON public.subject_confidence FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subject confidence"
  ON public.subject_confidence FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exam_contexts_updated_at
  BEFORE UPDATE ON public.exam_contexts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();