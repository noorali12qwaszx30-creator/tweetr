-- Create table to store plaintext passwords for admin reference
CREATE TABLE public.user_passwords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_passwords ENABLE ROW LEVEL SECURITY;

-- Only admins can view passwords
CREATE POLICY "Admins can view passwords" 
ON public.user_passwords 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can manage passwords
CREATE POLICY "Admins can manage passwords" 
ON public.user_passwords 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_user_passwords_updated_at
BEFORE UPDATE ON public.user_passwords
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();