/**
 * Custom Logger for GJS/AGS Environment
 *
 * A simple, lightweight logger that works in the GJS environment
 * with colorized output and context/function tracing.
 */

interface LoggerOptions {
  scope?: string;
  context?: string;
}

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",

  // Foreground colors
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",

  // Background colors
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
};

// Log level badges
const badges = {
  debug: "🔍",
  info: "🛈 ",
  success: "✔ ",
  warn: "⚠ ",
  error: "✖ ",
  log: "◆ ",
};

class Logger {
  private scope: string;
  private context: string;

  constructor(options: LoggerOptions = {}) {
    this.scope = options.scope || "App";
    this.context = options.context || "";
  }

  private formatMessage(level: string, fnContext?: string): string {
    const contextParts: string[] = [];

    if (this.scope) {
      contextParts.push(this.scope);
    }

    if (this.context) {
      contextParts.push(this.context);
    }

    if (fnContext) {
      contextParts.push(fnContext);
    }

    const trace =
      contextParts.length > 0 ? `[${contextParts.join("] [")}]` : "";
    return trace;
  }

  private colorize(text: string, color: string): string {
    return `${color}${text}${colors.reset}`;
  }

  private log(
    level: "debug" | "info" | "success" | "warn" | "error" | "log",
    message: string,
    fnContext?: string,
    ...args: any[]
  ): void {
    const badge = badges[level];
    const trace = this.formatMessage(level, fnContext);

    let coloredLevel: string;
    let coloredMessage: string;

    switch (level) {
      case "debug":
        coloredLevel = this.colorize(`${badge} debug  `, colors.yellow);
        coloredMessage = this.colorize(trace, colors.yellow) + " " + message;
        break;
      case "info":
        coloredLevel = this.colorize(`${badge} info   `, colors.blue);
        coloredMessage = this.colorize(trace, colors.cyan) + " " + message;
        break;
      case "success":
        coloredLevel = this.colorize(`${badge} success`, colors.green);
        coloredMessage = this.colorize(trace, colors.green) + " " + message;
        break;
      case "warn":
        coloredLevel = this.colorize(`${badge} warn   `, colors.yellow);
        coloredMessage = this.colorize(trace, colors.yellow) + " " + message;
        break;
      case "error":
        coloredLevel = this.colorize(`${badge} error  `, colors.red);
        coloredMessage = this.colorize(trace, colors.red) + " " + message;
        break;
      default:
        coloredLevel = this.colorize(`${badge} log    `, colors.white);
        coloredMessage = this.colorize(trace, colors.white) + " " + message;
    }

    const output = `${coloredLevel} ${coloredMessage}`;

    if (args.length > 0) {
      print(output, ...args);
    } else {
      print(output);
    }
  }

  public debug(message: string, ...args: any[]): void;
  public debug(fnContext: string, message: string, ...args: any[]): void;
  public debug(messageOrContext: string, ...args: any[]): void {
    if (args.length > 0 && typeof args[0] === "string") {
      // First arg is fnContext, second is message
      const fnContext = messageOrContext;
      const message = args[0];
      const restArgs = args.slice(1);
      this.log("debug", message, fnContext, ...restArgs);
    } else {
      // First arg is message
      this.log("debug", messageOrContext, undefined, ...args);
    }
  }

  public info(message: string, ...args: any[]): void;
  public info(fnContext: string, message: string, ...args: any[]): void;
  public info(messageOrContext: string, ...args: any[]): void {
    if (args.length > 0 && typeof args[0] === "string") {
      const fnContext = messageOrContext;
      const message = args[0];
      const restArgs = args.slice(1);
      this.log("info", message, fnContext, ...restArgs);
    } else {
      this.log("info", messageOrContext, undefined, ...args);
    }
  }

  public success(message: string, ...args: any[]): void;
  public success(fnContext: string, message: string, ...args: any[]): void;
  public success(messageOrContext: string, ...args: any[]): void {
    if (args.length > 0 && typeof args[0] === "string") {
      const fnContext = messageOrContext;
      const message = args[0];
      const restArgs = args.slice(1);
      this.log("success", message, fnContext, ...restArgs);
    } else {
      this.log("success", messageOrContext, undefined, ...args);
    }
  }

  public warn(message: string, ...args: any[]): void;
  public warn(fnContext: string, message: string, ...args: any[]): void;
  public warn(messageOrContext: string, ...args: any[]): void {
    if (args.length > 0 && typeof args[0] === "string") {
      const fnContext = messageOrContext;
      const message = args[0];
      const restArgs = args.slice(1);
      this.log("warn", message, fnContext, ...restArgs);
    } else {
      this.log("warn", messageOrContext, undefined, ...args);
    }
  }

  public error(message: string, ...args: any[]): void;
  public error(fnContext: string, message: string, ...args: any[]): void;
  public error(messageOrContext: string, ...args: any[]): void {
    if (args.length > 0 && typeof args[0] === "string") {
      const fnContext = messageOrContext;
      const message = args[0];
      const restArgs = args.slice(1);
      this.log("error", message, fnContext, ...restArgs);
    } else {
      this.log("error", messageOrContext, undefined, ...args);
    }
  }

  public setContext(context: string): void {
    this.context = context;
  }

  public setScope(scope: string): void {
    this.scope = scope;
  }

  public createScoped(scope: string, context?: string): Logger {
    return new Logger({ scope, context });
  }
}

// Create default logger instance
export const logger = new Logger({ scope: "App" });

// Export Logger class for custom instances
export { Logger };

// Helper to create scoped loggers
export function createLogger(scope: string, context?: string): Logger {
  return new Logger({ scope, context });
}
