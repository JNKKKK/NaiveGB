// T-Edge       // A single tick of the Game Boy's clock, from low to high, or high to low - 8,388,608 hz
// T-Cycle (t)  // Two T-Edges - 4,194,304 hz
// M-Cycle (m)  // Four T-Cycles - 1,048,576 hz

class Timer {
    constructor (bridge) {
        this.bridge = bridge
    }

    init () {
        this.MMU = this.bridge.MMU
        this.GPU = this.bridge.GPU
        this.reset()
    }

    reset () {
        this.reg = {
            divider: 0, // FF04 - DIV
            counter: 0, // FF05 - TIMA This timer is incremented by a clock frequency specified by the TAC register
            modulo: 0, // FF06 - TMA When the TIMA overflows, this data will be loaded.
            control: 0 // FF07 - TAC
        }
        this.total_m = 0
        this.div_m = 0
        this.cnt_m = 0
    }

    step (m) {
        this.total_m += m
        // divider timer
        this.div_m += m
        if (this.div_m >= 4 * 16) {
            this.div_m -= 4 * 16
            this.reg.divider += 1
            this.reg.divider &= 0xff
        }
        // counter timer
        if (this.reg.control & 0b100) {
            this.cnt_m += m
            let threshold = 4
            if ((this.reg.control & 0b11) == 0) threshold = 4 * 64
            if ((this.reg.control & 0b11) == 1) threshold = 4 * 1
            if ((this.reg.control & 0b11) == 2) threshold = 4 * 4
            if ((this.reg.control & 0b11) == 3) threshold = 4 * 16

            while (this.cnt_m >= threshold) {
                this.cnt_m -= threshold
                this.reg.counter += 1
                if (this.reg.counter > 0xff) {
                    this.reg.counter = this.reg.modulo
                    this.MMU.if |= 4
                }
            }
        }
        // gpu checkline
        this.GPU.step(m)
    }

    rb (addr) {
        switch (addr) {
            case 0xFF04: return this.reg.divider;
            case 0xFF05: return this.reg.counter;
            case 0xFF06: return this.reg.modulo;
            case 0xFF07: return this.reg.control;
        }
    }

    wb (addr, val) {
        switch (addr) {
            case 0xFF04: this.reg.divider = 0; break;
            case 0xFF05:
                this.reg.counter = val;
                // this.cnt_m = 0;
                break;
            case 0xFF06: this.reg.modulo = val; break;
            case 0xFF07:
                // if turning the timer on/off, clear the temporary count
                if ((this.reg.control & 0b100) != (val & 0b100)) {
                    this.cnt_m = 0
                }
                this.reg.control = val & 0b111;
                break;
        }
    }
}

export default Timer