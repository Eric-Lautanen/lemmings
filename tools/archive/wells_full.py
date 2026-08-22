from PIL import Image

im = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_004.png').convert('RGB')
print('v004 wells x0..130 y176..199:')
for y in range(176, 200):
    row = ''
    for x in range(0, 130):
        r, g, b = im.getpixel((x, y))
        if g > 120 and r < 100 and b < 100: row += 'G'
        elif r > 200 and g > 190 and b > 190: row += 'W'
        elif r > 130 and g > 130 and b < 100: row += 'Y'
        elif r + g + b > 150: row += 'o'
        else: row += '.'
    print('y%3d %s' % (y, row))