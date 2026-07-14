import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Check } from "lucide-react";

import { Input, Textarea } from "@/components/common/FormField";
import type { WorkspaceFormValues } from "@/features/workspaces/workspaceForm";
import { WorkspaceIcon } from "@/features/workspaces/workspaceAppearance";
import { workspaceColors, workspaceIcons } from "@/features/workspaces/workspaceAppearanceData";
import { cn } from "@/lib/utils";
import { useI18n } from "@/features/i18n/i18n";

interface WorkspaceFieldsProps {
  register: UseFormRegister<WorkspaceFormValues>;
  errors: FieldErrors<WorkspaceFormValues>;
  disabled: boolean;
  setValue: UseFormSetValue<WorkspaceFormValues>;
  watch: UseFormWatch<WorkspaceFormValues>;
}

export function WorkspaceFields({
  register,
  errors,
  disabled,
  setValue,
  watch,
}: WorkspaceFieldsProps) {
  const { language, t } = useI18n();
  const selectedIcon = watch("icon");
  const selectedColor = watch("color");
  const selectedColorName =
    workspaceColors.find((color) => color.value === selectedColor.toLowerCase())?.label ??
    t("custom");

  return (
    <div className="space-y-4">
      <label className="block space-y-1.5 text-sm font-medium">
        {t("name")} <span className="text-destructive">*</span>
        <Input autoFocus disabled={disabled} {...register("name")} />
        {errors.name && (
          <span className="text-destructive block text-xs">{errors.name.message}</span>
        )}
      </label>

      <label className="block space-y-1.5 text-sm font-medium">
        {t("description")}
        <Textarea disabled={disabled} {...register("description")} />
        {errors.description && (
          <span className="text-destructive block text-xs">{errors.description.message}</span>
        )}
      </label>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("icon")}</p>
        <div className="grid grid-cols-6 gap-2">
          {workspaceIcons.map((item) => (
            <button
              key={item.value}
              type="button"
              className={cn(
                "border-input hover:bg-accent flex h-10 items-center justify-center rounded-md border",
                selectedIcon === item.value && "border-primary bg-primary/15 text-primary",
              )}
              onClick={() => setValue("icon", item.value, { shouldDirty: true })}
              disabled={disabled}
              aria-label={language === "en" ? item.value || t("icon") : item.label}
              aria-pressed={selectedIcon === item.value}
              title={language === "en" ? item.value || t("icon") : item.label}
            >
              <WorkspaceIcon value={item.value} className="size-5" />
            </button>
          ))}
        </div>
        <label className="text-muted-foreground block space-y-1.5 text-xs">
          {t("customIcon")}
          <Input placeholder="예: 🚀" disabled={disabled} {...register("icon")} />
          {errors.icon && (
            <span className="text-destructive block text-xs">{errors.icon.message}</span>
          )}
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("color")}</p>
        <div className="flex flex-wrap gap-2">
          {workspaceColors.map((color) => (
            <button
              key={color.value}
              type="button"
              className={cn(
                "ring-offset-background flex size-9 items-center justify-center rounded-full border-2 border-transparent ring-offset-2 transition-transform hover:scale-110",
                selectedColor.toLowerCase() === color.value && "ring-ring ring-2",
              )}
              style={{ backgroundColor: color.value }}
              onClick={() =>
                setValue("color", color.value, { shouldDirty: true, shouldValidate: true })
              }
              disabled={disabled}
              aria-label={color.label}
              aria-pressed={selectedColor.toLowerCase() === color.value}
              title={color.label}
            >
              {selectedColor.toLowerCase() === color.value && (
                <Check className="size-4 text-white drop-shadow" aria-hidden="true" />
              )}
            </button>
          ))}
          <label className="border-input hover:bg-accent flex h-9 cursor-pointer items-center gap-2 rounded-md border px-2 text-xs">
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(selectedColor) ? selectedColor : "#6366f1"}
              onChange={(event) =>
                setValue("color", event.target.value, { shouldDirty: true, shouldValidate: true })
              }
              disabled={disabled}
              className="size-5 cursor-pointer border-0 bg-transparent p-0"
              aria-label={t("customColor")}
            />
            {t("chooseColor")}
          </label>
        </div>
        <input type="hidden" {...register("color")} />
        <p className="text-muted-foreground text-xs">
          {t("selectedColor", { name: selectedColorName })}
        </p>
        {errors.color && (
          <span className="text-destructive block text-xs">{errors.color.message}</span>
        )}
      </div>
    </div>
  );
}
