MMU = {
    // Flag indicating BIOS is mapped in
    // BIOS is unmapped with the first instruction above 0x00FF
    _inbios: 1,

    // Memory regions (initialised at reset time)
    _bios: [],
    _rom: [],
    _wram: [],
    _eram: [],
    _zram: [],

    // Read a byte from memory
    rb: function (addr) {
        switch (addr & 0xF000) {
            // BIOS (256b)/ROM0
            case 0x0000:
                if (MMU._inbios) {
                    if (addr < 0x0100)
                        return MMU._bios[addr];
                    else if (Z80._r.pc == 0x0100)
                        MMU._inbios = 0;
                }

                return MMU._rom[addr];

            // ROM0
            case 0x1000:
            case 0x2000:
            case 0x3000:
                return MMU._rom[addr];

            // ROM1 (unbanked) (16k)
            case 0x4000:
            case 0x5000:
            case 0x6000:
            case 0x7000:
                return MMU._rom[addr];

            // Graphics: VRAM (8k)
            case 0x8000:
            case 0x9000:
                return GPU._vram[addr & 0x1FFF];

            // External RAM (8k)
            case 0xA000:
            case 0xB000:
                return MMU._eram[addr & 0x1FFF];

            // Working RAM (8k)
            case 0xC000:
            case 0xD000:
                return MMU._wram[addr & 0x1FFF];

            // Working RAM shadow
            case 0xE000:
                return MMU._wram[addr & 0x1FFF];

            // Working RAM shadow, I/O, Zero-page RAM
            case 0xF000:
                switch (addr & 0x0F00) {
                    // Working RAM shadow
                    case 0x000: case 0x100: case 0x200: case 0x300:
                    case 0x400: case 0x500: case 0x600: case 0x700:
                    case 0x800: case 0x900: case 0xA00: case 0xB00:
                    case 0xC00: case 0xD00:
                        return MMU._wram[addr & 0x1FFF];

                    // Graphics: object attribute memory
                    // OAM is 160 bytes, remaining bytes read as 0
                    case 0xE00:
                        if (addr < 0xFEA0)
                            return GPU._oam[addr & 0xFF];
                        else
                            return 0;

                    // Zero-page
                    case 0xF00:
                        if (addr >= 0xFF80) {
                            return MMU._zram[addr & 0x7F];
                        }
                        else {
                            // I/O control handling
                            // Currently unhandled
                            return 0;
                        }
                }
        }
    },

    // Read a 16-bit word
    rw: function (addr) {
        return MMU.rb(addr) + (MMU.rb(addr + 1) << 8);
    }
};