import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { SenseTask } from "../entities/sense-task.entity"
import { SenseType, TaskType } from "../dto/sense-task.dto"

@Injectable()
export class TaskGeneratorService {
  private readonly logger = new Logger(TaskGeneratorService.name)

  constructor(private senseTaskRepository: Repository<SenseTask>) {}

  private readonly senseTaskMapping = {
    [SenseType.SIGHT]: [TaskType.QR_SCAN, TaskType.PHOTO_CAPTURE, TaskType.COLOR_IDENTIFY, TaskType.PATTERN_MATCH],
    [SenseType.HEARING]: [TaskType.SOUND_RECORD, TaskType.VOICE_COMMAND],
    [SenseType.TOUCH]: [TaskType.GESTURE_DETECT, TaskType.VIBRATION_DETECT],
    [SenseType.SMELL]: [
      TaskType.PHOTO_CAPTURE, // Photo of something with distinct smell
    ],
    [SenseType.TASTE]: [
      TaskType.PHOTO_CAPTURE, // Photo of food/drink
    ],
  }

  async generateDailyTasks(userId: string, date: Date = new Date()) {
    this.logger.log(`Generating daily tasks for user ${userId} on ${date.toDateString()}`)

    const tasks = []
    const usedTaskTypes = new Set<TaskType>()

    // Generate one task for each sense
    for (const sense of Object.values(SenseType)) {
      const availableTaskTypes = this.senseTaskMapping[sense].filter((taskType) => !usedTaskTypes.has(taskType))

      if (availableTaskTypes.length === 0) {
        // Fallback to any available task type for this sense
        const taskType = this.getRandomElement(this.senseTaskMapping[sense])
        const task = await this.getTaskBySenseAndType(sense, taskType)
        tasks.push(this.createTaskInstance(task, sense, taskType))
      } else {
        const taskType = this.getRandomElement(availableTaskTypes)
        usedTaskTypes.add(taskType)
        const task = await this.getTaskBySenseAndType(sense, taskType)
        tasks.push(this.createTaskInstance(task, sense, taskType))
      }
    }

    // Randomize the order
    return this.shuffleArray(tasks)
  }

  private async getTaskBySenseAndType(sense: SenseType, taskType: TaskType) {
    const tasks = await this.senseTaskRepository.find({
      where: { sense, taskType, isActive: true },
    })

    return tasks.length > 0 ? this.getRandomElement(tasks) : this.createDefaultTask(sense, taskType)
  }

  private createTaskInstance(task: SenseTask, sense: SenseType, taskType: TaskType) {
    return {
      taskId: task.id,
      sense,
      taskType,
      title: task.title,
      description: task.description,
      metadata: task.metadata,
      completed: false,
    }
  }

  private createDefaultTask(sense: SenseType, taskType: TaskType) {
    const defaultTasks = {
      [SenseType.SIGHT]: {
        [TaskType.QR_SCAN]: {
          title: "Scan the Mystery Code",
          description: "Find and scan a QR code in your environment",
          metadata: { requiredPattern: "any" },
        },
        [TaskType.PHOTO_CAPTURE]: {
          title: "Capture the Moment",
          description: "Take a photo of something colorful",
          metadata: { minColors: 3 },
        },
        [TaskType.COLOR_IDENTIFY]: {
          title: "Color Detective",
          description: "Identify the dominant color in your surroundings",
          metadata: { targetColors: ["red", "blue", "green", "yellow"] },
        },
      },
      [SenseType.HEARING]: {
        [TaskType.SOUND_RECORD]: {
          title: "Sound Collector",
          description: "Record a 5-second ambient sound",
          metadata: { duration: 5, minDecibels: 30 },
        },
        [TaskType.VOICE_COMMAND]: {
          title: "Voice Activation",
          description: "Say the magic phrase clearly",
          metadata: { phrase: "Unlock my senses" },
        },
      },
      [SenseType.TOUCH]: {
        [TaskType.GESTURE_DETECT]: {
          title: "Gesture Master",
          description: "Perform a swipe gesture on your device",
          metadata: { gestureType: "swipe", direction: "any" },
        },
        [TaskType.VIBRATION_DETECT]: {
          title: "Feel the Pulse",
          description: "Detect device vibration pattern",
          metadata: { pattern: [100, 200, 100] },
        },
      },
      [SenseType.SMELL]: {
        [TaskType.PHOTO_CAPTURE]: {
          title: "Scent Snapshot",
          description: "Take a photo of something with a distinct aroma",
          metadata: { category: "aromatic" },
        },
      },
      [SenseType.TASTE]: {
        [TaskType.PHOTO_CAPTURE]: {
          title: "Flavor Focus",
          description: "Photograph your next meal or drink",
          metadata: { category: "food_drink" },
        },
      },
    }

    const taskData = defaultTasks[sense]?.[taskType]
    return {
      id: `default-${sense}-${taskType}`,
      sense,
      taskType,
      title: taskData?.title || "Complete Task",
      description: taskData?.description || "Complete this sensory task",
      metadata: taskData?.metadata || {},
    }
  }

  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)]
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
}
