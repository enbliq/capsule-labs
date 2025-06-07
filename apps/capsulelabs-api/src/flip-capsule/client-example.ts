/**
 * This is a client-side example of how to use the Flip Capsule WebSocket API.
 * This is not part of the NestJS backend, but is provided as a reference for frontend implementation.
 */

// Example using Socket.IO client in a browser environment
import { io } from "socket.io-client"

class FlipCapsuleClient {
  private socket: any // Socket
  private sessionId: string | null = null
  private isFlipped = false
  private elapsedTime = 0
  private remainingTime = 0
  private requiredDuration = 30000 // 30 seconds default
  private onStatusUpdate: ((status: any) => void) | null = null
  private onSessionComplete: (() => void) | null = null
  private orientationListener: any = null

  constructor(serverUrl: string) {
    // Initialize Socket.IO connection
    this.socket = io(`${serverUrl}/flip-capsule`)

    // Set up socket event listeners
    this.socket.on("connect", () => {
      console.log("Connected to Flip Capsule server")
    })

    this.socket.on("disconnect", () => {
      console.log("Disconnected from Flip Capsule server")
      this.stopOrientationTracking()
    })

    this.socket.on("sessionComplete", (data: any) => {
      console.log("Session complete!", data)
      if (this.onSessionComplete) {
        this.onSessionComplete()
      }
    })
  }

  /**
   * Check if the device supports the required sensors
   */
  async checkDeviceCapabilities(): Promise<{
    hasRequiredSensors: boolean
    missingFeatures: string[]
    deviceOrientation: string
  }> {
    return new Promise((resolve) => {
      // Get a sample orientation reading
      if (window.DeviceOrientationEvent) {
        const tempListener = (event: DeviceOrientationEvent) => {
          window.removeEventListener("deviceorientation", tempListener)

          const orientationData = {
            alpha: event.alpha || 0,
            beta: event.beta || 0,
            gamma: event.gamma || 0,
            absolute: event.absolute || false,
          }

          this.socket.emit("checkDeviceCapabilities", orientationData, (response: any) => {
            resolve(response)
          })
        }

        window.addEventListener("deviceorientation", tempListener, { once: true })

        // If no orientation event fires within 1 second, device likely doesn't support it
        setTimeout(() => {
          window.removeEventListener("deviceorientation", tempListener)
          resolve({
            hasRequiredSensors: false,
            missingFeatures: ["deviceOrientation"],
            deviceOrientation: "unknown",
          })
        }, 1000)
      } else {
        resolve({
          hasRequiredSensors: false,
          missingFeatures: ["deviceOrientation"],
          deviceOrientation: "unknown",
        })
      }
    })
  }

  /**
   * Start a new flip session
   */
  async startSession(userId: string): Promise<boolean> {
    return new Promise((resolve) => {
      // Get device info
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        devicePixelRatio: window.devicePixelRatio,
      }

      this.socket.emit("startSession", { userId, deviceInfo }, (response: any) => {
        if (response && response.sessionId) {
          this.sessionId = response.sessionId
          this.requiredDuration = response.requiredDuration
          this.remainingTime = response.requiredDuration
          this.startOrientationTracking()
          resolve(true)
        } else {
          resolve(false)
        }
      })
    })
  }

  /**
   * End the current session
   */
  async endSession(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.sessionId) {
        resolve(false)
        return
      }

      this.socket.emit("endSession", {}, (response: any) => {
        this.stopOrientationTracking()
        this.sessionId = null
        resolve(response && response.success)
      })
    })
  }

  /**
   * Start tracking device orientation
   */
  private startOrientationTracking(): void {
    if (window.DeviceOrientationEvent) {
      this.orientationListener = (event: DeviceOrientationEvent) => {
        const orientationData = {
          alpha: event.alpha || 0,
          beta: event.beta || 0,
          gamma: event.gamma || 0,
          absolute: event.absolute || false,
          deviceId: this.sessionId,
        }

        // Add accelerometer data if available
        if ((window as any).DeviceMotionEvent) {
          window.addEventListener(
            "devicemotion",
            (motionEvent: DeviceMotionEvent) => {
              if (motionEvent.accelerationIncludingGravity) {
                orientationData.accelerometer = {
                  x: motionEvent.accelerationIncludingGravity.x || 0,
                  y: motionEvent.accelerationIncludingGravity.y || 0,
                  z: motionEvent.accelerationIncludingGravity.z || 0,
                }
              }
            },
            { once: true },
          )
        }

        // Send orientation data to server
        this.socket.emit("orientationUpdate", orientationData, (status: any) => {
          if (status) {
            this.isFlipped = status.isFlipped
            this.elapsedTime = status.elapsedTime
            this.remainingTime = status.remainingTime

            if (this.onStatusUpdate) {
              this.onStatusUpdate(status)
            }
          }
        })
      }

      // Request permission for iOS 13+ devices
      if (
        typeof (DeviceOrientationEvent as any).requestPermission === "function" &&
        typeof (DeviceMotionEvent as any).requestPermission === "function"
      ) {
        Promise.all([
          (DeviceOrientationEvent as any).requestPermission(),
          (DeviceMotionEvent as any).requestPermission(),
        ])
          .then((results) => {
            if (results.every((result) => result === "granted")) {
              window.addEventListener("deviceorientation", this.orientationListener)
            } else {
              console.error("Permission to access device orientation was denied")
            }
          })
          .catch((error) => {
            console.error("Error requesting device orientation permission:", error)
          })
      } else {
        // No permission needed
        window.addEventListener("deviceorientation", this.orientationListener)
      }
    } else {
      console.error("Device orientation not supported")
    }
  }

  /**
   * Stop tracking device orientation
   */
  private stopOrientationTracking(): void {
    if (this.orientationListener) {
      window.removeEventListener("deviceorientation", this.orientationListener)
      this.orientationListener = null
    }
  }

  /**
   * Set callback for status updates
   */
  setStatusUpdateCallback(callback: (status: any) => void): void {
    this.onStatusUpdate = callback
  }

  /**
   * Set callback for session completion
   */
  setSessionCompleteCallback(callback: () => void): void {
    this.onSessionComplete = callback
  }

  /**
   * Get current session status
   */
  getCurrentStatus(): {
    isFlipped: boolean
    elapsedTime: number
    remainingTime: number
    progress: number
  } {
    return {
      isFlipped: this.isFlipped,
      elapsedTime: this.elapsedTime,
      remainingTime: this.remainingTime,
      progress: this.requiredDuration > 0 ? this.elapsedTime / this.requiredDuration : 0,
    }
  }

  /**
   * Check if connected to server
   */
  isConnected(): boolean {
    return this.socket && this.socket.connected
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
    }
  }
}

// Example usage:
/*
const flipClient = new FlipCapsuleClient('https://your-api-server.com');

// Check device capabilities
flipClient.checkDeviceCapabilities().then(capabilities => {
  if (capabilities.hasRequiredSensors) {
    console.log('Device supports flip challenge!');
    
    // Set up callbacks
    flipClient.setStatusUpdateCallback(status => {
      console.log('Status update:', status);
      updateUI(status); // Update UI with current status
    });
    
    flipClient.setSessionCompleteCallback(() => {
      console.log('Challenge completed!');
      showCompletionUI(); // Show completion UI
    });
    
    // Start session when user clicks button
    document.getElementById('startButton').addEventListener('click', async () => {
      const started = await flipClient.startSession('user-123');
      if (started) {
        showActiveUI(); // Show active challenge UI
      }
    });
    
    // End session when user clicks cancel
    document.getElementById('cancelButton').addEventListener('click', async () => {
      await flipClient.endSession();
      showInitialUI(); // Show initial UI
    });
  } else {
    console.error('Device does not support flip challenge:', capabilities.missingFeatures);
    showUnsupportedUI(capabilities.missingFeatures); // Show unsupported device UI
  }
});
*/
