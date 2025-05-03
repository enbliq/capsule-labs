import { Injectable } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import type { Model } from "mongoose"
import { v4 as uuidv4 } from "uuid"
import { User } from "./schemas/user.schema"

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findByUsername(username: string): Promise<User | null> {
    return this.userModel.findOne({ username }).exec()
  }

  async createUser(username: string, name: string): Promise<User> {
    const newUser = new this.userModel({
      id: uuidv4(),
      username,
      name,
    })
    return newUser.save()
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findOne({ id }).exec()
  }
}
