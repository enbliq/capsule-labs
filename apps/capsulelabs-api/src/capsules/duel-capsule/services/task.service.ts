import { Injectable } from "@nestjs/common"
import { type Task, TaskType } from "../interfaces/duel.interface"

@Injectable()
export class TaskService {
  async generateTask(taskType?: TaskType): Promise<Task> {
    const type = taskType || this.getRandomTaskType()

    switch (type) {
      case TaskType.MATH:
        return this.generateMathTask()
      case TaskType.REACTION:
        return this.generateReactionTask()
      case TaskType.PUZZLE:
        return this.generatePuzzleTask()
      case TaskType.TRIVIA:
        return this.generateTriviaTask()
      default:
        return this.generateMathTask()
    }
  }

  validateAnswer(task: Task, answer: string): boolean {
    const normalizedAnswer = answer.toLowerCase().trim()
    const correctAnswer = task.answer.toString().toLowerCase().trim()

    return normalizedAnswer === correctAnswer
  }

  private getRandomTaskType(): TaskType {
    const types = Object.values(TaskType)
    return types[Math.floor(Math.random() * types.length)]
  }

  private generateMathTask(): Task {
    const operations = ["+", "-", "*"]
    const operation = operations[Math.floor(Math.random() * operations.length)]

    let num1: number, num2: number, answer: number

    switch (operation) {
      case "+":
        num1 = Math.floor(Math.random() * 50) + 1
        num2 = Math.floor(Math.random() * 50) + 1
        answer = num1 + num2
        break
      case "-":
        num1 = Math.floor(Math.random() * 50) + 25
        num2 = Math.floor(Math.random() * 25) + 1
        answer = num1 - num2
        break
      case "*":
        num1 = Math.floor(Math.random() * 12) + 1
        num2 = Math.floor(Math.random() * 12) + 1
        answer = num1 * num2
        break
    }

    return {
      id: this.generateTaskId(),
      type: TaskType.MATH,
      question: `What is ${num1} ${operation} ${num2}?`,
      answer: answer.toString(),
      timeLimit: 30,
    }
  }

  private generateReactionTask(): Task {
    const colors = ["red", "blue", "green", "yellow", "purple", "orange"]
    const targetColor = colors[Math.floor(Math.random() * colors.length)]

    return {
      id: this.generateTaskId(),
      type: TaskType.REACTION,
      question: `Type the color: ${targetColor.toUpperCase()}`,
      answer: targetColor,
      timeLimit: 15,
    }
  }

  private generatePuzzleTask(): Task {
    const puzzles = [
      {
        question: "I am not alive, but I grow; I don't have lungs, but I need air. What am I?",
        answer: "fire",
      },
      {
        question: "What has keys but no locks, space but no room, and you can enter but not go inside?",
        answer: "keyboard",
      },
      {
        question: "What gets wet while drying?",
        answer: "towel",
      },
      {
        question: "What has hands but cannot clap?",
        answer: "clock",
      },
    ]

    const puzzle = puzzles[Math.floor(Math.random() * puzzles.length)]

    return {
      id: this.generateTaskId(),
      type: TaskType.PUZZLE,
      question: puzzle.question,
      answer: puzzle.answer,
      timeLimit: 45,
    }
  }

  private generateTriviaTask(): Task {
    const trivia = [
      {
        question: "What is the capital of France?",
        answer: "paris",
        options: ["London", "Berlin", "Paris", "Madrid"],
      },
      {
        question: "Which planet is known as the Red Planet?",
        answer: "mars",
        options: ["Venus", "Mars", "Jupiter", "Saturn"],
      },
      {
        question: "What is the largest mammal in the world?",
        answer: "blue whale",
        options: ["Elephant", "Blue Whale", "Giraffe", "Hippopotamus"],
      },
    ]

    const question = trivia[Math.floor(Math.random() * trivia.length)]

    return {
      id: this.generateTaskId(),
      type: TaskType.TRIVIA,
      question: question.question,
      answer: question.answer,
      options: question.options,
      timeLimit: 20,
    }
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
