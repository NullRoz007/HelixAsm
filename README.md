#  Helix Assembler (hlxc)

A command-line compiler for the Helix Assembly Language.

The Helix Assembly Language is an assembly language designed to create flashable ROM's for my 8bit Minecraft Computer. 

This tool reads .hlm source files, tokenizes them, parses instructions, and generates output schematics for loading into the in-game ROM Flasher

hlxc is built using:

- Node.js ESBuild (bundling)
- Node SEA (Standalone Executable Architecture)
- Vitest (testing)
- [Consolas](https://github.com/unjs/consola) & [Citty](https://github.com/unjs/citty)
- [PrismarineJS](https://github.com/orgs/PrismarineJS/repositories)

  
For now, please see [asm.js](https://github.com/NullRoz007/HelixAsm/blob/main/src/lib/asm.mjs) & [cpu.js](https://github.com/NullRoz007/HelixAsm/blob/main/src/lib/cpu.mjs) for language/cpu definitions.

  

![CLI Showcase](https://github.com/NullRoz007/HelixAsm/blob/main/images/cli.png)

> See [HelixWeb](https://nullroz007.github.io/HelixWeb/) for a live example.

##  Features

- Tokenizer, parser, and code generator
- Inline expressions via the @expr macro
- Convenient jumps via the @label macro  
- Output compiled HSM assembly into a game ready SpongeV2 Schematic
- CLI interface powered by citty and consol

##  Installation

	git clone https://github.com/NullRoz007/helixasm.git

	cd helixasm

	npm install

##  Usage
### Example Program

	@label blink;
	LD :1 @expr 30 + 1;
	LD #110 :1
	LD :1 1
	LD #108 :1
	LD :1 0
	LD #108 :1
	JP @label blink;
  

To compile the above program into a schematic that can be loaded into Minecraft:

	hlxc BlinkPixel.hsm output --schem

This will produce the following schematic that can be loaded into the in-game ROM Flasher:
![Rom Image](https://github.com/NullRoz007/HelixAsm/blob/main/images/rom.png)
> For convenience, the ROM Flasher schematic is provided in /src/lib/schematics/Base32Rig.schem
> Currently, the compiler only supports programs with 32 instructions or less, however longer Base ROM schematics can be created using easily using WorldEdit and the --schemToJson argument (outlined below). 
###  Development

#### Run tests

	npm test

#### Bundle the CLI

Creates a bundled CommonJS file at build/hlxc.bundle.cjs:

	npm run bundle

#### Generate a Base ROM

Dumps a JSON string that can be saved and imported into HLXC

	./src/cli.js input.schem --schemToJson

  

###  Build Standalone Executable (Node SEA)

This process:

- Runs tests

- Bundles the CLI

- Makes a copy of the node binary on your system

- Injects the SEA blob into the Node executable

Run:

	npm run build

The output binary is located in:

> dist/hlxc

Run it directly:

	./dist/hlxc input.hsm output.bin
