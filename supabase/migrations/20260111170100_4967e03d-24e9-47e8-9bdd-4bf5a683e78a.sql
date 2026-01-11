-- Allow field role to view delivery roles in user_roles table
CREATE POLICY "Field can view delivery roles"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'field'::app_role) 
  AND role = 'delivery'::app_role
);
