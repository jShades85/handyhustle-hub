import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMeta } from "@/contexts/PageMetaContext";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  X,
  FileText,
} from "lucide-react";

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/settings/quote-templates")({
  head: () => ({ meta: [{ title: "Quote Templates · BearingPro" }] }),
  component: QuoteTemplatesPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplateSection {
  id: string;
  name: string;
  order: number;
}

interface QuoteTemplate {
  id: string;
  name: string;
  isDefault: boolean;
  sections: TemplateSection[];
}

// ─── Demo data ───────────────────────────────────────────────────────────────

const INITIAL_TEMPLATES: QuoteTemplate[] = [
  {
    id: "qt-001",
    name: "Commercial Install",
    isDefault: true,
    sections: [
      { id: "s-001-1", name: "Equipment", order: 1 },
      { id: "s-001-2", name: "Labor", order: 2 },
      { id: "s-001-3", name: "Low-Voltage Materials", order: 3 },
      { id: "s-001-4", name: "Subcontractor", order: 4 },
      { id: "s-001-5", name: "Misc", order: 5 },
    ],
  },
  {
    id: "qt-002",
    name: "Residential Install",
    isDefault: false,
    sections: [
      { id: "s-002-1", name: "Equipment", order: 1 },
      { id: "s-002-2", name: "Installation Labor", order: 2 },
      { id: "s-002-3", name: "Materials", order: 3 },
    ],
  },
  {
    id: "qt-003",
    name: "Service Call",
    isDefault: false,
    sections: [
      { id: "s-003-1", name: "Labor", order: 1 },
      { id: "s-003-2", name: "Parts & Materials", order: 2 },
    ],
  },
];

// ─── Zod schema ──────────────────────────────────────────────────────────────

const SectionRowSchema = z.object({
  name: z.string().min(1, "Required"),
});

const TemplateFormSchema = z
  .object({
    name: z.string().min(1, "Template name is required"),
    isDefault: z.boolean(),
    sections: z.array(SectionRowSchema),
  })
  .superRefine((data, ctx) => {
    if (data.sections.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one section is required",
        path: ["sections"],
      });
    }
  });

type TemplateFormValues = z.infer<typeof TemplateFormSchema>;

const BLANK_FORM: TemplateFormValues = {
  name: "",
  isDefault: false,
  sections: [{ name: "" }],
};

// ─── TemplateForm ─────────────────────────────────────────────────────────────

interface TemplateFormProps {
  template: QuoteTemplate | null;
  existingDefaultId: string | undefined;
  onSave: (t: QuoteTemplate) => void;
  onCancel: () => void;
}

function TemplateForm({ template, existingDefaultId, onSave, onCancel }: TemplateFormProps) {
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(TemplateFormSchema),
    defaultValues: template
      ? {
          name: template.name,
          isDefault: template.isDefault,
          sections: template.sections.map((s) => ({ name: s.name })),
        }
      : BLANK_FORM,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "sections",
    keyName: "fieldKey",
  });

  function onSubmit(values: TemplateFormValues) {
    const id = template?.id ?? `qt-${Date.now()}`;
    onSave({
      id,
      name: values.name,
      isDefault: values.isDefault,
      sections: values.sections.map((s, idx) => ({
        id: template?.sections[idx]?.id ?? `s-${id}-${idx + 1}`,
        name: s.name,
        order: idx + 1,
      })),
    });
  }

  const sectionsError =
    !Array.isArray(form.formState.errors.sections) &&
    form.formState.errors.sections
      ? (form.formState.errors.sections as { message?: string }).message
      : undefined;

  return (
    <div className="rounded-lg border-2 border-primary/25 bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <FileText className="h-3.5 w-3.5 text-primary/70 shrink-0" />
        <span className="text-base font-semibold">
          {template ? "Edit Template" : "New Template"}
        </span>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="px-4 py-4 space-y-5">
          {/* Name + Default row */}
          <div className="flex items-end gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-xs font-medium">Template Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. Commercial Install"
                      className="h-8 text-base"
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 pb-0.5 shrink-0">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={
                        !field.value &&
                        existingDefaultId !== undefined &&
                        existingDefaultId !== template?.id
                      }
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal text-muted-foreground cursor-pointer">
                    Default template
                  </FormLabel>
                </FormItem>
              )}
            />
          </div>

          {/* Sections */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Sections</span>
              <span className="text-xs text-muted-foreground">
                {fields.length} {fields.length === 1 ? "section" : "sections"}
              </span>
            </div>

            <div className="space-y-1.5">
              {fields.map((field, idx) => (
                <div key={field.fieldKey} className="flex items-center gap-1.5">
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/30" />
                  <FormField
                    control={form.control}
                    name={`sections.${idx}.name`}
                    render={({ field: f }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            {...f}
                            placeholder={`Section ${idx + 1}`}
                            className="h-7 text-sm"
                          />
                        </FormControl>
                        <FormMessage className="text-2xs" />
                      </FormItem>
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    disabled={fields.length === 1}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md transition-colors shrink-0",
                      fields.length === 1
                        ? "text-muted-foreground/20 cursor-not-allowed"
                        : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                    )}
                    aria-label="Remove section"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {sectionsError && (
              <p className="mt-1 text-xs text-destructive">{sectionsError}</p>
            )}

            <button
              type="button"
              onClick={() => append({ name: "" })}
              className="mt-2.5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add section
            </button>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="h-7 rounded-md border border-border bg-surface px-3 text-sm hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-7 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Save Template
            </button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ─── TemplateCard ─────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: QuoteTemplate;
  onEdit: () => void;
  onDelete: () => void;
}

function TemplateCard({ template, onEdit, onDelete }: TemplateCardProps) {
  const preview = template.sections
    .slice(0, 4)
    .map((s) => s.name)
    .join(", ");
  const overflow = template.sections.length > 4 ? ` +${template.sections.length - 4} more` : "";

  return (
    <div className="group flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3.5 hover:border-border/80 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold leading-none">{template.name}</span>
          {template.isDefault && (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-medium bg-primary/10 text-primary">
              Default
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground truncate">
          <span className="font-medium text-foreground/60">
            {template.sections.length}{" "}
            {template.sections.length === 1 ? "section" : "sections"}
          </span>
          {" · "}
          {preview}
          {overflow}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onEdit}
          className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={template.isDefault}
          title={template.isDefault ? "Cannot delete the default template" : "Delete template"}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface transition-colors",
            template.isDefault
              ? "cursor-not-allowed text-muted-foreground/30"
              : "text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive",
          )}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function QuoteTemplatesPage() {
  const { setMeta } = useMeta();
  const [templates, setTemplates] = useState<QuoteTemplate[]>(INITIAL_TEMPLATES);
  const [editingId, setEditingId] = useState<string | null>(null);

  const existingDefaultId = templates.find((t) => t.isDefault)?.id;

  const openNew = useCallback(() => {
    setEditingId((prev) => (prev === "new" ? prev : "new"));
  }, []);

  useEffect(() => {
    setMeta({
      title: "Quote Templates",
      subtitle: "Settings",
      newLabel: "New Template",
      onNew: openNew,
    });
  }, [setMeta, openNew]);

  function handleSave(saved: QuoteTemplate) {
    setTemplates((prev) => {
      let next = prev.some((t) => t.id === saved.id)
        ? prev.map((t) => (t.id === saved.id ? saved : t))
        : [...prev, saved];
      if (saved.isDefault) {
        next = next.map((t) => (t.id === saved.id ? t : { ...t, isDefault: false }));
      }
      return next;
    });
    setEditingId(null);
  }

  function handleDelete(id: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="space-y-3">
        {/* New template form at top */}
        {editingId === "new" && (
          <TemplateForm
            template={null}
            existingDefaultId={existingDefaultId}
            onSave={handleSave}
            onCancel={() => setEditingId(null)}
          />
        )}

        {templates.map((template) =>
          editingId === template.id ? (
            <TemplateForm
              key={template.id}
              template={template}
              existingDefaultId={existingDefaultId}
              onSave={handleSave}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => setEditingId(template.id)}
              onDelete={() => handleDelete(template.id)}
            />
          ),
        )}

        {templates.length === 0 && editingId !== "new" && (
          <div className="flex flex-col items-center py-16 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/25 mb-3" />
            <p className="text-base font-medium">No templates yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a template to reuse section structures across quotes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
