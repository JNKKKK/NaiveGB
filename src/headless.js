import ngbc from './ngbc';

var emu = new ngbc("headless");
// emu.MMU.load_rom_localfile('testRoms/instr_timing.gb')
emu.MMU.load_rom_localfile('testRoms/interrupt_time.gb')
// emu.MMU.load_rom_localfile('testRoms/mem_timing2.gb')
// emu.MMU.load_rom_localfile('testRoms/mem_timing1.gb')
// emu.MMU.load_rom_localfile('testRoms/cpu_instrs.gb')
emu.run()
