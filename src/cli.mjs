#!/usr/bin/env node
const VERSION = "1.0.0";

import { defineCommand, runMain } from "citty";
import { consola, createConsola } from "consola";

import { Lexer } from './lib/lexer.mjs';
import { Parser } from './lib/parser.mjs';
import { CodeGen, FORMATS } from './lib/gen.mjs';

import { readFile } from 'node:fs/promises';

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

    return tokens;
}

const parseStage = (tokens) => {
    let parser;
    try {
        parser = new Parser(tokens);
        parser.parse();
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
        await codeGen.build(outFile);
    } catch (ex) {
        consola.fatal(`Failed to build`);
        consola.info(ex);
        return;
    }

    consola.success('Build');
}

const compileSrc = async (srcFile, outFile) => {
    consola.start(`Helix Assembly Language v${VERSION}`);
    let formats = FORMATS.toString();
    consola.info(`Available output formats: ${formats}`);

    let src;
    try {
        src = (await readFile(srcFile)).toString();
    } catch (ex) {
        consola.fatal(`Failed to read source file: "${srcFile}"`);
        consola.info(ex);
        return;
    }
    
    consola.info(`Source: ${srcFile}`);
    
    let tokens = lexStage(src);
    if(tokens.length > 0) {
        let instructions = parseStage(tokens);
        await genStage(instructions, outFile);
        consola.success(`Output written to ${outFile} :)`);
    }
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
        }
    },
    run({ args }){
        compileSrc(args.src, args.out);
    }
});

runMain(main);