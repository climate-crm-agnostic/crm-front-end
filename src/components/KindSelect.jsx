import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { KIND_OPTIONS } from "../lib/catalogueKinds";

/** Product / Service switch that decides which catalogue items a line can pick from. */
export const KindSelect = ({ value, onChange, className = "h-8 w-full" }) => (
    <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={className} aria-label="Sold as"><SelectValue /></SelectTrigger>
        <SelectContent>
            {KIND_OPTIONS.map((kind) => (
                <SelectItem key={kind.value} value={kind.value}>{kind.label}</SelectItem>
            ))}
        </SelectContent>
    </Select>
);
