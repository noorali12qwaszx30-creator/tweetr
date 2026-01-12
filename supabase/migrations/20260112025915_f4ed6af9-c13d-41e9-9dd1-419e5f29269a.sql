-- Create issue_reasons table
CREATE TABLE public.issue_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.issue_reasons ENABLE ROW LEVEL SECURITY;

-- Everyone can view active issue reasons
CREATE POLICY "Everyone can view active issue reasons"
ON public.issue_reasons
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage issue reasons
CREATE POLICY "Admins can manage issue reasons"
ON public.issue_reasons
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_issue_reasons_updated_at
BEFORE UPDATE ON public.issue_reasons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default issue reasons
INSERT INTO public.issue_reasons (label, display_order) VALUES
  ('نقص في الطلب', 1),
  ('صنف غير متوفر', 2),
  ('خطأ في الطلب', 3),
  ('طلب بارد/غير طازج', 4),
  ('تغليف غير صحيح', 5),
  ('عنوان غير واضح', 6),
  ('الزبون غير راضٍ', 7),
  ('أخرى', 8);