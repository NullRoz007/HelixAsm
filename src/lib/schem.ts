import { Instruction } from './parser'
import { Schematic } from 'prismarine-schematic';
import registryLoader from 'prismarine-registry';
import blockLoader from 'prismarine-block';
import { Vec3 } from 'vec3';
import { readFile, writeFile } from 'node:fs/promises';
import Base32Rom from './schematics/base32.json';

const ROMS = {'Base32': Base32Rom};

// IMPORTANT, defined by the shape of the ROM schematic
const MAX_SCHEM_Y_OFFSET: number = 17;
const Z_OFFSET: number = 4;

const registry: registryLoader.Registry = registryLoader('1.21');
const Block = blockLoader(registry);

const oprandBitIdxToOffsetVec3 = (iidx: number, bIdx: number) => {
    let x = 1;
    let y = MAX_SCHEM_Y_OFFSET - 2 * bIdx;
    let z = iidx * Z_OFFSET;

    return new Vec3(x, y, z);
}

const opcodeBitIdxToOffsetVec3 = (iidx: number, bIdx: number) => {
    let x = 1;
    let y = MAX_SCHEM_Y_OFFSET - 2 * bIdx;
    let z = iidx * Z_OFFSET + 2;

    return new Vec3(x, y, z);
}

export class SchemBuilder {
    instructions: Instruction[];
    stats: Record<string, number>;

    constructor(instructions) {
        this.instructions = instructions;
        this.stats = {
            'blocksSet': 0
        }
    }
    async getRom(name: string) {
        return await JSON.stringify(ROMS[name]);
    }

    async schemToJson(schemFile: string) {
        const romSchem = await Schematic.read(await readFile(schemFile));
        let json = await romSchem.toJSON("");
        return json;
    }   
    
    async buildROMSchematic(baseRomJSON: string) {
        const air = new Block(registry.blocksByName.air.id, registry.biomesByName.plains.id, null, 0);
        const romSchem = await Schematic.fromJSON(baseRomJSON);
        
        for(let iidx = 0; iidx < this.instructions.length; iidx++) {
            const instruction = this.instructions[iidx].build();
            let oprand = instruction[0];
            let opcode = instruction[1];

            for(let i = 0; i < opcode.length - 2; i++) {
                if(opcode.charAt(i + 2) == '0') {
                    let pos = opcodeBitIdxToOffsetVec3(iidx, i);
                    let block = romSchem.getBlock(pos);
                    if(block.name !== 'redstone_block') throw new Error(`(opcode) Unexpected block at ${pos}`);

                    romSchem.setBlock(pos, air);
                    this.stats.blocksSet++;
                }

                if(oprand.charAt(i + 2) == '0') {
                    let pos = oprandBitIdxToOffsetVec3(iidx, i);
                    let block = romSchem.getBlock(pos);
                    if(block.name !== 'redstone_block') throw new Error(`(oprand) Unexpected block at ${pos}`);

                    romSchem.setBlock(pos, air);
                    this.stats.blocksSet++;
                }
            }
        }

        return romSchem;
    }
}