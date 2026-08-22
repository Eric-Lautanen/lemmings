import json, re
s = open('build/assets.js', encoding='utf8').read()
i = s.find('"menu"')
print('menu key found at', i)
seg = s[i:i+400]
print(seg[:300])
