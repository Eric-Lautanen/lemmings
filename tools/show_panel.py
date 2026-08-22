import os
import json

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
data = json.load(open(os.path.join('build', 'main_data.json'), encoding='utf-8'))
CHARS = [' ', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f']

panel = data['panel']
# find non-black column ranges to locate panel elements
for y in range(40):
    row = ''.join(CHARS[panel[y * 320 + x]] for x in range(320))
    print(row)
