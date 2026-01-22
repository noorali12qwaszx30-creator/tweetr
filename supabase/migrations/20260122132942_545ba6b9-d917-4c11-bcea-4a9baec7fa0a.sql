-- Create table for AI analysis snapshots (stores all data at analysis time)
CREATE TABLE public.ai_analysis_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  analysis_period TEXT DEFAULT 'today',
  
  -- Order statistics
  total_orders INTEGER DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  cancelled_orders INTEGER DEFAULT 0,
  pending_orders INTEGER DEFAULT 0,
  takeaway_orders INTEGER DEFAULT 0,
  delivery_orders INTEGER DEFAULT 0,
  
  -- Revenue
  total_revenue NUMERIC DEFAULT 0,
  delivery_fees_total NUMERIC DEFAULT 0,
  cancelled_revenue NUMERIC DEFAULT 0,
  average_order_value NUMERIC DEFAULT 0,
  
  -- Cashier stats
  cashier_stats JSONB,
  
  -- Delivery stats
  delivery_stats JSONB,
  
  -- Customer data
  total_customers INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,
  top_customers JSONB,
  
  -- Items
  top_selling_items JSONB,
  least_selling_items JSONB,
  
  -- Areas
  area_stats JSONB,
  
  -- Cancellation and issue reasons
  cancellation_reasons JSONB,
  issue_reasons JSONB,
  
  -- Performance metrics
  avg_delivery_time_minutes NUMERIC,
  avg_preparation_time_minutes NUMERIC,
  delayed_orders_count INTEGER DEFAULT 0,
  delay_rate NUMERIC DEFAULT 0,
  
  -- Hourly distribution
  hourly_distribution JSONB,
  peak_hour INTEGER,
  
  -- Congestion status
  congestion_status JSONB,
  
  -- Menu summary
  menu_summary JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create table for AI insights (stores Gemini analysis results)
CREATE TABLE public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES public.ai_analysis_snapshots(id) ON DELETE CASCADE,
  
  analysis_type TEXT NOT NULL DEFAULT 'comprehensive',
  
  -- Analysis results
  summary TEXT,
  insights JSONB,
  recommendations JSONB,
  warnings JSONB,
  opportunities JSONB,
  
  -- Overall assessment
  overall_score INTEGER,
  performance_grade TEXT,
  
  raw_response TEXT,
  model_used TEXT DEFAULT 'google/gemini-3-flash-preview',
  tokens_used INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  requested_by UUID REFERENCES auth.users(id)
);

-- Create table for daily statistics (permanent daily ledger)
CREATE TABLE public.daily_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE UNIQUE NOT NULL,
  
  -- Order statistics
  total_orders INTEGER DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  cancelled_orders INTEGER DEFAULT 0,
  takeaway_orders INTEGER DEFAULT 0,
  delivery_orders INTEGER DEFAULT 0,
  
  -- Revenue
  total_revenue NUMERIC DEFAULT 0,
  delivery_fees NUMERIC DEFAULT 0,
  
  -- Customers
  total_customers INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  
  -- Performance
  top_selling_items JSONB,
  area_distribution JSONB,
  avg_delivery_time NUMERIC,
  peak_hour INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ai_analysis_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_statistics ENABLE ROW LEVEL SECURITY;

-- RLS policies - only admins can access
CREATE POLICY "Admins can manage ai_analysis_snapshots"
  ON public.ai_analysis_snapshots
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage ai_insights"
  ON public.ai_insights
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage daily_statistics"
  ON public.daily_statistics
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updating daily_statistics updated_at
CREATE TRIGGER update_daily_statistics_updated_at
  BEFORE UPDATE ON public.daily_statistics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();