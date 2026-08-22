from PIL import Image
import sys, os
sys.path.insert(0, r'C:\github\Lemmings\tools')

img = Image.open(r'C:\github\Lemmings\build\ref\sshot3_dosdays_fun1.png').convert('RGB')
print('size:', img.size)
px = img.load()

# sample a few pixels to see the palette layout
for y in range(0, img.size[1], 20):
    print(y, [px[x, y] for x in range(0, img.size[0], 20)])
