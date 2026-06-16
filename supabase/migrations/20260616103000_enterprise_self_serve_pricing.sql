begin;

update public.plans
set
  price_usd = 350,
  monthly_price_usd = 350,
  polar_product_id = '3e478611-c444-46e5-9827-7450a1c8d046',
  description = 'For larger rollouts that need every channel, more capacity, and Enterprise AI business tools through a self-serve subscription.'
where internal_slug = 'enterprise-ready'
   or polar_product_id in (
    '3e4e4e1a-e1da-4f3f-be5a-298e409c7c1e',
    '3e478611-c444-46e5-9827-7450a1c8d046'
  );

commit;
