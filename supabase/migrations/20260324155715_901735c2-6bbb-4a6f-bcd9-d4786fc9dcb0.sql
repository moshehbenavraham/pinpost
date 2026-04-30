-- Explicit deny-all for client access; only service-role accesses this table
CREATE POLICY "No client access" ON public.rate_limits
  FOR ALL TO authenticated USING (false) WITH CHECK (false);