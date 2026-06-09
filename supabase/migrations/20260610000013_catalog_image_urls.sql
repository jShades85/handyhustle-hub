-- Seed image URLs for demo catalog items

update public.catalog_items
set image_url = 'https://www.axis.com/sites/axis/files/styles/square_500x500_/public/2019-11/1600_p3245_v_ceiling_front_1902.png.webp?itok=V9h8X3x-'
where name = 'Axis P3245-V Fixed Dome Camera';
