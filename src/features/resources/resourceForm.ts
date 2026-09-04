import { z } from "zod";

import { isValidHttpUrl } from "@/lib/validation";

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
    if (value.type === "website" && !isValidHttpUrl(value.target)) {
      context.addIssue({
        code: "custom",
        path: ["target"],
        message: "http:// 또는 https://로 시작하는 URL을 입력해 주세요.",
      });
    }
  });

export type ResourceFormValues = z.infer<typeof resourceFormSchema>;
