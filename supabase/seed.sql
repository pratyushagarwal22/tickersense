-- Optional seed data for local demos (safe to run multiple times)

insert into public.companies (ticker, cik, name, exchange)
values ('AAPL', '0000320193', 'Apple Inc.', 'NASDAQ')
on conflict (ticker) do nothing;

insert into public.companies (ticker, cik, name, exchange)
values ('MSFT', '0000789019', 'Microsoft Corporation', 'NASDAQ')
on conflict (ticker) do nothing;
