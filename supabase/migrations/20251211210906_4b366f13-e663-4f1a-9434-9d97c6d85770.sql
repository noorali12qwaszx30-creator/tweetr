-- Fix profiles table RLS policies
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create PERMISSIVE policies for profiles (users can only see their own profile, admins can see all)
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Fix customers table RLS policies - restrict to specific roles
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can create customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;

-- Only cashiers, field, delivery, takeaway, and admin can view customers
CREATE POLICY "Authorized roles can view customers" 
ON public.customers 
FOR SELECT 
USING (
  public.has_role(auth.uid(), 'cashier') OR 
  public.has_role(auth.uid(), 'field') OR 
  public.has_role(auth.uid(), 'delivery') OR 
  public.has_role(auth.uid(), 'takeaway') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Only cashiers, takeaway, and admin can create customers
CREATE POLICY "Authorized roles can create customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (
  public.has_role(auth.uid(), 'cashier') OR 
  public.has_role(auth.uid(), 'takeaway') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Only cashiers, takeaway, and admin can update customers
CREATE POLICY "Authorized roles can update customers" 
ON public.customers 
FOR UPDATE 
USING (
  public.has_role(auth.uid(), 'cashier') OR 
  public.has_role(auth.uid(), 'takeaway') OR 
  public.has_role(auth.uid(), 'admin')
);