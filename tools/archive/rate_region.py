from PIL import Image
im = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_004.png').convert('RGB')
print('v004 rate box x129..176 y176..199:')
print('    ' + ''.join(str((x // 10) % 10) if x % 10 == 0 else ' ' for x in range(129, 176)))
print('    ' + ''.join(str(x % 10) for x in range(129, 176)))
for y in range(176, 200):
    row = ''
    for x in range(129, 176):
        r, g, b = im.getpixel((x, y))
        if g > 100 and r < 80 and b < 80:
            row += 'G'
        elif r > 180 and g > 150 and b > 150:
            row += 'W'
        elif r + g + b > 200:
            row += 'o'
        else:
            row += '.'
    print('%3d %s' % (y, row))