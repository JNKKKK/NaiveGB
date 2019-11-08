class Joypad {
    constructor () {
        this.reset()
    }

    reset () {
        this.keys = [0x0F, 0x0F];
        this.colidx = 0;
    }

    rb () {
        switch (this.colidx) {
            case 0x00: return 0x00
            case 0x10: return this.keys[0]
            case 0x20: return this.keys[1]
            default: return 0x00
        }
    }

    wb (v) {
        this.colidx = v & 0x30;
    }

    keydown (e) {
        switch (e.keyCode) {
            case 39: this.keys[1] &= 0xE; break;
            case 37: this.keys[1] &= 0xD; break;
            case 38: this.keys[1] &= 0xB; break;
            case 40: this.keys[1] &= 0x7; break;
            case 90: this.keys[0] &= 0xE; break;
            case 88: this.keys[0] &= 0xD; break;
            case 32: this.keys[0] &= 0xB; break;
            case 13: this.keys[0] &= 0x7; break;
        }
    }

    keyup (e) {
        switch (e.keyCode) {
            case 39: this.keys[1] |= 0x1; break;
            case 37: this.keys[1] |= 0x2; break;
            case 38: this.keys[1] |= 0x4; break;
            case 40: this.keys[1] |= 0x8; break;
            case 90: this.keys[0] |= 0x1; break;
            case 88: this.keys[0] |= 0x2; break;
            case 32: this.keys[0] |= 0x5; break;
            case 13: this.keys[0] |= 0x8; break;
        }
    }
}

export default Joypad