import "dotenv/config";

import { getDefaultEnvironment } from "@modelcontextprotocol/sdk/client/stdio.js";
import { AzureOpenAI } from "@ainetwork/adk-provider-model-azure";
import { GeminiModel } from "@ainetwork/adk-provider-model-gemini";
import { MCPModule, MemoryModule, ModelModule } from "@ainetwork/adk/modules";
import { InMemoryMemory } from "@ainetwork/adk-provider-memory-inmemory";
import { AINAgent } from "@ainetwork/adk";

const PORT = Number(process.env.PORT) || 9100;

async function main() {
	const modelModule = new ModelModule();
	const azureModel = new AzureOpenAI(
		process.env.AZURE_OPENAI_PTU_BASE_URL!,
		process.env.AZURE_OPENAI_PTU_API_KEY!,
		process.env.AZURE_OPENAI_PTU_API_VERSION!,
		process.env.AZURE_OPENAI_MODEL_NAME!,
	);
	modelModule.addModel('azure-gpt-4o', azureModel);

	const geminiModel = new GeminiModel(
		process.env.GEMINI_API_KEY!,
		process.env.GEMINI_MODEL_NAME!,
	);
	modelModule.addModel('gemini-2.5', geminiModel);

	const mcpModule = new MCPModule();
	await mcpModule.addMCPConfig({
		notionApi: {
			command: "npx",
			args: ["-y", "@notionhq/notion-mcp-server"],
			env: {
				...getDefaultEnvironment(),
				OPENAPI_MCP_HEADERS: `{\"Authorization\": \"Bearer ${process.env.NOTION_API_KEY}\", \"Notion-Version\": \"2022-06-28\" }`,
			},
		},
	});

	const inMemoryMemory = new InMemoryMemory();
	const memoryModule = new MemoryModule(inMemoryMemory);

	const systemPrompt = ""

	const manifest = {
		name: "ComCom Agent",
		description: "An agent that can provide answers by referencing the contents of ComCom Notion.",
		version: "0.0.2", // Incremented version
		url: `http://localhost:${PORT}`,
		prompts: {
			agent: "always polite",
			system: systemPrompt,
		}
	};
	const agent = new AINAgent(
		manifest,
		{ modelModule, mcpModule, memoryModule }
	);

	agent.start(PORT);
}

main();