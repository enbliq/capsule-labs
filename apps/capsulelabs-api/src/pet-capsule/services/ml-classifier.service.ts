import { Injectable, Logger } from "@nestjs/common"
import { PetType } from "../dto/pet-upload.dto"
import * as tf from "@tensorflow/tfjs-node"
import * as fs from "fs/promises"
import * as path from "path"

@Injectable()
export class MLClassifierService {
  private readonly logger = new Logger(MLClassifierService.name)
  private model: tf.LayersModel | null = null
  private readonly modelPath = process.env.PET_MODEL_PATH || "./models/pet-classifier"
  private readonly modelVersion = "1.0.0"
  private readonly confidenceThreshold = 0.7

  // Pet class labels (must match model training order)
  private readonly classLabels = [
    PetType.DOG,
    PetType.CAT,
    PetType.BIRD,
    PetType.RABBIT,
    PetType.HAMSTER,
    PetType.FISH,
    PetType.REPTILE,
    PetType.OTHER,
  ]

  constructor() {
    this.initializeModel()
  }

  private async initializeModel(): Promise<void> {
    try {
      // Try to load custom model first
      await this.loadCustomModel()
    } catch (error) {
      this.logger.warn("Custom model not available, using fallback classification")
      // In production, you might want to download a pre-trained model here
    }
  }

  private async loadCustomModel(): Promise<void> {
    try {
      const modelJsonPath = path.join(this.modelPath, "model.json")
      await fs.access(modelJsonPath)

      this.model = await tf.loadLayersModel(`file://${modelJsonPath}`)
      this.logger.log(`Loaded pet classification model from ${this.modelPath}`)
    } catch (error) {
      this.logger.warn("Failed to load custom model:", error.message)
      throw error
    }
  }

  async classifyPet(imagePath: string): Promise<{
    predictedPetType: PetType
    confidence: number
    allPredictions: Array<{ petType: PetType; confidence: number }>
    processingTimeMs: number
    modelVersion: string
    modelProvider: string
  }> {
    const startTime = Date.now()

    try {
      if (this.model) {
        return await this.classifyWithTensorFlow(imagePath, startTime)
      } else {
        return await this.classifyWithFallback(imagePath, startTime)
      }
    } catch (error) {
      this.logger.error("Error in pet classification:", error)
      return await this.classifyWithFallback(imagePath, startTime)
    }
  }

  private async classifyWithTensorFlow(
    imagePath: string,
    startTime: number,
  ): Promise<{
    predictedPetType: PetType
    confidence: number
    allPredictions: Array<{ petType: PetType; confidence: number }>
    processingTimeMs: number
    modelVersion: string
    modelProvider: string
  }> {
    try {
      // Load and preprocess image
      const imageBuffer = await fs.readFile(imagePath)
      const imageTensor = await this.preprocessImage(imageBuffer)

      // Run prediction
      const predictions = this.model!.predict(imageTensor) as tf.Tensor
      const predictionData = await predictions.data()

      // Clean up tensors
      imageTensor.dispose()
      predictions.dispose()

      // Process predictions
      const allPredictions = Array.from(predictionData)
        .map((confidence, index) => ({
          petType: this.classLabels[index],
          confidence: Number(confidence.toFixed(4)),
        }))
        .sort((a, b) => b.confidence - a.confidence)

      const topPrediction = allPredictions[0]
      const processingTimeMs = Date.now() - startTime

      this.logger.log(
        `TensorFlow classification: ${topPrediction.petType} (${(topPrediction.confidence * 100).toFixed(1)}%) in ${processingTimeMs}ms`,
      )

      return {
        predictedPetType: topPrediction.petType,
        confidence: topPrediction.confidence,
        allPredictions,
        processingTimeMs,
        modelVersion: this.modelVersion,
        modelProvider: "tensorflow",
      }
    } catch (error) {
      this.logger.error("TensorFlow classification failed:", error)
      throw error
    }
  }

  private async preprocessImage(imageBuffer: Buffer): Promise<tf.Tensor> {
    try {
      // Decode image
      const imageTensor = tf.node.decodeImage(imageBuffer, 3) as tf.Tensor3D

      // Resize to model input size (224x224)
      const resized = tf.image.resizeBilinear(imageTensor, [224, 224])

      // Normalize pixel values to [0, 1]
      const normalized = resized.div(255.0)

      // Add batch dimension
      const batched = normalized.expandDims(0)

      // Clean up intermediate tensors
      imageTensor.dispose()
      resized.dispose()
      normalized.dispose()

      return batched
    } catch (error) {
      this.logger.error("Error preprocessing image:", error)
      throw error
    }
  }

  private async classifyWithFallback(
    imagePath: string,
    startTime: number,
  ): Promise<{
    predictedPetType: PetType
    confidence: number
    allPredictions: Array<{ petType: PetType; confidence: number }>
    processingTimeMs: number
    modelVersion: string
    modelProvider: string
  }> {
    // Fallback classification using simple heuristics
    // In production, this could call an external API like Google Vision, AWS Rekognition, etc.

    const processingTimeMs = Date.now() - startTime

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Simple fallback: assume it's a dog with moderate confidence
    // This would be replaced with actual external API calls
    const fallbackPredictions = [
      { petType: PetType.DOG, confidence: 0.6 },
      { petType: PetType.CAT, confidence: 0.25 },
      { petType: PetType.OTHER, confidence: 0.15 },
    ]

    this.logger.log(
      `Fallback classification: ${fallbackPredictions[0].petType} (${(fallbackPredictions[0].confidence * 100).toFixed(1)}%)`,
    )

    return {
      predictedPetType: fallbackPredictions[0].petType,
      confidence: fallbackPredictions[0].confidence,
      allPredictions: fallbackPredictions,
      processingTimeMs: Date.now() - startTime,
      modelVersion: "fallback-1.0.0",
      modelProvider: "fallback",
    }
  }

  async classifyWithExternalAPI(imagePath: string): Promise<{
    predictedPetType: PetType
    confidence: number
    allPredictions: Array<{ petType: PetType; confidence: number }>
    processingTimeMs: number
    modelVersion: string
    modelProvider: string
  }> {
    const startTime = Date.now()

    try {
      // Example: Google Vision API integration
      // const vision = new ImageAnnotatorClient()
      // const [result] = await vision.labelDetection(imagePath)
      // const labels = result.labelAnnotations || []

      // Example: AWS Rekognition integration
      // const rekognition = new AWS.Rekognition()
      // const result = await rekognition.detectLabels({
      //   Image: { Bytes: await fs.readFile(imagePath) },
      //   MaxLabels: 10,
      //   MinConfidence: 50
      // }).promise()

      // For now, return a mock response
      const mockPredictions = [
        { petType: PetType.DOG, confidence: 0.85 },
        { petType: PetType.CAT, confidence: 0.12 },
        { petType: PetType.OTHER, confidence: 0.03 },
      ]

      return {
        predictedPetType: mockPredictions[0].petType,
        confidence: mockPredictions[0].confidence,
        allPredictions: mockPredictions,
        processingTimeMs: Date.now() - startTime,
        modelVersion: "external-api-1.0.0",
        modelProvider: "external_api",
      }
    } catch (error) {
      this.logger.error("External API classification failed:", error)
      throw error
    }
  }

  isHighConfidence(confidence: number): boolean {
    return confidence >= this.confidenceThreshold
  }

  needsManualReview(predictions: Array<{ petType: PetType; confidence: number }>): boolean {
    const topPrediction = predictions[0]
    const secondPrediction = predictions[1]

    // Needs review if:
    // 1. Top confidence is below threshold
    // 2. Top two predictions are very close
    // 3. Predicted as "OTHER" with high confidence
    return (
      topPrediction.confidence < this.confidenceThreshold ||
      (secondPrediction && Math.abs(topPrediction.confidence - secondPrediction.confidence) < 0.1) ||
      (topPrediction.petType === PetType.OTHER && topPrediction.confidence > 0.5)
    )
  }

  async getModelInfo(): Promise<{
    isLoaded: boolean
    modelVersion: string
    supportedPetTypes: PetType[]
    confidenceThreshold: number
    modelPath: string
  }> {
    return {
      isLoaded: this.model !== null,
      modelVersion: this.modelVersion,
      supportedPetTypes: this.classLabels,
      confidenceThreshold: this.confidenceThreshold,
      modelPath: this.modelPath,
    }
  }

  async reloadModel(): Promise<void> {
    if (this.model) {
      this.model.dispose()
      this.model = null
    }
    await this.initializeModel()
  }
}
