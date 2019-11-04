class tile {
    constructor () {

    }
}


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
        this.palette = { 'bg': [], 'obj0': [], 'obj1': [] }
        for (let i = 0; i < 4; i++) {
            this.palette.bg[i] = [0, 0, 0, 255];
            this.palette.obj0[i] = [0, 0, 0, 255];
            this.palette.obj1[i] = [0, 0, 0, 255];
        }
        this.vram = []
        this.oam = []
        for (let i = 0; i < 8192; i++) {
            this.vram[i] = 0;
        }
        for (let i = 0; i < 160; i++) {
            this.oam[i] = 0;
        }

    }

    connect_mmu (mmu) {
        this.MMU = mmu
    }

    connect_canvas (c) {
        if (c && c.getContext) {
            this.canvas = c.getContext('2d');
            if (!this.canvas) {
                throw new Error('GPU: Canvas context could not be created.');
            }
            else {
                if (this.canvas.createImageData)
                    this.scrn = this.canvas.createImageData(160, 144);
                else if (this.canvas.getImageData)
                    this.scrn = this.canvas.getImageData(0, 0, 160, 144);
                else
                    this.scrn = { 'width': 160, 'height': 144, 'data': new Array(160 * 144 * 4) };
                for (let i = 0; i < this.scrn.data.length; i++)
                    this.scrn.data[i] = 255;
                this.canvas.putImageData(this.scrn, 0, 0);
            }
        }
    }

    render_bg () {

    }

    update_tileset () {

    }

    update_tilemap () {

    }

    step (m) {
        this.modeclocks += m;
        switch (this.linemode) {
            case 0: // In hblank
                if (this.modeclocks >= 51) {
                    // End of hblank for last scanline; render screen
                    if (this.reg.ly == 143) {
                        this.linemode = 1;
                        // console.log("render")
                        if (this.lcdc_7_enable) {
                            if (this.lcdc_0_bg_disp) {
                                let tileset = (this.lcdc_4_tileset) ? this.vram.slice(0x0000, 0x1000) : this.vram.slice(0x0800, 0x1800)
                                let tilemap = (this.lcdc_3_tilemap) ? this.vram.slice(0x1c00, 0x2000) : this.vram.slice(0x1800, 0x1c00)
                                let pixels = tilemap.map( // shape 1024
                                    i => (this.lcdc_4_tileset) ?
                                        tileset.slice(i << 4, (i << 4) + 0x10) :
                                        tileset.slice(((i + 0x80) & 0xff) << 4, (((i + 0x80) & 0xff) << 4) + 0x10)
                                ).map(b => { // shape 1024, 16
                                    let pix = []
                                    for (let i = 0; i < 16; i += 2) {
                                        for (let j = 7; j >= 0; j--) {
                                            let l = (b[i] >> j) & 0b1
                                            let u = (b[i + 1] >> j) & 0b1
                                            pix.push((u << 1) + l)
                                        }
                                    }
                                    return pix
                                }) // shape 1024, 64
                                let pix_crop = []
                                for (let i = this.reg.scy; i < (this.reg.scy + 144); i++) {
                                    for (let j = this.reg.scx; j < (this.reg.scx + 160); j++) {
                                        let x = j
                                        let y = i
                                        if (x > 255) x -= 256
                                        if (y > 255) y -= 256
                                        pix_crop.push(pixels[Math.floor(y / 8) * 32 + Math.floor(x / 8)][(y % 8) * 8 + (x % 8)])
                                    }
                                }
                                // console.log(pix_crop)
                                pix_crop = pix_crop.map(p => this.palette.bg[p]).flat()
                                // console.log('dd', pix_crop.length)

                                for (let i = 0; i < this.scrn.data.length; i++)
                                    this.scrn.data[i] = pix_crop[i];
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
                // Render scanline at end of allotted time
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
                console.log('scy', this.reg.scy)
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