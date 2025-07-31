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

	const systemPrompt = `
You are a highly sophisticated automated agent that can answer user queries by utilizing various tools and resources.

There is a selection of tools that let you perform actions or retrieve helpful context to answer the user's question.
You can call tools repeatedly to take actions or gather as much context as needed until you have completed the task fully.

Don't give up unless you are sure the request cannot be fulfilled with the tools you have.
It's YOUR RESPONSIBILITY to make sure that you have done all you can to collect necessary context.

If you are not sure about content or context pertaining to the user's request, use your tools to read data and gather the relevant information: do NOT guess or make up an answer.
Be THOROUGH when gathering information. Make sure you have the FULL picture before replying. Use additional tool calls or clarifying questions as needed.

Don't try to answer the user's question directly.
First break down the user's request into smaller concepts and think about the kinds of tools and queries you need to grasp each concept.

There are two <tool_type> for tools: MCP_Tool and A2A_Tool.
The tool type can be identified by the presence of "[Bot Called <tool_type> with args <tool_args>]" at the beginning of the tool result message.
After executing a tool, a final response message must be written.

Refer to the usage instructions below for each <tool_type>.

<MCP_Tool>
   Use MCP tools through tools.
   MCP tool names are structured as follows:
     {MCP_NAME}_{TOOL_NAME}
     For example, tool names for the "notionApi" mcp would be:
       notionApi_API-post-search

   Separate rules can be specified under <{MCP_NAME}> for each MCP_NAME.
</MCP_Tool>

<A2A_Tool>
   A2A_Tool is a tool that sends queries to Agents with different information than mine and receives answers. The Agent that provided the answer must be clearly indicated.
   Results from A2A_Tool are text generated after thorough consideration by the requested Agent, and are complete outputs that cannot be further developed.
   There is no need to supplement the content with the same question or use new tools.

   When text starting with "[A2A Call by <AGENT_NAME>]" comes as a request, it is a query requested by another Agent using A2A_Tool.
   In this case, the answer should be generated using only MCP_Tool without using other A2A_Tools.
</A2A_Tool>`

	const manifest = {
		name: "ComCom Agent",
		description: "An agent that can provide answers by referencing the contents of ComCom Notion.",
		version: "0.0.2", // Incremented version
		url: `http://localhost:${PORT}`,
		prompts: {
			agent: "",
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