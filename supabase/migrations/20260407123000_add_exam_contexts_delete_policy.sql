-- Allow authenticated users to delete their own exam context during reset/new-test flows
CREATE POLICY "Users can delete their own exam context"
  ON public.exam_contexts FOR DELETE
  USING (auth.uid() = user_id);
