class GPU {

    constructor () {
        this.vram = []
        this.oam = []
        this.reg = []
        this.tilemap = []
        this.objdata = []
        this.objdatasorted = []
        this.palette = { 'bg': [], 'obj0': [], 'obj1': [] }
        this.scanrow = []

        this.curline = 0
        this.curscan = 0
        this.linemode = 0
        this.modeclocks = 0

        this.yscrl = 0
        this.xscrl = 0
        this.raster = 0
        this.ints = 0

        this.lcdon = 0
        this.bgon = 0
        this.objon = 0
        this.winon = 0

        this.objsize = 0

        this.bgtilebase = 0x0000
        this.bgmapbase = 0x1800
        this.wintilebase = 0x1800
    }

    connect_mmu (mmu) {
        this.MMU = mmu
    }

    reset () {
        for (let i = 0; i < 8192; i++) {
            this.vram[i] = 0;
        }
        for (let i = 0; i < 160; i++) {
            this.oam[i] = 0;
        }
        for (let i = 0; i < 4; i++) {
            this.palette.bg[i] = 255;
            this.palette.obj0[i] = 255;
            this.palette.obj1[i] = 255;
        }
        for (let i = 0; i < 512; i++) {
            this.tilemap[i] = [];
            for (let j = 0; j < 8; j++) {
                this.tilemap[i][j] = [];
                for (let k = 0; k < 8; k++) {
                    this.tilemap[i][j][k] = 0;
                }
            }
        }

        var c = document.getElementById('screen');
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

        this.curline = 0;
        this.curscan = 0;
        this.linemode = 2;
        this.modeclocks = 0;
        this.yscrl = 0;
        this.xscrl = 0;
        this.raster = 0;
        this.ints = 0;

        this.lcdon = 0;
        this.bgon = 0;
        this.objon = 0;
        this.winon = 0;

        this.objsize = 0;
        for (let i = 0; i < 160; i++) this.scanrow[i] = 0;

        for (let i = 0; i < 40; i++) {
            this.objdata[i] = { 'y': -16, 'x': -8, 'tile': 0, 'palette': 0, 'yflip': 0, 'xflip': 0, 'prio': 0, 'num': i };
        }

        // Set to values expected by BIOS, to start
        this.bgtilebase = 0x0000;
        this.bgmapbase = 0x1800;
        this.wintilebase = 0x1800;
    }

    checkline (m) {
        this.modeclocks += m;
        switch (this.linemode) {
            // In hblank
            case 0:
                if (this.modeclocks >= 51) {
                    // End of hblank for last scanline; render screen
                    if (this.curline == 143) {
                        this.linemode = 1;
                        // console.log("render", this.scrn)
                        this.canvas.putImageData(this.scrn, 0, 0);
                        this.MMU.if |= 1;
                    }
                    else {
                        this.linemode = 2;
                    }
                    this.curline++;
                    this.curscan += 640;
                    this.modeclocks = 0;
                }
                break;

            // In vblank
            case 1:
                if (this.modeclocks >= 114) {
                    this.modeclocks = 0;
                    this.curline++;
                    if (this.curline > 153) {
                        this.curline = 0;
                        this.curscan = 0;
                        this.linemode = 2;
                    }
                }
                break;

            // In OAM-read mode
            case 2:
                if (this.modeclocks >= 20) {
                    this.modeclocks = 0;
                    this.linemode = 3;
                }
                break;

            // In VRAM-read mode
            case 3:
                // Render scanline at end of allotted time
                if (this.modeclocks >= 43) {
                    this.modeclocks = 0;
                    this.linemode = 0;
                    if (this.lcdon) {
                        if (this.bgon) {
                            var linebase = this.curscan;
                            var mapbase = this.bgmapbase + ((((this.curline + this.yscrl) & 255) >> 3) << 5);
                            var y = (this.curline + this.yscrl) & 7;
                            var x = this.xscrl & 7;
                            var t = (this.xscrl >> 3) & 31;
                            var w = 160;

                            if (this.bgtilebase) {
                                var tile = this.vram[mapbase + t];
                                if (tile < 128) tile = 256 + tile;
                                let tilerow = this.tilemap[tile][y];
                                do {
                                    this.scanrow[160 - x] = tilerow[x];
                                    this.scrn.data[linebase + 3] = this.palette.bg[tilerow[x]];
                                    // if (this.palette.bg[tilerow[x]] != 255)
                                    // console.log(this.palette.bg[tilerow[x]])
                                    x++;
                                    if (x == 8) { t = (t + 1) & 31; x = 0; tile = this.vram[mapbase + t]; if (tile < 128) tile = 256 + tile; tilerow = this.tilemap[tile][y]; }
                                    linebase += 4;
                                } while (--w);
                            }
                            else {
                                let tilerow = this.tilemap[this.vram[mapbase + t]][y];
                                do {
                                    this.scanrow[160 - x] = tilerow[x];
                                    this.scrn.data[linebase + 3] = this.palette.bg[tilerow[x]];
                                    // if (this.palette.bg[tilerow[x]] == 96)
                                    //     console.log(this.palette.bg[tilerow[x]])
                                    x++;
                                    if (x == 8) { t = (t + 1) & 31; x = 0; tilerow = this.tilemap[this.vram[mapbase + t]][y]; }
                                    linebase += 4;
                                } while (--w);
                            }
                        }
                        if (this.objon) {
                            var cnt = 0;
                            if (this.objsize) {
                                // for (var i = 0; i < 40; i++) {
                                // }
                            }
                            else {
                                var tilerow;
                                var obj;
                                var pal;
                                let x;
                                let linebase = this.curscan;
                                for (let i = 0; i < 40; i++) {
                                    obj = this.objdatasorted[i];
                                    if (obj.y <= this.curline && (obj.y + 8) > this.curline) {
                                        if (obj.yflip)
                                            tilerow = this.tilemap[obj.tile][7 - (this.curline - obj.y)];
                                        else
                                            tilerow = this.tilemap[obj.tile][this.curline - obj.y];

                                        if (obj.palette) pal = this.palette.obj1;
                                        else pal = this.palette.obj0;

                                        linebase = (this.curline * 160 + obj.x) * 4;
                                        if (obj.xflip) {
                                            for (x = 0; x < 8; x++) {
                                                if (obj.x + x >= 0 && obj.x + x < 160) {
                                                    if (tilerow[7 - x] && (obj.prio || !this.scanrow[x])) {
                                                        this.scrn.data[linebase + 3] = pal[tilerow[7 - x]];
                                                    }
                                                }
                                                linebase += 4;
                                            }
                                        }
                                        else {
                                            for (x = 0; x < 8; x++) {
                                                if (obj.x + x >= 0 && obj.x + x < 160) {
                                                    if (tilerow[x] && (obj.prio || !this.scanrow[x])) {
                                                        this.scrn.data[linebase + 3] = pal[tilerow[x]];
                                                    }
                                                }
                                                linebase += 4;
                                            }
                                        }
                                        cnt++; if (cnt > 10) break;
                                    }
                                }
                            }
                        }
                    }
                }
                break;
        }
    }

    updatetile (addr) {
        // console.log('updatetile')
        var saddr = addr;
        if (addr & 1) { saddr--; addr--; }
        var tile = (addr >> 4) & 511;
        var y = (addr >> 1) & 7;
        var sx;
        for (var x = 0; x < 8; x++) {
            sx = 1 << (7 - x);
            this.tilemap[tile][y][x] = ((this.vram[saddr] & sx) ? 1 : 0) | ((this.vram[saddr + 1] & sx) ? 2 : 0);
        }
    }

    updateoam (addr, val) {
        // console.log(addr.toString('16'))
        addr -= 0xFE00;
        var obj = addr >> 2;
        if (obj < 40) {
            // console.log(obj,this.objdata[obj])
            switch (addr & 3) {
                case 0: this.objdata[obj].y = val - 16; break;
                case 1: this.objdata[obj].x = val - 8; break;
                case 2:
                    if (this.objsize) this.objdata[obj].tile = (val & 0xFE);
                    else this.objdata[obj].tile = val;
                    break;
                case 3:
                    this.objdata[obj].palette = (val & 0x10) ? 1 : 0;
                    this.objdata[obj].xflip = (val & 0x20) ? 1 : 0;
                    this.objdata[obj].yflip = (val & 0x40) ? 1 : 0;
                    this.objdata[obj].prio = (val & 0x80) ? 1 : 0;
                    break;
            }
        }
        this.objdatasorted = this.objdata;
        this.objdatasorted.sort(function (a, b) {
            if (a.x > b.x) return -1;
            if (a.num > b.num) return -1;
        });
    }

    rb (addr) {
        var gaddr = addr - 0xFF40;
        switch (gaddr) {
            case 0:
                return (this.lcdon ? 0x80 : 0) |
                    ((this.bgtilebase == 0x0000) ? 0x10 : 0) |
                    ((this.bgmapbase == 0x1C00) ? 0x08 : 0) |
                    (this.objsize ? 0x04 : 0) |
                    (this.objon ? 0x02 : 0) |
                    (this.bgon ? 0x01 : 0);

            case 1:
                return (this.curline == this.raster ? 4 : 0) | this.linemode;

            case 2:
                return this.yscrl;

            case 3:
                return this.xscrl;

            case 4:
                // console.log("read ly", this.curline)
                return this.curline;

            case 5:
                return this.raster;

            default:
                return this.reg[gaddr];
        }
    }

    wb (addr, val) {
        var gaddr = addr - 0xFF40;
        this.reg[gaddr] = val;
        switch (gaddr) {
            case 0:
                this.lcdon = (val & 0x80) ? 1 : 0;
                this.bgtilebase = (val & 0x10) ? 0x0000 : 0x0800;
                this.bgmapbase = (val & 0x08) ? 0x1C00 : 0x1800;
                this.objsize = (val & 0x04) ? 1 : 0;
                this.objon = (val & 0x02) ? 1 : 0;
                this.bgon = (val & 0x01) ? 1 : 0;
                break;

            case 2:
                this.yscrl = val;
                break;

            case 3:
                this.xscrl = val;
                break;

            case 5:
                this.raster = val;
                break;
            // OAM DMA
            case 6:
                for (let i = 0; i < 160; i++) {
                    let v = this.MMU.rb((val << 8) + i);
                    this.oam[i] = v;
                    console.log(0xFE00 + i)
                    this.updateoam(0xFE00 + i, v);
                }
                break;

            // BG palette mapping
            case 7:
                // console.log(this.palette.bg)
                // for (let i = 0; i < 4; i++) {
                //     switch ((val >> (i * 2)) & 3) {
                //         case 0: this.palette.bg[i] = 255; break;
                //         case 1: this.palette.bg[i] = 192; break;
                //         case 2: this.palette.bg[i] = 96; break;
                //         case 3: this.palette.bg[i] = 0; break;
                //     }
                // }
                // console.log(this.palette.bg)
                this.palette.bg[3] = 200
                this.palette.bg[2] = 150
                this.palette.bg[1] = 100
                this.palette.bg[0] = 50
                break;

            // OBJ0 palette mapping
            case 8:
                for (let i = 0; i < 4; i++) {
                    switch ((val >> (i * 2)) & 3) {
                        case 0: this.palette.obj0[i] = 255; break;
                        case 1: this.palette.obj0[i] = 192; break;
                        case 2: this.palette.obj0[i] = 96; break;
                        case 3: this.palette.obj0[i] = 0; break;
                    }
                }
                break;

            // OBJ1 palette mapping
            case 9:
                for (let i = 0; i < 4; i++) {
                    switch ((val >> (i * 2)) & 3) {
                        case 0: this.palette.obj1[i] = 255; break;
                        case 1: this.palette.obj1[i] = 192; break;
                        case 2: this.palette.obj1[i] = 96; break;
                        case 3: this.palette.obj1[i] = 0; break;
                    }
                }
                break;
        }
    }
}

export default GPU