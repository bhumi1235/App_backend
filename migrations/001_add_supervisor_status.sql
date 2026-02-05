-- Add status column to employees table for supervisor status tracking
-- Valid values: 'Active', 'Suspended', 'Terminated'

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active' 
CHECK (status IN ('Active', 'Suspended', 'Terminated'));

-- Set all existing supervisors to Active
UPDATE employees SET status = 'Active' WHERE status IS NULL;

-- Add index for better query performance when filtering by status
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
