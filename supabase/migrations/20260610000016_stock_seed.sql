do $$
declare
  v_tenant_id  uuid;
  v_user_1     uuid;  -- first user (owner)
  v_user_2     uuid;  -- second user
  v_user_3     uuid;  -- third user

  -- catalog item IDs (look up by partial name from catalog seed)
  v_ci_p3245   uuid;
  v_ci_m3106   uuid;
  v_ci_a1001   uuid;
  v_ci_cd52    uuid;
  v_ci_jack    uuid;
  v_ci_rack    uuid;
  v_ci_forte   uuid;
  v_ci_parle   uuid;

  -- stock item UUIDs (pre-generated so we can reference in movements)
  v_si_1  uuid := gen_random_uuid();
  v_si_2  uuid := gen_random_uuid();
  v_si_3  uuid := gen_random_uuid();
  v_si_4  uuid := gen_random_uuid();
  v_si_5  uuid := gen_random_uuid();
  v_si_6  uuid := gen_random_uuid();
  v_si_7  uuid := gen_random_uuid();
  v_si_8  uuid := gen_random_uuid();
  v_si_9  uuid := gen_random_uuid();
  v_si_10 uuid := gen_random_uuid();
  v_si_11 uuid := gen_random_uuid();
  v_si_12 uuid := gen_random_uuid();
begin
  select id into v_tenant_id from tenants limit 1;
  if v_tenant_id is null then return; end if;

  -- already seeded? skip
  if exists (select 1 from stock_items where tenant_id = v_tenant_id limit 1) then
    return;
  end if;

  -- grab three distinct user profiles for movement attribution
  select id into v_user_1 from user_profiles where tenant_id = v_tenant_id order by created_at limit 1;
  select id into v_user_2 from user_profiles where tenant_id = v_tenant_id order by created_at limit 1 offset 1;
  select id into v_user_3 from user_profiles where tenant_id = v_tenant_id order by created_at limit 1 offset 2;

  -- try to find catalog item IDs by name (set null if not found — harmless)
  select id into v_ci_p3245 from catalog_items where tenant_id = v_tenant_id and name ilike '%P3245%' limit 1;
  select id into v_ci_m3106 from catalog_items where tenant_id = v_tenant_id and name ilike '%M3106%' limit 1;
  select id into v_ci_a1001 from catalog_items where tenant_id = v_tenant_id and name ilike '%A1001%' limit 1;
  select id into v_ci_cd52  from catalog_items where tenant_id = v_tenant_id and name ilike '%CD52%' limit 1;
  select id into v_ci_jack  from catalog_items where tenant_id = v_tenant_id and name ilike '%QuickPort%' limit 1;
  select id into v_ci_rack  from catalog_items where tenant_id = v_tenant_id and name ilike '%Open Frame%' limit 1;
  select id into v_ci_forte from catalog_items where tenant_id = v_tenant_id and name ilike '%Forte%' limit 1;
  select id into v_ci_parle from catalog_items where tenant_id = v_tenant_id and name ilike '%Parlé%' limit 1;

  -- ─── stock items ──────────────────────────────────────────────────────────

  insert into stock_items (id, tenant_id, catalog_item_id, name, sku, category, description, unit_cost, unit_of_measure, manufacturer_name, location_bin, qty_on_hand, min_stock_level, max_stock_level, is_active)
  values
    (v_si_1,  v_tenant_id, v_ci_p3245, 'Axis P3245-V Fixed Dome Camera',          'AX-P3245-V',    'camera',         'Fixed dome 1080p, WDR, IR to 10m, IP66/IK10.',                               420,  'ea',  'Axis Communications', 'Warehouse Shelf A1', 14, 5,  25,  true),
    (v_si_2,  v_tenant_id, v_ci_m3106, 'Axis M3106-L MkII Mini Dome',             'AX-M3106L',     'camera',         'Compact 4MP fixed mini dome, 2.8mm lens, indoor ceiling.',                    180,  'ea',  'Axis Communications', 'Warehouse Shelf A1',  3, 8,  30,  true),
    (v_si_3,  v_tenant_id, v_ci_a1001, 'Axis A1001 Network Door Controller',      'AX-A1001',      'access_control', '2-door network controller, OSDP/Wiegand, PoE-powered.',                       680,  'ea',  'Axis Communications', 'Cage B',               0, 2,  10,  true),
    (v_si_4,  v_tenant_id, v_ci_cd52,  'Verkada CD52 Indoor Dome Camera',         'VK-CD52',       'camera',         '5MP IR dome, cloud-managed, 30-day onboard storage, PoE.',                    590,  'ea',  'Verkada',             'Warehouse Shelf A2',  8, 4,  20,  true),
    (v_si_5,  v_tenant_id, null,       'Verkada AD31 Access Controller',          'VK-AD31',       'access_control', 'Cloud-based door controller, 2 readers, built-in Bluetooth.',                  890,  'ea',  'Verkada',             'Cage B',               5, 2,  12,  true),
    (v_si_6,  v_tenant_id, v_ci_jack,  'Leviton GigaMax Cat5e QuickPort Jack',    'LV-5G108-RW5',  'networking',     'Cat5e QuickPort jack, 110-style termination, white. Pack of 25.',              28,   'box', 'Leviton',             'Warehouse Shelf A3', 48, 10, 40,  true),
    (v_si_7,  v_tenant_id, v_ci_rack,  'Leviton 42" 2-Post Open Frame Rack',      'LV-47612-FR',   'cable_hardware', '42U two-post open frame rack, 19-inch, 400 lb capacity.',                      285,  'ea',  'Leviton',             'Warehouse Shelf A4',  2, 1,  6,   true),
    (v_si_8,  v_tenant_id, v_ci_forte, 'Biamp Tesira Forte AVB VT4',              'BA-TESIRA-VT4', 'audio_video',    'Fixed I/O DSP, 4-in/4-out, AVB/DANTE, AEC, rackmount.',                       2240, 'ea',  'Biamp',               'Van 1',                1, 2,  8,   true),
    (v_si_9,  v_tenant_id, v_ci_parle, 'Biamp Parlé TCM-1 Ceiling Mic',           'BA-PARLE-TCM1', 'audio_video',    'Beamtracking ceiling microphone, 360° coverage, PoE.',                         890,  'ea',  'Biamp',               'Van 1',                6, 3,  16,  true),
    (v_si_10, v_tenant_id, null,       'Cat6 Cable 1000ft Bulk Box',              'CAT6-BULK-1K',  'networking',     'Cat6 UTP 1000ft pull box, 23AWG, CMR-rated, blue.',                            110,  'box', 'Misc / Consumables',  'Warehouse Shelf A3',  2, 3,  12,  true),
    (v_si_11, v_tenant_id, null,       'HDMI 2.1 Cable 6ft',                      'HDMI-2-6FT',    'audio_video',    'HDMI 2.1 cable, 6ft, 48Gbps, supports 8K@60Hz.',                              22,   'ea',  'Misc / Consumables',  'Van 2',               24, 10, 50,  true),
    (v_si_12, v_tenant_id, null,       'Single-Gang Low-Voltage Mounting Plate',  'MISC-SGMNT',    'misc',           'Low-voltage single-gang mounting bracket, ivory/white, clamshell pack of 10.', 3,    'ea',  'Misc / Consumables',  'Warehouse Shelf A4', 45, 20, 100, true);

  -- ─── stock movements ──────────────────────────────────────────────────────
  -- null created_by = "System"; v_user_* = named team members

  insert into stock_movements (tenant_id, stock_item_id, type, qty_delta, note, job_reference, created_by, created_at)
  values
    -- si_1: Axis P3245-V (14 on hand)
    (v_tenant_id, v_si_1, 'received', 24,  'Initial stock receipt',      'PO-1178',                          null,       '2026-06-01 08:00:00'),
    (v_tenant_id, v_si_1, 'consumed', -3,  null,                          'PRJ-0019 — Pinecrest Hospitality', v_user_2,   '2026-05-22 10:30:00'),
    (v_tenant_id, v_si_1, 'consumed', -4,  null,                          'PRJ-0021 — Vertex Capital 14F',    v_user_1,   '2026-06-03 14:00:00'),
    (v_tenant_id, v_si_1, 'consumed', -3,  null,                          'PRJ-0023 — Halcyon Schools Ph1',   v_user_2,   '2026-06-05 09:00:00'),
    (v_tenant_id, v_si_1, 'adjusted', 1,   'Cycle count — found one unit', null,                             v_user_1,   '2026-06-08 11:00:00'),

    -- si_2: Axis M3106-L (3 on hand)
    (v_tenant_id, v_si_2, 'received', 10,  'Initial order receipt',       'PO-1176',                          null,       '2026-05-15 08:00:00'),
    (v_tenant_id, v_si_2, 'consumed', -3,  null,                          'PRJ-0019 — Pinecrest Hospitality', v_user_2,   '2026-05-22 10:30:00'),
    (v_tenant_id, v_si_2, 'consumed', -4,  null,                          'PRJ-0022 — Helio Health 3F',       v_user_3,   '2026-06-02 13:00:00'),

    -- si_3: Axis A1001 (0 on hand)
    (v_tenant_id, v_si_3, 'received', 5,   'Initial stock receipt',       'PO-1172',                          null,       '2026-04-10 08:00:00'),
    (v_tenant_id, v_si_3, 'consumed', -2,  null,                          'PRJ-0017 — Vertex Capital Lobby',  v_user_1,   '2026-04-18 09:00:00'),
    (v_tenant_id, v_si_3, 'consumed', -3,  null,                          'PRJ-0020 — Quay Residential Lobby',v_user_2,   '2026-05-28 14:00:00'),

    -- si_4: Verkada CD52 (8 on hand)
    (v_tenant_id, v_si_4, 'received', 12,  'Verkada bulk order',          'PO-1179',                          null,       '2026-06-03 08:00:00'),
    (v_tenant_id, v_si_4, 'consumed', -4,  null,                          'PRJ-0024 — Cinder & Oak',          v_user_3,   '2026-06-06 10:00:00'),

    -- si_5: Verkada AD31 (5 on hand)
    (v_tenant_id, v_si_5, 'received', 8,   'Verkada access order',        'PO-1177',                          null,       '2026-05-28 08:00:00'),
    (v_tenant_id, v_si_5, 'consumed', -2,  null,                          'PRJ-0022 — Helio Health 3F',       v_user_1,   '2026-06-01 11:00:00'),
    (v_tenant_id, v_si_5, 'adjusted', -1,  'RMA — defective unit',        null,                               v_user_3,   '2026-06-04 14:00:00'),

    -- si_6: Leviton Cat5e Jack (48 on hand)
    (v_tenant_id, v_si_6, 'received', 25,  'Bulk networking order',       'PO-1175',                          null,       '2026-04-05 08:00:00'),
    (v_tenant_id, v_si_6, 'received', 30,  'Top-up order',                'PO-1180',                          null,       '2026-05-20 08:00:00'),
    (v_tenant_id, v_si_6, 'consumed', -7,  'Terminations — various jobs', null,                               v_user_2,   '2026-06-05 15:00:00'),

    -- si_7: Leviton Rack (2 on hand)
    (v_tenant_id, v_si_7, 'received', 4,   'Rack order',                  'PO-1171',                          null,       '2026-03-12 08:00:00'),
    (v_tenant_id, v_si_7, 'consumed', -1,  null,                          'PRJ-0018 — Northbeam Architects',  v_user_1,   '2026-04-22 10:00:00'),
    (v_tenant_id, v_si_7, 'consumed', -1,  null,                          'PRJ-0021 — Vertex Capital 14F',    v_user_2,   '2026-06-04 09:00:00'),

    -- si_8: Biamp Forte (1 on hand)
    (v_tenant_id, v_si_8, 'received', 3,   'Biamp DSP order',             'PO-1173',                          null,       '2026-03-25 08:00:00'),
    (v_tenant_id, v_si_8, 'consumed', -1,  null,                          'PRJ-0019 — Pinecrest Boardroom',   v_user_1,   '2026-04-30 11:00:00'),
    (v_tenant_id, v_si_8, 'consumed', -1,  null,                          'PRJ-0021 — Vertex Capital 14F',    v_user_3,   '2026-05-15 14:00:00'),

    -- si_9: Biamp Parlé Mic (6 on hand)
    (v_tenant_id, v_si_9, 'received', 8,   'Biamp mic order',             'PO-1174',                          null,       '2026-04-01 08:00:00'),
    (v_tenant_id, v_si_9, 'consumed', -2,  null,                          'PRJ-0019 — Pinecrest Boardroom',   v_user_1,   '2026-04-30 11:30:00'),

    -- si_10: Cat6 Bulk Box (2 on hand)
    (v_tenant_id, v_si_10, 'received', 5,  'Bulk cable order',            'PO-1176',                          null,       '2026-05-15 08:00:00'),
    (v_tenant_id, v_si_10, 'consumed', -2, null,                          'PRJ-0022 — Helio Health 3F',       v_user_2,   '2026-05-30 13:00:00'),
    (v_tenant_id, v_si_10, 'consumed', -1, 'Additional drops',            'PRJ-0023 — Halcyon Schools',       v_user_2,   '2026-06-03 15:00:00'),

    -- si_11: HDMI 2.1 Cable (24 on hand)
    (v_tenant_id, v_si_11, 'received', 28, 'Initial cable stock',         'PO-1170',                          null,       '2026-02-28 08:00:00'),
    (v_tenant_id, v_si_11, 'consumed', -3, null,                          'PRJ-0019 — Pinecrest Boardroom',   v_user_1,   '2026-04-30 11:30:00'),
    (v_tenant_id, v_si_11, 'consumed', -2, null,                          'PRJ-0021 — Vertex Capital 14F',    v_user_2,   '2026-06-04 09:00:00'),
    (v_tenant_id, v_si_11, 'returned', 1,  'Spare returned from site',    'PRJ-0019',                         v_user_3,   '2026-06-05 16:00:00'),

    -- si_12: Mounting Plates (45 on hand)
    (v_tenant_id, v_si_12, 'received', 50, 'Bulk hardware order',         'PO-1175',                          null,       '2026-04-05 08:00:00'),
    (v_tenant_id, v_si_12, 'consumed', -5, 'Various installs',            null,                               v_user_2,   '2026-06-05 15:00:00');

end $$;
