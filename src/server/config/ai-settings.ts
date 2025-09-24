/**
 * Server-side AI configuration settings
 * These settings control AI behavior across the application
 */

export interface AISettings {
	models: {
		main: {
			name: string;
			description: string;
			provider: "hackclub";
		};
		light: {
			name: string;
			description: string;
			provider: "hackclub";
		};
	};
	flashcards: {
		defaultCardCount: number | "auto";
		minCardCount: number;
		maxCardCount: number;
		defaultDifficulty: "beginner" | "intermediate" | "advanced";
		autoCountEnabled: boolean;
	};
	generation: {
		includeExamples: boolean;
		progressiveComplexity: boolean;
		maxTopicLength: number;
	};
	prompts: {
		deckName: {
			template: string;
			examples: string[];
		};
		deckDescription: {
			template: string;
			examples: string[];
		};
		cardCount: {
			template: string;
			examples: string[];
		};
		flashcardGeneration: {
			template: string;
			guidelines: string[];
		};
	};
}

/**
 * Default AI settings configuration
 */
export const AI_SETTINGS: AISettings = {
	models: {
		main: {
			name: "GPT OSS 120B",
			description: "Heavy model for comprehensive flashcard content generation",
			provider: "hackclub",
		},
		light: {
			name: "GPT OSS 20B",
			description: "Light model for titles, descriptions, and quick decisions",
			provider: "hackclub",
		},
	},
	flashcards: {
		defaultCardCount: "auto",
		minCardCount: 3,
		maxCardCount: 50,
		defaultDifficulty: "intermediate",
		autoCountEnabled: true,
	},
	generation: {
		includeExamples: true,
		progressiveComplexity: true,
		maxTopicLength: 20000,
	},
	prompts: {
		deckName: {
			template: `Generate a concise, descriptive name for a flashcard deck about: "{topic}"

The name should be:
- 2-6 words maximum
- Clear and descriptive
- Suitable for a study deck title
- Professional and educational

Examples:
{examples}`,
			examples: [
				'"JavaScript Fundamentals"',
				'"World War II History"',
				'"Biology Cell Structure"',
				'"Spanish Vocabulary Basics"',
				'"Python Data Structures"',
				'"Renaissance Art History"',
			],
		},
		deckDescription: {
			template: `Generate a helpful, informative description for a flashcard deck about: "{topic}"

The description should be:
- 1-2 sentences maximum
- Explain what the deck covers
- Help users understand the scope and content
- Professional and educational tone
- Engaging and motivating

Examples:
{examples}`,
			examples: [
				'"Master essential JavaScript concepts including variables, functions, and control structures for web development."',
				'"Explore key events, figures, and outcomes of World War II from 1939-1945."',
				'"Learn the structure and function of cellular components in plant and animal cells."',
				'"Build your Spanish vocabulary with common words and phrases for everyday conversation."',
				'"Understand fundamental data structures in Python including lists, dictionaries, and sets."',
				'"Discover the art, artists, and cultural movements of the Renaissance period in Europe."',
			],
		},
		cardCount: {
			template: `Analyze this topic and determine the optimal number of flashcards needed for effective learning: "{topic}"

Consider:
- Topic complexity and scope
- Amount of information to cover
- Optimal learning chunk size
- Balance between comprehensive coverage and manageable study sessions

Provide a number between {minCount}-{maxCount} flashcards that would best serve a student learning this topic.

Examples:
{examples}`,
			examples: [
				"Simple vocabulary: 8-12 cards",
				"Complex historical event: 12-18 cards",
				"Basic concept explanation: 5-8 cards",
				"Comprehensive subject overview: 15-20 cards",
				"Mathematical formulas: 6-10 cards",
				"Language grammar rules: 10-15 cards",
			],
		},
		flashcardGeneration: {
			template: `Generate {cardCount} flashcards about "{topic}".

Create educational flashcards that help someone learn about this topic effectively.
Each flashcard should have:
- A clear, concise question or prompt on the front
- A comprehensive but not overly long answer on the back

{guidelines}

Focus on key facts, definitions, concepts, and important details that someone studying this topic should know.`,
			guidelines: [
				"Make sure the flashcards cover different aspects of the topic and progress from basic to more advanced concepts where appropriate",
				"Use varied question types (definitions, examples, comparisons, applications)",
				"Keep answers concise but informative",
				"Include specific details and examples where helpful",
				"Ensure each card tests a single concept or fact",
			],
		},
	},
} as const;

/**
 * Get current AI settings (can be extended to read from database/env in future)
 */
export function getAISettings(): AISettings {
	return AI_SETTINGS;
}

/**
 * Get available card count options based on settings
 */
export function getCardCountOptions(): Array<{ value: string; label: string }> {
	const settings = getAISettings();
	const options = [];

	if (settings.flashcards.autoCountEnabled) {
		options.push({ value: "auto", label: "Auto (AI decides)" });
	}

	// Generate options from min to max
	for (
		let i = settings.flashcards.minCardCount;
		i <= settings.flashcards.maxCardCount;
		i += 5
	) {
		if (i <= settings.flashcards.maxCardCount) {
			options.push({ value: i.toString(), label: `${i} cards` });
		}
	}

	// Ensure max is included if not already
	if (settings.flashcards.maxCardCount % 5 !== 0) {
		options.push({
			value: settings.flashcards.maxCardCount.toString(),
			label: `${settings.flashcards.maxCardCount} cards`,
		});
	}

	return options;
}

/**
 * Get difficulty options
 */
export function getDifficultyOptions(): Array<{
	value: string;
	label: string;
}> {
	return [
		{ value: "beginner", label: "Beginner" },
		{ value: "intermediate", label: "Intermediate" },
		{ value: "advanced", label: "Advanced" },
	];
}

/**
 * Build deck name generation prompt
 */
export function buildDeckNamePrompt(topic: string): string {
	const settings = getAISettings();
	const examples = settings.prompts.deckName.examples
		.map((ex) => `- ${ex}`)
		.join("\n");

	return settings.prompts.deckName.template
		.replace("{topic}", topic)
		.replace("{examples}", examples);
}

/**
 * Build deck description generation prompt
 */
export function buildDeckDescriptionPrompt(topic: string): string {
	const settings = getAISettings();
	const examples = settings.prompts.deckDescription.examples
		.map((ex) => `- ${ex}`)
		.join("\n");

	return settings.prompts.deckDescription.template
		.replace("{topic}", topic)
		.replace("{examples}", examples);
}

/**
 * Build card count determination prompt
 */
export function buildCardCountPrompt(topic: string): string {
	const settings = getAISettings();
	const examples = settings.prompts.cardCount.examples
		.map((ex) => `- ${ex}`)
		.join("\n");

	return settings.prompts.cardCount.template
		.replace("{topic}", topic)
		.replace("{minCount}", settings.flashcards.minCardCount.toString())
		.replace("{maxCount}", settings.flashcards.maxCardCount.toString())
		.replace("{examples}", examples);
}

/**
 * Build flashcard generation prompt
 */
export function buildFlashcardGenerationPrompt(
	topic: string,
	cardCount: number,
): string {
	const settings = getAISettings();
	const guidelines = settings.prompts.flashcardGeneration.guidelines
		.map((g) => `- ${g}`)
		.join("\n");

	return settings.prompts.flashcardGeneration.template
		.replace("{topic}", topic)
		.replace("{cardCount}", cardCount.toString())
		.replace("{guidelines}", guidelines);
}
