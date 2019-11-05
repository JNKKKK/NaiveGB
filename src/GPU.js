class GPU {

    constructor () {
        this.reset()
    }

    reset () {
        // LCDC reg
        this.lcdc_0_bg_disp = 0
        this.lcdc_1_obj_enable = 0
        this.lcdc_2_obj_size = 0
        this.lcdc_3_tilemap = 0
        this.lcdc_4_tileset = 0
        this.lcdc_5_win_enable = 0
        this.lcdc_6_win_tilemap = 0
        this.lcdc_7_enable = 0
        // STAT REG
        this.stat_01_mode = 0
        this.stat_2_lyc_ly = 0
        this.stat_3_hb_int = 0
        this.stat_4_vb_int = 0
        this.stat_5_oam_int = 0
        this.stat_6_lyc_int = 0
        // regs
        this.reg = {}
        this.reg.scy = 0
        this.reg.scx = 0
        this.reg.ly = 0
        this.reg.lyc = 0
        this.reg.wy = 0
        this.reg.wx = 0
        this.reg.bg_palette = 0
        this.reg.obj_palette0 = 0
        this.reg.obj_palette1 = 0
        //
        this.modeclocks = 0
        this.linemode = 2
        this.palette = {
            'bg': Array(4).fill([0, 0, 0, 255]),
            'obj0': Array(4).fill([0, 0, 0, 255]),
            'obj1': Array(4).fill([0, 0, 0, 255])
        }
        // vram, oam
        this.vram = Array(8192).fill(0)
        this.oam = Array(160).fill(0)
        // tileset
        this.tileset = Array(384).fill(Array(64).fill(0))
        // tilemap
        this.tilemap = []
        this.tilemap[0] = Array(1024).fill([0, 0])
        this.tilemap[1] = Array(1024).fill([0, 0])
    }

    connect_mmu (mmu) {
        this.MMU = mmu
    }

    connect_canvas (c) {
        try {
            this.canvas = c.getContext('2d');
            this.scrn = this.canvas.createImageData(160, 144);
            for (let i = 0; i < this.scrn.data.length; i++)
                this.scrn.data[i] = 255;
            this.canvas.putImageData(this.scrn, 0, 0);
        } catch (error) {
            console.error(error)
            console.error('GPU: Canvas context could not be created.')
        }
    }

    render_bg () {
        let i = 0
        for (let a = this.reg.scy; a < (this.reg.scy + 144); a++) {
            for (let b = this.reg.scx; b < (this.reg.scx + 160); b++) {
                let x = b
                let y = a
                if (x > 255) x -= 256
                if (y > 255) y -= 256
                let palette_i = this.tilemap[this.lcdc_3_tilemap][Math.floor(y / 8) * 32 + Math.floor(x / 8)][this.lcdc_4_tileset][(y % 8) * 8 + (x % 8)]
                for (let rgba of this.palette.bg[palette_i]) {
                    this.scrn.data[i] = rgba
                    i += 1
                }
            }
        }
    }

    update_tileset (addr) {
        let i = Math.floor(addr / 16)
        this.tileset[i] = []
        for (let j = 0; j < 16; j += 2) {
            for (let k = 7; k >= 0; k--) {
                let l = (this.vram[16 * i + j] >> k) & 0b1
                let u = (this.vram[16 * i + j + 1] >> k) & 0b1
                this.tileset[i].push((u << 1) + l)
            }
        }
    }

    update_tilemap (addr) {
        let tm_i
        if ((addr >= 0x1800) && (addr <= 0x1bff)) tm_i = 0
        if ((addr >= 0x1c00) && (addr <= 0x1fff)) tm_i = 1
        let tile_i_1 = this.vram[addr]
        let tile_i_0 = 0x80 + ((this.vram[addr] + 0x80) & 0xff)
        this.tilemap[tm_i][addr - 0x1800 - 0x400 * tm_i] = [this.tileset[tile_i_0], this.tileset[tile_i_1]]
    }

    step (m) {
        this.modeclocks += m;
        switch (this.linemode) {
            case 0: // In hblank
                if (this.modeclocks >= 51) {
                    if (this.reg.ly == 143) { // End of hblank for last scanline; render screen
                        this.linemode = 1;
                        // render
                        if (this.lcdc_7_enable) {
                            if (this.lcdc_0_bg_disp) {
                                this.render_bg()
                            }
                        }
                        this.canvas.putImageData(this.scrn, 0, 0);
                        this.MMU.if |= 1;
                    }
                    else {
                        this.linemode = 2;
                    }
                    this.reg.ly++;
                    this.modeclocks -= 51;
                }
                break;
            case 1: // In vblank
                if (this.modeclocks >= 114) {
                    this.modeclocks -= 114;
                    this.reg.ly++;
                    if (this.reg.ly > 153) {
                        this.reg.ly = 0;
                        this.linemode = 2;
                    }
                }
                break;
            case 2: // In OAM-read mode
                if (this.modeclocks >= 20) {
                    this.modeclocks -= 20;
                    this.linemode = 3;
                }
                break;
            case 3:  // In VRAM-read mode
                if (this.modeclocks >= 43) {
                    this.modeclocks -= 43;
                    this.linemode = 0;
                }
        }
    }

    rb (addr) {
        // 0xff4x
        switch (addr & 0xf) {
            case 0:
                return (this.lcdc_7_enable << 7) + (this.lcdc_6_win_tilemap << 6) + (this.lcdc_5_win_enable << 5) + (this.lcdc_4_tileset << 4)
                    + (this.lcdc_3_tilemap << 3) + (this.lcdc_2_obj_size << 2) + (this.lcdc_1_obj_enable << 1) + this.lcdc_0_bg_disp
            case 1:
                return (this.stat_6_lyc_int << 6) + (this.stat_5_oam_int << 5) + (this.stat_4_vb_int << 4)
                    + (this.stat_3_hb_int << 3) + (this.stat_2_lyc_ly << 2) + this.stat_01_mode
            case 2:
                return this.reg.scy
            case 3:
                return this.reg.scx
            case 4:
                return this.reg.ly
            case 5:
                return this.reg.lyc
            case 7:
                return this.reg.bg_palette
            case 8:
                return this.reg.obj_palette0
            case 9:
                return this.reg.obj_palette1
            case 0xa:
                return this.reg.wy
            case 0xb:
                return this.reg.wx
            default:
                return 0xff
        }
    }

    wb (addr, val) {
        // 0xff4x
        switch (addr & 0xf) {
            case 0:
                this.lcdc_0_bg_disp = (val & 0b1)
                this.lcdc_1_obj_enable = (val & 0b10) >> 1
                this.lcdc_2_obj_size = (val & 0b100) >> 2
                this.lcdc_3_tilemap = (val & 0b1000) >> 3
                this.lcdc_4_tileset = (val & 0b10000) >> 4
                this.lcdc_5_win_enable = (val & 0b100000) >> 5
                this.lcdc_6_win_tilemap = (val & 0b1000000) >> 6
                this.lcdc_7_enable = (val & 0b10000000) >> 7
                break
            case 1:
                this.stat_3_hb_int = (val & 0b1000) >> 3
                this.stat_4_vb_int = (val & 0b10000) >> 4
                this.stat_5_oam_int = (val & 0b100000) >> 5
                this.stat_6_lyc_int = (val & 0b1000000) >> 6
                break
            case 2:
                this.reg.scy = val;
                // console.log('scy', this.reg.scy)
                break
            case 3:
                this.reg.scx = val;
                break
            case 4: // ly
                if ((this.reg.ly & 0x80) >> 7) { // bit 7 is 1
                    if ((val & 0x80) >> 7) {
                        this.lcdc_7_enable = 0
                        this.reg.ly = 0
                    }
                }
                break
            case 5:
                this.reg.lyc = val;
                break
            case 6: // OAM DMA
                for (let i = 0; i < 160; i++) {
                    let v = this.MMU.rb((val << 8) + i);
                    this.oam[i] = v;
                    // this.updateoam(0xFE00 + i, v);
                }
                break;
            case 7: // BG palette mapping
                for (let i = 0; i < 4; i++) {
                    switch ((val >> (i * 2)) & 3) {
                        case 0: this.palette.bg[i] = [255, 255, 255, 0]; break;
                        case 1: this.palette.bg[i] = [192, 192, 192, 255]; break;
                        case 2: this.palette.bg[i] = [96, 96, 96, 255]; break;
                        case 3: this.palette.bg[i] = [0, 0, 0, 255]; break;
                    }
                }
                break;
            case 8: // OBJ0 palette mapping
                for (let i = 0; i < 4; i++) {
                    switch ((val >> (i * 2)) & 3) {
                        case 0: this.palette.obj0[i] = [255, 255, 255, 0]; break;
                        case 1: this.palette.obj0[i] = [192, 192, 192, 255]; break;
                        case 2: this.palette.obj0[i] = [96, 96, 96, 255]; break;
                        case 3: this.palette.obj0[i] = [0, 0, 0, 255]; break;
                    }
                }
                break;
            case 9:  // OBJ1 palette mapping
                for (let i = 0; i < 4; i++) {
                    switch ((val >> (i * 2)) & 3) {
                        case 0: this.palette.obj1[i] = [255, 255, 255, 0]; break;
                        case 1: this.palette.obj1[i] = [192, 192, 192, 255]; break;
                        case 2: this.palette.obj1[i] = [96, 96, 96, 255]; break;
                        case 3: this.palette.obj1[i] = [0, 0, 0, 255]; break;
                    }
                }
                break;
            case 0xa:
                this.reg.wy = val
                break
            case 0xb:
                this.reg.wx = val
                break
        }
    }
}

export default GPU