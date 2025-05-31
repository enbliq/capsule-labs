import { Injectable } from "@nestjs/common"

interface TruthAnalysisResult {
  truthScore: number
  sentimentScore: number
  analysisDetails: string
  confidence: number
}

@Injectable()
export class TruthAnalysisService {
  /**
   * Analyzes the truthfulness of an answer using NLP techniques
   * In a real implementation, this would use OpenAI, HuggingFace, or similar AI services
   */
  async analyzeTruthfulness(question: string, answer: string, expectedPattern?: string): Promise<TruthAnalysisResult> {
    // Mock implementation - in reality, this would use AI/NLP APIs

    // Basic sentiment analysis simulation
    const sentimentScore = this.calculateSentimentScore(answer)

    // Truth score calculation based on various factors
    let truthScore = 0.5 // Base score

    // Factor 1: Answer length (very short or very long answers might be less truthful)
    const lengthFactor = this.calculateLengthFactor(answer)
    truthScore += lengthFactor * 0.2

    // Factor 2: Sentiment consistency (truthful answers tend to have consistent sentiment)
    const sentimentFactor = this.calculateSentimentFactor(sentimentScore)
    truthScore += sentimentFactor * 0.2

    // Factor 3: Specificity (specific answers tend to be more truthful)
    const specificityFactor = this.calculateSpecificityFactor(answer)
    truthScore += specificityFactor * 0.2

    // Factor 4: Pattern matching if expected pattern is provided
    if (expectedPattern) {
      const patternFactor = this.calculatePatternFactor(answer, expectedPattern)
      truthScore += patternFactor * 0.3
    } else {
      // Factor 5: Linguistic markers of deception
      const linguisticFactor = this.calculateLinguisticFactor(answer)
      truthScore += linguisticFactor * 0.3
    }

    // Ensure score is between 0 and 1
    truthScore = Math.max(0, Math.min(1, truthScore))

    // Calculate confidence based on various factors
    const confidence = this.calculateConfidence(answer, truthScore)

    const analysisDetails = this.generateAnalysisDetails(
      truthScore,
      sentimentScore,
      lengthFactor,
      specificityFactor,
      confidence,
    )

    return {
      truthScore,
      sentimentScore,
      analysisDetails,
      confidence,
    }
  }

  private calculateSentimentScore(text: string): number {
    // Simple sentiment analysis based on positive/negative words
    const positiveWords = ["good", "great", "happy", "love", "excellent", "wonderful", "amazing", "fantastic"]
    const negativeWords = ["bad", "terrible", "hate", "awful", "horrible", "disgusting", "worst", "sad"]

    const words = text.toLowerCase().split(/\s+/)
    let positiveCount = 0
    let negativeCount = 0

    words.forEach((word) => {
      if (positiveWords.includes(word)) positiveCount++
      if (negativeWords.includes(word)) negativeCount++
    })

    const totalSentimentWords = positiveCount + negativeCount
    if (totalSentimentWords === 0) return 0.5 // Neutral

    return positiveCount / totalSentimentWords
  }

  private calculateLengthFactor(answer: string): number {
    const length = answer.trim().length

    // Optimal length is between 20-200 characters
    if (length < 10) return -0.3 // Too short, might be evasive
    if (length > 500) return -0.2 // Too long, might be overcompensating
    if (length >= 20 && length <= 200) return 0.3 // Good length

    return 0 // Neutral
  }

  private calculateSentimentFactor(sentimentScore: number): number {
    // Extreme sentiment scores might indicate emotional manipulation
    if (sentimentScore > 0.8 || sentimentScore < 0.2) return -0.1
    return 0.1 // Balanced sentiment is good
  }

  private calculateSpecificityFactor(answer: string): number {
    // Count specific details: numbers, dates, names, places
    const specificityMarkers = [
      /\b\d+\b/g, // Numbers
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi, // Months
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, // Days
      /\b[A-Z][a-z]+\s[A-Z][a-z]+\b/g, // Proper names (simplified)
    ]

    let specificityCount = 0
    specificityMarkers.forEach((pattern) => {
      const matches = answer.match(pattern)
      if (matches) specificityCount += matches.length
    })

    // More specific details generally indicate truthfulness
    return Math.min(0.3, specificityCount * 0.1)
  }

  private calculatePatternFactor(answer: string, expectedPattern: string): number {
    // Simple pattern matching - in reality, this would be more sophisticated
    const answerLower = answer.toLowerCase()
    const patternLower = expectedPattern.toLowerCase()

    if (answerLower.includes(patternLower)) return 0.3

    // Check for partial matches
    const patternWords = patternLower.split(/\s+/)
    let matchCount = 0

    patternWords.forEach((word) => {
      if (answerLower.includes(word)) matchCount++
    })

    return (matchCount / patternWords.length) * 0.3
  }

  private calculateLinguisticFactor(answer: string): number {
    // Look for linguistic markers that might indicate deception
    const deceptionMarkers = [
      /\b(honestly|truthfully|to be honest|believe me|trust me)\b/gi, // Overemphasis on honesty
      /\b(maybe|perhaps|might|could be|i think|i guess)\b/gi, // Uncertainty markers
      /\b(never|always|everyone|nobody|everything|nothing)\b/gi, // Absolute statements
    ]

    let deceptionScore = 0
    deceptionMarkers.forEach((pattern) => {
      const matches = answer.match(pattern)
      if (matches) deceptionScore += matches.length * 0.1
    })

    // More deception markers = lower truth score
    return Math.max(-0.3, -deceptionScore)
  }

  private calculateConfidence(answer: string, truthScore: number): number {
    // Confidence based on answer length and truth score consistency
    const length = answer.trim().length
    let confidence = 0.5

    // Longer, more detailed answers generally have higher confidence
    if (length > 50) confidence += 0.2
    if (length > 100) confidence += 0.1

    // Truth scores closer to extremes (0 or 1) have higher confidence
    const extremeness = Math.abs(truthScore - 0.5) * 2
    confidence += extremeness * 0.3

    return Math.max(0.1, Math.min(1, confidence))
  }

  private generateAnalysisDetails(
    truthScore: number,
    sentimentScore: number,
    lengthFactor: number,
    specificityFactor: number,
    confidence: number,
  ): string {
    const details = []

    if (truthScore > 0.7) {
      details.push("High truthfulness indicators detected")
    } else if (truthScore < 0.3) {
      details.push("Potential deception markers found")
    } else {
      details.push("Neutral truthfulness assessment")
    }

    if (sentimentScore > 0.7) {
      details.push("Positive sentiment")
    } else if (sentimentScore < 0.3) {
      details.push("Negative sentiment")
    } else {
      details.push("Neutral sentiment")
    }

    if (lengthFactor > 0.2) {
      details.push("Appropriate response length")
    } else if (lengthFactor < -0.2) {
      details.push("Response length concerns")
    }

    if (specificityFactor > 0.2) {
      details.push("Good level of specific details")
    }

    details.push(`Confidence: ${(confidence * 100).toFixed(1)}%`)

    return details.join("; ")
  }
}
