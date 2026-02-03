-- Add 'Modificação de Fundido' to apps table
-- This app will be unchecked for all users by default (since they don't have the permission record)
-- Admins will automatically have access due to existing logic.

INSERT INTO public.apps (code, name, active)
VALUES ('shift-app', 'Modificação de Fundido', true)
ON CONFLICT (code) DO NOTHING;
