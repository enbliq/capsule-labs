import { Injectable } from "@nestjs/common"
import * as crypto from "crypto"

@Injectable()
export class QrCodeService {
  async generateQrCodeHash(capsuleId: string): Promise<string> {
    const timestamp = Date.now().toString()
    const randomBytes = crypto.randomBytes(16).toString("hex")
    const data = `${capsuleId}:${timestamp}:${randomBytes}`

    return crypto.createHash("sha256").update(data).digest("hex")
  }

  async generateQrCodeData(hash: string): Promise<string> {
    // In a real implementation, this would generate actual QR code image data
    // For now, we'll return the hash that can be encoded into a QR code
    return hash
  }

  validateQrCodeHash(hash: string): boolean {
    // Basic validation - check if it's a valid SHA256 hash
    const sha256Regex = /^[a-f0-9]{64}$/i
    return sha256Regex.test(hash)
  }

  async generateQrCodeUrl(hash: string, baseUrl = "https://api.qrserver.com/v1/create-qr-code/"): Promise<string> {
    const size = "200x200"
    const data = encodeURIComponent(hash)
    return `${baseUrl}?size=${size}&data=${data}`
  }
}
