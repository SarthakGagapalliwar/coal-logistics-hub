
-- Create function to get emails for users (admin only, security definer)
CREATE OR REPLACE FUNCTION public.get_user_email(user_id UUID)
RETURNS TABLE (email TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Check if the current user is an admin
  SELECT role INTO current_user_role 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  IF current_user_role = 'admin' THEN
    RETURN QUERY 
    SELECT au.email::text
    FROM auth.users au
    WHERE au.id = user_id;
  ELSE
    RETURN QUERY SELECT 'Not authorized'::text;
  END IF;
END;
$$;

-- Grant access to the function for authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_email TO authenticated;
