REVOKE UPDATE ON public.video_reports FROM authenticated;
ALTER TABLE public.contact_conversations ADD COLUMN last_message text NOT NULL DEFAULT '';
UPDATE public.contact_conversations c SET last_message=coalesce((SELECT m.text FROM public.contact_messages m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC,m.id DESC LIMIT 1),'');
CREATE OR REPLACE FUNCTION public.support_message_saved() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
UPDATE public.contact_conversations SET last_message=NEW.text,updated_at=now(), admin_unread=CASE WHEN NEW.role='sender' THEN admin_unread+1 ELSE admin_unread END, sender_unread=CASE WHEN NEW.role='admin' THEN sender_unread+1 ELSE sender_unread END WHERE id=NEW.conversation_id;
IF NEW.role='admin' THEN INSERT INTO public.support_activity(actor_id,action,target_id) VALUES(auth.uid(),'admin_reply',NEW.conversation_id::text); END IF;
RETURN NEW; END $$;