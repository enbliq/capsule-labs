import { Injectable } from "@nestjs/common"
import type { PuzzleConfig, PuzzleSolution } from "../../entities/puzzle-capsule.entity"

@Injectable()
export class MathPuzzleService {
  validateConfig(config: PuzzleConfig): boolean {
    if (!config.equation || typeof config.equation !== "string") return false
    if (!config.variables || typeof config.variables !== "object") return false
    if (typeof config.targetValue !== "number") return false

    try {
      // Test if equation can be evaluated
      this.evaluateEquation(config.equation, config.variables)
      return true
    } catch {
      return false
    }
  }

  async preparePuzzle(config: PuzzleConfig): Promise<PuzzleConfig> {
    // Verify the equation evaluates to the target value
    const result = this.evaluateEquation(config.equation!, config.variables!)

    if (Math.abs(result - config.targetValue!) > 0.0001) {
      throw new Error("Equation does not evaluate to target value with given variables")
    }

    return config
  }

  validateSolution(config: PuzzleConfig, solution: Record<string, number>): PuzzleSolution {
    if (!solution || typeof solution !== "object") {
      return {
        isCorrect: false,
        score: 0,
        timeTaken: 0,
        hintsUsed: 0,
        feedback: "Solution must be an object with variable values",
        errors: ["Invalid solution format"],
      }
    }

    try {
      const result = this.evaluateEquation(config.equation!, solution)
      const target = config.targetValue!
      const difference = Math.abs(result - target)
      const tolerance = 0.0001

      const isCorrect = difference <= tolerance
      const accuracy = Math.max(0, 1 - difference / Math.abs(target || 1))
      const score = Math.round(accuracy * 100)

      return {
        isCorrect,
        score,
        timeTaken: 0,
        hintsUsed: 0,
        feedback: isCorrect
          ? "Excellent! You've solved the equation correctly!"
          : `Close! Your result (${result.toFixed(4)}) differs from the target (${target}) by ${difference.toFixed(4)}`,
        errors: isCorrect ? [] : [`Expected result: ${target}, Got: ${result}`],
      }
    } catch (error) {
      return {
        isCorrect: false,
        score: 0,
        timeTaken: 0,
        hintsUsed: 0,
        feedback: "Error evaluating your solution",
        errors: [error instanceof Error ? error.message : "Unknown error"],
      }
    }
  }

  getPuzzleDataForUser(config: PuzzleConfig): any {
    return {
      equation: config.equation,
      targetValue: config.targetValue,
      timeLimit: config.timeLimit,
      variableNames: Object.keys(config.variables!),
    }
  }

  generateHints(config: PuzzleConfig, maxHints: number): string[] {
    const hints: string[] = []
    const variables = config.variables!
    const variableNames = Object.keys(variables)

    hints.push(`Find values for variables: ${variableNames.join(", ")}`)

    if (maxHints > 1) {
      hints.push(`The equation should equal ${config.targetValue}`)
    }

    if (maxHints > 2 && variableNames.length > 0) {
      const firstVar = variableNames[0]
      hints.push(`Try ${firstVar} = ${variables[firstVar]} as a starting point`)
    }

    if (maxHints > 3) {
      hints.push("Work backwards from the target value to find the variables")
    }

    return hints.slice(0, maxHints)
  }

  private evaluateEquation(equation: string, variables: Record<string, number>): number {
    // Simple equation evaluator - replace variables and use eval
    // In production, use a proper math expression parser
    let expression = equation

    // Replace variables with their values
    for (const [variable, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\b${variable}\\b`, "g")
      expression = expression.replace(regex, value.toString())
    }

    // Basic safety check - only allow numbers, operators, and parentheses
    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
      throw new Error("Invalid characters in equation")
    }

    try {
      // eslint-disable-next-line no-eval
      return eval(expression)
    } catch (error) {
      throw new Error("Failed to evaluate equation")
    }
  }
}
