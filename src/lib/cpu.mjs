export const ALU_MAP = {
  "AD": 0b001, 
  "SB": 0b010,
  "AN": 0b011,
  "OR": 0b100,
  "NO": 0b101,
  "XO": 0b110,

  //special
  "OVERRIDE": 0b111 
};

export const SPECIAL_INST_MAP = {
  "PP": 0,
  "PO": 0,
  "JZ": 0b01110011,
  "JP": 0b11111111,
  "RT": 0,
  "RI": 0b11101111,
  "SL": 0b00011000,
  "SR": 0b00010100
}

export class HelixScreen {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  
    this.mode = 0x0;
    this.x = 0x0;
    this.y = 0x0;
  }
}

export class InstructionRom {
  constructor(instructions) {
    this.operands = [];
    this.opcodes = [];

    for(inst of instructions) {
      this.operands.push(inst.raw[0]);
      this.operands.push(inst.raw[1]);
    }
  }
}

export class Register {
  constructor() {}
  read() {}
  write() {}
}

export class HelixCPU {
  constructor() {
    this.pc = 0;
  }
  
  ld() { // ld

  }

  pp() { // push

  }

  po() { // pop

  }

  jz() { // jump if zero

  }

  jp() { // jump basic

  }

  rt() { // return, NYI

  }

  ad() { // a + b

  }

  sb() { // a - b

  }

  an() { // a & b

  }

  or() { // a || b

  }

  no() { // !a

  }

  xo() { // a XOR b

  }

  sl() { // shift a left

  }

  sr() { //shift a right

  }

  cycle(){
    this.pc++;
  }
}