class GPU {

    constructor (ngb) {
        this.ngb = ngb
    }

    init () {
        this.MMU = this.ngb.MMU
        this.reset()
    }

    reset () {
        // LCDC reg
        this.lcdc_0_bg_disp = 0     // (0=Off, 1=On)
        this.lcdc_1_obj_enable = 0  // (0=Off, 1=On)
        this.lcdc_2_obj_size = 0    // (0=8x8, 1=8x16)
        this.lcdc_3_tilemap = 0     // (0=9800-9BFF, 1=9C00-9FFF)
        this.lcdc_4_tileset = 0     // (0=8800-97FF, 1=8000-8FFF)
        this.lcdc_5_win_enable = 0  // (0=Off, 1=On)
        this.lcdc_6_win_tilemap = 0 // (0=9800-9BFF, 1=9C00-9FFF)
        this.lcdc_7_enable = 0      // (0=Off, 1=On)
        // STAT REG
        this.stat_01_mode = 2   // (Read Only)
        this.stat_2_lyc_ly = 0  // (0:LYC<>LY, 1:LYC=LY) (Read Only)
        this.stat_3_hb_int = 0  // (1=Enable) (Read/Write)
        this.stat_4_vb_int = 0  // (1=Enable) (Read/Write)
        this.stat_5_oam_int = 0 // (1=Enable) (Read/Write)
        this.stat_6_lyc_int = 0 // (1=Enable) (Read/Write)
        // regs
        this.reg = {}
        this.reg.scy = 0    // (R/W)
        this.reg.scx = 0    // (R/W)
        this.reg.ly = 0     // (R)
        this.reg.lyc = 0    // (R/W)
        this.reg.wy = 0     // (R/W)
        this.reg.wx = 0     // (R/W)
        this.reg.bg_palette = 0     // (R/W)
        this.reg.obj_palette0 = 0   // (R/W)
        this.reg.obj_palette1 = 0   // (R/W)
        //
        this.modeclocks = 0
        this.palette = {
            'bg': Array(4).fill(0).map(() => [0, 0, 0, 255]),
            'obj': [
                Array(4).fill(0).map(() => [0, 0, 0, 255]),
                Array(4).fill(0).map(() => [0, 0, 0, 255])
            ]
        }
        // vram, oam  RAW memory
        this.vram = Array(8192).fill(0)
        this.oam = Array(160).fill(0)
        // tileset
        this.tileset = Array(384).fill(0).map(() => Array(64).fill(0))
        // tilemap
        this.tilemap = []
        this.tilemap[0] = Array(1024).fill(0).map(() => [Array(64).fill(0), Array(64).fill(0)])
        this.tilemap[1] = Array(1024).fill(0).map(() => [Array(64).fill(0), Array(64).fill(0)])
        // sprite
        this.sprite = Array(40).fill(0).map(() => {
            return {
                y: 0,
                x: 0,
                pix_u: this.tileset[0],
                pix_l: this.tileset[0],
                x_flip: 0,      // (0=Normal, 1=Horizontally mirrored)
                y_flip: 0,      // (0=Normal, 1=Vertically mirrored)
                priority_bg: 0, // (0=OBJ Above BG, 1=OBJ Behind BG color 1-3)
                palette: 0,     // (0=OBP0, 1=OBP1)
                i: 0
            }
        })
        this.sprite.forEach((s, i) => s.i = i)
        this.sprite_sorted = []
        this.bg_alpha_map = Array(160 * 144).fill(0)
        this.tilemap_index = [[], []]
        //
        this.headless = false
    }

    setHeadless () {
        this.headless = true
        this.scrn = { data: [] }
        for (let i = 0; i < 160 * 144 * 4; i++)
            this.scrn.data[i] = 255;
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

    render_bg (line) {
        let i = 0
        let y = this.reg.scy + line
        for (let b = this.reg.scx; b < (this.reg.scx + 160); b++) {
            let x = b
            if (x > 255) x -= 256
            if (y > 255) y -= 256
            let palette_i = this.tilemap[this.lcdc_3_tilemap][Math.floor(y / 8) * 32 + Math.floor(x / 8)][this.lcdc_4_tileset][(y % 8) * 8 + (x % 8)]
            for (let rgba of this.palette.bg[palette_i]) {
                this.scrn.data[line * 160 * 4 + i] = rgba
                i += 1
            }
            if (this.palette.bg[palette_i][3] == 0)
                this.bg_alpha_map[line * 160 + x] = 1  // alpha
            else
                this.bg_alpha_map[line * 160 + x] = 0 // not alpha
        }
    }

    render_window (line) {
        if (line < this.reg.wy) return
        let i = 0
        let y = line - this.reg.wy
        for (let x = 0; x < 160 - (this.reg.wx - 7); x++) {
            let palette_i = this.tilemap[this.lcdc_6_win_tilemap][Math.floor(y / 8) * 32 + Math.floor(x / 8)][this.lcdc_4_tileset][(y % 8) * 8 + (x % 8)]
            for (let rgba of this.palette.bg[palette_i]) {
                this.scrn.data[line * 160 * 4 + (this.reg.wx - 7) * 4 + i] = rgba
                i += 1
            }
            if (this.palette.bg[palette_i][3] == 0)
                this.bg_alpha_map[line * 160 + (this.reg.wx - 7) + x] = 1  // alpha
            else
                this.bg_alpha_map[line * 160 + (this.reg.wx - 7) + x] = 0 // not alpha
        }
    }

    render_sprite (line) {
        function swap (arr, i, j) {
            let tmp = arr[i]
            arr[i] = arr[j]
            arr[j] = tmp
        }
        let tmp = this.sprite_sorted.filter( // filter sprites out of screen
            s => (this.lcdc_2_obj_size ?
                (s.x > 0) && (s.x < 168) && (s.y > 0) && (s.y < 160) :
                (s.x > 0) && (s.x < 168) && (s.y > 8) && (s.y < 160))
        ).filter( // sprites only cover the line
            s => (line >= s.y - 16) && (line <= s.y - 16 + (this.lcdc_2_obj_size ? 16 : 8))
        )
        // if (tmp.length > 1)
        // console.log(tmp)
        // if (this.lcdc_5_win_enable) console.log(this.lcdc_5_win_enable)
        // console.log(this.stat_3_hb_int, this.stat_4_vb_int, this.stat_5_oam_int, this.stat_6_lyc_int)
        tmp.forEach(s => {
            let pix = Array.from(this.lcdc_2_obj_size ? s.pix_u.concat(s.pix_l) : s.pix_u) // 8x16 sprite : 8x8 sprite
            if (s.x_flip) {
                for (let y = 0; y < (this.lcdc_2_obj_size ? 16 : 8); y++)
                    for (let x = 0; x < 4; x++)
                        swap(pix, y * 8 + x, y * 8 + 7 - x)
            }
            if (s.y_flip) {
                for (let x = 0; x < 8; x++)
                    for (let y = 0; y < (this.lcdc_2_obj_size ? 8 : 4); y++)
                        swap(pix, y * 8 + x, ((this.lcdc_2_obj_size ? 16 : 8) - 1 - y) * 8 + x)
            }
            pix.forEach((c, i) => {
                if (!c) return // only render not alpha obj pixels
                let x = i % 8 + s.x - 8
                let y = Math.floor(i / 8) + s.y - 16
                if (y != line) return // only render pixels in the line
                if ((x >= 0) && (x <= 160) && (y >= 0) && (y <= 144)) { // in screen
                    if (s.priority_bg) { // behind bg
                        if (this.bg_alpha_map[y * 160 + x]) {
                            for (let pi of [0, 1, 2, 3]) {
                                this.scrn.data[(y * 160 + x) * 4 + pi] = this.palette.obj[s.palette][c][pi]
                            }
                        }
                    } else { // above bg
                        for (let pi of [0, 1, 2, 3]) {
                            this.scrn.data[(y * 160 + x) * 4 + pi] = this.palette.obj[s.palette][c][pi]
                        }
                    }
                }
            })
        })
    }

    update_tileset (addr) {
        let i = Math.floor(addr / 16)
        let y = Math.floor((addr % 16) / 2)
        for (let k = 7; k >= 0; k--) {
            let l = (this.vram[16 * i + y * 2] >> k) & 0b1
            let u = (this.vram[16 * i + y * 2 + 1] >> k) & 0b1
            this.tileset[i][y * 8 + 7 - k] = (u << 1) + l
        }
    }

    update_tilemap (addr) {
        let tm_i;
        if ((addr >= 0x1800) && (addr <= 0x1bff)) tm_i = 0;
        if ((addr >= 0x1c00) && (addr <= 0x1fff)) tm_i = 1;
        let tile_i_1 = this.vram[addr]
        let tile_i_0 = 0x80 + ((this.vram[addr] + 0x80) & 0xff)
        this.tilemap[tm_i][addr - 0x1800 - 0x400 * tm_i] = [this.tileset[tile_i_0], this.tileset[tile_i_1]]
        this.tilemap_index[tm_i][addr - 0x1800 - 0x400 * tm_i] = this.vram[addr]
    }

    update_oam (addr) {
        let i = Math.floor(addr / 4)
        // Byte0 - Y Position
        this.sprite[i].y = this.oam[i * 4]
        // Byte1 - X Position
        this.sprite[i].x = this.oam[i * 4 + 1]
        // Byte2 - Tile/Pattern Number
        if (this.lcdc_2_obj_size) {
            this.sprite[i].pix_u = this.tileset[this.oam[i * 4 + 2] & 0xfe]
            this.sprite[i].pix_l = this.tileset[(this.oam[i * 4 + 2] & 0xff) | 0b1]
        }
        else {
            this.sprite[i].pix_u = this.tileset[this.oam[i * 4 + 2] & 0xff]
        }
        // Byte3 - Attributes/Flags:
        let attr = this.oam[i * 4 + 3]
        this.sprite[i].palette = (attr >> 4) & 0b1
        this.sprite[i].x_flip = (attr >> 5) & 0b1
        this.sprite[i].y_flip = (attr >> 6) & 0b1
        this.sprite[i].priority_bg = (attr >> 7) & 0b1
        // Sort
        this.sprite_sorted = Array.from(this.sprite)
        this.sprite_sorted.sort((a, b) => {
            if (a.x != b.x) {
                return (b.x - a.x)
            } else {
                return (b.i - a.i)
            }
        })
    }

    check_ly_lyc () {
        if (this.reg.ly == this.reg.lyc) {
            this.stat_2_lyc_ly = 1
            if (this.stat_6_lyc_int) this.MMU.if |= 0b10
        } else {
            this.stat_2_lyc_ly = 0
        }
    }

    render (line) {
        if (this.lcdc_7_enable) {
            if (this.lcdc_0_bg_disp) this.render_bg(line)
            if (this.lcdc_5_win_enable) this.render_window(line)
            if (this.lcdc_1_obj_enable) this.render_sprite(line)
        }
        if (!this.headless) this.canvas.putImageData(this.scrn, 0, 0);
    }

    step (m) {
        //   Mode 2  2_____2_____2_____2_____2_____2___________________2____    OAM-read mode
        //   Mode 3  _33____33____33____33____33____33__________________3___    VRAM-read mode
        //   Mode 0  ___000___000___000___000___000___000________________000    hblank
        //   Mode 1  ____________________________________11111111111111_____    vblank
        if (!this.lcdc_7_enable) {
            this.modeclocks = 0;
            this.stat_01_mode = 2;
            this.reg.ly = 0;
            return
        }
        this.modeclocks += m;
        switch (this.stat_01_mode) {
            case 0: // In hblank
                if (this.modeclocks >= 51) {
                    if (this.reg.ly == 143) { // End of hblank for last scanline; render screen
                        this.stat_01_mode = 1;
                        this.MMU.if |= 1;
                        if (this.stat_4_vb_int) this.MMU.if |= 0b10
                    } else {
                        this.stat_01_mode = 2;
                        if (this.stat_5_oam_int) this.MMU.if |= 0b10
                    }
                    this.reg.ly++;
                    this.check_ly_lyc()
                    this.modeclocks -= 51;
                }
                break;
            case 1: // In vblank
                if (this.modeclocks >= 114) {
                    this.modeclocks -= 114;
                    this.reg.ly++;
                    this.check_ly_lyc()
                    if (this.reg.ly == 1) {
                        this.reg.ly = 0;
                        this.stat_01_mode = 2;
                    }
                    if (this.reg.ly == 153) {
                        this.reg.ly = 0;
                    }
                }
                break;
            case 2: // In OAM-read mode
                if (this.modeclocks >= 20) {
                    this.modeclocks -= 20;
                    this.stat_01_mode = 3;
                }
                break;
            case 3:  // In VRAM-read mode
                if (this.modeclocks >= 43) {
                    this.modeclocks -= 43;
                    this.stat_01_mode = 0;
                    if (this.stat_3_hb_int) this.MMU.if |= 0b10
                    this.render(this.reg.ly)
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
                // console.log(this.lcdc_3_tilemap, this.lcdc_6_win_tilemap)
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
                this.check_ly_lyc()
                break
            case 6: // OAM DMA
                for (let i = 0; i < 160; i++) {
                    let v = this.MMU.rb((val << 8) + i);
                    this.oam[i] = v;
                    this.update_oam(i);
                }
                // console.log(this.sprite)
                break;
            case 7: // BG palette mapping
                this.reg.bg_palette = val
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
                this.reg.obj_palette0 = val
                for (let i = 0; i < 4; i++) {
                    switch ((val >> (i * 2)) & 3) {
                        case 0: this.palette.obj[0][i] = [255, 255, 255, 0]; break;
                        case 1: this.palette.obj[0][i] = [192, 192, 192, 255]; break;
                        case 2: this.palette.obj[0][i] = [96, 96, 96, 255]; break;
                        case 3: this.palette.obj[0][i] = [0, 0, 0, 255]; break;
                    }
                }
                break;
            case 9:  // OBJ1 palette mapping
                this.reg.obj_palette1 = val
                for (let i = 0; i < 4; i++) {
                    switch ((val >> (i * 2)) & 3) {
                        case 0: this.palette.obj[1][i] = [255, 255, 255, 0]; break;
                        case 1: this.palette.obj[1][i] = [192, 192, 192, 255]; break;
                        case 2: this.palette.obj[1][i] = [96, 96, 96, 255]; break;
                        case 3: this.palette.obj[1][i] = [0, 0, 0, 255]; break;
                    }
                }
                break;
            case 0xa:
                this.reg.wy = val
                // console.log('wy:', this.reg.wy)
                // console.log(this.tilemap_tmp[1])
                break
            case 0xb:
                this.reg.wx = val
                break
        }
    }
}

export default GPU