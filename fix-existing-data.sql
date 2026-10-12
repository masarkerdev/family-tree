-- আগে থেকে যোগ করা তথ্য ঠিক করা (একবার Run করুন)

-- ১. যাঁদের কারো "মা" হিসেবে বাছা হয়েছে, তাঁদের লিঙ্গ নারী করা
update members set gender = 'female'
where id in (select mother_id from members where mother_id is not null) and gender <> 'female';

-- ২. যাঁদের কারো "বাবা" হিসেবে বাছা হয়েছে, তাঁদের লিঙ্গ পুরুষ করা
update members set gender = 'male'
where id in (select father_id from members where father_id is not null) and gender <> 'male';

-- ৩. একই সন্তানের বাবা ও মাকে স্বামী-স্ত্রী হিসেবে জুড়ে দেওয়া
insert into marriages (husband_id, wife_id)
select distinct father_id, mother_id from members
where father_id is not null and mother_id is not null
on conflict (husband_id, wife_id) do nothing;

-- ফলাফল দেখুন
select h.name as husband, w.name as wife
from marriages r join members h on h.id = r.husband_id join members w on w.id = r.wife_id;
