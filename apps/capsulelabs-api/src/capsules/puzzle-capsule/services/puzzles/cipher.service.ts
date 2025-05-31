import { Injectable } from "@nestjs/common"
import { CipherType, type PuzzleConfig, type PuzzleSolution } from "../../entities/puzzle-capsule.entity"

@Injectable()
export class CipherService {
  validateConfig(config: PuzzleConfig): boolean {
    if (!config.cipherType || !config.encryptedText) return false

    switch (config.cipherType) {
      case CipherType.CAESAR:
        return typeof config.key === "string" && /^\d+$/.test(config.key)
      case CipherType.SUBSTITUTION:
        return typeof config.key === "string" && config.key.length === 26
      case CipherType.VIGENERE:
        return typeof config.key === "string" && /^[A-Za-z]+$/.test(config.key)
      case CipherType.MORSE:
        return true // No key needed for Morse code
      default:
        return false
    }
  }

  async preparePuzzle(config: PuzzleConfig): Promise<PuzzleConfig> {
    if (!config.plainText) {
      // Decrypt to get the plain text (for validation)
      config.plainText = this.decrypt(config.cipherType!, config.encryptedText!, config.key)
    }

    return config
  }

  validateSolution(config: PuzzleConfig, solution: string): PuzzleSolution {
    const correctAnswer = config.plainText!.toLowerCase().replace(/[^a-z0-9\s]/g, "")
    const userAnswer = solution.toLowerCase().replace(/[^a-z0-9\s]/g, "")

    const isCorrect = correctAnswer === userAnswer
    const similarity = this.calculateSimilarity(correctAnswer, userAnswer)
    const score = Math.round(similarity * 100)

    return {
      isCorrect,
      score,
      timeTaken: 0,
      hintsUsed: 0,
      feedback: isCorrect
        ? "Excellent! You've cracked the cipher!"
        : `Close! Your answer is ${score}% similar to the correct solution.`,
      errors: isCorrect ? [] : [`Expected: "${config.plainText}", Got: "${solution}"`],
    }
  }

  getPuzzleDataForUser(config: PuzzleConfig): any {
    return {
      cipherType: config.cipherType,
      encryptedText: config.encryptedText,
      timeLimit: config.timeLimit,
      hint: this.getCipherTypeHint(config.cipherType!),
    }
  }

  generateHints(config: PuzzleConfig, maxHints: number): string[] {
    const hints: string[] = []
    const cipherType = config.cipherType!

    switch (cipherType) {
      case CipherType.CAESAR:
        hints.push("This is a Caesar cipher. Each letter is shifted by a fixed number.")
        if (maxHints > 1) hints.push(`The shift value is ${config.key}`)
        if (maxHints > 2) hints.push(`The first word is: "${config.plainText!.split(" ")[0]}"`)
        break

      case CipherType.SUBSTITUTION:
        hints.push("This is a substitution cipher. Each letter is replaced by another letter.")
        if (maxHints > 1) hints.push("Look for common letter patterns like 'THE', 'AND', 'OF'")
        if (maxHints > 2) hints.push(`The most frequent letter likely represents 'E'`)
        break

      case CipherType.VIGENERE:
        hints.push("This is a Vigenère cipher. It uses a keyword to shift letters.")
        if (maxHints > 1) hints.push(`The keyword is: ${config.key}`)
        if (maxHints > 2) hints.push("Apply the keyword repeatedly across the message")
        break

      case CipherType.MORSE:
        hints.push("This is Morse code. Dots and dashes represent letters.")
        if (maxHints > 1) hints.push("A = .-, B = -..., C = -.-., D = -..")
        if (maxHints > 2) hints.push(`The first letter is: ${config.plainText![0]}`)
        break
    }

    return hints.slice(0, maxHints)
  }

  private decrypt(cipherType: CipherType, encryptedText: string, key?: string): string {
    switch (cipherType) {
      case CipherType.CAESAR:
        return this.caesarDecrypt(encryptedText, Number.parseInt(key!, 10))
      case CipherType.SUBSTITUTION:
        return this.substitutionDecrypt(encryptedText, key!)
      case CipherType.VIGENERE:
        return this.vigenereDecrypt(encryptedText, key!)
      case CipherType.MORSE:
        return this.morseDecrypt(encryptedText)
      default:
        return encryptedText
    }
  }

  private caesarDecrypt(text: string, shift: number): string {
    return text.replace(/[A-Za-z]/g, (char) => {
      const start = char <= "Z" ? 65 : 97
      return String.fromCharCode(((char.charCodeAt(0) - start - shift + 26) % 26) + start)
    })
  }

  private substitutionDecrypt(text: string, key: string): string {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    return text.replace(/[A-Za-z]/g, (char) => {
      const isUpper = char === char.toUpperCase()
      const index = key.toUpperCase().indexOf(char.toUpperCase())
      if (index === -1) return char
      const result = alphabet[index]
      return isUpper ? result : result.toLowerCase()
    })
  }

  private vigenereDecrypt(text: string, key: string): string {
    const result: string[] = []
    let keyIndex = 0

    for (const char of text) {
      if (/[A-Za-z]/.test(char)) {
        const isUpper = char === char.toUpperCase()
        const charCode = char.toUpperCase().charCodeAt(0) - 65
        const keyChar = key[keyIndex % key.length].toUpperCase().charCodeAt(0) - 65
        const decryptedChar = String.fromCharCode(((charCode - keyChar + 26) % 26) + 65)
        result.push(isUpper ? decryptedChar : decryptedChar.toLowerCase())
        keyIndex++
      } else {
        result.push(char)
      }
    }

    return result.join("")
  }

  private morseDecrypt(text: string): string {
    const morseCode: Record<string, string> = {
      ".-": "A",
      "-...": "B",
      "-.-.": "C",
      "-..": "D",
      ".": "E",
      "..-.": "F",
      "--.": "G",
      "....": "H",
      "..": "I",
      ".---": "J",
      "-.-": "K",
      ".-..": "L",
      "--": "M",
      "-.": "N",
      "---": "O",
      ".--.": "P",
      "--.-": "Q",
      ".-.": "R",
      "...": "S",
      "-": "T",
      "..-": "U",
      "...-": "V",
      ".--": "W",
      "-..-": "X",
      "-.--": "Y",
      "--..": "Z",
      "-----": "0",
      ".----": "1",
      "..---": "2",
      "...--": "3",
      "....-": "4",
      ".....": "5",
      "-....": "6",
      "--...": "7",
      "---..": "8",
      "----.": "9",
    }

    return text
      .split(" ")
      .map((code) => morseCode[code] || "?")
      .join("")
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) return 1.0

    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  private getCipherTypeHint(cipherType: CipherType): string {
    switch (cipherType) {
      case CipherType.CAESAR:
        return "Each letter is shifted by the same amount in the alphabet"
      case CipherType.SUBSTITUTION:
        return "Each letter is replaced by a different letter consistently"
      case CipherType.VIGENERE:
        return "A keyword is used to shift letters by varying amounts"
      case CipherType.MORSE:
        return "Dots and dashes represent letters and numbers"
      default:
        return "Decode the encrypted message"
    }
  }
}
