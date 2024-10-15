import { Command } from "commander";
import pkg from "figlet";
import { resourceTypes } from "workforce-core/model";
import { deleteResource, getResource, listResources } from "./commands/api.js";
import { config, configKeys } from "./commands/config.js";
import { login } from "./commands/login.js";
import { push } from "./commands/push.js";
import { excelsiorLinks } from "./commands/excelsior.js";

const { textSync } = pkg;
console.log(textSync('Workforce'));

const cli = new Command();

cli
.version("1.0.0")
.description("Workforce CLI")

cli
.command("login")
.description("Login to the Workforce API")
.option("-i, --oauth2-issuer-uri [oauth2-issuer-uri]", "Workforce Oauth2 Issuer URI - can also be set with WORKFORCE_OAUTH2_ISSUER_URI environment variable", process.env.WORKFORCE_OAUTH2_ISSUER_URI)
.option("-c, --oauth2-client-id [oauth2-client-id]", "Workforce Oauth2 Client ID - can also be set with WORKFORCE_OAUTH2_CLIENT_ID environment variable", process.env.WORKFORCE_OAUTH2_CLIENT_ID)
.option("-a, --api [url]", "Workforce API URL - can also be set with WORKFORCE_API_URL environment variable", process.env.WORKFORCE_API_URL)
.action(login);

cli
.command("config")
.description("Set configuration values")
.command("set")
.argument("<key>", `Configuration key - must be one of: ${configKeys.join(", ")}`)
.argument("<value>", "Configuration value")
.action(config);

const typeString = `Type of resource - must be one of: ${resourceTypes.join(", ")}`;
const apiString = "Workforce API URL - can also be set with WORKFORCE_API_URL environment variable";
const orgString = "Organization ID - can also be set with WORKFORCE_ORG_ID environment variable";

const listCommands = cli
.command("list")
.description("List resources")
.argument("<type>", typeString)
.option("-a, --api [url]", apiString, process.env.WORKFORCE_API_URL)
.option("-o, --org [org]", orgString, process.env.WORKFORCE_ORG_ID)
.option("-f, --flow [flow]", "Flow ID, required for some resource types")

listCommands.action(listResources);

const getCommands = cli
.command("get")
.description("Get a resource")
.argument("<type>", typeString)
.argument("<id>", "ID of the resource to get")
.option("-a, --api [url]", apiString, process.env.WORKFORCE_API_URL)
.option("-o, --org [org]", orgString, process.env.WORKFORCE_ORG_ID)

getCommands.action(getResource);

const deleteCommands = cli
.command("delete")
.description("Delete a resource")
.argument("<type>", typeString)
.argument("<id>", "ID of the resource to delete")
.option("-a, --api [url]", apiString, process.env.WORKFORCE_API_URL)
.option("-o, --org [org]", orgString, process.env.WORKFORCE_ORG_ID)

deleteCommands.action(deleteResource);

const pushCommand = cli
.command("push")
.description("Push resources")
.argument("<path>", "Path to the file containing the resources to push")
.option("-a, --api [url]", apiString, process.env.WORKFORCE_API_URL)
.option("-o, --org [org]", orgString, process.env.WORKFORCE_ORG_ID)

pushCommand.action(push);

const excelsiorCommand = cli
.command("excelsior")
.alias("exl")
.description("Generate Excelsior links for channels")
.option("-f, --flow <flow>", "Flow ID")
.option("-a, --api [url]", apiString, process.env.WORKFORCE_API_URL)
.option("-o, --org [org]", orgString, process.env.WORKFORCE_ORG_ID)

excelsiorCommand.action(excelsiorLinks);

cli.parse();