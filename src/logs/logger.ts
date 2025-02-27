import fs from "fs";
import path from "path";
import { config } from "../config/config";

enum LogLevel {
  INFO = "info",
  ERROR = "error",
  WARN = "warn",
  CRITICAL = "critical",
}

class Logger {
  // Add this to constructor or initialize method
  constructor() {
    // Run cleanup daily
    setInterval(() => {
      this.cleanOldLogs();
    }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
  }

  private getTimestamp(): string {
    return new Date().toISOString().replace("T", " ").slice(0, 19);
  }

  private cleanOldLogs(): void {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    Object.values(LogLevel).forEach((level) => {
      const logFile = path.join(config.logPath, `${level}.log`);
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        if (stats.mtime < oneDayAgo) {
          fs.writeFileSync(logFile, "");
        }
      }
    });
  }

  private writeLog(level: LogLevel, message: string): void {
    const logMessage = `${this.getTimestamp()} [${level}] ${message}\n`;
    const logFile = path.join(config.logPath, `${level}.log`);

    if (!fs.existsSync(config.logPath)) {
      fs.mkdirSync(config.logPath, { recursive: true });
    }

    fs.appendFileSync(logFile, logMessage);
  }

  info(message: string): void {
    console.info(message);
    this.writeLog(LogLevel.INFO, message);
  }

  error(message: string): void {
    console.error(message);
    this.writeLog(LogLevel.ERROR, message);
  }

  warn(message: string): void {
    console.warn(message);
    this.writeLog(LogLevel.WARN, message);
  }

  critical(message: string): void {
    console.log(message);
    this.writeLog(LogLevel.CRITICAL, message);
  }

  clearLogs(): void {
    Object.values(LogLevel).forEach((level) => {
      const logFile = path.join(config.logPath, `${level}.log`);
      if (fs.existsSync(logFile)) {
        fs.writeFileSync(logFile, "");
      }
    });
    const cleanConsole = () => {
      console.clear(); // Clears the console
      process.stdout.write('\u001b[H\u001b[2J\u001b[3J'); // More thorough clearing including scrollback
    }
    setInterval(cleanConsole, 1000 * 60 * 60); // clear every 60 minutes
  }

  getAllLogs(): Record<LogLevel, string> {
    const logs: Record<LogLevel, string> = {} as Record<LogLevel, string>;

    Object.values(LogLevel).forEach((level) => {
      const logFile = path.join(config.logPath, `${level}.log`);
      if (fs.existsSync(logFile)) {
        logs[level] = fs.readFileSync(logFile, "utf8");
      } else {
        logs[level] = "";
      }
    });

    return logs;
  }
}

export default new Logger();
