import { Injectable } from "@nestjs/common"
import { QuestionType } from "../entities/truth-question.entity"

interface GeneratedQuestion {
  questionText: string
  type: QuestionType
  expectedAnswerPattern?: string
  weight: number
}

@Injectable()
export class QuestionGeneratorService {
  private readonly questionTemplates = {
    [QuestionType.PERSONAL]: [
      "What is your full name?",
      "Where were you born?",
      "What is your mother's maiden name?",
      "What was the name of your first pet?",
      "What is your favorite childhood memory?",
      "What school did you attend as a child?",
      "What is your biggest fear?",
      "What is your greatest achievement?",
    ],
    [QuestionType.FACTUAL]: [
      "What year did you graduate from high school?",
      "How many siblings do you have?",
      "What is your current age?",
      "What city do you currently live in?",
      "What is your profession?",
      "What car do you drive?",
      "What is your phone number?",
      "What is your address?",
    ],
    [QuestionType.EMOTIONAL]: [
      "Describe a time when you felt truly happy.",
      "What makes you feel most anxious?",
      "Who is the most important person in your life?",
      "What is your biggest regret?",
      "Describe a moment when you felt proud of yourself.",
      "What makes you feel most grateful?",
      "What is your deepest secret?",
      "How do you handle stress?",
    ],
    [QuestionType.BEHAVIORAL]: [
      "What do you do when you're angry?",
      "How do you typically spend your weekends?",
      "What is your morning routine?",
      "How do you make important decisions?",
      "What do you do when you can't sleep?",
      "How do you celebrate your birthday?",
      "What is your approach to conflict resolution?",
      "How do you show affection to loved ones?",
    ],
  }

  /**
   * Generates a set of questions for truth verification
   */
  generateQuestions(count = 5, types?: QuestionType[]): GeneratedQuestion[] {
    const questionTypes = types || Object.values(QuestionType)
    const questions: GeneratedQuestion[] = []

    for (let i = 0; i < count; i++) {
      const type = questionTypes[i % questionTypes.length]
      const templates = this.questionTemplates[type]
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)]

      questions.push({
        questionText: randomTemplate,
        type,
        weight: this.getQuestionWeight(type),
      })
    }

    return questions
  }

  /**
   * Gets the default weight for a question type
   */
  private getQuestionWeight(type: QuestionType): number {
    switch (type) {
      case QuestionType.FACTUAL:
        return 1.2 // Factual questions are easier to verify
      case QuestionType.PERSONAL:
        return 1.0 // Standard weight
      case QuestionType.EMOTIONAL:
        return 0.8 // Emotional questions are more subjective
      case QuestionType.BEHAVIORAL:
        return 0.9 // Behavioral questions are somewhat subjective
      default:
        return 1.0
    }
  }

  /**
   * Suggests questions based on user profile or previous answers
   */
  suggestPersonalizedQuestions(userProfile?: any): GeneratedQuestion[] {
    // In a real implementation, this would analyze user data to generate personalized questions
    // For now, we'll return a mix of different question types

    return [
      {
        questionText: "What was the name of your first school?",
        type: QuestionType.FACTUAL,
        expectedAnswerPattern: "school",
        weight: 1.2,
      },
      {
        questionText: "Describe your relationship with your parents.",
        type: QuestionType.EMOTIONAL,
        weight: 0.8,
      },
      {
        questionText: "What do you usually do on Sunday mornings?",
        type: QuestionType.BEHAVIORAL,
        weight: 0.9,
      },
      {
        questionText: "What is your middle name?",
        type: QuestionType.PERSONAL,
        weight: 1.0,
      },
      {
        questionText: "How many jobs have you had in your lifetime?",
        type: QuestionType.FACTUAL,
        weight: 1.2,
      },
    ]
  }
}
