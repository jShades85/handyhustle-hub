alter table public.categories add column icon text not null default 'Package2';

-- backfill the seeded AV/Security categories
update public.categories set icon = 'Camera'   where name = 'Cameras';
update public.categories set icon = 'KeyRound' where name = 'Access Control';
update public.categories set icon = 'Network'  where name = 'Networking';
update public.categories set icon = 'Volume2'  where name = 'Audio/Video';
update public.categories set icon = 'Cable'    where name = 'Structured Cabling';
update public.categories set icon = 'Wrench'   where name = 'Labor';
