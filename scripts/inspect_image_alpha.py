import urllib.request
import io
from PIL import Image
import numpy as np

urls = {
    "wenzy_side": "https://dmmdcbpgyxgtrvhdildo.supabase.co/storage/v1/object/public/product-images/1794997771901-4sjcrfg.png",
    "wenzy_front": "https://dmmdcbpgyxgtrvhdildo.supabase.co/storage/v1/object/public/product-images/1794994181713-u54mvz8.png",
    "wenzy_back": "https://dmmdcbpgyxgtrvhdildo.supabase.co/storage/v1/object/public/product-images/1794994194126-qufarws.png",
    "nike_side": "https://nike-makknzjs.myshopify.com/cdn/shop/files/blazzer-side.png?v=1738740263",
    "nike_front": "https://nike-makknzjs.myshopify.com/cdn/shop/files/blazzer-front.png?v=1738740263",
}

for name, url in urls.items():
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
        im = Image.open(io.BytesIO(data))
        print(f"\n--- {name} ---")
        print(f"Format: {im.format}, Mode: {im.mode}, Size: {im.size}")
        
        if im.mode == 'RGBA':
            arr = np.array(im)
            alpha = arr[:, :, 3]
            # Check non-zero alpha pixels
            semi_transparent = (alpha > 0) & (alpha < 250)
            fully_opaque = (alpha >= 250)
            fully_transparent = (alpha == 0)
            
            print(f"Total pixels: {alpha.size}")
            print(f"Fully transparent (alpha=0): {np.sum(fully_transparent)} ({np.sum(fully_transparent)/alpha.size*100:.1f}%)")
            print(f"Fully opaque (alpha>=250): {np.sum(fully_opaque)} ({np.sum(fully_opaque)/alpha.size*100:.1f}%)")
            print(f"Semi-transparent (0 < alpha < 250): {np.sum(semi_transparent)} ({np.sum(semi_transparent)/alpha.size*100:.1f}%)")
            
            # Check rgb values of semi-transparent border pixels
            if np.sum(semi_transparent) > 0:
                semi_rgb = arr[semi_transparent][:, :3]
                mean_rgb = np.mean(semi_rgb, axis=0)
                print(f"Semi-transparent edge pixels mean RGB: {mean_rgb} (e.g. gray/white fringe check)")
                
                # Check if there is an outer soft shadow: pixels with alpha < 50
                low_alpha = (alpha > 0) & (alpha < 50)
                print(f"Low alpha pixels (0 < alpha < 50, feather/shadow halo): {np.sum(low_alpha)} ({np.sum(low_alpha)/alpha.size*100:.2f}%)")
    except Exception as e:
        print(f"Error checking {name}: {e}")
