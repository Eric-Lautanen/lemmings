from PIL import Image
im = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_004.png').convert('RGB')
print('v004 x129..210 y176..199:')
for y in range(176, 200):
    row = ''
    for x in range(129, 210):
        r, g, b = im.getpixel((x, y))
        if g > 120 and r < 80 and b < 80:
            row += 'G'
        elif r > 180 and g > 150 and b > 150:
            row += 'W'
        elif r > 120 and g > 120 and b < 100:
            row += 'Y'   # yellow (176,176,0)
        elif r + g + b > 200:
            row += 'o'
        else:
            row += '.'
    print('%3d %s' % (y, row))