// The three states a task moves through. The values are the API's; the labels are what people see.
export const STATUSES = [
    { value: "todo", label: "Created", dot: "var(--muted-foreground)" },
    { value: "in_progress", label: "In progress", dot: "#e0a030" },
    { value: "done", label: "Finished", dot: "var(--primary)" },
];

export const statusLabel = (value) => STATUSES.find((s) => s.value === value)?.label ?? value;
