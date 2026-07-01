-- FVE migration: add data_source to subscriptions
-- Run this in the Supabase SQL editor.
-- Tracks how each subscription was added (manual entry, CSV import, or future integrations).

ALTER TABLE subscriptions
ADD COLUMN data_source TEXT NOT NULL DEFAULT 'manual';
