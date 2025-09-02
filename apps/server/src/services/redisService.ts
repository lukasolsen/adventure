import { Redis } from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export class RedisService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(REDIS_URL);
  }

  async set(
    key: string,
    value: string,
    mode: "EX" | "PX",
    duration: number
  ): Promise<void> {
    if (mode === "EX") {
      await this.redis.set(key, value, "EX", duration);
    } else {
      await this.redis.set(key, value, mode, duration);
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
}

export const redisService = new RedisService();
