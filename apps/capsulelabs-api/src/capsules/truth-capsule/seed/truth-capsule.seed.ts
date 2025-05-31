import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { TruthCapsule } from "../entities/truth-capsule.entity"
import { TruthQuestion } from "../entities/truth-question.entity"
import { QuestionType } from "../entities/truth-question.entity"

@Injectable()
export class TruthCapsuleSeed {
  private readonly truthCapsuleRepository: Repository<TruthCapsule>
  private readonly truthQuestionRepository: Repository<TruthQuestion>

  constructor(
    @InjectRepository(TruthCapsule)
    truthCapsuleRepository: Repository<TruthCapsule>,
    @InjectRepository(TruthQuestion)
    truthQuestionRepository: Repository<TruthQuestion>,
  ) {
    this.truthCapsuleRepository = truthCapsuleRepository
    this.truthQuestionRepository = truthQuestionRepository
  }

  async seed(): Promise<void> {
    // Clear existing data
    await this.truthQuestionRepository.delete({})
    await this.truthCapsuleRepository.delete({})

    // Create sample truth capsules
    const capsules = [
      {
        title: "Personal Identity Verification",
        content: "This capsule contains your personal identity verification results.",
        userId: "seed-user-1",
        truthThreshold: 0.7,
        maxAttempts: 3,
        isLocked: true,
        attemptCount: 0,
      },
      {
        title: "High Security Capsule",
        content: "This capsule requires high truthfulness scores to unlock.",
        userId: "seed-user-1",
        truthThreshold: 0.9,
        maxAttempts: 2,
        isLocked: true,
        attemptCount: 0,
      },
      {
        title: "Family History Capsule",
        content: "This capsule contains sensitive family history information.",
        userId: "seed-user-2",
        truthThreshold: 0.6,
        maxAttempts: 5,
        isLocked: true,
        attemptCount: 0,
      },
    ]

    const savedCapsules = await this.truthCapsuleRepository.save(capsules)

    // Create questions for the first capsule (Personal Identity)
    const personalQuestions = [
      {
        capsuleId: savedCapsules[0].id,
        questionText: "What is your full legal name?",
        type: QuestionType.FACTUAL,
        orderIndex: 0,
        expectedAnswerPattern: "name",
        weight: 1.2,
      },
      {
        capsuleId: savedCapsules[0].id,
        questionText: "Where were you born?",
        type: QuestionType.FACTUAL,
        orderIndex: 1,
        expectedAnswerPattern: "city",
        weight: 1.2,
      },
      {
        capsuleId: savedCapsules[0].id,
        questionText: "Describe your childhood home.",
        type: QuestionType.PERSONAL,
        orderIndex: 2,
        weight: 1.0,
      },
      {
        capsuleId: savedCapsules[0].id,
        questionText: "What was your biggest fear as a child?",
        type: QuestionType.EMOTIONAL,
        orderIndex: 3,
        weight: 0.8,
      },
    ]

    // Create questions for the second capsule (High Security)
    const securityQuestions = [
      {
        capsuleId: savedCapsules[1].id,
        questionText: "What is your mother's maiden name?",
        type: QuestionType.FACTUAL,
        orderIndex: 0,
        expectedAnswerPattern: "name",
        weight: 1.5,
      },
      {
        capsuleId: savedCapsules[1].id,
        questionText: "What was the name of your first pet?",
        type: QuestionType.PERSONAL,
        orderIndex: 1,
        expectedAnswerPattern: "pet",
        weight: 1.3,
      },
      {
        capsuleId: savedCapsules[1].id,
        questionText: "Describe the most embarrassing moment of your life.",
        type: QuestionType.EMOTIONAL,
        orderIndex: 2,
        weight: 1.0,
      },
    ]

    // Create questions for the third capsule (Family History)
    const familyQuestions = [
      {
        capsuleId: savedCapsules[2].id,
        questionText: "How many siblings do you have?",
        type: QuestionType.FACTUAL,
        orderIndex: 0,
        expectedAnswerPattern: "number",
        weight: 1.2,
      },
      {
        capsuleId: savedCapsules[2].id,
        questionText: "Describe your relationship with your parents.",
        type: QuestionType.EMOTIONAL,
        orderIndex: 1,
        weight: 0.9,
      },
      {
        capsuleId: savedCapsules[2].id,
        questionText: "What family traditions did you grow up with?",
        type: QuestionType.BEHAVIORAL,
        orderIndex: 2,
        weight: 0.8,
      },
      {
        capsuleId: savedCapsules[2].id,
        questionText: "What is your father's occupation?",
        type: QuestionType.FACTUAL,
        orderIndex: 3,
        expectedAnswerPattern: "job",
        weight: 1.1,
      },
    ]

    // Save all questions
    await this.truthQuestionRepository.save([...personalQuestions, ...securityQuestions, ...familyQuestions])

    console.log("Truth capsule seed data created successfully")
  }
}
