from PIL import Image

for name in ['vgalemmi_002', 'vgalemmi_004', 'vgalemmi_006']:
    img = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\{}.png'.format(name)).convert('RGB')
    px = img.load()
    print('==== {} ===='.format(name))
    for y in range(175, 200):
        row = ''
        for x in range(0, 128):
            p = px[x, y]
            if p[0] > 150 and p[1] > 150 and p[2] > 150:
                row += 'W'
            elif p[0] < 40 and p[1] < 40 and p[2] < 40:
                row += '.'
            elif p[1] > 100 and p[0] < 80 and p[2] < 80:
                row += 'G'
            elif p[0] > 100 and p[1] > 100 and p[2] < 80:
                row += 'Y'
            else:
                row += '?'
        print('y{}: {}'.format(y, row))