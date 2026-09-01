import json, os

target_dir = r"c:\mern stack\mernpro\Sklp_ecommers\frontend\src\i18n\locales"
en = json.load(open(os.path.join(target_dir, "en.json"), "r", encoding="utf-8"))
te = json.load(open(os.path.join(target_dir, "te.json"), "r", encoding="utf-8"))
hi = json.load(open(os.path.join(target_dir, "hi.json"), "r", encoding="utf-8"))

def get_keys(d, prefix=""):
    keys = []
    for k, v in d.items():
        curr = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            keys.extend(get_keys(v, curr))
        else:
            keys.append(curr)
    return set(keys)

en_k = get_keys(en)
te_k = get_keys(te)
hi_k = get_keys(hi)

print(f"Total Translation Keys: {len(en_k)}")
diff_te = en_k.symmetric_difference(te_k)
diff_hi = en_k.symmetric_difference(hi_k)

if diff_te:
    print(f"Mismatch between EN and TE: {diff_te}")
else:
    print("✅ EN and TE match perfectly!")

if diff_hi:
    print(f"Mismatch between EN and HI: {diff_hi}")
else:
    print("✅ EN and HI match perfectly!")
