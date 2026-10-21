"""
FinanceiT PWA Icon Generator
Generates valid PNG icons (192x192, 512x512, maskable 512x512, apple-touch-icon 180x180)
using Python's standard library (zlib, struct).
No third-party packages required.
"""
import os
import struct
import zlib
import math

def create_png(width, height, pixel_func):
    """
    Creates raw PNG bytes using zlib and struct.
    pixel_func: (x, y) -> (r, g, b, a) as integers 0-255
    """
    # Raw scanlines with filter byte 0 (None)
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter type 0
        for x in range(width):
            r, g, b, a = pixel_func(x, y)
            raw_data.extend([r, g, b, a])
    
    compressed = zlib.compress(bytes(raw_data), level=9)
    
    # PNG signature
    png = bytearray(b'\x89PNG\r\n\x1a\n')
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    png.extend(struct.pack('>I', 13))
    png.extend(b'IHDR')
    png.extend(ihdr_data)
    png.extend(struct.pack('>I', ihdr_crc))
    
    # IDAT chunk
    idat_len = len(compressed)
    idat_crc = zlib.crc32(b'IDAT' + compressed)
    png.extend(struct.pack('>I', idat_len))
    png.extend(b'IDAT')
    png.extend(compressed)
    png.extend(struct.pack('>I', idat_crc))
    
    # IEND chunk
    iend_crc = zlib.crc32(b'IEND')
    png.extend(struct.pack('>I', 0))
    png.extend(b'IEND')
    png.extend(struct.pack('>I', iend_crc))
    
    return bytes(png)

def make_icon(size, is_maskable=False):
    """
    Generates a minimalist black and white FinanceiT icon:
    Pure black background, crisp white geometric 'F' with currency accent.
    """
    scale = size / 512.0
    safe_margin = size * 0.15 if is_maskable else size * 0.08
    corner_radius = 0 if is_maskable else size * 0.22

    # Background color: #0a0a0c (near pitch black)
    bg_r, bg_g, bg_b = 10, 10, 12

    def get_pixel(x, y):
        # Center coordinates
        cx = size / 2.0
        cy = size / 2.0
        
        # Check rounded rect for non-maskable icons
        if not is_maskable:
            # Distance from corners
            dx = max(abs(x - cx) - (cx - corner_radius), 0)
            dy = max(abs(y - cy) - (cy - corner_radius), 0)
            if math.hypot(dx, dy) > corner_radius:
                return (0, 0, 0, 0) # transparent outside rounded rect

        # Draw FinanceiT "F" monogram with an upward financial arrow/accent
        # Normalize to 512x512 space
        nx = x / scale
        ny = y / scale

        # Base background
        r, g, b, a = bg_r, bg_g, bg_b, 255

        # Subtle elegant inner border for iOS aesthetics
        dist_border = min(x, y, size - 1 - x, size - 1 - y)
        if not is_maskable and 2 <= dist_border <= 4:
            return (40, 40, 45, 255)

        # Monogram geometry in 512x512 grid:
        # Vertical stem: x in [140, 185], y in [120, 392]
        # Top bar: x in [140, 372], y in [120, 165]
        # Middle bar: x in [140, 310], y in [225, 270]
        # Accent coin / slash: upward dynamic slash at 45 deg or clean dot
        in_stem = (150 <= nx <= 195) and (130 <= ny <= 382)
        in_top_bar = (150 <= nx <= 362) and (130 <= ny <= 175)
        in_mid_bar = (150 <= nx <= 305) and (235 <= ny <= 280)
        
        # Accent: White dot/coin at top right [320, 362] x [235, 280] or pill
        in_dot = math.hypot(nx - 340, ny - 257) <= 22
        
        # Accent line under F: small sleek pill at y [340, 360], x [230, 340]
        in_sub_pill = (230 <= nx <= 340) and (338 <= ny <= 368) and (
            math.hypot(nx - 245, ny - 353) <= 15 or 
            math.hypot(nx - 325, ny - 353) <= 15 or 
            (245 <= nx <= 325)
        )

        if in_stem or in_top_bar or in_mid_bar or in_dot or in_sub_pill:
            return (255, 255, 255, 255)

        return (r, g, b, a)

    return create_png(size, size, get_pixel)

def main():
    icons_dir = os.path.join(os.getcwd(), 'icons')
    os.makedirs(icons_dir, exist_ok=True)
    
    print("Generating FinanceiT icons...")
    
    # 192x192
    png192 = make_icon(192, is_maskable=False)
    with open(os.path.join(icons_dir, 'icon-192.png'), 'wb') as f:
        f.write(png192)
    print("[OK] Created icon-192.png")
    
    # 512x512
    png512 = make_icon(512, is_maskable=False)
    with open(os.path.join(icons_dir, 'icon-512.png'), 'wb') as f:
        f.write(png512)
    print("[OK] Created icon-512.png")
    
    # 512x512 maskable (full bleed background)
    png_maskable = make_icon(512, is_maskable=True)
    with open(os.path.join(icons_dir, 'icon-maskable-512.png'), 'wb') as f:
        f.write(png_maskable)
    print("[OK] Created icon-maskable-512.png")
    
    # Apple touch icon (180x180)
    png_apple = make_icon(180, is_maskable=True)
    with open(os.path.join(icons_dir, 'apple-touch-icon.png'), 'wb') as f:
        f.write(png_apple)
    print("[OK] Created apple-touch-icon.png")
    
    print("All icons generated successfully!")

if __name__ == '__main__':
    main()
