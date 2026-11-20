import json
import urllib.request
import io
import os
from PIL import Image

def analyze():
    with open('scripts/nike_rail_images_raw.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Total garments in raw JSON: {len(data)}")

    garments = {}
    for item in data:
        name = item.get("name", "Unknown")
        if name not in garments:
            garments[name] = {
                "name": name,
                "price": item.get("price"),
                "views": {
                    "side": {"urls": set(), "attrs": set()},
                    "front": {"urls": set(), "attrs": set()},
                    "back": {"urls": set(), "attrs": set()}
                }
            }
        for view_name in ["side", "front", "back"]:
            view_data = item.get(view_name, {})
            src = view_data.get("src")
            if src:
                clean_url = src.split("?")[0]
                if clean_url.startswith("//"):
                    clean_url = "https:" + clean_url
                garments[name]["views"][view_name]["urls"].add(clean_url)
            w = view_data.get("attrWidth")
            h = view_data.get("attrHeight")
            if w and h:
                garments[name]["views"][view_name]["attrs"].add(f"{w}x{h}")

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }

    results = []

    for name, gdata in sorted(garments.items()):
        print("\n" + "="*50)
        print(f"Garment: {name} (Price: {gdata['price']})")
        print("="*50)

        garment_result = {
            "name": name,
            "price": gdata["price"],
            "views": {}
        }

        for view_name in ["side", "front", "back"]:
            urls = list(gdata["views"][view_name]["urls"])
            attrs = list(gdata["views"][view_name]["attrs"])
            print(f"\n--- View: {view_name.upper()} ---")
            print(f"  DOM Attributes: {attrs}")
            print(f"  Master URLs found: {urls}")

            garment_result["views"][view_name] = {
                "dom_attrs": attrs,
                "urls": urls,
                "assets": []
            }

            for url in urls:
                try:
                    req = urllib.request.Request(url, headers=headers)
                    with urllib.request.urlopen(req, timeout=15) as resp:
                        content_type = resp.headers.get('Content-Type')
                        img_bytes = resp.read()
                        size_kb = round(len(img_bytes) / 1024, 2)
                        
                        img = Image.open(io.BytesIO(img_bytes))
                        w, h = img.size
                        fmt = img.format
                        mode = img.mode
                        has_alpha = ('A' in mode) or ('transparency' in img.info)
                        aspect_ratio = round(w / h, 4)
                        
                        alpha_percent = 0.0
                        if 'A' in mode:
                            alpha = img.split()[-1]
                            hist = alpha.histogram()
                            # hist[0] is count of pixels with alpha=0 (completely transparent)
                            transparent_pixels = hist[0]
                            total_pixels = w * h
                            alpha_percent = round((transparent_pixels / total_pixels) * 100, 2)

                        asset_data = {
                            "url": url,
                            "content_type": content_type,
                            "width": w,
                            "height": h,
                            "format": fmt,
                            "mode": mode,
                            "has_alpha": has_alpha,
                            "transparent_bg_percentage": alpha_percent,
                            "aspect_ratio_decimal": aspect_ratio,
                            "aspect_ratio_ratio": f"{w}:{h}",
                            "file_size_kb": size_kb
                        }
                        garment_result["views"][view_name]["assets"].append(asset_data)

                        print(f"  [SUCCESS] {url.split('/')[-1]}")
                        print(f"    Dimensions: {w} x {h} px")
                        print(f"    Aspect Ratio: {w}:{h} ({aspect_ratio})")
                        print(f"    Format: {fmt} | Mode: {mode} | Alpha: {has_alpha} ({alpha_percent}% fully transparent)")
                        print(f"    Size: {size_kb} KB | Content-Type: {content_type}")

                except Exception as e:
                    print(f"  [ERROR] {url}: {e}")
                    garment_result["views"][view_name]["assets"].append({
                        "url": url,
                        "error": str(e)
                    })

        results.append(garment_result)

    with open('scripts/nike_master_dimensions_report.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)

    print("\nSaved comprehensive report to scripts/nike_master_dimensions_report.json")

if __name__ == "__main__":
    analyze()
