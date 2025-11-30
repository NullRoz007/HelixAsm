import { Token } from "./lexer.mjs";
import { ALU_MAP, SPECIAL_INST_MAP } from "./cpu.mjs";

const padBinaryString = (bits, bStr) => {
  let padded = "";
  for(let i = 0; i < bits; i++) padded += "0";
  padded += bStr;0b01110011

  return '0b' + padded.slice(-bits);
}

class Label {
  constructor(name, pos) {
    this.name = name;
    this.pos = pos;
  }
}

export class Instruction {
  constructor(line = '') {
    this.line       = line;
    this.memAddr    = 0b000000;
    this.immValue   = 0b000000;
    this.immFlag    = 0b0;
    this.aluCtrl    = 0b000;
    this.regAddr    = 0b000;
    this.writeFlag  = 0b0;
    this.clearFlag  = 0b0;
  }

  setRaw(hi, lo) {
    //use for "special" instructions (PS, PO, SL, SR, JZ, JP, RI) with an extra "decoding" step
    //in these cases, our CPU ignores the values of the control bits
    let hiStr = padBinaryString(8, hi.toString(2));
    let loStr = padBinaryString(8, lo.toString(2));

    this.immValue   = hi;
    this.memAddr    = hi;
    this.immFlag    = hi & 1;

    this.aluCtrl    = (lo >> 5) & 0b111;
    this.regAddr    = (lo >> 2) & 0b111;
    this.writeFlag  = (lo >> 1) & 0b1;
    this.clearFlag  = lo & 0b1;
  }

  build() {
    let resultHigh = (
      (!this.immFlag ? this.memAddr : this.immValue) << 1
    ) | this.immFlag;

    let resultLow = 0;

    resultLow |= (this.aluCtrl << 5);
    resultLow |= (this.regAddr << 2); 
    resultLow |= (this.writeFlag << 1);
    resultLow |= this.clearFlag;

    return [padBinaryString(8, resultHigh.toString(2)), padBinaryString(8, resultLow.toString(2))];
  }

  toString() {
    let raw = this.build(); 
    let result = `Line:\t\t${this.line}\nInstruction:\t`;
    let paddedImm = padBinaryString(7, this.immValue.toString(2));
    let paddedMemAddr = padBinaryString(7, this.memAddr.toString(2));
    let paddedAluCtrl = padBinaryString(3, this.aluCtrl.toString(2));
    let paddedRegAddr = padBinaryString(3, this.regAddr.toString(2));

    result += (this.immFlag) ? `Imm(${paddedImm})` : `MemAddr(${paddedMemAddr})`;   
    result += `, AluCtrl(${paddedAluCtrl})`;
    result += `, RegAddr(${paddedRegAddr})`;
    result += `, Flags(imm = 0b${this.immFlag}, wr = 0b${this.writeFlag}, cl = 0b${this.clearFlag})`;
    result += `\nRaw:\t\t[${raw[0]}, ${raw[1]}]`;

    return result;
  }
}

export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
    this.instructions = [];
    this.labels = [];
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
      inst.immFlag = 1;
      inst.aluCtrl = ALU_MAP.OVERRIDE; //CPU requires us to set ALU Ctrl to 0b111 to load immediate values...
      inst.immValue = value;
    } else if(valueType == "REG") {
      inst.immFlag = 0;
      inst.regAddr = value;
    } else {
      throw new Error(`Unsupported valueType!"
        value:\t${value}
        type: \t${type}
      `);
    }
  }
  
  parseKeyword(token) {
    let inst = new Instruction();
    let ahead = this.lookAhead(2);

    let address = ahead[0].value;
    let addressType = ahead[0].type;

    let value = ahead[1].value;
    let valueType = ahead[1].type;

    let line = `${token.value}: `;
    let label = null;

    if(addressType == "REG") {
      inst.regAddr = address;
    } else if (addressType == "MEM") {
      inst.memAddr = address;

    } else if (addressType == "LBL") {
      label = this.getLabel(address);
      if(!label) throw new Error(`Unknown label: ${address}`);
    } else if (addressType != "INT") {
      throw new Error("Unsupported addressType!");
    }

    if(ALU_MAP[token.value] !== undefined) {
      line += `${addressType}(${address})`;
      inst.aluCtrl = ALU_MAP[token.value]
      
      this.advance();
    } else if (SPECIAL_INST_MAP[token.value] !== undefined) {
      line +=  `${addressType}(${address}) - S`;
      
      if(addressType == 'LBL' && label) {
        address = label.pos;
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
    console.log(inst.memAddr);
    inst.line = line;
    return inst;
  }

  getLabel(name) {
    return this.labels.filter((l) => l.name == name)[0];
  }

  getNextToken() {
    return this.tokens[this.pos];
  }

  parse() {
    let nextToken = new Token();
    let stop = false;
    let line = 0;
    while(nextToken.type != 'EOF' && !stop)  {
      nextToken = this.getNextToken();

      switch (nextToken.type) {
        case 'KWD':
          let inst = this.parseKeyword(nextToken);
          this.instructions.push(inst);
          this.advance();
          line++;
          break;
        case 'LBL':
          let label = nextToken.value;
          if(!this.getLabel(label)) {=
            this.labels.push(new Label(label, line));
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
}