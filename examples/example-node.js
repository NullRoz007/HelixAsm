const HlxLexer = require('../src/lib/lexer.mjs').Lexer;
const HlxParser = require('../src/lib/parser.mjs').Parser;

//  label :register value
const exampleSrc = `
LD :7 @expr 1 + (2 * 4 + (5 - 1));
LD :6 1
AD :0 
SR :0
RI #1
JZ 0
`;

const example = () => {
  const hlxLexer = new HlxLexer(exampleSrc);
  let tokens = hlxLexer.tokenize();

  console.log("=== SOURCE CODE ===");
  console.log(exampleSrc.trim());
  console.log();
  
  console.log("=== COMPUTED TOKENS ===");
  console.log(tokens);
  console.log();

  const parser = new HlxParser(tokens);
  parser.parse();

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
}

example();