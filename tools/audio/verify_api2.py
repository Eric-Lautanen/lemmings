"""verify_api2.py - re-init mid-play, tune 0, tune-switch with tempo active."""
import sys
sys.path.insert(0, r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work')
import emu8086 as E
sys.path.insert(0, r'C:\github\Lemmings')
import adlib_player as P


def run_both(scenario):
    mem = E.load_driver()
    cpu = E.CPU(mem)
    E.check_channels(cpu.m)
    events = []
    pending = {'reg': 0}
    def out(port, val):
        if (port & 0xFF) == 0x88:
            pending['reg'] = val
        elif (port & 0xFF) == 0x89:
            events.append((pending['reg'], val))
    def inp(port):
        return (cpu.r['ax'] >> 8) & 0xFF
    cpu.out_cb = out
    cpu.in_cb = inp

    E.call(cpu, 0x0200)
    E.call(cpu, 0x0300 | 1)
    E.call(cpu, 0x0500)
    for f in range(30):
        E.call(cpu, 0x0000)
    scenario(cpu)
    emu_frames = []
    for f in range(40):
        n0 = len(events)
        E.call(cpu, 0x0000)
        emu_frames.append(events[n0:])

    py = P.Driver(E.load_driver())
    py.init()
    py.set_tune(1)
    py.start()
    for f in range(30):
        py.update()
    scenario_py = globals()[scenario.__name__ + '_py']
    scenario_py(py)
    py_frames = []
    for f in range(40):
        n0 = len(py.events)
        py.update()
        py_frames.append(py.events[n0:])

    bad = 0
    for f in range(40):
        if emu_frames[f] != py_frames[f]:
            bad += 1
            print('FRAME %d MISMATCH' % f)
            print('  emu: %s' % ' '.join('%02X=%02X' % e for e in emu_frames[f][:16]))
            print('  py : %s' % ' '.join('%02X=%02X' % e for e in py_frames[f][:16]))
            if bad > 5:
                break
    if bad == 0:
        print('ALL 40 FRAMES IDENTICAL: %s' % scenario.__name__)
    else:
        print('%d mismatched frames: %s' % (bad, scenario.__name__))


def reinit(cpu):
    E.call(cpu, 0x0200)
    E.call(cpu, 0x0300 | 3)
    E.call(cpu, 0x0500)

def reinit_py(py):
    py.init()
    py.set_tune(3)
    py.start()

def tune0(cpu):
    E.call(cpu, 0x0300 | 0)
    E.call(cpu, 0x0500)

def tune0_py(py):
    py.set_tune(0)
    py.start()

def switch_with_tempo(cpu):
    E.call(cpu, 0x0400 | 3)
    E.call(cpu, 0x0300 | 2)

def switch_with_tempo_py(py):
    py.set_tempo(3)
    py.set_tune(2)

run_both(reinit)
run_both(tune0)
run_both(switch_with_tempo)
