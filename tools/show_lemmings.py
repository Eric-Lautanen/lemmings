import os
import json

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
data = json.load(open(os.path.join('build', 'main_data.json'), encoding='utf-8'))
CHARS = [' ', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f']


def show(px, w, h, label):
    print(f'--- {label} ---')
    for y in range(h):
        print(''.join(CHARS[px[y * w + x]] for x in range(w)))


for name in ('walk_r', 'walk_l', 'dig', 'climb_r', 'build_r', 'bash_r', 'mine_r',
             'fall_r', 'umbrella_r', 'splat', 'exit', 'block', 'ohno', 'explode'):
    a = data['anims'][name]
    show(a['frames'][0], a['w'], a['h'], f'{name} frame 0')

print('digit 5:')
show(data['digits']['5'], 8, 8, 'digit 5')
print('bash mask r 0:')
show([1 if v else 0 for v in data['masks']['bash_mask_r']['frames'][0]], 16, 10, 'bashmask0')
print('explode mask:')
show([1 if v else 0 for v in data['masks']['explode_mask']['frames'][0]], 16, 22, 'explodemask')
