
## Helix Assembler (hlxc)

  

A command-line compiler for the Helix Assembly Language.
The Helix Assembly Language is an assembly language designed to make producing code
for my custom 8bit Minecraft CPU easier.

This tool reads .hlm source files, tokenizes them, parses instructions, and generates output for loading into the Helix Computer. 

hlxc is built using:

 - Node.js ESBuild (bundling) 
 - Node SEA (Standalone Executable Architecture) 
 - Vitest (testing)

See [BlinkPixel.hsm](https://github.com/NullRoz007/HelixAsm/blob/main/examples/BlinkPixel.hsm) for a working example. 
For now, please see [asm.js](https://github.com/NullRoz007/HelixAsm/blob/main/src/lib/asm.mjs) & [cpu.js](https://github.com/NullRoz007/HelixAsm/blob/main/src/lib/cpu.mjs)  for language/cpu definitions. 

![CLI Showcase](https://github.com/NullRoz007/HelixAsm/blob/main/images/cli.png)

See [HelixWeb](https://nullroz007.github.io/HelixWeb/) for a live example.

### Features
- Tokenizer, parser, and code generator
- Output compiled HSM assembly into a game ready SpongeV2 Schematic
- CLI interface powered by citty and consola
- Bundled with esbuild
- Can be compiled into a standalone executable
- Run tests using Vitest

  

### Installation

  

Clone the repository:

    git clone https://github.com/NullRoz007/helixasm.git
    cd helixasm
    npm install

  

### Usage

Compile a Helix Assembly source file

	hlxc input.hsm output --json --schem

If installed locally (not globally):

	node src/cli.js input.hsm output.bin

  

### Development

Run tests

	npm test

	
Bundle the CLI

Creates a bundled CommonJS file at build/hlxc.bundle.cjs:

	npm run bundle


Generate a Base ROM

Dumps a JSON string that can be saved and imported into HLXC

	./src/cli.js input.schem --schemToJson

### Build Standalone Executable (Node SEA)
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

