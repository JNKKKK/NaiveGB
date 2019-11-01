class Timer {
    constructor () {
        this.reg = { divider: 0, counter: 0, modulo: 0, control: 0 }
        this.last_m = 0
        this.div_m = 0
        this.cnt_m = 0
    }

    reset () {
        this.reg = { divider: 0, counter: 0, modulo: 0, control: 0 }
        this.last_m = 0
        this.div_m = 0
        this.cnt_m = 0
    }

    connect_mmu (mmu) {
        this.MMU = mmu
    }

    sync (m) {
        let dm = m - this.last_m
        this.last_m = m
        if (dm == 0) dm = 1
        // divider timer
        this.div_m += dm
        if (this.div_m >= 4 * 16) {
            this.div_m -= 4 * 16
            this.reg.divider += 1
            this.reg.divider &= 0xff
        }
        // counter timer
        if (this.reg.control & 0b100) {
            this.cnt_m += dm
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
            case 0xFF05: this.reg.counter = val; break;
            case 0xFF06: this.reg.modulo = val; break;
            case 0xFF07: this.reg.control = val & 0b111; break;
        }
    }
}

export default Timer