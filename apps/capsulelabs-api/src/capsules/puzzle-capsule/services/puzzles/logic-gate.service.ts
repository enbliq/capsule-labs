import { Injectable } from "@nestjs/common"
import {
  LogicGateType,
  type PuzzleConfig,
  type PuzzleSolution,
  type LogicGate,
} from "../../entities/puzzle-capsule.entity"

@Injectable()
export class LogicGateService {
  validateConfig(config: PuzzleConfig): boolean {
    if (!config.gates || !Array.isArray(config.gates)) return false
    if (!config.inputs || !Array.isArray(config.inputs)) return false
    if (!config.expectedOutput || !Array.isArray(config.expectedOutput)) return false

    // Validate each gate
    for (const gate of config.gates) {
      if (!this.isValidGate(gate)) return false
    }

    return true
  }

  async preparePuzzle(config: PuzzleConfig): Promise<PuzzleConfig> {
    // Validate the circuit can produce the expected output
    const actualOutput = this.evaluateCircuit(config.gates!, config.inputs!)

    if (JSON.stringify(actualOutput) !== JSON.stringify(config.expectedOutput)) {
      throw new Error("Circuit configuration does not produce expected output")
    }

    return config
  }

  validateSolution(config: PuzzleConfig, solution: boolean[]): PuzzleSolution {
    if (!Array.isArray(solution)) {
      return {
        isCorrect: false,
        score: 0,
        timeTaken: 0,
        hintsUsed: 0,
        feedback: "Solution must be an array of boolean values",
        errors: ["Invalid solution format"],
      }
    }

    const expectedOutput = config.expectedOutput!
    const isCorrect = JSON.stringify(solution) === JSON.stringify(expectedOutput)

    let correctOutputs = 0
    for (let i = 0; i < Math.min(solution.length, expectedOutput.length); i++) {
      if (solution[i] === expectedOutput[i]) {
        correctOutputs++
      }
    }

    const score = expectedOutput.length > 0 ? Math.round((correctOutputs / expectedOutput.length) * 100) : 0

    return {
      isCorrect,
      score,
      timeTaken: 0,
      hintsUsed: 0,
      feedback: isCorrect
        ? "Perfect! You've correctly analyzed the logic circuit!"
        : `You got ${correctOutputs} out of ${expectedOutput.length} outputs correct.`,
      errors: isCorrect ? [] : [`Expected: [${expectedOutput.join(", ")}], Got: [${solution.join(", ")}]`],
    }
  }

  getPuzzleDataForUser(config: PuzzleConfig): any {
    return {
      gates: config.gates,
      inputs: config.inputs,
      timeLimit: config.timeLimit,
      gateTypes: Object.values(LogicGateType),
    }
  }

  generateHints(config: PuzzleConfig, maxHints: number): string[] {
    const hints: string[] = []
    const gates = config.gates!

    hints.push("Trace the signal flow from inputs through each gate to the outputs")

    if (maxHints > 1) {
      hints.push("Remember: AND gates output true only when ALL inputs are true")
    }

    if (maxHints > 2) {
      hints.push("OR gates output true when ANY input is true")
    }

    if (maxHints > 3 && gates.length > 0) {
      const firstGate = gates[0]
      const output = this.evaluateGate(firstGate, this.getGateInputValues(firstGate, config.inputs!, []))
      hints.push(`The first gate (${firstGate.type}) outputs: ${output}`)
    }

    return hints.slice(0, maxHints)
  }

  private isValidGate(gate: LogicGate): boolean {
    if (!gate.id || !gate.type || !gate.output) return false
    if (!gate.inputs || !Array.isArray(gate.inputs)) return false

    // Validate gate type
    if (!Object.values(LogicGateType).includes(gate.type)) return false

    // Validate input count for gate type
    switch (gate.type) {
      case LogicGateType.NOT:
        return gate.inputs.length === 1
      case LogicGateType.AND:
      case LogicGateType.OR:
      case LogicGateType.NAND:
      case LogicGateType.NOR:
      case LogicGateType.XOR:
        return gate.inputs.length >= 2
      default:
        return false
    }
  }

  private evaluateCircuit(gates: LogicGate[], inputs: boolean[]): boolean[] {
    const gateOutputs = new Map<string, boolean>()
    const finalOutputs: boolean[] = []

    // Create input mappings (assuming inputs are named "input0", "input1", etc.)
    const inputMap = new Map<string, boolean>()
    inputs.forEach((value, index) => {
      inputMap.set(`input${index}`, value)
    })

    // Evaluate gates in dependency order
    const evaluatedGates = new Set<string>()

    while (evaluatedGates.size < gates.length) {
      for (const gate of gates) {
        if (evaluatedGates.has(gate.id)) continue

        // Check if all inputs are available
        const inputValues = this.getGateInputValues(gate, inputs, Array.from(gateOutputs.entries()))
        if (inputValues.length === gate.inputs.length) {
          const output = this.evaluateGate(gate, inputValues)
          gateOutputs.set(gate.output, output)
          evaluatedGates.add(gate.id)
        }
      }
    }

    // Collect final outputs (assuming they're named "output0", "output1", etc.)
    let outputIndex = 0
    while (gateOutputs.has(`output${outputIndex}`)) {
      finalOutputs.push(gateOutputs.get(`output${outputIndex}`)!)
      outputIndex++
    }

    return finalOutputs
  }

  private getGateInputValues(gate: LogicGate, circuitInputs: boolean[], gateOutputs: [string, boolean][]): boolean[] {
    const values: boolean[] = []
    const outputMap = new Map(gateOutputs)

    for (const inputName of gate.inputs) {
      // Check if it's a circuit input
      if (inputName.startsWith("input")) {
        const inputIndex = Number.parseInt(inputName.replace("input", ""), 10)
        if (inputIndex < circuitInputs.length) {
          values.push(circuitInputs[inputIndex])
          continue
        }
      }

      // Check if it's an output from another gate
      if (outputMap.has(inputName)) {
        values.push(outputMap.get(inputName)!)
        continue
      }

      // Input not available yet
      break
    }

    return values
  }

  private evaluateGate(gate: LogicGate, inputs: boolean[]): boolean {
    switch (gate.type) {
      case LogicGateType.AND:
        return inputs.every((input) => input)
      case LogicGateType.OR:
        return inputs.some((input) => input)
      case LogicGateType.NOT:
        return !inputs[0]
      case LogicGateType.NAND:
        return !inputs.every((input) => input)
      case LogicGateType.NOR:
        return !inputs.some((input) => input)
      case LogicGateType.XOR:
        return inputs.filter((input) => input).length % 2 === 1
      default:
        throw new Error(`Unknown gate type: ${gate.type}`)
    }
  }
}
