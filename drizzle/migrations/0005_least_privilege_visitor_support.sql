REVOKE ALL ON public.video_reports,public.contact_conversations,public.contact_messages,public.support_activity FROM anon;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.videos FROM anon;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.contact_conversations,public.support_activity FROM authenticated;
REVOKE UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.contact_messages FROM authenticated;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.video_reports FROM authenticated;