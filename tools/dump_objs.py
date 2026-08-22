import sys
import os
import struct

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
data = open('original/ground0o.dat', 'rb').read()
for i in range(16):
    slot = data[i * 28:(i + 1) * 28]
    anim_flags, start_frame, end_frame, width, height = struct.unpack_from('<HBBBB', slot, 0)
    frame_data_size, mask_off = struct.unpack_from('<HH', slot, 6)
    u1, u2 = struct.unpack_from('<HH', slot, 10)
    trig_l, trig_t = struct.unpack_from('<HH', slot, 14)
    trig_w, trig_h = slot[18], slot[19]
    trig_effect = slot[20]
    frames_base, preview_idx = struct.unpack_from('<HH', slot, 21)
    u3 = struct.unpack_from('<H', slot, 25)[0]
    trap_sound = slot[27]
    if width and height:
        print(i, 'flags=%d start=%d end=%d w=%d h=%d fs=%d maskoff=%d u1=%d u2=%d tl=%d tt=%d tw=%d th=%d eff=%d base=%d prev=%d u3=%d snd=%d' % (
            anim_flags, start_frame, end_frame, width, height, frame_data_size, mask_off,
            u1, u2, trig_l, trig_t, trig_w, trig_h, trig_effect, frames_base, preview_idx, u3, trap_sound))

print('slot0 raw:', data[0:28].hex())
print('slot1 raw:', data[28:56].hex())
print('slot2 raw:', data[56:84].hex())
