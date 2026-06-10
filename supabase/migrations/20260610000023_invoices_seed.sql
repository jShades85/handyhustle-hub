-- Seed invoices + line items + payments for the default test tenant.
-- company_id / contact_id left null — invoice companies don't match seeded CRM companies.
-- linked_project_id wired for "Surgical Center A/V Overhaul" which exists in operations seed.

do $$
declare
  v_tenant  uuid := (select id from tenants order by created_at limit 1);

  -- linked project (matches operations seed by name ilike)
  v_surgical uuid := (select id from projects
                       where name ilike '%Surgical Center%'
                         and tenant_id = v_tenant
                       limit 1);

  -- invoice IDs (needed for line items + payments)
  v_inv1  uuid := gen_random_uuid();
  v_inv2  uuid := gen_random_uuid();
  v_inv3  uuid := gen_random_uuid();
  v_inv4  uuid := gen_random_uuid();
  v_inv5  uuid := gen_random_uuid();
  v_inv6  uuid := gen_random_uuid();
  v_inv7  uuid := gen_random_uuid();
  v_inv8  uuid := gen_random_uuid();
  v_inv9  uuid := gen_random_uuid();
  v_inv10 uuid := gen_random_uuid();

begin

  -- ── Invoices ────────────────────────────────────────────────────────────────

  insert into invoices
    (id, tenant_id, invoice_number, status,
     company_name, contact_name,
     linked_project_id,
     issued_date, due_date, payment_terms,
     subtotal, tax_rate, tax_amount, total,
     amount_paid, balance_due, notes)
  values

    (v_inv1, v_tenant, 'INV-04812', 'sent',
     'Quay Residential', 'Theodore Fox', null,
     '2026-06-01', '2026-07-01', 'Net 30',
     10205, 0.07, 714.35, 10919.35,
     0, 10919.35,
     'Phase 2 of whole-home audio/lighting integration. Client approved scope on May 27.'),

    (v_inv2, v_tenant, 'INV-04811', 'partial',
     'Vertex Capital Partners', 'Iris Wang', null,
     '2026-05-28', '2026-06-27', 'Net 30',
     31580, 0.0625, 1973.75, 33553.75,
     15000, 18553.75,
     '50% deposit received. Balance due upon punch-list sign-off.'),

    (v_inv3, v_tenant, 'INV-04809', 'paid',
     'Northbeam Architects', 'Audrey Chen', null,
     '2026-05-22', '2026-06-21', 'Net 30',
     12886, 0.08, 1030.88, 13916.88,
     13916.88, 0,
     ''),

    (v_inv4, v_tenant, 'INV-04806', 'overdue',
     'Helio Health Systems', 'Priya Anand', v_surgical,
     '2026-05-18', '2026-06-17', 'Net 30',
     51700, 0.029, 1499.3, 53199.3,
     0, 53199.3,
     'AP contact: finance@heliohealth.org — PO# HHS-2026-0441 required on remittance.'),

    (v_inv5, v_tenant, 'INV-04802', 'paid',
     'Halcyon Public Schools', 'Damon Reyes', null,
     '2026-05-12', '2026-06-11', 'Net 30',
     21810, 0, 0, 21810,
     21810, 0,
     'Tax exempt — Ed. institution. Exemption cert on file.'),

    (v_inv6, v_tenant, 'INV-04799', 'overdue',
     'Cinder & Oak Hospitality', 'Hugo Albright', null,
     '2026-05-04', '2026-06-03', 'Net 30',
     8030, 0.0925, 742.78, 8772.78,
     0, 8772.78,
     'Second reminder sent Jun 10. GM out of office, follow up with owner directly.'),

    (v_inv7, v_tenant, 'INV-04795', 'paid',
     'Arden & Loom Studios', 'Lena Romero', null,
     '2026-04-28', '2026-05-28', 'Net 30',
     7034, 0.1025, 720.99, 7754.99,
     7754.99, 0,
     ''),

    (v_inv8, v_tenant, 'INV-04790', 'paid',
     'Pinecrest Hospitality Group', 'Marcus Bell', null,
     '2026-04-20', '2026-05-20', 'Net 30',
     102000, 0.0825, 8415, 110415,
     110415, 0,
     'Split into two wire payments per client''s AP policy.'),

    (v_inv9, v_tenant, 'INV-04815', 'draft',
     'Vertex Capital Partners', 'Noor Saleh', null,
     '2026-06-06', '2026-07-06', 'Net 30',
     33362, 0.0625, 2085.13, 35447.13,
     0, 35447.13,
     'Draft — pending final scope sign-off from Noor.'),

    (v_inv10, v_tenant, 'INV-04813', 'sent',
     'Helio Health Systems', 'Priya Anand', v_surgical,
     '2026-06-03', '2026-07-03', 'Net 30',
     40880, 0.029, 1185.52, 42065.52,
     0, 42065.52,
     'PO# HHS-2026-0448 required on remittance.');


  -- ── Line Items ──────────────────────────────────────────────────────────────

  insert into invoice_line_items (invoice_id, description, qty, unit_price, total, sort_order)
  values
    -- INV-04812 (Quay Residential)
    (v_inv1, 'Lutron Caseta Smart Dimmer (8-pack)',  4,  320,   1280,  0),
    (v_inv1, 'Sonos Era 300 (pair)',                 2,  899,   1798,  1),
    (v_inv1, 'Apple TV 4K (3rd gen)',                3,  129,    387,  2),
    (v_inv1, 'Control4 EA-1 Controller',             1, 1200,   1200,  3),
    (v_inv1, 'Programming & Integration Labor',     16,  145,   2320,  4),
    (v_inv1, 'Low-Voltage Installation Labor',      28,  115,   3220,  5),

    -- INV-04811 (Vertex Capital Partners)
    (v_inv2, 'Samsung 98" QN900D Neo QLED',          1, 14000, 14000,  0),
    (v_inv2, 'Crestron DM-NVX-D80 Network AV Decoder', 2, 2100, 4200, 1),
    (v_inv2, 'Shure MXA920 Ceiling Array Mic',       1,  2800,  2800,  2),
    (v_inv2, 'Biamp TesiraFORTE DSP',                1,  3400,  3400,  3),
    (v_inv2, 'AV Systems Integration Labor',        40,   145,  5800,  4),
    (v_inv2, 'Rack Build & Wiring Labor',           12,   115,  1380,  5),

    -- INV-04809 (Northbeam Architects)
    (v_inv3, 'Conference Room Display — Samsung 75" QM75B', 2, 3200, 6400, 0),
    (v_inv3, 'Logitech Rally Bar Mini',              2,  1299,  2598,  1),
    (v_inv3, 'HDMI 2.1 Active Cable 15ft',           6,    48,   288,  2),
    (v_inv3, 'Ceiling-Recessed Speaker (pair)',      2,   420,   840,  3),
    (v_inv3, 'Installation & Configuration Labor',  24,   115,  2760,  4),

    -- INV-04806 (Helio Health Systems)
    (v_inv4, 'LG 55" Medical-Grade Display (DICOM)', 4,  4200, 16800,  0),
    (v_inv4, 'Extron XTP CrossPoint 1600 Matrix',    1, 18500, 18500,  1),
    (v_inv4, 'Biamp Devio SCX-20 (rooms A & B)',     2,  2200,  4400,  2),
    (v_inv4, 'Rack Equipment & Cable Management',    1,  1800,  1800,  3),
    (v_inv4, 'Engineering & Project Management',    20,   165,  3300,  4),
    (v_inv4, 'Installation Labor',                  60,   115,  6900,  5),

    -- INV-04802 (Halcyon Public Schools)
    (v_inv5, 'Axis P3245-V Fixed Dome Camera',      12,   380,  4560,  0),
    (v_inv5, 'Verkada Door Access Controller (6-door)', 3, 1400, 4200, 1),
    (v_inv5, 'Verkada Access Badge Reader',         18,   220,  3960,  2),
    (v_inv5, 'Cat6A Cable Pull & Termination (per drop)', 42, 85, 3570, 3),
    (v_inv5, 'Security System Labor & Commissioning', 48, 115,  5520,  4),

    -- INV-04799 (Cinder & Oak Hospitality)
    (v_inv6, 'Sonos Amp (bar & patio zones)',        4,   699,  2796,  0),
    (v_inv6, 'Sonos Era 100 (indoor zone speaker)',  6,   249,  1494,  1),
    (v_inv6, 'TOA CS-304 Outdoor Ceiling Speaker (pair)', 3, 480, 1440, 2),
    (v_inv6, 'Audio Zone Wiring & Installation',    20,   115,  2300,  3),

    -- INV-04795 (Arden & Loom Studios)
    (v_inv7, 'Shure SM7dB Active Dynamic Mic',       4,   499,  1996,  0),
    (v_inv7, 'Focusrite Scarlett 18i20 (3rd gen)',   2,   499,   998,  1),
    (v_inv7, 'Yamaha DXS15mkII Subwoofer',           2,  1100,  2200,  2),
    (v_inv7, 'Studio Wiring & Patching Labor',      16,   115,  1840,  3),

    -- INV-04790 (Pinecrest Hospitality Group)
    (v_inv8, 'Samsung IFR Series LED Cabinet (2x2 panel)', 21, 3800, 79800, 0),
    (v_inv8, 'Novastar MCTRL4K LED Controller',      1,  6200,  6200,  1),
    (v_inv8, 'Custom Structural Mounting Frame',     1,  4500,  4500,  2),
    (v_inv8, 'Signal & Power Distribution',          1,  2800,  2800,  3),
    (v_inv8, 'LED Wall Installation Labor',         60,   145,  8700,  4),

    -- INV-04815 (Vertex Capital Partners — draft)
    (v_inv9, 'Cisco Catalyst 9300-48P Switch',       2,  5800, 11600,  0),
    (v_inv9, 'Cisco Catalyst 9200L-24P Switch',      4,  2200,  8800,  1),
    (v_inv9, 'Ubiquiti UniFi AP U6 Pro',            18,   179,  3222,  2),
    (v_inv9, 'Middle Atlantic WRK-44-27 Equipment Rack', 2, 1100, 2200, 3),
    (v_inv9, 'Network Installation & Configuration', 52,  145,  7540,  4),

    -- INV-04813 (Helio Health Systems)
    (v_inv10, 'Crestron DM-MD6X6-CPU3 6x6 Matrix',  1,  4800,  4800,  0),
    (v_inv10, 'Crestron TSW-770 7" Wall Touchpanel', 4,  1600,  6400,  1),
    (v_inv10, 'Overhead Projector — Epson EB-PU2220B', 2, 9800, 19600, 2),
    (v_inv10, 'Draper Motorized Projection Screen 133"', 2, 2400, 4800, 3),
    (v_inv10, 'Control System Programming',         32,   165,  5280,  4);


  -- ── Payments ────────────────────────────────────────────────────────────────

  insert into invoice_payments (tenant_id, invoice_id, date, amount, method, reference)
  values
    -- INV-04811 deposit
    (v_tenant, v_inv2, '2026-06-05', 15000,     'wire',        'VCP-WIRE-0605'),
    -- INV-04809 paid in full
    (v_tenant, v_inv3, '2026-06-18', 13916.88,  'ach',         'NBA-ACH-0618'),
    -- INV-04802 paid in full
    (v_tenant, v_inv5, '2026-06-09', 21810,     'check',       'HPS-CHK-44219'),
    -- INV-04795 paid in full
    (v_tenant, v_inv7, '2026-05-22', 7754.99,   'credit_card', 'CC-STRIPE-7F2A9'),
    -- INV-04790 two-wire split
    (v_tenant, v_inv8, '2026-04-28', 55207.5,   'wire',        'PHG-WIRE-0428'),
    (v_tenant, v_inv8, '2026-05-16', 55207.5,   'wire',        'PHG-WIRE-0516');

end $$;
