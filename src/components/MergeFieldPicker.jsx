import { useEffect, useState } from "react";
import { Braces } from "lucide-react";
import { Button } from "./ui/button";
import {
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
    DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { getMergeFields } from "../services/emailTemplateService";

// Dropdown of {contact.x} / {client.x} variables, fetched from the backend
// so it only ever lists fields that really exist (fixed Contact/Client
// fields plus this tenant's own custom Attributes). `onInsert` receives the
// literal "{path}" token to drop into a subject input or the RTE body.
export const MergeFieldPicker = ({ onInsert, label = "Insert Variable" }) => {
    const [fields, setFields] = useState([]);

    useEffect(() => {
        getMergeFields().then(setFields).catch(() => setFields([]));
    }, []);

    const grouped = fields.reduce((acc, f) => {
        (acc[f.group] = acc[f.group] || []).push(f);
        return acc;
    }, {});

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={fields.length === 0}>
                    <Braces className="h-3.5 w-3.5 mr-1.5" /> {label}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 max-h-80 overflow-y-auto">
                {Object.entries(grouped).map(([group, items], idx) => (
                    <div key={group}>
                        {idx > 0 && <DropdownMenuSeparator />}
                        <DropdownMenuLabel>{group}</DropdownMenuLabel>
                        {items.map(f => (
                            <DropdownMenuItem key={f.path} onClick={() => onInsert(`{${f.path}}`)} className="flex items-center justify-between gap-3">
                                <span className="text-sm">{f.label}</span>
                                <span className="font-mono text-xs text-muted-foreground">{`{${f.path}}`}</span>
                            </DropdownMenuItem>
                        ))}
                    </div>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
