import ngbc from './ngbc';

var emu = new ngbc("headless");
emu.MMU.load_rom_localfile('testRoms/cpu_instrs.gb')
// emu.mmu.load_rom_localfile('testRoms/mem_timing2.gb')
// emu.mmu.load_rom_localfile('testRoms/cpu_instrs.gb')
emu.run()
