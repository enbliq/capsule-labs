import { Injectable, Logger } from "@nestjs/common"
import type { HttpService } from "@nestjs/axios"
import type { ConfigService } from "@nestjs/config"
import { SentimentLabel } from "../entities/mood-entry.entity"

export interface SentimentAnalysisResult {
  score: number // -1 to 1
  label: SentimentLabel
  confidence: number // 0 to 1
}

@Injectable()
export class SentimentService {
  private readonly logger = new Logger(SentimentService.name)

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async analyzeSentiment(text: string): Promise<SentimentAnalysisResult> {
    try {
      // Using a mock sentiment analysis - replace with actual API
      const result = await this.mockSentimentAnalysis(text)
      return result
    } catch (error) {
      this.logger.error("Sentiment analysis failed", error)
      // Return neutral sentiment as fallback
      return {
        score: 0,
        label: SentimentLabel.NEUTRAL,
        confidence: 0.5,
      }
    }
  }

  private async mockSentimentAnalysis(text: string): Promise<SentimentAnalysisResult> {
    // Mock implementation - replace with actual sentiment API call
    const positiveWords = ["happy", "joy", "great", "amazing", "wonderful", "love", "excited"]
    const negativeWords = ["sad", "angry", "terrible", "awful", "hate", "depressed", "frustrated"]

    const lowerText = text.toLowerCase()
    let score = 0
    let positiveCount = 0
    let negativeCount = 0

    positiveWords.forEach((word) => {
      if (lowerText.includes(word)) {
        positiveCount++
        score += 0.3
      }
    })

    negativeWords.forEach((word) => {
      if (lowerText.includes(word)) {
        negativeCount++
        score -= 0.3
      }
    })

    // Normalize score to -1 to 1 range
    score = Math.max(-1, Math.min(1, score))

    const confidence = Math.min(0.9, 0.5 + (positiveCount + negativeCount) * 0.1)

    let label: SentimentLabel
    if (score >= 0.6) label = SentimentLabel.VERY_POSITIVE
    else if (score >= 0.2) label = SentimentLabel.POSITIVE
    else if (score <= -0.6) label = SentimentLabel.VERY_NEGATIVE
    else if (score <= -0.2) label = SentimentLabel.NEGATIVE
    else label = SentimentLabel.NEUTRAL

    return { score, label, confidence }
  }

  // Example integration with TextRazor API (commented out)
  /*
  private async callTextRazorAPI(text: string): Promise<SentimentAnalysisResult> {
    const apiKey = this.configService.get<string>('TEXTRAZOR_API_KEY');
    
    const response = await firstValueFrom(
      this.httpService.post('https://api.textrazor.com/', 
        `text=${encodeURIComponent(text)}&extractors=sentiment`,
        {
          headers: {
            'X-TextRazor-Key': apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      )
    );

    const sentiment = response.data.response.sentiment;
    return {
      score: sentiment.score,
      label: this.mapSentimentLabel(sentiment.score),
      confidence: sentiment.confidence || 0.5,
    };
  }
  */

  private mapSentimentLabel(score: number): SentimentLabel {
    if (score >= 0.6) return SentimentLabel.VERY_POSITIVE
    if (score >= 0.2) return SentimentLabel.POSITIVE
    if (score <= -0.6) return SentimentLabel.VERY_NEGATIVE
    if (score <= -0.2) return SentimentLabel.NEGATIVE
    return SentimentLabel.NEUTRAL
  }
}
