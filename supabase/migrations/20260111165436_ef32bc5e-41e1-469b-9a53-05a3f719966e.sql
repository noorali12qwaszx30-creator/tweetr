
-- Allow field role to view delivery drivers profiles
CREATE POLICY "Field can view delivery drivers profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'field'::app_role) 
  AND user_id IN (
    SELECT user_id FROM public.user_roles WHERE role = 'delivery'::app_role
  )
);
