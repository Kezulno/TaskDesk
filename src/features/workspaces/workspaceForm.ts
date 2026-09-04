import { z } from "zod";

import { isValidHexColor } from "@/lib/validation";

export const workspaceFormSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(120),
  description: z.string().max(2000),
  icon: z.string().max(200),
  color: z
    .string()
    .max(7)
    .refine((value) => value === "" || isValidHexColor(value), {
      message: "올바른 색상을 선택해 주세요.",
    }),
});

export type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;
