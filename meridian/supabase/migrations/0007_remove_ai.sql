-- ============================================================================
-- Meridian — 0007 remove the AI assistant
--
-- The assistant was removed from the product. Migrations 0001 and 0004 no
-- longer create these objects, so a fresh install never has them; this file
-- exists for a database where the earlier versions were already applied.
--
-- Everything here is guarded, so it is a no-op on a fresh install and safe to
-- re-run. Dropping ai_conversations cascades to ai_messages.
-- ============================================================================

drop table if exists public.ai_messages;
drop table if exists public.ai_conversations;

drop type if exists meridian_message_role;

alter table public.user_settings drop column if exists ai_data_permission;
alter table public.user_settings drop column if exists ai_conversation_memory;
