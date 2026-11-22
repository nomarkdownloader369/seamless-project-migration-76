CREATE TABLE public.assistant_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, thread_id uuid REFERENCES public.assistant_threads(id) ON DELETE SET NULL,
 title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 500), command text NOT NULL CHECK (length(trim(command)) BETWEEN 1 AND 20000),
 kind text NOT NULL CHECK (kind IN ('plan','catalog_audit')), status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
 execution_mode text NOT NULL DEFAULT 'planned' CHECK (execution_mode IN ('planned','real','simulated')), logs jsonb NOT NULL DEFAULT '[]', error text,
 created_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz, finished_at timestamptz,
 CHECK (execution_mode <> 'planned' OR status = 'pending')
);
GRANT SELECT ON public.assistant_tasks TO authenticated;
GRANT ALL ON public.assistant_tasks TO service_role;
ALTER TABLE public.assistant_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY assistant_tasks_owner ON public.assistant_tasks FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));
CREATE INDEX assistant_tasks_owner_time ON public.assistant_tasks(user_id,created_at DESC);
CREATE TABLE public.assistant_automations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
 command text NOT NULL CHECK (length(trim(command)) BETWEEN 1 AND 20000), scheduled_at timestamptz NOT NULL,
 recurrence text NOT NULL DEFAULT 'once' CHECK (recurrence IN ('once','daily','weekly')), enabled boolean NOT NULL DEFAULT false CHECK (enabled = false),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.assistant_automations TO authenticated;
GRANT ALL ON public.assistant_automations TO service_role;
ALTER TABLE public.assistant_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY assistant_automations_owner ON public.assistant_automations FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));
CREATE FUNCTION public.assistant_manage_thread(p_id uuid,p_action text,p_title text DEFAULT '',p_confirmed boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF p_confirmed IS DISTINCT FROM true OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Confirmation and administrator access required'; END IF;
 PERFORM 1 FROM public.assistant_threads WHERE id=p_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Conversation unavailable'; END IF;
 IF p_action='rename' THEN
  IF length(trim(p_title)) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Invalid title'; END IF;
  UPDATE public.assistant_threads SET title=trim(p_title),updated_at=now() WHERE id=p_id;
  INSERT INTO public.assistant_activity(user_id,thread_id,action) VALUES(auth.uid(),p_id,'conversation_renamed');
 ELSIF p_action='delete' THEN
  INSERT INTO public.assistant_activity(user_id,thread_id,action) VALUES(auth.uid(),p_id,'conversation_deleted');
  DELETE FROM public.assistant_threads WHERE id=p_id AND user_id=auth.uid();
 ELSE RAISE EXCEPTION 'Invalid action'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.assistant_manage_thread(uuid,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.assistant_manage_thread(uuid,text,text,boolean) TO authenticated;
CREATE FUNCTION public.assistant_create_task(p_id uuid,p_command text,p_kind text,p_confirmed boolean,p_thread_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total_count bigint; published_count bigint; pending_count bigint; task_owner uuid;
BEGIN
 IF p_confirmed IS DISTINCT FROM true OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Confirmation and administrator access required'; END IF;
 IF length(trim(p_command)) NOT BETWEEN 1 AND 20000 OR p_kind NOT IN ('plan','catalog_audit') THEN RAISE EXCEPTION 'Invalid task'; END IF;
 IF p_thread_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.assistant_threads WHERE id=p_thread_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Conversation unavailable'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 SELECT user_id INTO task_owner FROM public.assistant_tasks WHERE id=p_id;
 IF FOUND THEN IF task_owner <> auth.uid() THEN RAISE EXCEPTION 'Forbidden'; END IF; RETURN p_id; END IF;
 INSERT INTO public.assistant_tasks(id,user_id,thread_id,title,command,kind,execution_mode,status,started_at,logs)
 VALUES(p_id,auth.uid(),p_thread_id,left(trim(p_command),500),trim(p_command),p_kind,CASE WHEN p_kind='plan' THEN 'planned' ELSE 'real' END,CASE WHEN p_kind='plan' THEN 'pending' ELSE 'running' END,CASE WHEN p_kind='catalog_audit' THEN now() ELSE NULL END,
 jsonb_build_array(jsonb_build_object('at',now(),'event',CASE WHEN p_kind='plan' THEN 'Plan saved. No executor; not queued for automatic execution.' ELSE 'Administrator confirmed read-only catalog audit.' END)));
 IF p_kind='catalog_audit' THEN
  BEGIN
   SELECT count(*),count(*) FILTER(WHERE status='published'),count(*) FILTER(WHERE status='pending') INTO total_count,published_count,pending_count FROM public.videos;
   UPDATE public.assistant_tasks SET status='completed',finished_at=now(),logs=logs || jsonb_build_array(jsonb_build_object('at',now(),'event','Catalog read completed','total',total_count,'published',published_count,'pending',pending_count)) WHERE id=p_id;
  EXCEPTION WHEN OTHERS THEN
   UPDATE public.assistant_tasks SET status='failed',finished_at=now(),error='Catalog audit failed',logs=logs || jsonb_build_array(jsonb_build_object('at',now(),'event','Catalog audit failed')) WHERE id=p_id;
  END;
 END IF;
 INSERT INTO public.assistant_activity(user_id,thread_id,action) VALUES(auth.uid(),p_thread_id,CASE WHEN p_kind='plan' THEN 'task_plan_saved' ELSE 'catalog_audit_executed' END);
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.assistant_create_task(uuid,text,text,boolean,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.assistant_create_task(uuid,text,text,boolean,uuid) TO authenticated;
CREATE FUNCTION public.assistant_save_automation(p_id uuid,p_name text,p_command text,p_scheduled_at timestamptz,p_recurrence text,p_enabled boolean,p_confirmed boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF p_confirmed IS DISTINCT FROM true OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Confirmation and administrator access required'; END IF;
 IF p_enabled IS DISTINCT FROM false THEN RAISE EXCEPTION 'Scheduler not connected. Activation refused.'; END IF;
 IF length(trim(p_name)) NOT BETWEEN 1 AND 120 OR length(trim(p_command)) NOT BETWEEN 1 AND 20000 OR p_scheduled_at IS NULL OR p_recurrence NOT IN ('once','daily','weekly') THEN RAISE EXCEPTION 'Invalid schedule'; END IF;
 INSERT INTO public.assistant_automations(id,user_id,name,command,scheduled_at,recurrence,enabled) VALUES(p_id,auth.uid(),trim(p_name),trim(p_command),p_scheduled_at,p_recurrence,false)
 ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,command=EXCLUDED.command,scheduled_at=EXCLUDED.scheduled_at,recurrence=EXCLUDED.recurrence,enabled=false,updated_at=now() WHERE assistant_automations.user_id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Forbidden'; END IF;
 INSERT INTO public.assistant_activity(user_id,action) VALUES(auth.uid(),'automation_draft_saved');
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.assistant_save_automation(uuid,text,text,timestamptz,text,boolean,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.assistant_save_automation(uuid,text,text,timestamptz,text,boolean,boolean) TO authenticated;
CREATE FUNCTION public.assistant_delete_automation(p_id uuid,p_confirmed boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF p_confirmed IS DISTINCT FROM true OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Confirmation and administrator access required'; END IF;
 DELETE FROM public.assistant_automations WHERE id=p_id AND user_id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Schedule unavailable'; END IF;
 INSERT INTO public.assistant_activity(user_id,action) VALUES(auth.uid(),'automation_draft_deleted');
END $$;
REVOKE ALL ON FUNCTION public.assistant_delete_automation(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.assistant_delete_automation(uuid,boolean) TO authenticated;