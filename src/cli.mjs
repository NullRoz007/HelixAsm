#!/usr/bin/env node
const VERSION = "1.3.0";

import { defineCommand, runMain } from "citty";
import { consola, createConsola } from "consola";

import { Lexer } from './lib/lexer.mjs';
import { Parser } from './lib/parser.mjs';
import { CodeGen, FORMATS } from './lib/gen.mjs';
import { SchemBuilder } from "./lib/schem.mjs";

import { readFile, writeFile } from 'node:fs/promises';

const lexStage = (src) => {
    let hlxLexer;
    let tokens;

    try {
        hlxLexer = new Lexer(src);
        tokens = hlxLexer.tokenize();
    } catch (ex) {
        consola.fatal(`Error during tokenization`);
        consola.info(ex);
        return [];
    }

    consola.success('Tokenize');
    consola.info(`Tokens: ${tokens.length}`);
    consola.success(`Expressions: ${hlxLexer.expressions.length}`);

    for(let expr of hlxLexer.expressions) {
        consola.info(`Expr: ${expr.expr} = ${expr.value}`);
    }

    return { 'tokens': tokens, 'subroutines': hlxLexer.subroutines };
}

const parseStage = (tokens, subroutines) => {
    let parser;

    try {
        let parsedSubroutines = {};
        for(let sr of Object.keys(subroutines)) {
            let tokens = subroutines[sr]; 
            let subParser = new Parser(tokens, parsedSubroutines);
            subParser.parse();
    
            parsedSubroutines[sr] = subParser.instructions;
        }

        parser = new Parser(tokens, parsedSubroutines);
        parser.parse();
        parser.mapSubroutines();
    } catch (ex) {
        consola.fatal(`Error during parsing`);
        consola.info(ex);
        return [];
    }
    
    consola.success('Parse');
    consola.info(`Instructions: ${parser.instructions.length}`);
    
    return parser.instructions;
}

const genStage = async (instructions, outFile) => {
    let codeGen;
    try {
        codeGen = new CodeGen(instructions);
        const outJson = await codeGen.build(outFile);
        await writeFile(outFile, outJson, () => {});
    } catch (ex) {
        consola.fatal(`Failed to build`);
        consola.info(ex);
        return;
    }

    consola.success('Build');
}

const schemStage = async (instructions, baseRom, outputRomPath) => {
    let schemBuilder = new SchemBuilder(instructions);
    let baseRomJSON = await schemBuilder.getRom(baseRom);

    try {
        let schem = await schemBuilder.buildROMSchematic(baseRomJSON);
        await writeFile(outputRomPath, await schem.write());
    } catch (ex) {
        consola.fatal(`Failed to build ROM schematic:`);
        consola.info(ex);
        return;
    }

    consola.success('Schematic');
    consola.info(`Stats: Blocks (${schemBuilder.stats.blocksSet})`);
}


const compileSrc = async (srcFile, outFile, formats) => {
    consola.start(`Helix Assembly Language v${VERSION}`);
    consola.info(`Available output formats: ${FORMATS.toString()}`);

    let src;
    try {
        src = (await readFile(srcFile)).toString();
    } catch (ex) {
        consola.fatal(`Failed to read source file: "${srcFile}"`);
        consola.info(ex);
        return;
    }
    
    consola.info(`Source: ${srcFile}`);
    const lexResult = lexStage(src);

    let instructions = [];
    if(lexResult.tokens.length > 0) {
        instructions = parseStage(lexResult.tokens, lexResult.subroutines);

        if(formats.indexOf('json') != -1) await genStage(instructions, outFile + '.json');
        if(formats.indexOf('schem') != -1) await schemStage(instructions, "Base32", outFile + '.schem');
    }
}

const schemToJson = async (src) => {
    let json = await new SchemBuilder().schemToJson(src);
    console.log(json);
}


const main = defineCommand({
    meta: {
        name: "hlxc",
        version: VERSION,
        description: "CLI interface for the Helix Assembly Language"
    },
    args: {
        src: {
            type: "positional",
            description: "Input source file",
            required: true
        },
        out: {
            type: "positional",
            description: "Output file",
            required: true
        },
        json: {
            type: "boolean",
            description: "Compile to JSON"
        },
        schem: {
            type: "boolean",
            description: "Compile to SpongeV2 Schematic"
        },
        schemToJson: {
            type: "boolean",
            description: `Instead of compiling an HSM file, turn a provided .schem file (SRC) 
                   into a JSON text and dump to terminal (for development purposes)
                   (ignores OUT)
                    `
        }
    },
    run({ args }){
        let formats = [];

        if(args.schem) formats.push('schem');
        if(args.json) formats.push('json');

        if(!args.schemToJson) {
            compileSrc(args.src, args.out, formats);
        } else {
            schemToJson(args.src);
        }
    }
});

runMain(main);