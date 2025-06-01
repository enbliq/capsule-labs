import { Test, type TestingModule } from "@nestjs/testing"
import { CipherService } from "../services/puzzles/cipher.service"
import { CipherType } from "../entities/puzzle-capsule.entity"

describe("CipherService", () => {
  let service: CipherService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CipherService],
    }).compile()

    service = module.get<CipherService>(CipherService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("validateConfig", () => {
    it("should validate Caesar cipher config", () => {
      const config = {
        cipherType: CipherType.CAESAR,
        encryptedText: "KHOOR ZRUOG",
        key: "3",
      }

      const result = service.validateConfig(config)
      expect(result).toBe(true)
    })

    it("should validate Morse code config", () => {
      const config = {
        cipherType: CipherType.MORSE,
        encryptedText: ".... . .-.. .-.. ---",
      }

      const result = service.validateConfig(config)
      expect(result).toBe(true)
    })

    it("should reject invalid Caesar cipher key", () => {
      const config = {
        cipherType: CipherType.CAESAR,
        encryptedText: "KHOOR ZRUOG",
        key: "abc", // Should be numeric
      }

      const result = service.validateConfig(config)
      expect(result).toBe(false)
    })

    it("should reject missing encrypted text", () => {
      const config = {
        cipherType: CipherType.CAESAR,
        key: "3",
      }

      const result = service.validateConfig(config)
      expect(result).toBe(false)
    })
  })

  describe("validateSolution", () => {
    it("should validate correct Caesar cipher solution", () => {
      const config = {
        cipherType: CipherType.CAESAR,
        encryptedText: "KHOOR ZRUOG",
        key: "3",
        plainText: "HELLO WORLD",
      }

      const result = service.validateSolution(config, "hello world")

      expect(result.isCorrect).toBe(true)
      expect(result.score).toBe(100)
      expect(result.feedback).toContain("cracked the cipher")
    })

    it("should handle incorrect solution", () => {
      const config = {
        cipherType: CipherType.CAESAR,
        encryptedText: "KHOOR ZRUOG",
        key: "3",
        plainText: "HELLO WORLD",
      }

      const result = service.validateSolution(config, "wrong answer")

      expect(result.isCorrect).toBe(false)
      expect(result.score).toBeLessThan(100)
      expect(result.errors).toBeDefined()
    })

    it("should validate Morse code solution", () => {
      const config = {
        cipherType: CipherType.MORSE,
        encryptedText: ".... . .-.. .-.. ---",
        plainText: "HELLO",
      }

      const result = service.validateSolution(config, "hello")

      expect(result.isCorrect).toBe(true)
      expect(result.score).toBe(100)
    })
  })

  describe("generateHints", () => {
    it("should generate Caesar cipher hints", () => {
      const config = {
        cipherType: CipherType.CAESAR,
        encryptedText: "KHOOR ZRUOG",
        key: "3",
        plainText: "HELLO WORLD",
      }

      const hints = service.generateHints(config, 3)

      expect(hints).toHaveLength(3)
      expect(hints[0]).toContain("Caesar cipher")
      expect(hints[1]).toContain("shift value is 3")
      expect(hints[2]).toContain("HELLO")
    })

    it("should generate Morse code hints", () => {
      const config = {
        cipherType: CipherType.MORSE,
        encryptedText: ".... . .-.. .-.. ---",
        plainText: "HELLO",
      }

      const hints = service.generateHints(config, 3)

      expect(hints).toHaveLength(3)
      expect(hints[0]).toContain("Morse code")
      expect(hints[1]).toContain("A = .-")
      expect(hints[2]).toContain("H")
    })

    it("should limit hints to requested number", () => {
      const config = {
        cipherType: CipherType.CAESAR,
        encryptedText: "KHOOR ZRUOG",
        key: "3",
        plainText: "HELLO WORLD",
      }

      const hints = service.generateHints(config, 1)

      expect(hints).toHaveLength(1)
    })
  })

  describe("getPuzzleDataForUser", () => {
    it("should return safe puzzle data", () => {
      const config = {
        cipherType: CipherType.CAESAR,
        encryptedText: "KHOOR ZRUOG",
        key: "3",
        plainText: "HELLO WORLD",
        timeLimit: 300,
      }

      const userData = service.getPuzzleDataForUser(config)

      expect(userData.cipherType).toBe(CipherType.CAESAR)
      expect(userData.encryptedText).toBe("KHOOR ZRUOG")
      expect(userData.timeLimit).toBe(300)
      expect(userData.hint).toBeDefined()
      expect(userData.key).toBeUndefined() // Key should not be exposed
      expect(userData.plainText).toBeUndefined() // Plain text should not be exposed
    })
  })
})
