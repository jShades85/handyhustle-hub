-- Seed 6 service tickets for the default test tenant.
-- Uses name-based lookups so it's safe across any tenant UUID.

do $$
declare
  v_tenant  uuid := (select id from tenants order by created_at limit 1);

  -- Companies (from crm_seed)
  v_vertex  uuid := (select id from companies where name = 'Vertex Capital Partners'    and tenant_id = v_tenant limit 1);
  v_helio   uuid := (select id from companies where name = 'Helio Health Systems'       and tenant_id = v_tenant limit 1);
  v_arden   uuid := (select id from companies where name = 'Arden & Loom Studios'       and tenant_id = v_tenant limit 1);
  v_north   uuid := (select id from companies where name = 'Northbeam Architects'       and tenant_id = v_tenant limit 1);
  v_pine    uuid := (select id from companies where name = 'Pinecrest Hospitality Group' and tenant_id = v_tenant limit 1);

  -- Team members (from user_seed)
  v_mike    uuid := (select id from user_profiles where email = 'mike.okafor@example.com'  limit 1);
  v_jordan  uuid := (select id from user_profiles where email = 'jordan.vale@example.com'  limit 1);
  v_riley   uuid := (select id from user_profiles where email = 'riley.torres@example.com' limit 1);

begin
  insert into service_tickets
    (id, tenant_id, code, company_id, customer_name, contact_name, phone, site_address,
     issue, category, priority, status, assigned_to, on_service_plan, due_date, notes)
  values

    -- 1. Urgent — in progress
    (gen_random_uuid(), v_tenant, 'ST-2026-0001', v_vertex,
     'Vertex Capital Partners', 'Iris Wang', '(312) 555-9090',
     '200 W Madison St, Chicago, IL 60606',
     'IP camera offline — Floor 14 northwest corner',
     'Surveillance', 'urgent', 'in-progress', v_mike, true, '2026-06-10',
     'PoE switch port confirmed active. Suspect camera hardware failure. Replacement unit pulled from stock.'),

    -- 2. Urgent — assigned
    (gen_random_uuid(), v_tenant, 'ST-2026-0002', v_arden,
     'Arden & Loom Studios', 'Lena Romero', '(323) 555-7741',
     '5200 Lankershim Blvd, Los Angeles, CA 91601',
     'DSP not recovering after power outage — all audio zones silent',
     'AV / Audio', 'urgent', 'assigned', v_jordan, true, '2026-06-10',
     'DSP unresponsive after yesterday power outage. Factory reset attempted with no result.'),

    -- 3. High — open, unassigned
    (gen_random_uuid(), v_tenant, 'ST-2026-0003', v_helio,
     'Helio Health Systems', 'Priya Anand', '(303) 555-2230',
     '1719 E 19th Ave, Denver, CO 80218',
     'Conference room display showing no signal on HDMI 2',
     'AV / Audio', 'high', 'open', null, false, '2026-06-13',
     null),

    -- 4. High — assigned, service plan
    (gen_random_uuid(), v_tenant, 'ST-2026-0004', v_north,
     'Northbeam Architects', 'Audrey Chen', '(718) 555-0142',
     '44 Berry St, Brooklyn, NY 11211',
     'Access control reader unresponsive at main entrance',
     'Access Control', 'high', 'assigned', v_riley, true, '2026-06-11',
     'Reader was working yesterday. Badge scans not registering.'),

    -- 5. Medium — pending parts
    (gen_random_uuid(), v_tenant, 'ST-2026-0005', v_pine,
     'Pinecrest Hospitality Group', 'Marcus Bell', '(512) 555-0911',
     '905 Congress Ave, Austin, TX 78701',
     'Lobby background music stopped playing — zones 1–3 silent',
     'AV / Audio', 'medium', 'pending-parts', v_jordan, true, '2026-06-15',
     'Amplifier board needs replacement. Part on order, ETA June 14.'),

    -- 6. Medium — resolved
    (gen_random_uuid(), v_tenant, 'ST-2026-0006', v_vertex,
     'Vertex Capital Partners', 'Noor Saleh', '(312) 555-9111',
     '200 W Madison St, Chicago, IL 60606',
     'Wireless network intermittent in 3rd floor conference rooms',
     'Networking', 'medium', 'resolved', v_mike, false, '2026-06-08',
     'AP firmware updated and channel conflict resolved. Monitoring for 48 hrs.');

end $$;
