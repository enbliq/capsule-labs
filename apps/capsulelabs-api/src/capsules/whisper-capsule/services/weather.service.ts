import { Injectable, Logger } from "@nestjs/common"
import type { HttpService } from "@nestjs/axios"
import type { ConfigService } from "@nestjs/config"
import { firstValueFrom } from "rxjs"

export interface WeatherData {
  temperature: number
  weatherType: string
  description: string
  humidity: number
  pressure: number
  windSpeed: number
  location: {
    name: string
    country: string
  }
}

export interface OpenWeatherMapResponse {
  main: {
    temp: number
    humidity: number
    pressure: number
  }
  weather: Array<{
    main: string
    description: string
  }>
  wind: {
    speed: number
  }
  name: string
  sys: {
    country: string
  }
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name)
  private readonly apiKey: string
  private readonly baseUrl = "https://api.openweathermap.org/data/2.5"

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>("OPENWEATHERMAP_API_KEY") || "demo_key"
  }

  async getCurrentWeather(latitude: number, longitude: number): Promise<WeatherData> {
    try {
      const url = `${this.baseUrl}/weather`
      const params = {
        lat: latitude.toString(),
        lon: longitude.toString(),
        appid: this.apiKey,
        units: "metric", // Use Celsius
      }

      this.logger.log(`Fetching weather for coordinates: ${latitude}, ${longitude}`)

      const response = await firstValueFrom(this.httpService.get<OpenWeatherMapResponse>(url, { params }))

      const data = response.data

      return {
        temperature: Math.round(data.main.temp * 10) / 10, // Round to 1 decimal place
        weatherType: data.weather[0].main.toLowerCase(),
        description: data.weather[0].description,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: data.wind.speed,
        location: {
          name: data.name,
          country: data.sys.country,
        },
      }
    } catch (error) {
      this.logger.error(`Failed to fetch weather data: ${error.message}`)

      // Return mock data if API fails (for development/testing)
      if (this.apiKey === "demo_key") {
        this.logger.warn("Using demo weather data")
        return this.getMockWeatherData(latitude, longitude)
      }

      throw new Error(`Weather service unavailable: ${error.message}`)
    }
  }

  private getMockWeatherData(latitude: number, longitude: number): WeatherData {
    // Generate semi-realistic mock data based on coordinates
    const baseTemp = 20 - Math.abs(latitude) * 0.5 // Colder near poles
    const variation = (Math.sin(longitude / 10) + Math.cos(latitude / 10)) * 10
    const temperature = Math.round((baseTemp + variation) * 10) / 10

    const weatherTypes = ["clear", "clouds", "rain", "snow"]
    const weatherType = weatherTypes[Math.floor(Math.abs(latitude + longitude) * 10) % weatherTypes.length]

    const descriptions = {
      clear: "clear sky",
      clouds: "scattered clouds",
      rain: "light rain",
      snow: "light snow",
    }

    return {
      temperature,
      weatherType,
      description: descriptions[weatherType] || "unknown",
      humidity: 50 + Math.floor(Math.random() * 40),
      pressure: 1000 + Math.floor(Math.random() * 50),
      windSpeed: Math.floor(Math.random() * 20),
      location: {
        name: "Mock City",
        country: "MC",
      },
    }
  }

  async getWeatherByCity(cityName: string): Promise<WeatherData> {
    try {
      const url = `${this.baseUrl}/weather`
      const params = {
        q: cityName,
        appid: this.apiKey,
        units: "metric",
      }

      this.logger.log(`Fetching weather for city: ${cityName}`)

      const response = await firstValueFrom(this.httpService.get<OpenWeatherMapResponse>(url, { params }))

      const data = response.data

      return {
        temperature: Math.round(data.main.temp * 10) / 10,
        weatherType: data.weather[0].main.toLowerCase(),
        description: data.weather[0].description,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: data.wind.speed,
        location: {
          name: data.name,
          country: data.sys.country,
        },
      }
    } catch (error) {
      this.logger.error(`Failed to fetch weather data for city ${cityName}: ${error.message}`)
      throw new Error(`Weather service unavailable: ${error.message}`)
    }
  }
}
