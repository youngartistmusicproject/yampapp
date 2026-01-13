-- Update the default status value for new tasks
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'not-started';