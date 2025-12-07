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
@label start;
LD :0 1

@start sub1;
LD :0 2
RT
@end;

CL @route sub1;
JP @label start;
`

const example = async () => {
  const hlxLexer = new HlxLexer(exampleSubRoutines);
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
    let subParser = new HlxParser(tokens);
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