import os
import re
import cv2
import numpy as np
from concurrent.futures import ThreadPoolExecutor

def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower()
            for text in re.split(r'(\d+)', s)]

def get_sorted_files(folder):
    files = [f for f in os.listdir(folder) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    files.sort(key=natural_sort_key)
    return [os.path.join(folder, f) for f in files]

def is_duplicate(file1, file2, threshold=1.0):
    img1 = cv2.imread(file1)
    img2 = cv2.imread(file2)
    if img1 is None or img2 is None:
        return False
    if img1.shape != img2.shape:
        return False
    diff = np.mean(np.abs(img1.astype(float) - img2.astype(float)))
    return diff < threshold

def process_image(task):
    src_path, dst_desktop, dst_mobile = task
    img = cv2.imread(src_path)
    if img is None:
        raise ValueError(f"Could not load image {src_path}")
    
    h, w = img.shape[:2]
    
    # Desktop 1600px wide, quality 78
    w_d = 1600
    h_d = int(round(h * w_d / w))
    # Using INTER_LANCZOS4 for crisp upsampling from 1280 to 1600
    img_d = cv2.resize(img, (w_d, h_d), interpolation=cv2.INTER_LANCZOS4)
    cv2.imwrite(dst_desktop, img_d, [cv2.IMWRITE_WEBP_QUALITY, 78])
    
    # Mobile 960px wide, quality 72
    w_m = 960
    h_m = int(round(h * w_m / w))
    img_m = cv2.resize(img, (w_m, h_m), interpolation=cv2.INTER_AREA)
    cv2.imwrite(dst_mobile, img_m, [cv2.IMWRITE_WEBP_QUALITY, 72])

def get_folder_size(path):
    total = 0
    for root, dirs, files in os.walk(path):
        for f in files:
            fp = os.path.join(root, f)
            total += os.path.getsize(fp)
    return total

def main():
    os.makedirs('assets/frames/hero', exist_ok=True)
    os.makedirs('assets/frames/hero-mobile', exist_ok=True)
    os.makedirs('assets/frames/dismantle', exist_ok=True)
    os.makedirs('assets/frames/dismantle-mobile', exist_ok=True)
    os.makedirs('assets/cars', exist_ok=True)

    # 1. Collect Hero Frames
    c1 = get_sorted_files('frames/hero section/clip 1')
    c2 = get_sorted_files('frames/hero section/clip 2')
    c3 = get_sorted_files('frames/hero section/clip 3')

    print(f"Original counts -> Clip 1: {len(c1)}, Clip 2: {len(c2)}, Clip 3: {len(c3)}")

    hero_list = list(c1)
    
    # Check join clip 1 -> clip 2
    if hero_list and c2:
        if is_duplicate(hero_list[-1], c2[0]):
            print(f"Skipping first frame of clip 2 as duplicate of last frame of clip 1: {c2[0]}")
            hero_list.extend(c2[1:])
        else:
            hero_list.extend(c2)
            
    # Check join clip 2 -> clip 3
    if hero_list and c3:
        if is_duplicate(hero_list[-1], c3[0]):
            print(f"Skipping first frame of clip 3 as duplicate of last frame of clip 2: {c3[0]}")
            hero_list.extend(c3[1:])
        else:
            hero_list.extend(c3)

    print(f"Total hero frames to process: {len(hero_list)}")

    # 2. Collect Dismantle Frames
    dismantle_list = get_sorted_files('frames/dismantle')
    print(f"Total dismantle frames to process: {len(dismantle_list)}")

    # Prepare conversion tasks
    tasks = []
    for idx, src in enumerate(hero_list, start=1):
        dst_desktop = f'assets/frames/hero/frame_{idx:04d}.webp'
        dst_mobile = f'assets/frames/hero-mobile/frame_{idx:04d}.webp'
        tasks.append((src, dst_desktop, dst_mobile))

    for idx, src in enumerate(dismantle_list, start=1):
        dst_desktop = f'assets/frames/dismantle/frame_{idx:04d}.webp'
        dst_mobile = f'assets/frames/dismantle-mobile/frame_{idx:04d}.webp'
        tasks.append((src, dst_desktop, dst_mobile))

    print(f"Processing {len(tasks)} images (x2 for desktop + mobile)...")
    with ThreadPoolExecutor(max_workers=8) as executor:
        list(executor.map(process_image, tasks))

    print("Conversion complete!")

    # Summary
    folders = [
        ('Hero Desktop', 'assets/frames/hero'),
        ('Hero Mobile', 'assets/frames/hero-mobile'),
        ('Dismantle Desktop', 'assets/frames/dismantle'),
        ('Dismantle Mobile', 'assets/frames/dismantle-mobile'),
    ]

    for name, path in folders:
        files = [f for f in os.listdir(path) if f.endswith('.webp')]
        size_bytes = get_folder_size(path)
        size_mb = size_bytes / (1024 * 1024)
        print(f"{name}: {len(files)} frames, {size_mb:.2f} MB ({size_bytes:,} bytes)")

    # Prepare placeholder car images using the first dismantle frame
    ref_first_frame = dismantle_list[0]
    img_ref = cv2.imread(ref_first_frame)
    h, w = img_ref.shape[:2]
    img_ref_1600 = cv2.resize(img_ref, (1600, int(round(h * 1600 / w))), interpolation=cv2.INTER_LANCZOS4)
    
    cars = ['gt-e.webp', 's.webp', 'x.webp', 'r.webp', 'one.webp']
    for car in cars:
        car_path = os.path.join('assets/cars', car)
        if not os.path.exists(car_path):
            cv2.imwrite(car_path, img_ref_1600, [cv2.IMWRITE_WEBP_QUALITY, 85])
            print(f"Saved placeholder: {car_path}")

if __name__ == '__main__':
    main()

