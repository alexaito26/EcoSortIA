-- El QR contiene una URL completa con token seguro; 70 caracteres no alcanza.
alter table public.screen_events
  drop constraint if exists screen_events_accepted_payload_check;

alter table public.screen_events
  add constraint screen_events_accepted_payload_check check (
    (
      state = 'accepted'
      and accepted is true
      and waste_type is not null
      and btrim(waste_type) <> ''
      and qr_content is not null
      and char_length(qr_content) between 1 and 2048
      and rejection_reason is null
    )
    or (
      state = 'rejected'
      and accepted is false
      and points = 0
      and qr_content is null
    )
    or (
      state in ('waiting', 'processing')
      and accepted is null
      and points = 0
      and qr_content is null
    )
  );
