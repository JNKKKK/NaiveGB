class CPU {
    constructor () {
        this.reg = {
            a: 0, b: 0, c: 0, d: 0, e: 0, h: 0, l: 0, f: 0,
            sp: 0, pc: 0, i: 0, r: 0,
            m: 0, t: 0,
            ime: 0
        }
        this.clock = { m: 0, t: 0 }
        this.halt = 0
        this.stop = 0
        //Make instruction table
        this.instructions = Array(0xf * 0xf * 2).fill(() => console.log('instruction not implemented!'))
        // not implement ADD HL, ss h flag
        var regCode = { 'a': 0b111, 'b': 0b000, 'c': 0b001, 'd': 0b101, 'e': 0b011, 'h': 0b100, 'l': 0b101 }
        var regddCode = { 'bc': 0b00, 'de': 0b01, 'hl': 0b10 }
        var regqqCode = { 'bc': 0b00, 'de': 0b01, 'hl': 0b10, 'af': 0b11 }
        // ____________________________________________________
        // 
        // 8-Bit Transfer and Input/Output Instructions
        // ____________________________________________________

        // r <- r'
        for (let r1 in regCode) {
            let r1b = regCode[r1]
            for (let r2 in regCode) {
                let r2b = regCode[r2]
                this.instructions[0b01 << 6 + r1b << 3 + r2b] = () => {
                    this.reg[r1] = this.reg[r2]
                    this.clock.m += 1
                }
            }
        }
        // r <- n
        for (let r1 in regCode) {
            let r1b = regCode[r1]
            this.instructions[r1b << 3 + 0b110] = () => {
                this.pc += 1
                this.reg[r1] = this.MMU.rb(this.reg.pc)
                this.clock.m += 2
            }
        }
        // r <- (HL)
        for (let r1 in regCode) {
            let r1b = regCode[r1]
            this.instructions[0b01 << 6 + r1b << 3 + 0b110] = () => {
                this.reg[r1] = this.MMU.rb(this.reg.h << 8 + this.reg.l)
                this.clock.m += 2
            }
        }
        // (HL) <- r
        for (let r1 in regCode) {
            let r1b = regCode[r1]
            this.instructions[0b01 << 6 + r1b << 3 + 0b110] = () => {
                this.MMU.wb(this.reg.h << 8 + this.reg.l, this.reg[r1])
                this.clock.m += 2
            }
        }
        // (HL) <- n
        this.instructions[0b110110] = () => {
            this.pc += 1
            this.MMU.wb(this.reg.h << 8 + this.reg.l, this.MMU.rb(this.reg.pc))
            this.clock.m += 3
        }
        // A <- (BC)
        this.instructions[0b001010] = () => {
            this.reg.a = this.MMU.rb(this.reg.b << 8 + this.reg.c)
            this.clock.m += 2
        }
        // A <- (DE)
        this.instructions[0b011010] = () => {
            this.reg.a = this.MMU.rb(this.reg.d << 8 + this.reg.e)
            this.clock.m += 2
        }
        // A <- (FF00H+C)
        this.instructions[0b11110010] = () => {
            this.reg.a = this.MMU.rb(0xff00 + this.reg.c)
            this.clock.m += 2
        }
        // (FF00H+C) <- A
        this.instructions[0b11100010] = () => {
            this.MMU.wb(0xff00 + this.reg.c, this.reg.a)
            this.clock.m += 2
        }
        // A <- (n)
        this.instructions[0b11110000] = () => {
            this.pc += 1
            this.reg.a = this.MMU.rb(0xff00 + this.MMU.rb(this.pc))
            this.clock.m += 3
        }
        // (n) <- A
        this.instructions[0b11100000] = () => {
            this.pc += 1
            this.MMU.wb(0xff00 + this.MMU.rb(this.reg.pc), this.reg.a)
            this.clock.m += 3
        }
        // A <- (nn)
        this.instructions[0b11111010] = () => {
            this.pc += 1
            this.reg.a = this.MMU.rb(this.MMU.rw(this.pc))
            this.pc += 1
            this.clock.m += 4
        }
        // (nn) <- A
        this.instructions[0b11101010] = () => {
            this.pc += 1
            this.MMU.wb(this.MMU.rw(this.reg.pc), this.reg.a)
            this.pc += 1
            this.clock.m += 4
        }
        // A ← (HL) HL ← HL+1
        this.instructions[0b101010] = () => {
            this.reg.a = this.MMU.rb(this.reg.h << 8 + this.reg.l)
            let hl = this.reg.h << 8 + this.reg.l
            hl += 1
            hl &= 0xffff
            this.reg.h = hl >> 8
            this.reg.l = hl & 0xff
            this.clock.m += 2
        }
        // A ← (HL) HL ← HL+1
        this.instructions[0b101010] = () => {
            this.reg.a = this.MMU.rb(this.reg.h << 8 + this.reg.l)
            let hl = this.reg.h << 8 + this.reg.l
            hl += 1
            hl &= 0xffff
            this.reg.h = hl >> 8
            this.reg.l = hl & 0xff
            this.clock.m += 2
        }
        // A ← (HL) HL ← HL-1
        this.instructions[0b111010] = () => {
            this.reg.a = this.MMU.rb(this.reg.h << 8 + this.reg.l)
            let hl = this.reg.h << 8 + this.reg.l
            hl -= 1
            hl &= 0xffff
            this.reg.h = hl >> 8
            this.reg.l = hl & 0xff
            this.clock.m += 2
        }
        // (bc) <- A
        this.instructions[0b10] = () => {
            this.MMU.wb(this.reg.b << 8 + this.reg.c, this.reg.a)
            this.clock.m += 2
        }
        // (de) <- A
        this.instructions[0b10010] = () => {
            this.MMU.wb(this.reg.d << 8 + this.reg.e, this.reg.a)
            this.clock.m += 2
        }
        // (HL) ← A HL ← HL+1
        this.instructions[0b100010] = () => {
            this.MMU.wb(this.reg.h << 8 + this.reg.l, this.reg.a)
            let hl = this.reg.h << 8 + this.reg.l
            hl += 1
            hl &= 0xffff
            this.reg.h = hl >> 8
            this.reg.l = hl & 0xff
            this.clock.m += 2
        }
        // (HL) ← A HL ← HL-1
        this.instructions[0b110010] = () => {
            this.MMU.wb(this.reg.h << 8 + this.reg.l, this.reg.a)
            let hl = this.reg.h << 8 + this.reg.l
            hl -= 1
            hl &= 0xffff
            this.reg.h = hl >> 8
            this.reg.l = hl & 0xff
            this.clock.m += 2
        }

        // ____________________________________________________
        // 
        // 16-Bit Transfer Instructions
        // ____________________________________________________

        // dd ← nn
        for (let r1 in regddCode) {
            let r1b = regddCode[r1]
            this.instructions[r1b << 4 + 0b1] = () => {
                this.pc += 1
                this.reg[r1.charAt(1)] = this.MMU.rb(this.pc)
                this.pc += 1
                this.reg[r1.charAt(0)] = this.MMU.rb(this.pc)
                this.clock.m += 3
            }
        }
        // sp ← nn
        this.instructions[0b110001] = () => {
            this.pc += 1
            this.reg.sp = this.MMU.rw(this.pc)
            this.pc += 1
            this.clock.m += 3
        }
        // SP ← HL
        this.instructions[0b11111001] = () => {
            this.reg.sp = this.reg.h << 8 + this.reg.l
            this.clock.m += 2
        }
        // PUSH qq (SP - 1) ← qqH (SP - 2) ← qqL  SP ← SP-2
        for (let r1 in regqqCode) {
            let r1b = regqqCode[r1]
            this.instructions[0b11 << 6 + r1b << 4 + 0b101] = () => {
                this.reg.sp -= 1
                this.MMU.wb(this.reg.sp, this.reg[r1.charAt(0)])
                this.reg.sp -= 1
                this.MMU.wb(this.reg.sp, this.reg[r1.charAt(1)])
                this.clock.m += 4
            }
        }
        // POP qq qqL ← (SP) qqH ← (SP+1)  SP ← SP+2
        for (let r1 in regqqCode) {
            let r1b = regqqCode[r1]
            this.instructions[0b11 << 6 + r1b << 4 + 0b001] = () => {
                this.reg[r1.charAt(1)] = this.MMU.rb(this.reg.sp)
                this.reg.sp += 1
                this.reg[r1.charAt(0)] = this.MMU.rb(this.reg.sp)
                this.reg.sp += 1
                this.clock.m += 3
            }
        }
        // HL ← SP+e
        this.instructions[0b11111000] = () => {
            this.pc += 1
            let e = this.MMU.rb(this.reg.pc)
            if (e > 127) e = -((~e + 1) & 255)
            e += this.reg.sp
            this.reg.h = (e >> 8) & 0xff
            this.reg.l = e & 0xff
            this.reg.f = 0
            this.clock.m += 3
        }
        // LD (nn), SP   (nn) ← SPL   (nnH) ← SPH
        this.instructions[0b1000] = () => {
            this.pc += 1
            this.MMU.wb(this.MMU.rw(this.reg.pc), this.reg.sp & 0xff)
            this.MMU.wb(this.MMU.rw(this.reg.pc) + 1, this.reg.sp >> 8)
            this.pc += 1
            this.clock.m += 5
        }

        // ____________________________________________________
        // 
        // 8-Bit Arithmetic and Logical Operation Instructions
        // ____________________________________________________

        // A ← A + r
        for (let r1 in regCode) {
            let r1b = regCode[r1]
            this.instructions[0b10000 << 3 + r1b] = () => {
                let a = this.reg.a
                this.reg.a += this.reg[r1]
                let z = 0, n = 0, h = 0, c = 0
                if (this.reg.a > 255) c = 1
                this.reg.a &= 0xff
                if (this.reg.a == 0) z = 1
                if ((this.reg.a ^ this.reg[r1] ^ a) & 0x10) h = 1
                this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
                this.clock.m += 1
            }
        }
        // A ← A + n
        this.instructions[0b11000110] = () => {
            this.reg.pc += 1
            let d8 = this.MMU.rb(this.reg.pc)
            let a = this.reg.a
            this.reg.a += d8
            let z = 0, n = 0, h = 0, c = 0
            if (this.reg.a > 255) c = 1
            this.reg.a &= 0xff
            if (this.reg.a == 0) z = 1
            if ((this.reg.a ^ d8 ^ a) & 0x10) h = 1
            this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
            this.clock.m += 2
        }
        // A ← A + (HL)
        this.instructions[0b10000110] = () => {
            let d8 = this.MMU.rb(this.reg.h << 8 + this.reg.l)
            let a = this.reg.a
            this.reg.a += d8
            let z = 0, n = 0, h = 0, c = 0
            if (this.reg.a > 255) c = 1
            this.reg.a &= 0xff
            if (this.reg.a == 0) z = 1
            if ((this.reg.a ^ d8 ^ a) & 0x10) h = 1
            this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
            this.clock.m += 2
        }
        // A ← A+r+CY
        for (let r1 in regCode) {
            let r1b = regCode[r1]
            this.instructions[0b10001 << 3 + r1b] = () => {
                let a = this.reg.a
                this.reg.a += this.reg[r1]
                this.reg.a += (this.reg.f & 0x10) ? 1 : 0
                let z = 0, n = 0, h = 0, c = 0
                if (this.reg.a > 255) c = 1
                this.reg.a &= 0xff
                if (this.reg.a == 0) z = 1
                if ((this.reg.a ^ this.reg[r1] ^ a) & 0x10) h = 1
                this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
                this.clock.m += 1
            }
        }
        // A ← A+n+CY
        this.instructions[0b11001110] = () => {
            this.reg.pc += 1
            let d8 = this.MMU.rb(this.reg.pc)
            let a = this.reg.a
            this.reg.a += d8
            this.reg.a += (this.reg.f & 0x10) ? 1 : 0
            let z = 0, n = 0, h = 0, c = 0
            if (this.reg.a > 255) c = 1
            this.reg.a &= 0xff
            if (this.reg.a == 0) z = 1
            if ((this.reg.a ^ d8 ^ a) & 0x10) h = 1
            this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
            this.clock.m += 2
        }
        // A ← A+(HL)+CY
        this.instructions[0b10001110] = () => {
            let d8 = this.MMU.rb(this.reg.h << 8 + this.reg.l)
            let a = this.reg.a
            this.reg.a += d8
            this.reg.a += (this.reg.f & 0x10) ? 1 : 0
            let z = 0, n = 0, h = 0, c = 0
            if (this.reg.a > 255) c = 1
            this.reg.a &= 0xff
            if (this.reg.a == 0) z = 1
            if ((this.reg.a ^ d8 ^ a) & 0x10) h = 1
            this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
            this.clock.m += 2
        }
        //A ← A-r
        for (let r1 in regCode) {
            let r1b = regCode[r1]
            this.instructions[0b10010 << 3 + r1b] = () => {
                let a = this.reg.a
                this.reg.a -= this.reg[r1]
                let z = 0, n = 1, h = 0, c = 0
                if (this.reg.a < 0) c = 1
                this.reg.a &= 0xff
                if (this.reg.a == 0) z = 1
                if ((this.reg.a ^ this.reg[r1] ^ a) & 0x10) h = 1
                this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
                this.clock.m += 1
            }
        }
        // A ← A - n
        this.instructions[0b11010110] = () => {
            this.reg.pc += 1
            let d8 = this.MMU.rb(this.reg.pc)
            let a = this.reg.a
            this.reg.a -= d8
            let z = 0, n = 1, h = 0, c = 0
            if (this.reg.a < 0) c = 1
            this.reg.a &= 0xff
            if (this.reg.a == 0) z = 1
            if ((this.reg.a ^ d8 ^ a) & 0x10) h = 1
            this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
            this.clock.m += 2
        }
        // A ← A - (HL)
        this.instructions[0b10010110] = () => {
            let d8 = this.MMU.rb(this.reg.h << 8 + this.reg.l)
            let a = this.reg.a
            this.reg.a -= d8
            let z = 0, n = 1, h = 0, c = 0
            if (this.reg.a < 0) c = 1
            this.reg.a &= 0xff
            if (this.reg.a == 0) z = 1
            if ((this.reg.a ^ d8 ^ a) & 0x10) h = 1
            this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
            this.clock.m += 2
        }
        // A ← A-r-CY
        for (let r1 in regCode) {
            let r1b = regCode[r1]
            this.instructions[0b10011 << 3 + r1b] = () => {
                let a = this.reg.a
                this.reg.a -= this.reg[r1]
                this.reg.a -= (this.reg.f & 0x10) ? 1 : 0
                let z = 0, n = 1, h = 0, c = 0
                if (this.reg.a < 0) c = 1
                this.reg.a &= 0xff
                if (this.reg.a == 0) z = 1
                if ((this.reg.a ^ this.reg[r1] ^ a) & 0x10) h = 1
                this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
                this.clock.m += 1
            }
        }
        // A ← A-n-CY
        this.instructions[0b11011110] = () => {
            this.reg.pc += 1
            let d8 = this.MMU.rb(this.reg.pc)
            let a = this.reg.a
            this.reg.a -= d8
            this.reg.a -= (this.reg.f & 0x10) ? 1 : 0
            let z = 0, n = 0, h = 0, c = 0
            if (this.reg.a < 0) c = 1
            this.reg.a &= 0xff
            if (this.reg.a == 0) z = 1
            if ((this.reg.a ^ d8 ^ a) & 0x10) h = 1
            this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
            this.clock.m += 2
        }
        // A ← A-(HL)-CY
        this.instructions[0b10011110] = () => {
            let d8 = this.MMU.rb(this.reg.h << 8 + this.reg.l)
            let a = this.reg.a
            this.reg.a -= d8
            this.reg.a -= (this.reg.f & 0x10) ? 1 : 0
            let z = 0, n = 1, h = 0, c = 0
            if (this.reg.a < 0) c = 1
            this.reg.a &= 0xff
            if (this.reg.a == 0) z = 1
            if ((this.reg.a ^ d8 ^ a) & 0x10) h = 1
            this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
            this.clock.m += 2
        }
        //A ← A & r
        for (let r1 in regCode) {
            let r1b = regCode[r1]
            this.instructions[0b10100 << 3 + r1b] = () => {
                this.reg.a &= this.reg[r1]
                let z = 0, n = 0, h = 1, c = 0
                if (this.reg.a == 0) z = 1
                this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
                this.clock.m += 1
            }
        }
        // A ← A & n
        this.instructions[0b11100110] = () => {
            this.reg.pc += 1
            let d8 = this.MMU.rb(this.reg.pc)
            this.reg.a &= d8
            let z = 0, n = 0, h = 1, c = 0
            if (this.reg.a == 0) z = 1
            this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
            this.clock.m += 2
        }
        // A ← A & (HL)
        this.instructions[0b10100110] = () => {
            let d8 = this.MMU.rb(this.reg.h << 8 + this.reg.l)
            this.reg.a &= d8
            let z = 0, n = 0, h = 1, c = 0
            if (this.reg.a == 0) z = 1
            this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
            this.clock.m += 2
        }
        //A ← A | r
        for (let r1 in regCode) {
            let r1b = regCode[r1]
            this.instructions[0b10110 << 3 + r1b] = () => {
                this.reg.a |= this.reg[r1]
                let z = 0, n = 0, h = 0, c = 0
                if (this.reg.a == 0) z = 1
                this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
                this.clock.m += 1
            }
        }
        // A ← A | n
        this.instructions[0b11110110] = () => {
            this.reg.pc += 1
            let d8 = this.MMU.rb(this.reg.pc)
            this.reg.a |= d8
            let z = 0, n = 0, h = 0, c = 0
            if (this.reg.a == 0) z = 1
            this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
            this.clock.m += 2
        }
        // A ← A | (HL)
        this.instructions[0b10110110] = () => {
            let d8 = this.MMU.rb(this.reg.h << 8 + this.reg.l)
            this.reg.a |= d8
            let z = 0, n = 0, h = 0, c = 0
            if (this.reg.a == 0) z = 1
            this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
            this.clock.m += 2
        }
        //A ← A ^ r
        for (let r1 in regCode) {
            let r1b = regCode[r1]
            this.instructions[0b10101 << 3 + r1b] = () => {
                this.reg.a ^= this.reg[r1]
                let z = 0, n = 0, h = 0, c = 0
                if (this.reg.a == 0) z = 1
                this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
                this.clock.m += 1
            }
        }
        // A ← A ^ n
        this.instructions[0b11101110] = () => {
            this.reg.pc += 1
            let d8 = this.MMU.rb(this.reg.pc)
            this.reg.a ^= d8
            let z = 0, n = 0, h = 0, c = 0
            if (this.reg.a == 0) z = 1
            this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
            this.clock.m += 2
        }
        // A ← A ^ (HL)
        this.instructions[0b10101110] = () => {
            let d8 = this.MMU.rb(this.reg.h << 8 + this.reg.l)
            this.reg.a ^= d8
            let z = 0, n = 0, h = 0, c = 0
            if (this.reg.a == 0) z = 1
            this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
            this.clock.m += 2
        }
        //CP r
        for (let r1 in regCode) {
            let r1b = regCode[r1]
            this.instructions[0b10111 << 3 + r1b] = () => {
                let a = this.reg.a
                a -= this.reg[r1]
                let z = 0, n = 1, h = 0, c = 0
                if (a < 0) c = 1
                a &= 0xff
                if (a == 0) z = 1
                if ((this.reg.a ^ this.reg[r1] ^ a) & 0x10) h = 1
                this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
                this.clock.m += 1
            }
        }
        // CP n
        this.instructions[0b11111110] = () => {
            this.reg.pc += 1
            let d8 = this.MMU.rb(this.reg.pc)
            let a = this.reg.a
            a -= d8
            let z = 0, n = 1, h = 0, c = 0
            if (a < 0) c = 1
            a &= 0xff
            if (a == 0) z = 1
            if ((this.reg.a ^ d8 ^ a) & 0x10) h = 1
            this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
            this.clock.m += 2
        }
        // CP (HL)
        this.instructions[0b10111110] = () => {
            let d8 = this.MMU.rb(this.reg.h << 8 + this.reg.l)
            let a = this.reg.a
            a -= d8
            let z = 0, n = 1, h = 0, c = 0
            if (a < 0) c = 1
            a &= 0xff
            if (a == 0) z = 1
            if ((this.reg.a ^ d8 ^ a) & 0x10) h = 1
            this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
            this.clock.m += 2
        }
        // inc r
        for (let r1 in regCode) {
            let r1b = regCode[r1]
            this.instructions[r1b << 3 + 0b100] = () => {
                let a = this.reg[r1]
                this.reg[r1] += 1
                this.reg[r1] &= 0xff
                let z = 0, n = 0, h = 0, c = (this.reg.f >> 4) & 1
                if (this.reg[r1] == 0) z = 1
                if ((this.reg[r1] ^ 1 ^ a) & 0x10) h = 1
                this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
                this.clock.m += 1
            }
        }
        // inc (HL)
        this.instructions[0b110100] = () => {
            let d8 = this.MMU.rb(this.reg.h << 8 + this.reg.l)
            let a = d8 + 1
            a &= 0xff
            this.MMU.wb(this.reg.h << 8 + this.reg.l, a)
            let z = 0, n = 0, h = 0, c = (this.reg.f >> 4) & 1
            if (a == 0) z = 1
            if ((a ^ d8 ^ 1) & 0x10) h = 1
            this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
            this.clock.m += 3
        }
        // dec r
        for (let r1 in regCode) {
            let r1b = regCode[r1]
            this.instructions[r1b << 3 + 0b100] = () => {
                let a = this.reg[r1]
                this.reg[r1] -= 1
                this.reg[r1] &= 0xff
                let z = 0, n = 1, h = 0, c = (this.reg.f >> 4) & 1
                if (this.reg[r1] == 0) z = 1
                if ((this.reg[r1] ^ 1 ^ a) & 0x10) h = 1
                this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
                this.clock.m += 1
            }
        }
        // dec (HL)
        this.instructions[0b110100] = () => {
            let d8 = this.MMU.rb(this.reg.h << 8 + this.reg.l)
            let a = d8 - 1
            a &= 0xff
            this.MMU.wb(this.reg.h << 8 + this.reg.l, a)
            let z = 0, n = 1, h = 0, c = (this.reg.f >> 4) & 1
            if (a == 0) z = 1
            if ((a ^ 1 ^ d8) & 0x10) h = 1
            this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
            this.clock.m += 3
        }
        // ____________________________________________________
        // 
        // 16-Bit Arithmetic Operation Instructions
        // ____________________________________________________

        // ADD HL, ss
        for (let r1 in regddCode) {
            let r1b = regCode[r1]
            this.instructions[r1b << 4 + 0b1001] = () => {
                let hl = this.reg.h << 8 + this.reg.l
                hl += this.reg[r1.charAt(0)] << 8 + this.reg[r1.charAt(1)]
                let z = this.reg.f >> 7, n = 0, h = 0, c = 0
                if (hl > 0xffff) c = 1
                hl &= 0xffff
                this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
                this.clock.m += 2
            }
        }
        // ADD HL, SP
        this.instructions[0b111001] = () => {
            let hl = this.reg.h << 8 + this.reg.l
            hl += this.reg.sp
            let z = this.reg.f >> 7, n = 0, h = 0, c = 0
            if (hl > 0xffff) c = 1
            hl &= 0xffff
            this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
            this.clock.m += 2
        }
        // ADD SP, e  SP ← SP + e
        this.instructions[0b11101000] = () => {
            this.pc += 1
            let e = this.MMU.rb(this.reg.pc)
            if (e > 127) e = -((~e + 1) & 255)
            this.reg.sp += e
            let z = 0, n = 0, h = 0, c = 0
            if (this.reg.sp > 0xffff) c = 1
            this.reg.sp &= 0xffff
            this.reg.f = z << 7 + n << 6 + h << 5 + c << 4
            this.clock.m += 4
        }
        // inc ss
        for (let r1 in regddCode) {
            let r1b = regCode[r1]
            this.instructions[r1b << 4 + 0b0011] = () => {
                let d16 = this.reg[r1.charAt(0)] << 8 + this.reg[r1.charAt(1)]
                d16 += 1
                d16 &= 0xffff
                this.reg[r1.charAt(0)] = d16 >> 8
                this.reg[r1.charAt(1)] = d16 & 0xff
                this.clock.m += 2
            }
        }
        //inc SP
        this.instructions[0b110011] = () => {
            let d16 = this.reg.sp
            d16 += 1
            d16 &= 0xffff
            this.reg.sp = d16
            this.clock.m += 2
        }
        // dec ss
        for (let r1 in regddCode) {
            let r1b = regCode[r1]
            this.instructions[r1b << 4 + 0b1011] = () => {
                let d16 = this.reg[r1.charAt(0)] << 8 + this.reg[r1.charAt(1)]
                d16 -= 1
                d16 &= 0xffff
                this.reg[r1.charAt(0)] = d16 >> 8
                this.reg[r1.charAt(1)] = d16 & 0xff
                this.clock.m += 2
            }
        }
        //dec SP
        this.instructions[0b111011] = () => {
            let d16 = this.reg.sp
            d16 -= 1
            d16 &= 0xffff
            this.reg.sp = d16
            this.clock.m += 2
        }
        // ____________________________________________________
        // 
        // Rotate Shift Instructions
        // ____________________________________________________

        //RLCA
        this.instructions[0b111] = () => {
            let b7 = this.reg.a & 0x80 ? 1 : 0
            this.reg.f = b7 << 4
            this.reg.a = (this.reg.a << 1) + b7
            this.reg.a &= 0xff
            this.clock.m += 1
        }
        //RLA
        this.instructions[0b10111] = () => {
            let b7 = this.reg.a & 0x80 ? 1 : 0
            this.reg.a = (this.reg.a << 1) + this.reg.f & 0x10 ? 1 : 0
            this.reg.a &= 0xff
            this.reg.f = b7 << 4
            this.clock.m += 1
        }
        //RRCA
        this.instructions[0b1111] = () => {
            let b0 = this.reg.a & 0b1
            this.reg.f = b0 << 4
            this.reg.a = (this.reg.a >> 1) + b0 << 7
            this.reg.a &= 0xff
            this.clock.m += 1
        }
        //RRA
        this.instructions[0b11111] = () => {
            let b0 = this.reg.a & 0b1
            this.reg.a = (this.reg.a >> 1) + this.reg.f & 0x10 ? 0b1 << 7 : 0
            this.reg.a &= 0xff
            this.reg.f = b0 << 4
            this.clock.m += 1
        }
        // RLC r
        for (let r1 in regCode) {
            let r1b = regCode[r1]
            this.instructions[0x100 + r1b] = () => {
                let b7 = this.reg[r1] & 0x80 ? 1 : 0
                this.reg[r1] = (this.reg[r1] << 1) + b7
                this.reg[r1] &= 0xff
                let z = this.reg[r1] ? 0 : 1
                this.reg.f = z << 7 + b7 << 4
                this.clock.m += 2
            }
        }
        // RLC (HL)
        this.instructions[0x100 + 0b110] = () => {
            let a = this.MMU.rb(this.reg.h << 8 + this.reg.l)
            let b7 = a & 0x80 ? 1 : 0
            a = (a << 1) + b7
            a &= 0xff
            this.MMU.wb(this.reg.h << 8 + this.reg.l, a)
            let z = a ? 0 : 1
            this.reg.f = z << 7 + b7 << 4
            this.clock.m += 4
        }
        // RL r
        for (let r1 in regCode) {
            let r1b = regCode[r1]
            this.instructions[0x100 + 0b10 << 3 + r1b] = () => {
                let b7 = this.reg[r1] & 0x80 ? 1 : 0
                this.reg[r1] = (this.reg[r1] << 1) + this.reg.f & 0x10 ? 1 : 0
                this.reg[r1] &= 0xff
                let z = this.reg[r1] ? 0 : 1
                this.reg.f = z << 7 + b7 << 4
                this.clock.m += 2
            }
        }
        // RL (HL)
        this.instructions[0x100 + 0b10110] = () => {
            let a = this.MMU.rb(this.reg.h << 8 + this.reg.l)
            let b7 = a & 0x80 ? 1 : 0
            a = (a << 1) + this.reg.f & 0x10 ? 1 : 0
            a &= 0xff
            this.MMU.wb(this.reg.h << 8 + this.reg.l, a)
            let z = a ? 0 : 1
            this.reg.f = z << 7 + b7 << 4
            this.clock.m += 4
        }
        // RRC r
        for (let r1 in regCode) {
            let r1b = regCode[r1]
            this.instructions[0x100 + 0b1 << 3 + r1b] = () => {
                let b0 = this.reg[r1] & 0b1
                this.reg[r1] = (this.reg[r1] >> 1) + b0 << 7
                this.reg[r1] &= 0xff
                let z = this.reg[r1] ? 0 : 1
                this.reg.f = z << 7 + b0 << 4
                this.clock.m += 2
            }
        }
        //  RRC (HL)
        this.instructions[0x100 + 0b1110] = () => {
            let a = this.MMU.rb(this.reg.h << 8 + this.reg.l)
            let b0 = a & 0b1
            a = (a >> 1) + b0 << 7
            a &= 0xff
            this.MMU.wb(this.reg.h << 8 + this.reg.l, a)
            let z = a ? 0 : 1
            this.reg.f = z << 7 + b0 << 4
            this.clock.m += 4
        }
        //  RR r
        for (let r1 in regCode) {
            let r1b = regCode[r1]
            this.instructions[0x100 + 0b11 << 3 + r1b] = () => {
                let b0 = this.reg[r1] & 0b1
                this.reg[r1] = (this.reg[r1] >> 1) + this.reg.f & 0x10 ? 0b1 << 7 : 0
                this.reg[r1] &= 0xff
                let z = this.reg[r1] ? 0 : 1
                this.reg.f = z << 7 + b0 << 4
                this.clock.m += 2
            }
        }
        // RR (HL)
        this.instructions[0x100 + 0b11110] = () => {
            let a = this.MMU.rb(this.reg.h << 8 + this.reg.l)
            let b0 = a & 0b1
            a = (a >> 1) + this.reg.f & 0x10 ? 0b1 << 7 : 0
            a &= 0xff
            this.MMU.wb(this.reg.h << 8 + this.reg.l, a)
            let z = a ? 0 : 1
            this.reg.f = z << 7 + b0 << 4
            this.clock.m += 4
        }
        // SLA r
        for (let r1 in regCode) {
            let r1b = regCode[r1]
            this.instructions[0x100 + 0b100 << 3 + r1b] = () => {
                let b7 = this.reg[r1] & 0x80 ? 1 : 0
                this.reg[r1] = (this.reg[r1] << 1)
                this.reg[r1] &= 0xff
                let z = this.reg[r1] ? 0 : 1
                this.reg.f = z << 7 + b7 << 4
                this.clock.m += 2
            }
        }
        // SLA (HL)
        this.instructions[0x100 + 0b100110] = () => {
            let a = this.MMU.rb(this.reg.h << 8 + this.reg.l)
            let b7 = a & 0x80 ? 1 : 0
            a = (a << 1)
            a &= 0xff
            this.MMU.wb(this.reg.h << 8 + this.reg.l, a)
            let z = a ? 0 : 1
            this.reg.f = z << 7 + b7 << 4
            this.clock.m += 4
        }
        // SRA r
        for (let r1 in regCode) {
            let r1b = regCode[r1]
            this.instructions[0x100 + 0b101 << 3 + r1b] = () => {
                let b0 = this.reg[r1] & 0b1
                let b7 = this.reg[r1] & 0x80 ? 1 : 0
                this.reg[r1] = (this.reg[r1] >> 1) + b7 << 7
                this.reg[r1] &= 0xff
                let z = this.reg[r1] ? 0 : 1
                this.reg.f = z << 7 + b0 << 4
                this.clock.m += 2
            }
        }
        // SRA (HL)
        this.instructions[0x100 + 0b101110] = () => {
            let a = this.MMU.rb(this.reg.h << 8 + this.reg.l)
            let b0 = a & 0b1
            let b7 = a & 0x80 ? 1 : 0
            a = (a >> 1) + b7 << 7
            a &= 0xff
            this.MMU.wb(this.reg.h << 8 + this.reg.l, a)
            let z = a ? 0 : 1
            this.reg.f = z << 7 + b0 << 4
            this.clock.m += 4
        }
        // SRL r
        for (let r1 in regCode) {
            let r1b = regCode[r1]
            this.instructions[0x100 + 0b111 << 3 + r1b] = () => {
                let b0 = this.reg[r1] & 0b1
                this.reg[r1] = (this.reg[r1] >> 1)
                this.reg[r1] &= 0xff
                let z = this.reg[r1] ? 0 : 1
                this.reg.f = z << 7 + b0 << 4
                this.clock.m += 2
            }
        }
        // SRL (HL)
        this.instructions[0x100 + 0b111110] = () => {
            let a = this.MMU.rb(this.reg.h << 8 + this.reg.l)
            let b0 = a & 0b1
            a = (a >> 1)
            a &= 0xff
            this.MMU.wb(this.reg.h << 8 + this.reg.l, a)
            let z = a ? 0 : 1
            this.reg.f = z << 7 + b0 << 4
            this.clock.m += 4
        }
        // SWAP r
        for (let r1 in regCode) {
            let r1b = regCode[r1]
            this.instructions[0x100 + 0b110 << 3 + r1b] = () => {
                let h = this.reg[r1] >> 4
                let l = this.reg[r1] & 0xf
                this.reg[r1] = l << 4 + h
                let z = this.reg[r1] ? 0 : 1
                this.reg.f = z << 7
                this.clock.m += 2
            }
        }
        // SWAP (HL)
        this.instructions[0x100 + 0b110110] = () => {
            let a = this.MMU.rb(this.reg.h << 8 + this.reg.l)
            let h = a >> 4
            let l = a & 0xf
            a = l << 4 + h
            this.MMU.wb(this.reg.h << 8 + this.reg.l, a)
            let z = a ? 0 : 1
            this.reg.f = z << 7
            this.clock.m += 4
        }

        // ____________________________________________________
        // 
        // Bit Operations
        // ____________________________________________________

        // BIT b, r
        for (let b of [0, 1, 2, 3, 4, 5, 6, 7]) {
            for (let r1 in regCode) {
                let r1b = regCode[r1]
                this.instructions[0x100 + 0b01 << 6 + b << 3 + r1b] = () => {
                    let h = 1
                    let z = ~((this.reg[r1] >> b) & 0b1)
                    this.reg.f = z << 7 + h << 5
                    this.clock.m += 2
                }
            }
        }
        // BIT b, (HL)
        for (let b of [0, 1, 2, 3, 4, 5, 6, 7]) {
            this.instructions[0x100 + 0b01 << 6 + b << 3 + 0b110] = () => {
                let a = this.MMU.rb(this.reg.h << 8 + this.reg.l)
                let h = 1
                let z = ~((a >> b) & 0b1)
                this.reg.f = z << 7 + h << 5
                this.clock.m += 3
            }
        }
        // SET b, r
        for (let b of [0, 1, 2, 3, 4, 5, 6, 7]) {
            for (let r1 in regCode) {
                let r1b = regCode[r1]
                this.instructions[0x100 + 0b11 << 6 + b << 3 + r1b] = () => {
                    this.reg[r1] |= 1 << b
                    this.clock.m += 2
                }
            }
        }
        // SET b, (HL)
        for (let b of [0, 1, 2, 3, 4, 5, 6, 7]) {
            this.instructions[0x100 + 0b11 << 6 + b << 3 + 0b110] = () => {
                let a = this.MMU.rb(this.reg.h << 8 + this.reg.l)
                a |= 1 << b
                this.MMU.wb(this.reg.h << 8 + this.reg.l, a)
                this.clock.m += 4
            }
        }
        // RES b, r
        for (let b of [0, 1, 2, 3, 4, 5, 6, 7]) {
            for (let r1 in regCode) {
                let r1b = regCode[r1]
                this.instructions[0x100 + 0b10 << 6 + b << 3 + r1b] = () => {
                    this.reg[r1] &= (~(1 << b)) & 0xff
                    this.clock.m += 2
                }
            }
        }
        // RES b, (HL)
        for (let b of [0, 1, 2, 3, 4, 5, 6, 7]) {
            this.instructions[0x100 + 0b11 << 6 + b << 3 + 0b110] = () => {
                let a = this.MMU.rb(this.reg.h << 8 + this.reg.l)
                a &= (~(1 << b)) & 0xff
                this.MMU.wb(this.reg.h << 8 + this.reg.l, a)
                this.clock.m += 4
            }
        }
        // ____________________________________________________
        // 
        // Jump Instructions
        // ____________________________________________________

        // JP nn
        
    }

    reset () {
        this.reg.a = 0; this.reg.b = 0; this.reg.c = 0; this.reg.d = 0; this.reg.e = 0; this.reg.h = 0; this.reg.l = 0; this.reg.f = 0;
        this.reg.sp = 0; this.reg.pc = 0; this.reg.i = 0; this.reg.r = 0;
        this.reg.m = 0; this.reg.t = 0;
        this.halt = 0; this.stop = 0;
        this.clock.m = 0; this.clock.t = 0;
        this.reg.ime = 1;
    }

    exec () {
        this.reg.r = (this.reg.r + 1) & 127;
        this._map[MMU.rb(this.reg.pc)]();
        this.reg.pc += 1;
        this.reg.pc &= 65535;
        this.clock.m += this.reg.m; this.clock.t += this.reg.t;
        if (MMU._inbios && this.reg.pc == 0x0100) MMU._inbios = 0;
    }
}