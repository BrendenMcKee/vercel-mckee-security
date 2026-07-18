-- VoIP phone service (R42): new service type. The enum addition sits alone in
-- this migration because a value added to an enum cannot be referenced later
-- in the same transaction; the CHECK/RPC changes are the next migration.
alter type public.service_type add value if not exists 'voip';
