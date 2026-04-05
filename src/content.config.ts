import { defineCollection, reference, z } from "astro:content";
import type { icons as lucideIcons } from "@iconify-json/lucide/icons.json";
import { file, glob } from "astro/loaders";

const other = defineCollection({
	loader: glob({ base: "src/content/other", pattern: "**/*.{md,mdx}" }),
});

const iconSchema = z.custom<keyof typeof lucideIcons>();

const quickInfo = defineCollection({
	loader: file("src/content/info.json"),
	schema: z.object({
		id: z.number(),
		icon: iconSchema,
		text: z.string(),
		link: z.string().url().optional(),
	}),
});

const workExperience = defineCollection({
	loader: file("src/content/work.json"),
	schema: z.object({
		id: z.number(),
		title: z.string(),
		company: z.string(),
		duration: z.string(),
		description: z.string(),
	}),
});

const tags = defineCollection({
	loader: file("src/content/tags.json"),
	schema: z.object({
		id: z.string(),
	}),
});

const posts = defineCollection({
	loader: glob({ base: "src/content/posts", pattern: "**/*.{md,mdx}" }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			createdAt: z.coerce.date(),
			updatedAt: z.coerce.date().optional(),
			description: z.string(),
			tags: z.array(reference("tags")),
			draft: z.boolean().optional().default(false),
			image: image(),
			aiDisclaimer: z
				.object({
					text: z.string(),
					link: z.string().url().optional(),
				})
				.optional(),
		}),
});

const projects = defineCollection({
	loader: glob({ base: "src/content/projects", pattern: "**/*.{md,mdx}" }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			date: z.coerce.date(),
			draft: z.boolean().optional().default(false),
			image: image(),
			link: z.string().url().optional(),
			info: z.array(
				z.object({
					text: z.string(),
					icon: iconSchema,
					link: z.string().url().optional(),
				}),
			),
			aiDisclaimer: z
				.object({
					text: z.string(),
					link: z.string().url().optional(),
				})
				.optional(),
		}),
});

export const collections = {
	tags,
	posts,
	projects,
	other,
	quickInfo,
	workExperience,
};
