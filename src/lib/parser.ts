import { Token } from "./lexer";
import { ALU_MAP, SPECIAL_INST_MAP } from "./cpu";

const padBinaryString = (bits, bStr) => {
  let padded = "";
  for(let i = 0; i < bits; i++) padded += "0";
  padded += bStr;

  return '0b' + padded.slice(-bits);
}

class Label {
  name: string;
  pos: number;

  constructor(name: string, pos: number) {
    this.name = name;
    this.pos = pos;
  }
}

class Subroutine {
  name: string;
  pos: number;
  instructions: Instruction[];

  constructor(name, pos, instructions) {
    this.name = name;
    this.pos = pos;
    this.instructions = instructions;
  }
}

export class Instruction {
  line: string;
  srName: string;
  srTableFlag: boolean;

  immValue: number;
  aluCtrl: number;
  regAddr: number;
  writeFlag: number;
  memFlag: number;

  unresolvedLabel: string;
  
  constructor(line = '') {
    this.line         = line;
    this.srName       = null;
    this.srTableFlag  = false;
    
    this.immValue     = 0b0000000;
    this.aluCtrl      = 0b000;
    this.regAddr      = 0b000;
    this.writeFlag    = 0b0;
    this.memFlag      = 0b0;

    this.unresolvedLabel = null;
  }

  setRaw(hi, lo) {
    //use for "special" instructions (PS, PO, SL, SR, JZ, JP, RI) with an extra "decoding" step
    //in these cases, our CPU ignores the values of the control bits
    let hiStr = padBinaryString(8, hi.toString(2));
    let loStr = padBinaryString(8, lo.toString(2));

    this.immValue   = hi;
    this.aluCtrl    = (lo >> 5) & 0b111;
    this.regAddr    = (lo >> 2) & 0b111;
    this.writeFlag  = (lo >> 1) & 0b1;
    this.memFlag    = lo & 0b1;
  }

  build(): string[] {
    let resultLow: number = 0;

    resultLow |= (this.aluCtrl << 5);
    resultLow |= (this.regAddr << 2); 
    resultLow |= (this.writeFlag << 1);
    resultLow |= this.memFlag;
    
    if(this.srTableFlag || this.srName) { //if we need a subroutine, we must return the raw immValue, rather than the calculated resultHigh
      return [padBinaryString(8, this.immValue.toString(2)), padBinaryString(8, resultLow.toString(2))];
    }


    let resultHigh = this.immValue;
    
    return [padBinaryString(8, resultHigh.toString(2)), padBinaryString(8, resultLow.toString(2))];
  }

  toString():string {
    let raw = this.build(); 
    let result = `Line:\t\t${this.line}\nInstruction:\t`;
    let paddedImm = padBinaryString(8, this.immValue.toString(2));
    let paddedMemAddr = padBinaryString(8, this.immValue.toString(2));
    let paddedAluCtrl = padBinaryString(3, this.aluCtrl.toString(2));
    let paddedRegAddr = padBinaryString(3, this.regAddr.toString(2));

    result += (!this.memFlag) ? `Imm(${paddedImm})` : `Addr(${paddedMemAddr})`;   
    result += `, AluCtrl(${paddedAluCtrl})`;
    result += `, RegAddr(${paddedRegAddr})`;
    result += `, Flags(mem = 0b${this.memFlag}, wr = 0b${this.writeFlag})`;
    result += `\nRaw:\t\t[${raw[0]}, ${raw[1]}]`;

    return result;
  }
}

export class Parser {
  tokens: Token[];
  pos: number;
  instructions: Instruction[];
  labels: Label[];
  subroutines: Subroutine[];
  loadedSubroutes: Subroutine[];

  constructor(tokens, subroutines) {
    this.tokens = tokens;
    this.pos = 0;
    this.instructions = [];
    this.labels = [];
    this.subroutines = subroutines;
    this.loadedSubroutes = [];
  }
  
  lookAhead(n = 1) {
    //console.log(`looking ahead from pos:${this.pos} by ${n} (total tokens: ${this.tokens.length})`);
    let aheadTokens = [];
    let start = this.pos + 1;

    if(this.pos + n < this.tokens.length) {
      for(let i = 0; i < n; i++) {
        let nextToken = this.tokens[start + i];
        aheadTokens.push(nextToken);
      }
    }

    return aheadTokens;
  }
  
  advance(n = 1) {
    this.pos += n;
  }

  parseLoadKeyword(inst, value, valueType) {
    if(valueType == "INT") {
      inst.memFlag = 0;
      inst.aluCtrl = ALU_MAP.OVERRIDE; //CPU requires us to set ALU Ctrl to 0b111 to load immediate values...
      inst.immValue = value;
    } else if(valueType == "REG") {
      inst.memFlag = 1;
      inst.regAddr = value;
    } else if(valueType == "MEM" ){
      inst.memFlag = 0;
      inst.immValue = value;
    } else {
      throw new Error(`Unsupported valueType!"
        value:\t${value}
        type: \t${valueType}
      `);
    }
  }
  
  parseKeyword(token) {
    let inst        = new Instruction();
    let ahead       = this.lookAhead(2);
    let address     = ahead[0].value;
    let addressType = ahead[0].type;
    let value       = ahead[1].value;
    let valueType   = ahead[1].type;
    let line        = `${token.value}: `;
    let label       = null;

    if(addressType == "REG") {
      inst.regAddr = address;
    } else if (addressType == "MEM") {
      inst.immValue = address;
    } else if (addressType == "LBL") {
      inst.unresolvedLabel = address;
    } else if (addressType == "ROUTE") {
      if(!this.getSubroutine(address)) throw new Error(`Unknown subroutine: ${address}`);

      inst.srName = address;
    } else if (addressType != "INT") {
      throw new Error(`Unsupported addressType: ${addressType}`);
    }

    if(ALU_MAP[token.value] !== undefined) {
      line += `${addressType}(${address})`;
      inst.aluCtrl = ALU_MAP[token.value]
      inst.writeFlag = 1;
      this.advance();
    } else if (SPECIAL_INST_MAP[token.value] !== undefined) { //special instructions require us to overwrite the opcode
      line +=  `${addressType}(${address}) - S`;
      
      if (addressType === 'LBL') {
        inst.unresolvedLabel = address;
        address = 0;
      }
      
      
      inst.setRaw(address, SPECIAL_INST_MAP[token.value]);
      
      this.advance();
    } else if (token.value == 'LD') {
      line +=  `${addressType}(${address}) <- ${valueType}(${value})`;
      this.parseLoadKeyword(inst, value, valueType);
      inst.writeFlag = 1;

      this.advance(2);
    } else {
      throw new Error(`Unknown Keyword: '${token.value}'`);
    }

    inst.line = line;
    return inst;
  }

  getLabel(name): Label {
    return this.labels.filter((l) => l.name == name)[0];
  }

  getSubroutine(name): Subroutine {
    return this.subroutines[name];
  }

  getNextToken(): Token {
    return this.tokens[this.pos];
  }

  parse() {
    let nextToken = new Token();
    let stop = false;
    let line = 0;
    while(nextToken.type != 'EOF'&& !stop)  {
      nextToken = this.getNextToken();
      
      if(nextToken === undefined) break;

      if(nextToken.type == 'KWD'){
        if(nextToken.value == 'RT') {
          let inst = new Instruction();
          inst.setRaw(0, SPECIAL_INST_MAP['RT']);
          inst.line = 'RT: PC <- CALLSTACK.pop()';
          
          this.instructions.push(inst);
          this.advance();
          line++;

          continue;
        }

        if(nextToken.value == "CL") {
          let inst = this.parseKeyword(nextToken);
          this.instructions.push(inst);
          this.advance();
          line++;

          continue;
        }
      }

      switch (nextToken.type) {
        case 'KWD':
          let inst = this.parseKeyword(nextToken);
          this.instructions.push(inst);
          this.advance();
          line++;
          break;
        case 'LBL':
          let label = nextToken.value;
          if(!this.getLabel(label)) {
            this.labels.push(new Label(label, this.instructions.length));
          }

          this.advance();
          break;
        case 'EOF':
          break;
        default:
          throw new Error(`Unknown Token Type: ${nextToken.type}`);
      }
    }
  }

  resolveLabels() {
    for (let inst of this.instructions) {
      if (inst.unresolvedLabel) {
        const label = this.getLabel(inst.unresolvedLabel);
        if (!label) throw new Error(`Unknown label: ${inst.unresolvedLabel}`);
        inst.immValue = label.pos;
      }
    }
  }

  mapSubroutines() {
    let topLevelSize = this.instructions.length;
    let pos = topLevelSize;

    const subroutineClasses = [];
    for(let name in this.subroutines) {
      let sr = new Subroutine(name, pos, this.subroutines[name]);
      pos += sr.instructions.length;
      subroutineClasses.push(sr);
    }

    let srJumpInst = new Instruction();
    srJumpInst.line = "=== START SR_TABLE ===";
    srJumpInst.srTableFlag = true;
    srJumpInst.setRaw(pos + 1, SPECIAL_INST_MAP['JP']);
    this.instructions.push(srJumpInst);
    
    for(let sr of subroutineClasses) {
      this.instructions.push(...sr.instructions);
    }

    for(let inst of this.instructions) {
      if(inst.srName !== null) {
        let sr = subroutineClasses.filter((sc) => sc.name == inst.srName)[0];
        inst.immValue = sr.pos + 1; // account for the JP past the subroutine table
      }
    }
  }
}