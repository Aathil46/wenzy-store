import json
import urllib.request
import io
import os
from PIL import Image

def analyze_all():
    with open('scripts/nike_img_elements_inspect.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }

    results = {}

    pos_to_view = {
        "0": "side",
        "1": "front",
        "-1": "back"
    }

    print("=" * 80)
    print("DETAILED MASTER ASSET ANALYSIS FOR ALL NIKE REFERENCE RAIL GARMENTS")
    print("=" * 80)

    for garment_name, views in data.items():
        print(f"\n=======================================================")
        print(f"GARMENT: {garment_name}")
        print("=======================================================")
        results[garment_name] = {}

        for pos in ["0", "1", "-1"]:
            view_label = pos_to_view[pos]
            view_data = views.get(pos, {})
            raw_url = view_data.get("src") or view_data.get("dataHi")
            # If not in src, check outerHTML for data-hi
            if not raw_url and "data-hi=" in view_data.get("outerHTML", ""):
                import re
                match = re.search(r'data-hi="([^"]+)"', view_data.get("outerHTML", ""))
                if match:
                    raw_url = match.group(1).replace("&amp;", "&")

            if raw_url and raw_url.startswith("//"):
                raw_url = "https:" + raw_url

            master_url = raw_url.split("?")[0] if raw_url else None
            attr_w = view_data.get("width")
            attr_h = view_data.get("height")

            print(f"\n  [{view_label.upper()} VIEW] (pos={pos})")
            print(f"    DOM Attributes: {attr_w} x {attr_h} px")
            print(f"    Master URL: {master_url}")

            asset_result = {
                "view": view_label,
                "pos": pos,
                "dom_width": attr_w,
                "dom_height": attr_h,
                "master_url": master_url,
            }

            if master_url:
                try:
                    req = urllib.request.Request(master_url, headers=headers)
                    with urllib.request.urlopen(req, timeout=20) as resp:
                        content_type = resp.headers.get('Content-Type')
                        img_bytes = resp.read()
                        size_kb = round(len(img_bytes) / 1024, 2)

                        img = Image.open(io.BytesIO(img_bytes))
                        w, h = img.size
                        fmt = img.format
                        mode = img.mode
                        has_alpha = ('A' in mode) or ('transparency' in img.info)
                        aspect_ratio_dec = round(w / h, 4)

                        alpha_percent = 0.0
                        if 'A' in mode:
                            alpha = img.split()[-1]
                            hist = alpha.histogram()
                            transparent_pixels = hist[0]
                            total_pixels = w * h
                            alpha_percent = round((transparent_pixels / total_pixels) * 100, 2)

                        asset_result.update({
                            "master_width": w,
                            "master_height": h,
                            "aspect_ratio_ratio": f"{w}:{h}",
                            "aspect_ratio_decimal": aspect_ratio_dec,
                            "format": fmt,
                            "mode": mode,
                            "has_alpha": has_alpha,
                            "transparent_bg_percentage": alpha_percent,
                            "file_size_kb": size_kb,
                            "content_type": content_type
                        })

                        print(f"    -> Master Asset: {w} x {h} px")
                        print(f"    -> Aspect Ratio: {w}:{h} ({aspect_ratio_dec})")
                        print(f"    -> Format: {fmt} | Mode: {mode} | Alpha: {has_alpha} ({alpha_percent}% fully transparent)")
                        print(f"    -> File Size: {size_kb} KB | Content-Type: {content_type}")

                except Exception as e:
                    print(f"    -> Error inspecting master: {e}")
                    asset_result["error"] = str(e)

            results[garment_name][view_label] = asset_result

    with open('scripts/nike_complete_18_assets_report.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)

    print("\n\nSuccessfully wrote comprehensive results to scripts/nike_complete_18_assets_report.json")

if __name__ == "__main__":
    analyze_all_18 = analyze_all
    analyze_all()
