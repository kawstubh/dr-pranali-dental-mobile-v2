from pathlib import Path
import re, sys
root=Path(__file__).resolve().parents[1]
catalog=(root/"shared"/"dentalServices.ts").read_text(encoding="utf-8")
entries=re.findall(r"\{\s*id:\s*'([^']+)'.*?image:\s*'([^']+)'\s*\}",catalog)
errors=[]
if len(entries)!=20: errors.append(f"Expected 20 service records, found {len(entries)}")
ids=[x[0] for x in entries]; images=[x[1] for x in entries]
if len(set(ids))!=len(ids): errors.append("Service IDs are not unique")
if len(set(images))!=len(images): errors.append("Service image keys are not unique")
app=(root/"App.js").read_text(encoding="utf-8")
for key in images:
    if not (root/"assets"/"services"/f"{key}.png").is_file(): errors.append(f"Missing PNG: {key}.png")
    if not re.search(r"['\"]"+re.escape(key)+r"['\"]\s*:\s*require\(['\"]\./assets/services/"+re.escape(key)+r"\.png['\"]\)",app):
        errors.append(f"Patient static image map missing key: {key}")
    if app.count("style={styles.servicePhoto}") < 1 or app.count("style={styles.serviceDetailPhoto}") < 1:
        errors.append("Service catalogue cards/details are not rendering image components")
if errors:
    print("\n".join("FAIL: "+e for e in errors)); sys.exit(1)
print(f"PASS: {len(entries)} unique service IDs map to {len(set(images))} dedicated local PNG assets.")
