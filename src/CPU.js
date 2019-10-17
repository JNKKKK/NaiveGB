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
        this.instructions = Array(0xf * 0xf * 2).fill(() => console.log('instruction not implemented!'))
        //Make instruction table
        var regCode = { 'a': 0b111, 'b': 0b000, 'c': 0b001, 'd': 0b101, 'e': 0b011, 'h': 0b100, 'l': 0b101 }

        // 8-Bit Transfer and Input/Output Instructions
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