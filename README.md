# Naive GameBoy

A Gameboy emulator written in JS.

[Demo](https://jnkkkk.github.io/NaiveGB/)

![banner](https://github.com/JNKKKK/NaiveGB/raw/master/banner.png)

## Motivation
The purpose of this project is mostly educational. The goal is to make this project a good reference for others who are learning about GameBoy or planning to create their own GameBoy emulator. We aim at making the code simple to understand as much as possible, and at the same time, accurate enough to emulate most of the behaviour correctly.

## Run in the Browser
Try it out [here](https://jnkkkk.github.io/NaiveGB/). The web app is built under folder [`/docs`](https://github.com/JNKKKK/NaiveGB/tree/master/docs) and hosted by Github Pages.

Please note that due to copyright protection, only the Blargg's test roms are available to run in the web app. You will need to supply you own roms if you want to run anything else.

**Run locally in the browser:**
```
npm run web
```
**Keys:**
| Action | Key |
| --- | --- |
| B | <kbd>Z</kbd> |
| A | <kbd>X</kbd> |
| UP,DOWN,LEFT,RIGHT | <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> |
| START | <kbd>Enter</kbd> |
| SELECT | <kbd>Space</kbd> |

## Run in the Terminal (headless mode)

```
npm run headless
```
Note that in this mode, there is **NO graphic output**. In the terminal, you will only see the serial output from `FF01` I/O port (FF01 - SB - Serial transfer data (R/W)).

## Test
```
npm run test
```
This will run the test automatically in headless mode. We use [Jest](https://jestjs.io/) testing framework to run tests against [Blargg's test roms](https://gbdev.gg8.se/files/roms/blargg-gb-tests/). For deatils, check the testing code under [`__test__`](https://github.com/JNKKKK/NaiveGB/tree/master/__tests__)

## Test Result
Blargg's test roms
| Test | Result |
| --- | --- |
| cpu_instrs | ✔️ |
| instr_timing | ✔️ |
| mem_timing1 | ✔️ |
| mem_timing2 | ✔️ |
| interrupt_time | ❌ |
| dmg_sound |✔️ |
| halt_bug | ❌ |
| oam_bug | ❌ |

## Roadmap
Milestone 1.0:
- [ ] Pass `interrupt_time` and `halt_bug` test roms
- [ ] Pass `oam_bug` test roms
- [ ] Make MBC1 implementation robust
- [ ] Support MBC2, MBC3
- [ ] Fix WAVE channel sound issue
- [ ] Support noise channel
- [ ] Test more game roms

Milestone 2.0:
- [ ] Interative web UI for debugging



## How to Contribute
1. Make changes and see live update in browser `npm run web`
2. Make sure the tests pass. `npm run test`
3. Build the web application. `npm run build`

## Folder Structure
```
/src
 The emulator source code. The emulator itself is a class and can be imported in any web applications.
 
/testROMs
 All the Blargg's test rooms
 
/web
 A web app imports ngb class
 
/docs
 The build artifact of the web app. It also hosts the Github Page
```


## Reference
- [BinjGB](https://github.com/binji/binjgb). The emulator I refered most to when working on NaiveGB
- [Pan Docs](https://problemkaputt.de/pandocs.htm) ([new version](https://gbdev.io/pandocs/Specifications.html))
- [GhostSonic's insights on APU](https://www.reddit.com/r/EmuDev/comments/5gkwi5/gb_apu_sound_emulation/)
- [An explanation of dmg_sound test](https://forums.nesdev.org/viewtopic.php?t=13730)
- [GameBoy sound hardware](https://gbdev.gg8.se/wiki/articles/Gameboy_sound_hardware)
- [OP Codes](https://www.pastraiser.com/cpu/gameboy/gameboy_opcodes.html)
- [GameBoy Programming Manual](https://ia803208.us.archive.org/9/items/GameBoyProgManVer1.1/GameBoyProgManVer1.1.pdf)
- [Nitty Gritty Gameboy Cycle Timing](http://blog.kevtris.org/blogfiles/Nitty%20Gritty%20Gameboy%20VRAM%20Timing.txt)
- [Complete Technical Reference](https://gekkio.fi/files/gb-docs/gbctr.pdf)
