import ngb from './ngb';

var emu = new ngb("headless");
// emu.MMU.load_rom_localfile('testRoms/instr_timing.gb')
// emu.MMU.load_rom_localfile('testRoms/interrupt_time.gb')
// emu.MMU.load_rom_localfile('testRoms/mem_timing2.gb')
// emu.MMU.load_rom_localfile('testRoms/mem_timing1.gb')
// emu.MMU.load_rom_localfile('testRoms/cpu_instrs.gb')
// emu.MMU.load_rom_localfile('testRoms/01-read_timing.gb')
emu.MMU.load_rom_localfile('testRoms/dmg_sound.gb')
emu.run()
