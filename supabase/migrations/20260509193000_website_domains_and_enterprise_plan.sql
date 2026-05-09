begin;

alter table public.plans
  add column if not exists max_website_domains integer not null default 1;

alter table public.chatbots
  add column if not exists allow_localhost_testing boolean not null default true;

update public.plans
set max_website_domains = case internal_slug
  when 'starter' then 1
  when 'silver' then 5
  when 'gold' then 10
  else coalesce(max_website_domains, 1)
end
where internal_slug in ('starter', 'silver', 'gold');

update public.plans
set
  name = 'Enterprise Ready',
  display_name = 'Enterprise Ready',
  description = 'For large deployments that need more chatbots, more replies, more training capacity, and custom-ready starter templates.',
  price_usd = 350.88,
  monthly_price_usd = 350.88,
  yearly_price_usd = null,
  polar_product_id = '3e4e4e1a-e1da-4f3f-be5a-298e409c7c1e',
  max_chatbots = 50,
  max_replies_per_month = 500000,
  max_training_units = 1000,
  max_website_domains = 100,
  max_embedding_mb = greatest(coalesce(max_embedding_mb, 0), 100),
  api_access = true,
  instagram_access = true,
  remove_branding = true,
  priority_support = true,
  advanced_training = true,
  has_script_embed = true,
  max_instagram_accounts = greatest(coalesce(max_instagram_accounts, 0), 10),
  internal_slug = 'enterprise-ready'
where internal_slug = 'enterprise-ready'
   or polar_product_id = '3e4e4e1a-e1da-4f3f-be5a-298e409c7c1e';

insert into public.plans (
  name,
  display_name,
  description,
  price_usd,
  monthly_price_usd,
  yearly_price_usd,
  polar_product_id,
  max_chatbots,
  max_replies_per_month,
  max_training_units,
  max_website_domains,
  max_embedding_mb,
  api_access,
  instagram_access,
  remove_branding,
  priority_support,
  advanced_training,
  has_script_embed,
  max_instagram_accounts,
  internal_slug
)
select
  'Enterprise Ready',
  'Enterprise Ready',
  'For large deployments that need more chatbots, more replies, more training capacity, and custom-ready starter templates.',
  350.88,
  350.88,
  null,
  '3e4e4e1a-e1da-4f3f-be5a-298e409c7c1e',
  50,
  500000,
  1000,
  100,
  100,
  true,
  true,
  true,
  true,
  true,
  true,
  10,
  'enterprise-ready'
where not exists (
  select 1
  from public.plans
  where internal_slug = 'enterprise-ready'
     or polar_product_id = '3e4e4e1a-e1da-4f3f-be5a-298e409c7c1e'
);

commit;
