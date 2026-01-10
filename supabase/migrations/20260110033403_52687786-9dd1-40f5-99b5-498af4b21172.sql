-- Create knowledge documents table
CREATE TABLE public.knowledge_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled Document',
  content TEXT DEFAULT '',
  parent_id UUID REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('folder', 'doc')) DEFAULT 'doc',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT DEFAULT 'Admin',
  sort_order INTEGER DEFAULT 0
);

-- Create index for parent_id lookups
CREATE INDEX idx_knowledge_documents_parent_id ON public.knowledge_documents(parent_id);
CREATE INDEX idx_knowledge_documents_type ON public.knowledge_documents(type);

-- Enable Row Level Security
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (knowledge base is typically shared)
CREATE POLICY "Anyone can view knowledge documents"
ON public.knowledge_documents
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create knowledge documents"
ON public.knowledge_documents
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update knowledge documents"
ON public.knowledge_documents
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete knowledge documents"
ON public.knowledge_documents
FOR DELETE
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_knowledge_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_knowledge_documents_updated_at
BEFORE UPDATE ON public.knowledge_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_knowledge_documents_updated_at();

-- Insert sample data
INSERT INTO public.knowledge_documents (id, title, type, parent_id, sort_order) VALUES
('11111111-1111-1111-1111-111111111111', 'Getting Started', 'folder', NULL, 0),
('22222222-2222-2222-2222-222222222222', 'SOPs & Policies', 'folder', NULL, 1),
('33333333-3333-3333-3333-333333333333', 'Teaching Resources', 'folder', NULL, 2);

INSERT INTO public.knowledge_documents (id, title, type, parent_id, content, sort_order) VALUES
('11111111-1111-1111-1111-111111111101', 'Welcome Guide', 'doc', '11111111-1111-1111-1111-111111111111', '<h1>Welcome Guide</h1><p>Welcome to our Music School Work Operating System! This guide will help you get started with using the platform effectively.</p><h2>Getting Started</h2><p>This system is designed to help our team manage daily operations, communicate effectively, and keep track of all student and parent information.</p><h3>Key Features</h3><ul><li><strong>Project Management</strong>: Create and track tasks, set due dates, and collaborate with team members</li><li><strong>Knowledge Base</strong>: Access SOPs, guides, and important documentation</li><li><strong>Communication</strong>: Chat with colleagues and manage parent communications</li><li><strong>Calendar</strong>: View and manage schedules, lessons, and events</li></ul>', 0),
('11111111-1111-1111-1111-111111111102', 'Quick Start', 'doc', '11111111-1111-1111-1111-111111111111', '<h1>Quick Start</h1><p>Get up and running in minutes with this quick start guide.</p>', 1),
('22222222-2222-2222-2222-222222222201', 'Attendance Policy', 'doc', '22222222-2222-2222-2222-222222222222', '<h1>Attendance Policy</h1><p>Our attendance policy ensures consistency and accountability.</p>', 0),
('22222222-2222-2222-2222-222222222202', 'Lesson Planning Guide', 'doc', '22222222-2222-2222-2222-222222222222', '<h1>Lesson Planning Guide</h1><p>Learn how to create effective lesson plans.</p>', 1),
('22222222-2222-2222-2222-222222222203', 'Parent Communication', 'doc', '22222222-2222-2222-2222-222222222222', '<h1>Parent Communication</h1><p>Best practices for communicating with parents.</p>', 2),
('33333333-3333-3333-3333-333333333301', 'Music Theory Basics', 'doc', '33333333-3333-3333-3333-333333333333', '<h1>Music Theory Basics</h1><p>Fundamental music theory concepts for teaching.</p>', 0),
('33333333-3333-3333-3333-333333333302', 'Practice Techniques', 'doc', '33333333-3333-3333-3333-333333333333', '<h1>Practice Techniques</h1><p>Effective practice techniques for students.</p>', 1),
('44444444-4444-4444-4444-444444444444', 'Staff Handbook', 'doc', NULL, '<h1>Staff Handbook</h1><p>Complete guide for all staff members.</p>', 3);