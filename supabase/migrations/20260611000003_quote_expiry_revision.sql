-- Add expiry_date and revision tracking to quotes

ALTER TABLE quotes
  ADD COLUMN expiry_date date,
  ADD COLUMN revision int not null default 1;
