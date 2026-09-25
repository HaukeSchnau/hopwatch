#!/usr/bin/env bash
# Publishes the last `scripts/m1.sh device` build for over-the-air installation on
# Hauke's iPhone: copies the .ipa from the builder into the Tailnet file share and writes an
# itms-services manifest plus an install page next to it.
#
#   scripts/publish-ipa.sh     → prints the install page URL
#
# A preview.jpg already in the share directory is shown on the page.
set -euo pipefail

cd "$(dirname "$0")/.."
SHARE_DIR=/srv/agent-share/stint-five
BASE_URL="${AGENT_SHARE_URL:?}/stint-five"

mkdir -p "$SHARE_DIR"
scp -q m1:Developer/stint-five/ios/build/export/StintFive.ipa "$SHARE_DIR/StintFive.ipa"
cp assets/images/icon.png "$SHARE_DIR/icon-512.png"

python3 - "$SHARE_DIR" "$BASE_URL" <<'EOF'
import html, os, plistlib, sys, time, zipfile

share, base = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(f"{share}/StintFive.ipa") as ipa:
    name = next(n for n in ipa.namelist() if n.count("/") == 2 and n.endswith(".app/Info.plist"))
    info = plistlib.loads(ipa.read(name))

bundle_id = info["CFBundleIdentifier"]
version = info["CFBundleShortVersionString"]
build = info["CFBundleVersion"]
title = info.get("CFBundleDisplayName") or info["CFBundleName"]

manifest = {
    "items": [{
        "assets": [
            {"kind": "software-package", "url": f"{base}/StintFive.ipa"},
            {"kind": "display-image", "url": f"{base}/icon-512.png"},
            {"kind": "full-size-image", "url": f"{base}/icon-512.png"},
        ],
        "metadata": {"bundle-identifier": bundle_id, "bundle-version": version, "kind": "software", "title": title},
    }]
}
with open(f"{share}/manifest.plist", "wb") as f:
    plistlib.dump(manifest, f)

# Optional overview of the directions, e.g. a contact sheet of the Lab screenshots.
preview = ""
if os.path.exists(f"{share}/preview.jpg"):
    preview = '<a href="preview.jpg"><img class="preview" src="preview.jpg" alt="Glass, Deck, Almanac, Orbit and Jelly"></a>'

install = f"itms-services://?action=download-manifest&url={base}/manifest.plist"
built = time.strftime("%d %b %Y, %H:%M UTC", time.gmtime())
page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Install {html.escape(title)}</title>
<style>
  :root {{ color-scheme: dark; }}
  body {{ margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0B0B0F;
         color: #F5F2EC; font: 17px/1.45 -apple-system, system-ui, sans-serif; }}
  main {{ max-width: 340px; padding: 32px 24px; text-align: center; }}
  img {{ width: 128px; height: 128px; border-radius: 29px; box-shadow: 0 18px 50px #4C8DFF33; }}
  h1 {{ font: 700 34px/1.1 ui-serif, Georgia, serif; margin: 22px 0 6px; letter-spacing: -0.5px; }}
  .meta {{ color: #8A8794; font-size: 14px; }}
  a.install {{ display: block; margin: 28px 0 18px; padding: 16px; border-radius: 16px; background: #F5F2EC;
               color: #0B0B0F; font-weight: 700; text-decoration: none; }}
  p {{ color: #A9A6B3; font-size: 15px; margin: 10px 0; }}
  img.preview {{ width: 100%; height: auto; border-radius: 12px; box-shadow: none; margin-top: 18px; }}
</style></head>
<body><main>
  <img src="icon-512.png" alt="">
  <h1>{html.escape(title)}</h1>
  <div class="meta">{html.escape(version)} ({html.escape(build)}) · built {built}</div>
  <a class="install" href="{html.escape(install)}">Install on this iPhone</a>
  <p>Open this page in Safari on the iPhone. After installing, iOS asks for Developer Mode once:
     Settings › Privacy &amp; Security › Developer Mode, then restart.</p>
  <p>Five design directions, one app. Pick one in the Lab and switch any time from its settings.</p>
  {preview}
</main></body></html>
"""
with open(f"{share}/index.html", "w") as f:
    f.write(page)
print(f"{bundle_id} {version} ({build})")
EOF

chmod -R g+rX "$SHARE_DIR"
echo "$BASE_URL/"
