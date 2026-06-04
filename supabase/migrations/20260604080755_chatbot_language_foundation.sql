begin;

create table if not exists public.languages (
  code text primary key,
  name text not null,
  native_name text not null,
  script text not null default 'Latin',
  region text,
  is_active boolean not null default true,
  is_low_resource boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.language_profiles (
  language_code text primary key references public.languages(code) on delete cascade,
  system_rules text not null,
  examples jsonb not null default '[]'::jsonb,
  glossary jsonb not null default '{}'::jsonb,
  fallback_rules text,
  updated_at timestamptz not null default now()
);

create table if not exists public.chatbot_languages (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  language_code text not null references public.languages(code),
  is_primary boolean not null default false,
  is_fallback boolean not null default false,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (chatbot_id, language_code)
);

create unique index if not exists chatbot_languages_one_primary_per_bot
  on public.chatbot_languages(chatbot_id)
  where is_primary = true and is_enabled = true;

create unique index if not exists chatbot_languages_one_fallback_per_bot
  on public.chatbot_languages(chatbot_id)
  where is_fallback = true and is_enabled = true;

create index if not exists chatbot_languages_chatbot_id_idx
  on public.chatbot_languages(chatbot_id);

create index if not exists chatbot_languages_language_code_idx
  on public.chatbot_languages(language_code);

insert into public.languages (code, name, native_name, script, region, is_active, is_low_resource)
values
  ('en', 'English', 'English', 'Latin', 'Global', true, false),
  ('fr', 'French', 'Français', 'Latin', 'Global / Africa', true, false),
  ('rw', 'Kinyarwanda', 'Ikinyarwanda', 'Latin', 'Rwanda / Great Lakes', true, true),
  ('sw', 'Kiswahili', 'Kiswahili', 'Latin', 'East Africa', true, false),
  ('rn', 'Kirundi', 'Ikirundi', 'Latin', 'Burundi / Great Lakes', true, true),
  ('lg', 'Luganda', 'Luganda', 'Latin', 'Uganda', true, true),
  ('ar', 'Arabic', 'العربية', 'Arabic', 'Africa / Middle East', true, false)
on conflict (code) do update set
  name = excluded.name,
  native_name = excluded.native_name,
  script = excluded.script,
  region = excluded.region,
  is_active = excluded.is_active,
  is_low_resource = excluded.is_low_resource;

insert into public.language_profiles (language_code, system_rules, examples, glossary, fallback_rules)
values
  ('en',
   'Reply in clear, helpful English. Keep customer-support answers concise and practical.',
   '[{"user":"Hello","assistant":"Hello! How can I help you today?"}]'::jsonb,
   '{}'::jsonb,
   'If the user asks for another supported language, switch to that language.'),
  ('fr',
   'Réponds en français clair, naturel et utile. Garde un ton professionnel et humain.',
   '[{"user":"Bonjour","assistant":"Bonjour ! Comment puis-je vous aider aujourd’hui ?"}]'::jsonb,
   '{}'::jsonb,
   'Si le message est ambigu, demande une clarification courte.'),
  ('rw',
   'Subiza mu Kinyarwanda gisanzwe, cyumvikana kandi cyubaha umukiriya. Irinde guhindura amagambo uko yakabaye avuye mu Cyongereza. Koresha Icyongereza gusa ku mazina y’ibicuruzwa, brands, cyangwa amagambo ya tekiniki adafite igisobanuro gisanzwe.',
   '[{"user":"Muraho","assistant":"Muraho! Nagufasha iki uyu munsi?"},{"user":"Ndashaka kumenya ibiciro","assistant":"Birumvikana. Ni ikihe gicuruzwa cyangwa serivisi wifuza kumenyaho igiciro?"}]'::jsonb,
   '{"appointment":"gahunda yo guhura","payment":"kwishyura","support":"ubufasha"}'::jsonb,
   'Niba utizeye neza icyo umukiriya ashaka, baza ikibazo kimwe kigufi mu Kinyarwanda.'),
  ('sw',
   'Jibu kwa Kiswahili fasaha, rahisi na cha kirafiki kwa huduma kwa wateja. Epuka kuchanganya Kiingereza bila sababu isipokuwa kwa majina ya bidhaa, brands au istilahi za kiufundi.',
   '[{"user":"Habari","assistant":"Habari! Naweza kukusaidiaje leo?"},{"user":"Nataka kujua bei","assistant":"Sawa. Ungependa kujua bei ya bidhaa au huduma gani?"}]'::jsonb,
   '{"appointment":"miadi","payment":"malipo","support":"msaada"}'::jsonb,
   'Kama ujumbe haueleweki, uliza swali moja fupi la ufafanuzi kwa Kiswahili.'),
  ('rn',
   'Wishure mu Kirundi gisanzwe, cubaha kandi cumvikana ku mukiriya. Ntufate ko Ikirundi ari co kimwe n’Ikinyarwanda. Irinde kuvanga Icongereza atari ngombwa.',
   '[{"user":"Bite","assistant":"Bite! Nogufasha iki uno munsi?"},{"user":"Ndashaka kumenya ibiciro","assistant":"Ego. Ni ikihe gicuruzwa canke serivisi wipfuza kumenyako igiciro?"}]'::jsonb,
   '{"appointment":"isango","payment":"ukwishura","support":"ubufasha"}'::jsonb,
   'Nimba utazi neza ico umukiriya ashaka, baza ikibazo kimwe kigufi mu Kirundi.'),
  ('lg',
   'Respond in simple, natural Luganda for customer support. Keep sentences short. Avoid unnecessary English mixing except for product names, brands, or technical terms.',
   '[{"user":"Gyebale ko","assistant":"Gyebale ko! Nnyinza kukuyamba ntya leero?"},{"user":"Njagala okumanya ebbeeyi","assistant":"Kale. Oyagala kumanya bbeeyi ya kintu ki oba empeereza ki?"}]'::jsonb,
   '{"appointment":"okusisinkana","payment":"okusasula","support":"obuyambi"}'::jsonb,
   'If unsure, ask one short clarification question in Luganda. If Luganda quality may be poor, keep wording simple.'),
  ('ar',
   'أجب بالعربية الفصحى الواضحة والمهنية. حافظ على أسلوب مختصر ومفيد لخدمة العملاء. لا تنتقل إلى الإنجليزية إلا عند الحاجة لأسماء المنتجات أو المصطلحات التقنية.',
   '[{"user":"مرحبا","assistant":"مرحباً! كيف يمكنني مساعدتك اليوم؟"},{"user":"أريد معرفة الأسعار","assistant":"بكل سرور. ما المنتج أو الخدمة التي تريد معرفة سعرها؟"}]'::jsonb,
   '{"appointment":"موعد","payment":"دفع","support":"دعم"}'::jsonb,
   'إذا كانت رسالة المستخدم غير واضحة، اطرح سؤال توضيح قصيراً بالعربية.')
on conflict (language_code) do update set
  system_rules = excluded.system_rules,
  examples = excluded.examples,
  glossary = excluded.glossary,
  fallback_rules = excluded.fallback_rules,
  updated_at = now();

-- Backfill current single-language chatbots into the new mapping table.
insert into public.chatbot_languages (chatbot_id, language_code, is_primary, is_fallback, is_enabled)
select
  c.id,
  case lower(coalesce(c.default_language, 'English'))
    when 'kinyarwanda' then 'rw'
    when 'ikinyarwanda' then 'rw'
    when 'swahili' then 'sw'
    when 'kiswahili' then 'sw'
    when 'kirundi' then 'rn'
    when 'ikirundi' then 'rn'
    when 'luganda' then 'lg'
    when 'arabic' then 'ar'
    when 'العربية' then 'ar'
    when 'french' then 'fr'
    when 'français' then 'fr'
    else 'en'
  end as language_code,
  true,
  false,
  true
from public.chatbots c
where c.deleted_at is null
on conflict (chatbot_id, language_code) do update set
  is_primary = excluded.is_primary,
  is_enabled = true;

-- Add English fallback for every active chatbot unless it already has one.
insert into public.chatbot_languages (chatbot_id, language_code, is_primary, is_fallback, is_enabled)
select c.id, 'en', false, true, true
from public.chatbots c
where c.deleted_at is null
  and not exists (
    select 1
    from public.chatbot_languages cl
    where cl.chatbot_id = c.id
      and cl.is_fallback = true
      and cl.is_enabled = true
  )
on conflict (chatbot_id, language_code) do update set
  is_fallback = excluded.is_fallback,
  is_enabled = true;

alter table public.languages enable row level security;
alter table public.language_profiles enable row level security;
alter table public.chatbot_languages enable row level security;

-- Explicit Data API grants; RLS policies below still control visible rows.
grant select on public.languages to anon, authenticated;
grant select on public.language_profiles to anon, authenticated;
grant select, insert, update, delete on public.chatbot_languages to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'languages' and policyname = 'languages_select_active'
  ) then
    create policy languages_select_active
      on public.languages
      for select
      to anon, authenticated
      using (is_active = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'language_profiles' and policyname = 'language_profiles_select_active_languages'
  ) then
    create policy language_profiles_select_active_languages
      on public.language_profiles
      for select
      to anon, authenticated
      using (
        exists (
          select 1 from public.languages l
          where l.code = language_profiles.language_code
            and l.is_active = true
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chatbot_languages' and policyname = 'chatbot_languages_select_own'
  ) then
    create policy chatbot_languages_select_own
      on public.chatbot_languages
      for select
      to authenticated
      using (
        exists (
          select 1 from public.chatbots c
          where c.id = chatbot_languages.chatbot_id
            and c.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chatbot_languages' and policyname = 'chatbot_languages_insert_own'
  ) then
    create policy chatbot_languages_insert_own
      on public.chatbot_languages
      for insert
      to authenticated
      with check (
        exists (
          select 1 from public.chatbots c
          where c.id = chatbot_languages.chatbot_id
            and c.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chatbot_languages' and policyname = 'chatbot_languages_update_own'
  ) then
    create policy chatbot_languages_update_own
      on public.chatbot_languages
      for update
      to authenticated
      using (
        exists (
          select 1 from public.chatbots c
          where c.id = chatbot_languages.chatbot_id
            and c.user_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1 from public.chatbots c
          where c.id = chatbot_languages.chatbot_id
            and c.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chatbot_languages' and policyname = 'chatbot_languages_delete_own'
  ) then
    create policy chatbot_languages_delete_own
      on public.chatbot_languages
      for delete
      to authenticated
      using (
        exists (
          select 1 from public.chatbots c
          where c.id = chatbot_languages.chatbot_id
            and c.user_id = (select auth.uid())
        )
      );
  end if;
end $$;

commit;
