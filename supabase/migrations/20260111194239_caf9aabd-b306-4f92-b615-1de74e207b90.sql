-- Create teams table
CREATE TABLE public.teams (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    priority TEXT NOT NULL DEFAULT 'medium',
    assignee TEXT,
    due_date DATE,
    estimated_time TEXT,
    progress INTEGER NOT NULL DEFAULT 0,
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activity log table
CREATE TABLE public.activity_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_title TEXT NOT NULL,
    target_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for teams (permissive for now since no auth)
CREATE POLICY "Allow all on teams" ON public.teams FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for projects
CREATE POLICY "Allow all on projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for tasks
CREATE POLICY "Allow all on tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for activity_log
CREATE POLICY "Allow all on activity_log" ON public.activity_log FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for tasks and activity_log
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;

-- Insert default teams based on the hierarchy specs
INSERT INTO public.teams (name, description, icon) VALUES
    ('Operations', 'Day-to-day business operations', '⚙️'),
    ('Teachers', 'Music instructors and educators', '🎵'),
    ('Sales & Marketing', 'Student acquisition and promotion', '📣'),
    ('Students', 'Student-related activities', '🎓'),
    ('Finance & Accounting', 'Financial management', '💰');

-- Insert a sample project
INSERT INTO public.projects (team_id, name, description, status, due_date)
SELECT id, 'Spring Recital Planning', 'Plan and execute the spring music recital', 'active', '2026-03-15'
FROM public.teams WHERE name = 'Teachers' LIMIT 1;

INSERT INTO public.projects (team_id, name, description, status, due_date)
SELECT id, 'Curriculum Update', 'Update music curriculum for new semester', 'active', '2026-02-28'
FROM public.teams WHERE name = 'Teachers' LIMIT 1;

INSERT INTO public.projects (team_id, name, description, status, due_date)
SELECT id, 'Student Enrollment', 'Spring enrollment campaign', 'active', '2026-01-31'
FROM public.teams WHERE name = 'Sales & Marketing' LIMIT 1;

-- Insert sample tasks
INSERT INTO public.tasks (project_id, title, description, status, priority, assignee, due_date, progress)
SELECT p.id, 'Review lesson plans for next week', 'Prepare and review all lesson materials', 'in_progress', 'high', 'Sarah M.', CURRENT_DATE, 50
FROM public.projects p WHERE p.name = 'Spring Recital Planning';

INSERT INTO public.tasks (project_id, title, description, status, priority, assignee, due_date, progress)
SELECT p.id, 'Update student progress reports', 'Complete quarterly progress reports', 'todo', 'medium', 'You', CURRENT_DATE + 3, 0
FROM public.projects p WHERE p.name = 'Spring Recital Planning';

INSERT INTO public.tasks (project_id, title, description, status, priority, assignee, due_date, progress)
SELECT p.id, 'Schedule parent-teacher meetings', 'Coordinate meeting times with parents', 'todo', 'high', 'John D.', CURRENT_DATE + 1, 0
FROM public.projects p WHERE p.name = 'Spring Recital Planning';

INSERT INTO public.tasks (project_id, title, description, status, priority, assignee, due_date, progress)
SELECT p.id, 'Order new music books', 'Order curriculum materials', 'done', 'low', 'Admin', CURRENT_DATE - 2, 100
FROM public.projects p WHERE p.name = 'Curriculum Update';

-- Insert sample activity
INSERT INTO public.activity_log (user_name, action, target_type, target_title)
VALUES 
    ('Sarah M.', 'completed task', 'task', 'Update curriculum guide'),
    ('John D.', 'submitted request', 'request', 'Time Off Request'),
    ('Admin', 'added document', 'document', '2024 Schedule');