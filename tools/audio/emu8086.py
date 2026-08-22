#!/usr/bin/env python3
"""Minimal 8086 interpreter to run the adlib.dat sound driver and capture OPL writes.

Usage: python emu8086.py <tune> <frames> [--trace]
"""
import sys, os
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon

F = {'cf': 0, 'pf': 2, 'af': 4, 'zf': 6, 'sf': 7, 'of': 11, 'df': 10}


def se8(v):
    v &= 0xFF
    return v - 256 if v & 0x80 else v


class CPU:
    def __init__(self, mem):
        self.m = bytearray(mem)
        if len(self.m) < 0x10000:
            self.m += b'\x00' * (0x10000 - len(self.m))
        self.r = {'ax': 0, 'bx': 0, 'cx': 0, 'dx': 0, 'si': 0, 'di': 0, 'bp': 0, 'sp': 0}
        self.flags = 0x200  # reserved bit
        self.cs = self.ds = self.ss = self.es = 0
        self.ip = 0
        self.out_cb = None       # (port, value)
        self.in_cb = None        # port -> value
        self.log = None          # fn(ip, text)
        self.steps = 0
        self.names = {}

    # ---------------- flags ----------------
    def f(self, name):
        return (self.flags >> F[name]) & 1

    def sf(self, name, v):
        if v:
            self.flags |= (1 << F[name])
        else:
            self.flags &= ~(1 << F[name])

    def setflags(self, v, bits=16, cf=0, of=None):
        v &= (1 << bits) - 1
        self.sf('cf', cf & 1)
        self.sf('pf', bin(v & 0xFF).count('1') % 2 == 0)
        self.sf('zf', v == 0)
        self.sf('sf', (v >> (bits - 1)) & 1)
        if of is not None:
            self.sf('of', of & 1)

    def of_arith(self, a, b, res, bits=16):
        m = 1 << (bits - 1)
        return 1 if ((a & m) == (b & m)) and ((a & m) != (res & m)) else 0

    # ---------------- memory ----------------
    def rd(self, o):
        return self.m[o & 0xFFFF]

    def wr(self, o, v):
        self.m[o & 0xFFFF] = v & 0xFF

    def rdw(self, o):
        o &= 0xFFFF
        return self.m[o] | (self.m[(o + 1) & 0xFFFF] << 8)

    def wrw(self, o, v):
        o &= 0xFFFF
        v &= 0xFFFF
        self.m[o] = v & 0xFF
        self.m[(o + 1) & 0xFFFF] = (v >> 8) & 0xFF

    def push(self, v):
        self.r['sp'] = (self.r['sp'] - 2) & 0xFFFF
        self.wrw(self.r['sp'], v)

    def pop(self):
        v = self.rdw(self.r['sp'])
        self.r['sp'] = (self.r['sp'] + 2) & 0xFFFF
        return v

    def fetch(self):
        b = self.m[self.ip & 0xFFFF]
        self.ip = (self.ip + 1) & 0xFFFF
        return b

    def imm8(self):
        return self.fetch()

    def imm16(self):
        lo = self.fetch()
        hi = self.fetch()
        return lo | (hi << 8)

    # ---------------- registers ----------------
    REG16 = ['ax', 'cx', 'dx', 'bx', 'sp', 'bp', 'si', 'di']
    REG8L = ['al', 'cl', 'dl', 'bl', 'ah', 'ch', 'dh', 'bh']

    def g16(self, r):
        return self.r[self.REG16[r & 7]]

    def s16(self, r, v):
        self.r[self.REG16[r & 7]] = v & 0xFFFF

    def g8(self, r):
        name = self.REG8L[r & 7]
        base = name[0] + 'x'
        if name[1] == 'l':
            return self.r[base] & 0xFF
        return (self.r[base] >> 8) & 0xFF

    def s8(self, r, v):
        name = self.REG8L[r & 7]
        base = name[0] + 'x'
        v &= 0xFF
        if name[1] == 'l':
            self.r[base] = (self.r[base] & 0xFF00) | v
        else:
            self.r[base] = (self.r[base] & 0x00FF) | (v << 8)

    # ---------------- modrm ----------------
    def modrm(self):
        b = self.fetch()
        mod = b >> 6
        reg = (b >> 3) & 7
        rm = b & 7
        if mod == 3:
            return reg, rm, None            # register rm
        if mod == 0:
            if rm == 6:
                return reg, None, self.imm16()   # direct
            base = ['bx+si', 'bx+di', 'bp+si', 'bp+di', 'si', 'di', 'bp', 'bx'][rm]
            return reg, None, (base, 0)
        if mod == 1:
            d = se8(self.imm8())
            base = ['bx+si', 'bx+di', 'bp+si', 'bp+di', 'si', 'di', 'bp', 'bx'][rm]
            return reg, None, (base, d)
        d = self.imm16()
        if d >= 0x8000:
            d -= 0x10000
        base = ['bx+si', 'bx+di', 'bp+si', 'bp+di', 'si', 'di', 'bp', 'bx'][rm]
        return reg, None, (base, d)

    def ea(self, addr):
        if isinstance(addr, tuple):
            base, d = addr
            v = 0
            for part in base.split('+'):
                v += self.r[part]
            return (v + d) & 0xFFFF
        return addr & 0xFFFF

    def get_rm(self, rm, addr, w):
        if addr is None:
            return self.g16(rm) if w else self.g8(rm), rm
        v = self.rdw(self.ea(addr)) if w else self.rd(self.ea(addr))
        return v, None

    def set_rm(self, rm, addr, w, v):
        if addr is None:
            if w:
                self.s16(rm, v)
            else:
                self.s8(rm, v)
        else:
            if w:
                self.wrw(self.ea(addr), v)
            else:
                self.wr(self.ea(addr), v)

    # ---------------- io ----------------
    def port_out(self, port, val):
        if self.out_cb:
            self.out_cb(port & 0xFF, val & 0xFF)

    def port_in(self, port):
        if self.in_cb:
            v = self.in_cb(port & 0xFF)
            if v is not None:
                return v & 0xFF
        return 0xFF

    # ---------------- run ----------------
    def run(self, max_steps=20_000_000):
        while self.steps < max_steps:
            self.steps += 1
            self.step()
            if getattr(self, 'halt_ip', None) is not None and self.ip == self.halt_ip:
                return 'halt'
        return 'timeout'

    def step(self):
        self.ip0 = self.ip
        op = self.fetch()
        self.dispatch(op)
        if self.log:
            self.log(self.ip0, self.lastname if hasattr(self, 'lastname') else '')

    def trace_off(self):
        self.log = None

    # ---------------- dispatch ----------------
    def dispatch(self, op):
        d = self
        # prefixes
        reps = None
        while op in (0x26, 0x2E, 0x36, 0x3E, 0xF2, 0xF3, 0xF0, 0x64, 0x65, 0x66, 0x67):
            if op in (0xF2, 0xF3):
                reps = op
            op = self.fetch()
        d.lastname = ''

        if op == 0x90:
            d.lastname = 'nop'
        elif op == 0xC3:
            d.ip = d.pop()
            d.lastname = 'ret'
        elif op == 0xC2:
            n = d.imm16()
            d.ip = d.pop()
            d.r['sp'] = (d.r['sp'] + n) & 0xFFFF
            d.lastname = 'ret %d' % n
        elif op == 0xCB:
            d.ip = d.pop()
            d.lastname = 'retf'
        elif op == 0xCF:
            d.ip = d.pop(); d.cs = d.pop(); d.flags = d.pop()
            d.lastname = 'iret'
        elif op == 0xE8:
            rel = d.imm16()
            if rel >= 0x8000:
                rel -= 0x10000
            d.push(d.ip)
            d.ip = (d.ip + rel) & 0xFFFF
            d.lastname = 'call'
        elif op == 0xE9:
            rel = d.imm16()
            if rel >= 0x8000:
                rel -= 0x10000
            d.ip = (d.ip + rel) & 0xFFFF
            d.lastname = 'jmp'
        elif op == 0xEB:
            rel = se8(d.imm8())
            d.ip = (d.ip + rel) & 0xFFFF
            d.lastname = 'jmp short'
        elif 0x70 <= op <= 0x7F:
            rel = se8(d.imm8())
            cond = ['o', 'no', 'b', 'ae', 'z', 'nz', 'be', 'a',
                    's', 'ns', 'pe', 'po', 'l', 'ge', 'le', 'g'][op - 0x70]
            ok = {
                'z': d.f('zf'), 'nz': not d.f('zf'),
                'c': d.f('cf'), 'nc': not d.f('cf'),
                's': d.f('sf'), 'ns': not d.f('sf'),
                'o': d.f('of'), 'no': not d.f('of'),
                'pe': d.f('pf'), 'po': not d.f('pf'),
                'b': d.f('cf'), 'ae': not d.f('cf'),
                'be': d.f('cf') or d.f('zf'), 'a': not d.f('cf') and not d.f('zf'),
                'l': d.f('sf') != d.f('of'), 'ge': d.f('sf') == d.f('of'),
                'le': d.f('zf') or (d.f('sf') != d.f('of')),
                'g': not d.f('zf') and (d.f('sf') == d.f('of')),
            }[cond]
            d.lastname = 'j' + cond
            if ok:
                d.ip = (d.ip + rel) & 0xFFFF
        elif op in (0xE0, 0xE1, 0xE2, 0xE3):
            rel = se8(d.imm8())
            if op == 0xE3:  # jcxz
                d.lastname = 'jcxz'
                if d.r['cx'] == 0:
                    d.ip = (d.ip + rel) & 0xFFFF
            else:
                d.r['cx'] = (d.r['cx'] - 1) & 0xFFFF
                names = {0xE0: 'loopne', 0xE1: 'loope', 0xE2: 'loop'}
                d.lastname = names[op]
                ok = d.r['cx'] != 0
                if op == 0xE0:
                    ok = ok and not d.f('zf')
                elif op == 0xE1:
                    ok = ok and d.f('zf')
                if ok:
                    d.ip = (d.ip + rel) & 0xFFFF
        elif op == 0x9A:
            off = d.imm16(); seg = d.imm16()
            d.push(d.cs); d.push(d.ip)
            d.cs = seg; d.ip = off
            d.lastname = 'callf'
        elif op == 0xEA:
            off = d.imm16(); seg = d.imm16()
            d.cs = seg; d.ip = off
            d.lastname = 'jmpf'
        elif 0x50 <= op <= 0x5F:
            if op <= 0x57:
                d.push(d.g16(op - 0x50))
                d.lastname = 'push %s' % d.REG16[op - 0x50]
            else:
                d.s16(op - 0x58, d.pop())
                d.lastname = 'pop %s' % d.REG16[op - 0x58]
        elif op in (0x06, 0x0E, 0x16, 0x1E):
            d.push([d.es, d.cs, d.ss, d.ds][{0x06: 0, 0x0E: 1, 0x16: 2, 0x1E: 3}[op]])
            d.lastname = 'push seg'
        elif op in (0x07, 0x17, 0x1F):
            sname = ['es', 'ss', 'ds'][{0x07: 0, 0x17: 1, 0x1F: 2}[op]]
            setattr(d, sname, d.pop())
            d.lastname = 'pop seg'
        elif op == 0x68:
            d.push(d.imm16())
            d.lastname = 'push imm16'
        elif op == 0x6A:
            d.push(se8(d.imm8()) & 0xFFFF)
            d.lastname = 'push imm8'
        elif op == 0xCD:
            n = d.imm8()
            d.lastname = 'int %02Xh' % n
            if n == 0x21 and (d.r['ax'] >> 8) in (0x25, 0x35, 0x48):
                pass  # set/get vector, allocate memory: no-op
            else:
                pass  # ignore all other ints; return immediately
            d.flags = d.pop(); d.ip = d.pop(); d.cs = d.pop()
        elif 0xE4 <= op <= 0xE7:
            port = d.imm8()
            if op in (0xE4, 0xE5):
                v = d.port_in(port)
                if op == 0xE4:
                    d.r['ax'] = (d.r['ax'] & 0xFF00) | v
                else:
                    d.r['ax'] = v | (d.port_in(port + 1) << 8)
                d.lastname = 'in al,ax %02Xh' % port
            else:
                d.port_out(port, d.r['ax'] & 0xFF)
                d.lastname = 'out %02Xh,al' % port
        elif 0xEC <= op <= 0xEF:
            port = d.r['dx'] & 0xFF
            if op in (0xEC, 0xED):
                v = d.port_in(port)
                if op == 0xEC:
                    d.r['ax'] = (d.r['ax'] & 0xFF00) | v
                else:
                    d.r['ax'] = v | (d.port_in(port + 1) << 8)
                d.lastname = 'in dx'
            else:
                d.port_out(port, d.r['ax'] & 0xFF)
                d.lastname = 'out dx'
        elif 0xB0 <= op <= 0xBF:
            rn = op - 0xB0
            if rn < 8:
                d.s8(rn, d.imm8())
                d.lastname = 'mov %s,imm8' % d.REG8L[rn]
            else:
                d.s16(rn - 8, d.imm16())
                d.lastname = 'mov %s,imm16' % d.REG16[rn - 8]
        elif 0x40 <= op <= 0x4F:
            rn = op - 0x40
            name = d.REG16[rn & 7]
            v = d.r[name]
            inc = op < 0x48
            r = (v + (1 if inc else -1)) & 0xFFFF
            d.setflags(r, 16, d.f('cf'), d.of_arith(v, 1 if inc else -1, r))
            d.r[name] = r
            d.lastname = '%s %s' % ('inc' if inc else 'dec', name)
        elif op == 0x8D:
            reg, rm, addr = d.modrm()
            d.s16(reg, d.ea(addr))
            d.lastname = 'lea'
        elif 0x88 <= op <= 0x8B:
            w = op & 1
            reg, rm, addr = d.modrm()
            if op in (0x8A, 0x8B):  # mov reg, rm
                v, _ = d.get_rm(rm, addr, w)
                if w:
                    d.s16(reg, v)
                else:
                    d.s8(reg, v)
            else:                  # mov rm, reg
                v = d.g16(reg) if w else d.g8(reg)
                d.set_rm(rm, addr, w, v)
            d.lastname = 'mov'
        elif op in (0x8C, 0x8E):
            reg, rm, addr = d.modrm()
            if op == 0x8C:
                d.set_rm(rm, addr, 1, [d.es, d.cs, d.ss, d.ds][reg])
                d.lastname = 'mov rm,seg'
            else:
                if addr is None:
                    sname = ['es', 'cs', 'ss', 'ds'][reg]
                    setattr(d, sname, d.g16(rm))
                d.lastname = 'mov seg,rm'
        elif op == 0x8F:
            reg, rm, addr = d.modrm()
            d.set_rm(rm, addr, 1, d.pop())
            d.lastname = 'pop rm'
        elif op in (0xA0, 0xA1):
            o = d.imm16()
            if op == 0xA0:
                d.s8(0, d.rd(o))
            else:
                d.s16(0, d.rdw(o))
            d.lastname = 'mov al/ax,[%04X]' % o
        elif op in (0xA2, 0xA3):
            o = d.imm16()
            if op == 0xA2:
                d.wr(o, d.g8(0))
            else:
                d.wrw(o, d.r['ax'])
            d.lastname = 'mov [%04X],al/ax' % o
        elif op in (0xA8, 0xA9):
            w = op == 0xA9
            v = d.r['ax'] if w else d.g8(0)
            m = d.imm16() if w else d.imm8()
            r = v & m
            d.setflags(r, 16 if w else 8, 0, 0)
            d.lastname = 'test al/ax,imm'
        elif op in (0x84, 0x85):
            w = op & 1
            reg, rm, addr = d.modrm()
            a, _ = d.get_rm(rm, addr, w)
            b = d.g16(reg) if w else d.g8(reg)
            r = a & b
            d.setflags(r, 16 if w else 8, 0, 0)
            d.lastname = 'test'
        elif op == 0x98:
            if d.g8(0) & 0x80:
                d.r['ax'] |= 0xFF00
            else:
                d.r['ax'] &= 0x00FF
            d.lastname = 'cbw'
        elif op == 0x99:
            d.r['dx'] = 0xFFFF if (d.r['ax'] & 0x8000) else 0
            d.lastname = 'cwd'
        elif op == 0x9C:
            d.push(d.flags)
            d.lastname = 'pushf'
        elif op == 0x9D:
            d.flags = d.pop()
            d.lastname = 'popf'
        elif op == 0x9E:
            d.sf('cf', d.g8(4) & 1)
            d.sf('pf', (d.g8(4) >> 2) & 1)
            d.sf('af', (d.g8(4) >> 4) & 1)
            d.sf('zf', (d.g8(4) >> 6) & 1)
            d.sf('sf', (d.g8(4) >> 7) & 1)
            d.lastname = 'sahf'
        elif op == 0x9F:
            v = d.g8(4)
            v = (v & ~0xD5) | (d.f('sf') << 7) | (d.f('zf') << 6) | (d.f('af') << 4) | (d.f('pf') << 2) | d.f('cf')
            d.s8(4, v)
            d.lastname = 'lahf'
        elif op in (0xF8, 0xF9):
            d.sf('cf', op == 0xF9)
            d.lastname = 'stc' if op == 0xF9 else 'clc'
        elif op in (0xFA, 0xFB):
            d.lastname = 'cli' if op == 0xFA else 'sti'
        elif op in (0xFC, 0xFD):
            d.sf('df', op == 0xFD)
            d.lastname = 'std' if op == 0xFD else 'cld'
        elif 0xA4 <= op <= 0xAF:
            inc = -1 if d.f('df') else 1
            names = {0xA4: 'movsb', 0xA5: 'movsw', 0xA6: 'cmpsb', 0xA7: 'cmpsw',
                     0xAA: 'stosb', 0xAB: 'stosw', 0xAC: 'lodsb', 0xAD: 'lodsw',
                     0xAE: 'scasb', 0xAF: 'scasw'}
            d.lastname = names[op]
            w = op in (0xA5, 0xA7, 0xAB, 0xAD, 0xAF)
            if op in (0xA4, 0xA5):
                v = d.rdw(d.r['si']) if w else d.rd(d.r['si'])
                d.wrw(d.r['di'], v) if w else d.wr(d.r['di'], v)
                d.r['si'] = (d.r['si'] + (2 if w else 1) * inc) & 0xFFFF
                d.r['di'] = (d.r['di'] + (2 if w else 1) * inc) & 0xFFFF
            elif op in (0xAA, 0xAB):
                d.wrw(d.r['di'], d.r['ax']) if w else d.wr(d.r['di'], d.g8(0))
                d.r['di'] = (d.r['di'] + (2 if w else 1) * inc) & 0xFFFF
            elif op in (0xAC, 0xAD):
                v = d.rdw(d.r['si']) if w else d.rd(d.r['si'])
                d.s16(0, v) if w else d.s8(0, v)
                d.r['si'] = (d.r['si'] + (2 if w else 1) * inc) & 0xFFFF
            elif op in (0xAE, 0xAF):
                v = d.rdw(d.r['si']) if w else d.rd(d.r['si'])
                a = d.r['ax'] if w else d.g8(0)
                r = (a - v) & (0xFFFF if w else 0xFF)
                d.setflags(r, 16 if w else 8, a < v, d.of_arith(a, v, r, 16 if w else 8))
                d.r['si'] = (d.r['si'] + (2 if w else 1) * inc) & 0xFFFF
            if reps:
                d.r['cx'] = (d.r['cx'] - 1) & 0xFFFF
                if d.r['cx'] != 0 and reps == 0xF3:
                    d.ip = d.ip0
                elif d.r['cx'] != 0 and reps == 0xF2 and not d.f('zf'):
                    d.ip = d.ip0
        elif op in (0x86, 0x87):
            w = op == 0x87
            reg, rm, addr = d.modrm()
            a, _ = d.get_rm(rm, addr, w)
            b = d.g16(reg) if w else d.g8(reg)
            d.set_rm(rm, addr, w, b)
            if w:
                d.s16(reg, a)
            else:
                d.s8(reg, a)
            d.lastname = 'xchg'
        elif 0x00 <= op <= 0x3F:
            if op in (0x04, 0x05, 0x0C, 0x0D, 0x14, 0x15, 0x1C, 0x1D, 0x24, 0x25, 0x2C, 0x2D, 0x34, 0x35, 0x3C, 0x3D):
                w = op & 1
                opname = ['add', 'or', 'adc', 'sbb', 'and', 'sub', 'xor', 'cmp'][op >> 3]
                bits = 16 if w else 8
                m = (1 << bits) - 1
                a = d.r['ax'] if w else d.g8(0)
                b = d.imm16() if w else d.imm8()
                if opname == 'add':
                    r = (a + b) & m; cf = (a + b) > m
                elif opname == 'or':
                    r = (a | b) & m; cf = 0
                elif opname == 'adc':
                    c = d.f('cf')
                    r = (a + b + c) & m; cf = (a + b + c) > m
                elif opname == 'sbb':
                    c = d.f('cf')
                    r = (a - b - c) & m; cf = (a - b - c) < 0
                elif opname == 'and':
                    r = (a & b) & m; cf = 0
                elif opname == 'sub':
                    r = (a - b) & m; cf = a < b
                elif opname == 'xor':
                    r = (a ^ b) & m; cf = 0
                else:
                    r = (a - b) & m; cf = a < b
                d.setflags(r, bits, cf, d.of_arith(a, b, r, bits))
                d.lastname = opname
                if opname != 'cmp':
                    if w:
                        d.r['ax'] = r
                    else:
                        d.s8(0, r)
            else:
                w = op & 1
                reg, rm, addr = d.modrm()
                opname = ['add', 'or', 'adc', 'sbb', 'and', 'sub', 'xor', 'cmp'][op >> 3]
                rmdst = ((op >> 1) & 1) == 0
                bits = 16 if w else 8
                m = (1 << bits) - 1
                if rmdst:
                    a, _ = d.get_rm(rm, addr, w)
                    b = d.g16(reg) if w else d.g8(reg)
                else:
                    a = d.g16(reg) if w else d.g8(reg)
                    b, _ = d.get_rm(rm, addr, w)
                if opname == 'add':
                    r = (a + b) & m; cf = (a + b) > m
                elif opname == 'or':
                    r = (a | b) & m; cf = 0
                elif opname == 'adc':
                    c = d.f('cf')
                    r = (a + b + c) & m; cf = (a + b + c) > m
                elif opname == 'sbb':
                    c = d.f('cf')
                    r = (a - b - c) & m; cf = (a - b - c) < 0
                elif opname == 'and':
                    r = (a & b) & m; cf = 0
                elif opname == 'sub':
                    r = (a - b) & m; cf = a < b
                elif opname == 'xor':
                    r = (a ^ b) & m; cf = 0
                else:  # cmp
                    r = (a - b) & m; cf = a < b
                d.setflags(r, bits, cf, d.of_arith(a, b, r, bits))
                d.lastname = opname
                if opname != 'cmp':
                    if rmdst:
                        d.set_rm(rm, addr, w, r)
                    else:
                        if w:
                            d.s16(reg, r)
                        else:
                            d.s8(reg, r)
        elif op in (0x80, 0x81, 0x83):
            w = 1 if op != 0x80 else 0
            reg, rm, addr = d.modrm()
            opname = ['add', 'or', 'adc', 'sbb', 'and', 'sub', 'xor', 'cmp'][reg]
            if op == 0x83:
                b = se8(d.imm8())
            else:
                b = d.imm16() if w else d.imm8()
            bits = 16 if w else 8
            m = (1 << bits) - 1
            a, _ = d.get_rm(rm, addr, w)
            if opname == 'add':
                r = (a + b) & m; cf = (a + b) > m
            elif opname == 'or':
                r = (a | b) & m; cf = 0
            elif opname == 'adc':
                c = d.f('cf')
                r = (a + b + c) & m; cf = (a + b + c) > m
            elif opname == 'sbb':
                c = d.f('cf')
                r = (a - b - c) & m; cf = (a - b - c) < 0
            elif opname == 'and':
                r = (a & b) & m; cf = 0
            elif opname == 'sub':
                r = (a - b) & m; cf = a < b
            elif opname == 'xor':
                r = (a ^ b) & m; cf = 0
            else:
                r = (a - b) & m; cf = a < b
            d.setflags(r, bits, cf, d.of_arith(a, b, r, bits))
            d.lastname = opname
            if opname != 'cmp':
                d.set_rm(rm, addr, w, r)
        elif op in (0xC6, 0xC7):
            w = op == 0xC7
            reg, rm, addr = d.modrm()
            v = d.imm16() if w else d.imm8()
            d.set_rm(rm, addr, w, v)
            d.lastname = 'mov rm,imm'
        elif op in (0xF6, 0xF7):
            w = op == 0xF7
            reg, rm, addr = d.modrm()
            bits = 16 if w else 8
            m = (1 << bits) - 1
            if reg == 0:  # test
                a, _ = d.get_rm(rm, addr, w)
                b = d.imm16() if w else d.imm8()
                d.setflags(a & b, bits, 0, 0)
                d.lastname = 'test rm,imm'
            elif reg == 2:  # not
                a, _ = d.get_rm(rm, addr, w)
                d.set_rm(rm, addr, w, (~a) & m)
                d.lastname = 'not'
            elif reg == 3:  # neg
                a, _ = d.get_rm(rm, addr, w)
                r = (-a) & m
                d.setflags(r, bits, a != 0, d.of_arith(0, a, r, bits))
                d.set_rm(rm, addr, w, r)
                d.lastname = 'neg'
            elif reg in (4, 5):  # mul / imul
                a, _ = d.get_rm(rm, addr, w)
                if not w:
                    r = d.g8(0) * a
                    d.s16(0, r)
                    d.setflags(r, 16, (r >> 8) != 0, 0)
                else:
                    r = d.r['ax'] * a
                    d.s16(0, r & 0xFFFF)
                    d.s16(2, (r >> 16) & 0xFFFF)
                    d.setflags(r & 0xFFFF, 16, (r >> 16) != 0, 0)
                d.lastname = 'mul'
            elif reg in (6, 7):  # div / idiv
                a, _ = d.get_rm(rm, addr, w)
                if not w:
                    q = d.r['ax'] // a if a else 0
                    d.s16(0, q)
                else:
                    num = d.r['dx'] * 0x10000 + d.r['ax']
                    q = num // a if a else 0
                    d.s16(0, q & 0xFFFF)
                    d.s16(2, q >> 16)
                d.lastname = 'div'
            else:
                raise SystemExit('UNSUPPORTED F6/F7 reg %d at %04X' % (reg, self.ip0))
        elif op in (0xD0, 0xD1, 0xD2, 0xD3, 0xC0, 0xC1):
            w = op in (0xD1, 0xD3, 0xC1)
            if op in (0xC0, 0xC1):
                cnt = d.imm8()
            elif op in (0xD2, 0xD3):
                cnt = d.r['cx'] & 0xFF
            else:
                cnt = 1
            reg, rm, addr = d.modrm()
            bits = 16 if w else 8
            m = (1 << bits) - 1
            a, _ = d.get_rm(rm, addr, w)
            cnt &= 31
            if cnt:
                if reg == 0:      # rol
                    r = ((a << cnt) | (a >> (bits - cnt))) & m
                    cf = a & (1 << (bits - cnt))
                    d.sf('of', ((r >> (bits - 1)) ^ (r >> (bits - 2))) & 1 if cnt == 1 else d.f('of'))
                elif reg == 1:    # ror
                    r = ((a >> cnt) | (a << (bits - cnt))) & m
                    cf = a & (1 << (cnt - 1))
                    d.sf('of', ((r >> (bits - 1)) ^ (r >> (bits - 2))) & 1 if cnt == 1 else d.f('of'))
                elif reg == 2:    # rcl
                    c = d.f('cf')
                    r = ((a << cnt) | (c << (cnt - 1)) | (a >> (bits - cnt + 1))) & m
                    cf = (a >> (bits - cnt)) & 1
                elif reg == 3:    # rcr
                    c = d.f('cf')
                    r = ((a >> cnt) | (c << (bits - cnt)) | (a << (bits - cnt + 1))) & m
                    cf = (a >> (cnt - 1)) & 1
                elif reg == 4:    # shl/sal
                    r = (a << cnt) & m
                    cf = (a >> (bits - cnt)) & 1
                    d.sf('of', ((r >> (bits - 1)) ^ (a >> (bits - 1))) & 1 if cnt == 1 else d.f('of'))
                elif reg == 5:    # shr
                    r = (a >> cnt) & m
                    cf = (a >> (cnt - 1)) & 1
                else:             # sar
                    s = 1 if (a & (1 << (bits - 1))) else 0
                    r = ((a >> cnt) | (s << (bits - cnt))) & m
                    cf = (a >> (cnt - 1)) & 1
                d.sf('cf', cf & 1)
            else:
                r = a
            d.setflags(r, bits, d.f('cf'))
            d.set_rm(rm, addr, w, r)
            d.lastname = ['rol', 'ror', 'rcl', 'rcr', 'shl', 'shr', 'sal', 'sar'][reg]
        elif op in (0xFE, 0xFF):
            w = op == 0xFF
            reg, rm, addr = d.modrm()
            if op == 0xFE:
                bits = 8
                a, _ = d.get_rm(rm, addr, w=False)
                if reg == 0:
                    r = (a + 1) & 0xFF
                    cf = a == 0xFF
                else:
                    r = (a - 1) & 0xFF
                    cf = a == 0
                d.setflags(r, 8, cf, d.of_arith(a, 1 if reg == 0 else -1, r, 8))
                d.set_rm(rm, addr, False, r)
                d.lastname = 'inc/dec byte'
            else:
                if reg == 2:  # call rm
                    v, _ = d.get_rm(rm, addr, True)
                    d.push(d.ip)
                    d.ip = v
                    d.lastname = 'call rm'
                elif reg == 4:  # jmp rm
                    v, _ = d.get_rm(rm, addr, True)
                    d.ip = v
                    d.lastname = 'jmp rm'
                elif reg == 6:  # push rm
                    v, _ = d.get_rm(rm, addr, True)
                    d.push(v)
                    d.lastname = 'push rm'
                elif reg == 0:
                    a, _ = d.get_rm(rm, addr, True)
                    r = (a + 1) & 0xFFFF
                    d.setflags(r, 16, a == 0xFFFF, d.of_arith(a, 1, r, 16))
                    d.set_rm(rm, addr, True, r)
                    d.lastname = 'inc word'
                elif reg == 1:
                    a, _ = d.get_rm(rm, addr, True)
                    r = (a - 1) & 0xFFFF
                    d.setflags(r, 16, a == 0, d.of_arith(a, -1, r, 16))
                    d.set_rm(rm, addr, True, r)
                    d.lastname = 'dec word'
                else:
                    raise SystemExit('UNSUPPORTED FF reg %d at %04X' % (reg, self.ip0))
        else:
            raise SystemExit('UNSUPPORTED OP 0x%02X at %04X' % (op, self.ip0))


def load_driver():
    path = os.path.join('original', 'adlib.dat')
    data = open(path, 'rb').read()
    sec = datcommon.decompress_section(data)
    print('decompressed to %d bytes' % len(sec))
    return sec


def call(cpu, ax, max_steps=4_000_000, trace=0):
    cpu.r['ax'] = ax & 0xFFFF
    cpu.halt_ip = 0xFFFF
    cpu.push(0x200)      # fake iret frame: flags (pushed first = popped last)
    cpu.push(0)          # cs
    cpu.push(0xFFFF)     # ip (pushed last = popped first = halt sentinel)
    cpu.ip = 0
    log = []
    if trace:
        def t(ip, name):
            log.append((ip, name))
        cpu.log = t
    r = None
    try:
        r = cpu.run(max_steps)
    except SystemExit:
        pass
    if trace:
        seen = []
        for ip, name in log[:trace]:
            seen.append('%04X:%s' % (ip, name))
        print(' '.join(seen))
    cpu.log = None
    cpu.halt_ip = None
    return r


def init_driver(cpu, trace=0):
    """Call the driver's own init routine at 0x3A with the custom stack frame
    the game pushes: (top->bottom) DS, AX, DI, SI, CX, DX, IP, CS, FLAGS."""
    cpu.halt_ip = 0xFFFF
    cpu.push(0x200)      # flags
    cpu.push(0)          # cs
    cpu.push(0xFFFF)     # ip (halt sentinel)
    cpu.push(0)          # dx
    cpu.push(0)          # cx
    cpu.push(0)          # si
    cpu.push(0)          # di
    cpu.push(0)          # ax
    cpu.push(0)          # ds (popped first by the routine)
    cpu.ip = 0x003A
    log = []
    if trace:
        def t(ip, name):
            log.append((ip, name))
        cpu.log = t
    try:
        r = cpu.run(4_000_000)
    except SystemExit:
        r = 'error'
    if trace:
        seen = []
        for ip, name in log[:trace]:
            seen.append('%04X:%s' % (ip, name))
        print(' '.join(seen))
    cpu.log = None
    cpu.halt_ip = None
    return r


CH_OFFS = [(0, 3), (1, 4), (2, 5), (8, 11), (9, 12), (10, 13),
           (16, 19), (17, 20), (18, 21)]


def check_channels(mem):
    """The raw image already carries the true per-channel operator offsets
    (ch struct +5 = mod offset, +6 = car offset, real YM3812 layout)."""
    for k in range(9):
        base = 0x5AC + k * 0x14
        assert mem[base + 5] == CH_OFFS[k][0], k
        assert mem[base + 6] == CH_OFFS[k][1], k
        assert mem[base + 7] == k


def main():
    tune = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    frames = int(sys.argv[2]) if len(sys.argv) > 2 else 60
    mem = load_driver()
    cpu = CPU(mem)
    check_channels(cpu.m)
    events = []
    pending = {'reg': 0}
    def out(port, val):
        if (port & 0xFF) == 0x88:          # OPL address port 0x388
            pending['reg'] = val
        elif (port & 0xFF) == 0x89:        # OPL data port 0x389
            events.append((pending['reg'], val))
    def inp(port):
        return (cpu.r['ax'] >> 8) & 0xFF   # OPL read echo = pending value
    cpu.out_cb = out
    cpu.in_cb = inp
    call(cpu, 0x0200)  # init (AH=2)
    print('after init: %d events' % len(events))
    call(cpu, 0x0300 | tune)  # set tune (AH=3, AL=tune -> [0xED])
    call(cpu, 0x0500)  # start playback (AH=5, AL=0 -> clear kick [0xEE])
    print('after start: %d events' % len(events))
    for f in range(frames):
        call(cpu, 0x0000)  # update (AH=0)
        if f % 10 == 0:
            print('frame %d, events %d' % (f, len(events)))
    print('TOTAL %d events' % len(events))
    for p, v in events[:40]:
        print('  %02X <- %02X' % (p, v))


if __name__ == '__main__':
    main()
