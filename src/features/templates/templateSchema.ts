import { z } from "zod";

const resourceTypeSchema = z.enum(["application", "website", "folder", "file"]);

const templateResourceBaseSchema = z
  .object({
    type: resourceTypeSchema,
    name: z.string().trim().min(1).max(200),
    target: z.string().trim().min(1).max(4096),
    icon: z.string().max(500).nullable(),
    description: z.string().max(2000).nullable(),
    launchOrder: z.number().int().min(0),
    isEnabled: z.boolean(),
  })
  .strict();

function websiteTargetIsValid(value: { type: string; target: string }): boolean {
  if (value.type !== "website") return true;
  try {
    const url = new URL(value.target);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.length > 0;
  } catch {
    return false;
  }
}

export const templateResourceSchema = templateResourceBaseSchema.refine(websiteTargetIsValid, {
  path: ["target"],
  message: "웹사이트는 http:// 또는 https:// URL이어야 합니다.",
});

export const workspaceTemplateSchema = z
  .object({
    schemaVersion: z.literal(1),
    name: z.string().trim().min(1).max(120),
    description: z.string().max(2000).nullable(),
    author: z.string().trim().min(1).max(120),
    category: z.string().trim().min(1).max(80),
    exportedAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "유효한 ISO 8601 날짜가 아닙니다.",
    }),
    workspace: z
      .object({
        name: z.string().trim().min(1).max(120),
        description: z.string().max(2000).nullable(),
        icon: z.string().max(200).nullable(),
        color: z.string().max(100).nullable(),
      })
      .strict(),
    resources: z.array(templateResourceSchema).max(200),
  })
  .strict();

const previewResourceSchema = templateResourceBaseSchema
  .extend({
    pathExists: z.boolean(),
    needsPathReview: z.boolean(),
  })
  .refine(websiteTargetIsValid, {
    path: ["target"],
    message: "웹사이트는 http:// 또는 https:// URL이어야 합니다.",
  });

export const workspaceTemplatePreviewSchema = z
  .object({
    template: workspaceTemplateSchema,
    resources: z.array(previewResourceSchema).max(200),
  })
  .strict();

export const exportTemplateFormSchema = z.object({
  name: z.string().trim().min(1, "템플릿 이름을 입력해 주세요.").max(120),
  description: z.string().max(2000),
  author: z.string().trim().min(1, "작성자를 입력해 주세요.").max(120),
  category: z.string().trim().min(1, "카테고리를 입력해 주세요.").max(80),
});

export type WorkspaceTemplatePreview = z.infer<typeof workspaceTemplatePreviewSchema>;
export type ExportTemplateFormValues = z.infer<typeof exportTemplateFormSchema>;
