from PIL import Image
img = Image.open(r'C:\github\Lemmings\build\ref\sshot3_dosdays_fun1.png').convert('RGB')
W, H = img.size
px = img.load()

# ASCII map of the whole shot: 8x8 blocks
for y in range(0, H, 8):
    s = ''
    for x in range(0, W, 8):
        dark = 0; green = 0; bright = 0; n = 0
        for yy in range(y, min(y + 8, H)):
            for xx in range(x, min(x + 8, W)):
                r, g, b = px[xx, yy]
                n += 1
                if max(r, g, b) < 100: dark += 1
                elif g > 90 and g > r + 30 and g > b + 30: green += 1
                elif r > 180 and g > 180 and b > 180: bright += 1
        if green > n // 3: s += 'G'
        elif dark > n // 3: s += '#'
        elif bright > n // 3: s += 'w'
        else: s += '.'
    print(s)