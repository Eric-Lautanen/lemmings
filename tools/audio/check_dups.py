lines = open('adlib_player.py', encoding='utf-8').read().splitlines()
dups = [(i + 1, lines[i]) for i in range(1, len(lines)) if lines[i] == lines[i - 1]]
print('consecutive duplicate lines:', len(dups))
for n, t in dups[:20]:
    print(n, t)
import hashlib
print('sha256:', hashlib.sha256(open('adlib_player.py', 'rb').read()).hexdigest())
print('total lines:', len(lines))
