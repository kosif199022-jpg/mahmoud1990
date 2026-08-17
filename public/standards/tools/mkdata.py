import json, os
os.makedirs("out/data", exist_ok=True)
META={
 "b1":dict(title="المعايير الدولية للتقرير المالي",
           sub="النسخة العربية المعتمدة — الهيئة السعودية للمحاسبين القانونيين",
           year="2018"),
 "b3":dict(title="المعايير الدولية للتقرير المالي — النسخة الكاملة المحدَّثة",
           sub="ترجمة الهيئة السعودية للمراجعين والمحاسبين", year="2025"),
 "b2":dict(title="ACCA DipIFR — Exam Practice Kit",
           sub="عدّة التدريب على امتحان الدبلوم الدولي في التقرير المالي · BPP",
           year="2025", dir="ltr"),
}
lib=[]
for k,m in META.items():
    ch=json.load(open(f"work/{k}_ch.json",encoding="utf-8"))
    os.makedirs(f"out/data/{k}",exist_ok=True)
    idx=[]; sizes=[]
    for c in ch:
        p=f"out/data/{k}/{c['no']}.json"
        json.dump({"no":c["no"],"title":c["title"],"name":c["name"],
                   "pages":c["pages"],"body":c["body"]},
                  open(p,"w",encoding="utf-8"),ensure_ascii=False)
        sizes.append(os.path.getsize(p))
        idx.append({"no":c["no"],"title":c["title"],"name":c["name"],
                    "pages":c["pages"],"words":c["words"],"blocks":len(c["body"])})
    json.dump({**m,"id":k,"chapters":idx},
              open(f"out/data/{k}.json","w",encoding="utf-8"),ensure_ascii=False)
    lib.append({"id":k,"title":m["title"],"sub":m["sub"],"year":m["year"],"dir":m.get("dir","rtl"),
                "chapters":len(ch),"words":sum(c["words"] for c in ch)})
    print(f"{k}: {len(ch)} فصلًا | مجموع {sum(sizes)/1048576:.1f} م.ب | أكبر فصل {max(sizes)/1024:.0f} ك.ب | وسيط {sorted(sizes)[len(sizes)//2]/1024:.0f} ك.ب")
json.dump(lib,open("out/data/library.json","w",encoding="utf-8"),ensure_ascii=False)
