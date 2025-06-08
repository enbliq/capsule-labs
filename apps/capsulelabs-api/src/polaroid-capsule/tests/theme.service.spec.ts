import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import { ThemeService } from "../services/theme.service"
import { PhotoTheme } from "../entities/photo-theme.entity"
import { DailyTheme } from "../entities/daily-theme.entity"
import type { Repository } from "typeorm"

describe("ThemeService", () => {
  let service: ThemeService
  let photoThemeRepository: Repository<PhotoTheme>
  let dailyThemeRepository: Repository<DailyTheme>

  const mockPhotoThemeRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  }

  const mockDailyThemeRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThemeService,
        {
          provide: getRepositoryToken(PhotoTheme),
          useValue: mockPhotoThemeRepository,
        },
        {
          provide: getRepositoryToken(DailyTheme),
          useValue: mockDailyThemeRepository,
        },
      ],
    }).compile()

    service = module.get<ThemeService>(ThemeService)
    photoThemeRepository = module.get<Repository<PhotoTheme>>(getRepositoryToken(PhotoTheme))
    dailyThemeRepository = module.get<Repository<DailyTheme>>(getRepositoryToken(DailyTheme))
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("createTheme", () => {
    it("should create a new theme", async () => {
      const createThemeDto = {
        name: "Something Yellow",
        description: "Take a photo of something yellow",
        category: "color" as any,
        keywords: ["yellow", "gold", "amber"],
      }

      const mockTheme = { id: "1", ...createThemeDto }
      mockPhotoThemeRepository.create.mockReturnValue(mockTheme)
      mockPhotoThemeRepository.save.mockResolvedValue(mockTheme)

      const result = await service.createTheme(createThemeDto)

      expect(mockPhotoThemeRepository.create).toHaveBeenCalledWith(createThemeDto)
      expect(mockPhotoThemeRepository.save).toHaveBeenCalledWith(mockTheme)
      expect(result).toEqual(mockTheme)
    })
  })

  describe("getDailyTheme", () => {
    it("should return existing daily theme if already assigned", async () => {
      const userId = "user-1"
      const date = new Date("2023-01-01")
      const mockDailyTheme = {
        id: "daily-1",
        userId,
        date,
        theme: { id: "theme-1", name: "Something Yellow" },
      }

      mockDailyThemeRepository.findOne.mockResolvedValue(mockDailyTheme)

      const result = await service.getDailyTheme(userId, date)

      expect(result).toEqual(mockDailyTheme)
      expect(mockDailyThemeRepository.findOne).toHaveBeenCalledWith({
        where: { userId, date: new Date("2023-01-01") },
        relations: ["theme"],
      })
    })

    it("should assign new theme if none exists for the day", async () => {
      const userId = "user-1"
      const date = new Date("2023-01-01")
      const mockThemes = [
        { id: "theme-1", name: "Something Yellow", usageCount: 0 },
        { id: "theme-2", name: "Something Blue", usageCount: 1 },
      ]
      const mockNewDailyTheme = {
        id: "daily-1",
        userId,
        date,
        theme: mockThemes[0],
      }

      mockDailyThemeRepository.findOne.mockResolvedValue(null)
      mockPhotoThemeRepository.find.mockResolvedValue(mockThemes)
      mockPhotoThemeRepository.save.mockResolvedValue({ ...mockThemes[0], usageCount: 1 })
      mockDailyThemeRepository.create.mockReturnValue(mockNewDailyTheme)
      mockDailyThemeRepository.save.mockResolvedValue(mockNewDailyTheme)

      const result = await service.getDailyTheme(userId, date)

      expect(result).toEqual(mockNewDailyTheme)
      expect(mockPhotoThemeRepository.save).toHaveBeenCalledWith({ ...mockThemes[0], usageCount: 1 })
    })
  })
})
