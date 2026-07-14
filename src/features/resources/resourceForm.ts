import { z } from "zod";

export const resourceFormSchema = z
  .object({
    type: z.enum(["application", "website", "folder", "file"]),
    name: z.string().trim().min(1, "이름을 입력해 주세요.").max(200),
    target: z.string().trim().min(1, "대상 경로 또는 URL을 입력해 주세요.").max(4096),
    description: z.string().max(2000),
    icon: z.string().max(500),
    isEnabled: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.type === "website" && !isValidWebsiteUrl(value.target)) {
      context.addIssue({
        code: "custom",
        path: ["target"],
        message: "http:// 또는 https://로 시작하는 URL을 입력해 주세요.",
      });
    }
  });

function isValidWebsiteUrl(target: string): boolean {
  try {
    const url = new URL(target);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.length > 0;
  } catch {
    return false;
  }
}

export type ResourceFormValues = z.infer<typeof resourceFormSchema>;
