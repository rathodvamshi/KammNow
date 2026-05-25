-- ============================================================
-- NearWork Phase 4 Chat & Accept/Reject Flow
-- Run in Supabase SQL Editor
-- ============================================================

-- Drop old tables if they exist
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;

-- ── 1. Chat Rooms ──────────────────────────
-- The ID format will be: chat:application:{application_id}
CREATE TABLE chat_rooms (
  id                  VARCHAR(255) PRIMARY KEY,
  application_id      UUID         NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  job_id              UUID         NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  provider_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seeker_id           UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_deleted          BOOLEAN      DEFAULT FALSE,
  created_at          TIMESTAMPTZ  DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  DEFAULT NOW(),
  -- Ensure only one room per application
  CONSTRAINT unique_chat_room_per_app UNIQUE (application_id)
);

-- ── 2. Chat Messages ──────────────────────────
CREATE TABLE chat_messages (
  id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id             VARCHAR(255) NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id           UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message             TEXT         NOT NULL,
  message_type        VARCHAR(50)  DEFAULT 'text',
  media_url           TEXT,
  status              VARCHAR(50)  DEFAULT 'sent', -- sent, delivered, seen
  is_deleted          BOOLEAN      DEFAULT FALSE,
  created_at          TIMESTAMPTZ  DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  DEFAULT NOW()
);

-- Realtime Configuration
-- Required for Supabase realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;

-- RLS Policies (For now allowing all operations, ideally restrict via RLS later)
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on chat_rooms" ON chat_rooms FOR ALL USING (true);
CREATE POLICY "Allow all on chat_messages" ON chat_messages FOR ALL USING (true);

-- Refresh the view to ensure tools or PostgREST see the new column
NOTIFY pgrst, 'reload schema';
