const { SchemBuilder } = require('../src/lib/schem.mjs');
const HlxLexer = require('../src/lib/lexer.mjs').Lexer;
const HlxParser = require('../src/lib/parser.mjs').Parser;
const HlxCodeGen = require('../src/lib/gen.mjs').CodeGen;

const fs = require('fs').promises

//  label :register value
const exampleSrc = `
@label start;
LD :7 @expr 1 + (2 * 4 + (5 - 1));
LD :6 1
AD :0 
@label start2;
SR :0
RI #1
JZ @label start2;
`;

const exampleSubRoutines = `
@define CHAR_BUF = #16;
@define H = 39;
@define E = 36;
@define L = 43;
@define I = 40;
@define X = 55;

@define VIDEO_X = #64;
@define VIDEO_Y = #65;
@define VIDEO_CTRL = #66;
@define VIDEO_DRAW = 3;
@define VIDEO_CLEAR = 1;

@label reset;
LD :1 31
LD VIDEO_X :1
LD :0 0
LD VIDEO_Y    :0
LD VIDEO_CTRL :0

@label bootmsg;
LD :0 H
LD CHAR_BUF :0
LD :0 E
LD CHAR_BUF :0
LD :0 L
LD CHAR_BUF :0
LD :0 I
LD CHAR_BUF :0
LD :0 X
LD CHAR_BUF :0

@label blink;
LD :1 VIDEO_DRAW
LD VIDEO_CTRL :1
LD :1 VIDEO_CLEAR
LD VIDEO_CTRL :1
JP @label blink;
`

const test = `
@define VIDEO_X = #64;
@define VIDEO_Y = #65;
@define VIDEO_CTRL = #66;
@define VIDEO_DRAW = 3;
@define VIDEO_CLEAR = 1;

@label start;
LD :0 VIDEO_CLEAR
LD VIDEO_CTRL :0

LD :6 0
LD :7 0
AN :0
JZ @route draw;

LD :6 1
LD :7 0
AN :0
JZ @route draw;

LD :6 0
LD :7 1
AN :0
JZ @route draw;

LD :6 1
LD :7 1
AN :0
JZ @route draw;

LD :6 2
LD :7 0
AN :0
JZ @route draw;

LD :6 0
LD :7 2
AN :0
JZ @route draw;

LD :6 2
LD :7 2
AN :0
JZ @route draw;

@label end;
JP @label end;

@start draw;
LD :0 :6
LD VIDEO_X :0
LD :0 :7
LD VIDEO_Y :0
LD :0 VIDEO_DRAW
LD VIDEO_CTRL :0
RT
@end;`;

const example = async () => {
  const hlxLexer = new HlxLexer(test);
  let tokens = hlxLexer.tokenize();

  console.log("=== SOURCE CODE ===");
  console.log(exampleSubRoutines.trim());
  console.log();
  
  console.log("=== COMPUTED TOKENS ===");
  console.log(tokens);
  console.log();

  console.log("=== SUBROUTINES ===");
  console.log(hlxLexer.subroutines);

  console.log("=== PARSED SUBROUTINES ===");
  let subroutines = {};
  for(let sr of Object.keys(hlxLexer.subroutines)) {
    let tokens = hlxLexer.subroutines[sr]; 
    let subParser = new HlxParser(tokens, subroutines);
    subParser.parse();
    
    for(let inst of subParser.instructions) {
      console.log(inst.toString());
      console.log();
    }

    subroutines[sr] = subParser.instructions;
  }

  const parser = new HlxParser(tokens, subroutines);
  parser.parse();
  parser.mapSubroutines();
  
  console.log("=== PARSED INSTRUCTIONS ===");
  for(let inst of parser.instructions) {
    console.log(inst.toString());
    console.log();
  }

  console.log('=== PARSED EXPRESSIONS ===');
  for(let expr of hlxLexer.expressions) {
    console.log('Expr:\t\t'+expr.expr);
    console.log('Result:\t\t'+expr.value);
  }

  console.log('\n=== PARSED LABELS ===');
  for(let label of parser.labels) {
    console.log('Label:\t\t'+label.name);
    console.log('Address:\t'+label.pos);
  }
}

example();