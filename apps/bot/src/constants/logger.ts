import { pino } from "pino";
import fs from "fs";
import path from "path";

type LogLevel = "info" | "warn" | "error" | "debug" | "trace";

export class Logger {
  private logger = pino();
  private static instance: Logger;
  private logDirectory: string;

  private constructor() {
    this.logDirectory = path.resolve("logs");

    this.ensureLogDirectoryExists();

    this.logger = pino(
      {
        name: "adventure-bot",
        level: "info",
        timestamp: pino.stdTimeFunctions.isoTime,
      },
      pino.destination(path.join(this.logDirectory, "adventure-bot.log"))
    );
  }

  private ensureLogDirectoryExists(): void {
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }

    return Logger.instance;
  }

  public log(level: LogLevel = "info", message: any): void {
    switch (level) {
      case "info":
        this.logger.info(message);
        break;
      case "warn":
        this.logger.warn(message);
        break;
      case "error":
        this.logger.error(message);
        break;
      case "debug":
        this.logger.debug(message);
        break;
      case "trace":
        this.logger.trace(message);
        break;
      default:
        this.logger.info(message);
        break;
    }
  }
}
