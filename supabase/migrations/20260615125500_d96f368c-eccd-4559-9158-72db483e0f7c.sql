CREATE OR REPLACE FUNCTION public.set_eval_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  total INT;
  pillar_floor_ok BOOLEAN;
BEGIN
  total := COALESCE(NEW.execution_score,0)
         + COALESCE(NEW.customer_score,0)
         + COALESCE(NEW.business_score,0)
         + COALESCE(NEW.behavior_score,0);
  NEW.total_score := total;

  -- Syllabus rule: no single pillar below 50% of its weight
  pillar_floor_ok := COALESCE(NEW.execution_score,0) >= 20  -- 50% of 40
                 AND COALESCE(NEW.customer_score,0)  >= 13  -- ~50% of 25
                 AND COALESCE(NEW.business_score,0)  >= 10  -- 50% of 20
                 AND COALESCE(NEW.behavior_score,0)  >= 8;  -- ~50% of 15

  IF NEW.status IS NULL OR NOT NEW.manual_override THEN
    NEW.status := CASE
      WHEN total >= 70 AND pillar_floor_ok THEN 'green'::review_status
      WHEN total >= 50 THEN 'yellow'::review_status
      ELSE 'red'::review_status
    END;
  END IF;
  RETURN NEW;
END;
$function$;