import { AsusService } from "./services/asus";
import { createLogger } from "./utils/logger";

const logger = createLogger("AsusServiceTest");

logger.info("=== Testing AsusService ===");
logger.info(`Available: ${AsusService.available}`);
logger.info(`Profile: ${AsusService.profile}`);
logger.info(`Charge Limit: ${AsusService.chargeLimit}`);
logger.info(`GPU Mode: ${AsusService.gpuMode}`);
logger.info(`Error: ${AsusService.error}`);
