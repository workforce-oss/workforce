import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';
import { Configuration, Logger } from 'workforce-core';
import { WorkforceComponent, workforceComponentTypes } from './components/model.js';
import { ServerContext } from './context.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: `${__dirname}/../.env.${Configuration.NodeEnv}` });

const componentNames = Configuration.ComponentName.split(",");
for (const componentName of componentNames) {
    if (!workforceComponentTypes.includes(componentName as WorkforceComponent)) {
        throw new Error(`Invalid component name: ${componentName}`);
    }
}
const context = new ServerContext(componentNames as WorkforceComponent[]);
context.init().catch((e) => {
    Logger.getInstance("WorkforceServer").error(`Error starting Workforce Server: ${JSON.stringify(e)}`);
    throw e;
});
