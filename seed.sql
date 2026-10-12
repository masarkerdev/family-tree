-- সরকার বংশ — শুরুর তথ্য
-- schema.sql চালানোর পরে একবার Run করুন।
-- এখানে শুধু আপনার জানানো বংশের প্রথম পুরুষ ও তাঁর তিন সন্তান আছেন।
-- বাকি সবাইকে সাইটের এডমিন পেইজ থেকে আসল তথ্য দিয়ে যোগ করবেন।
-- নাম, বানান, জন্ম-মৃত্যুর তথ্য সাইট থেকেই বদলানো যাবে।

with root as (
  insert into members (name, gender, sort_order, status, in_lineage)
  values ('মৈধর আলী', 'male', 1, 'approved', true)
  returning id
)
insert into members (name, gender, father_id, sort_order, status, in_lineage)
select v.name, 'male', root.id, v.ord, 'approved', true
from root, (values
  ('গোলাম নবী সরকার', 1),
  ('জিন্নাত আলী', 2),
  ('ফাজিল মোল্লা', 3)
) as v(name, ord);
