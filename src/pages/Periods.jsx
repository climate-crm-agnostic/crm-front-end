import { useEffect, useState } from "react";
import { Trash2, CalendarRange } from "lucide-react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { DateInput } from "../components/ui/date-input";
import { getPeriods, createPeriod, deletePeriod } from "../services/periodService";
import Swal from 'sweetalert2';

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export const Periods = () => {
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(true);

    const [name, setName] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [genYear, setGenYear] = useState(new Date().getFullYear());
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        loadPeriods();
    }, []);

    const loadPeriods = async () => {
        try {
            const data = await getPeriods();
            setPeriods(Array.isArray(data) ? data : []);
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load periods', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!name.trim() || !startDate || !endDate) return;
        try {
            await createPeriod({ name, start_date: startDate, end_date: endDate });
            setName(""); setStartDate(""); setEndDate("");
            loadPeriods();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?', icon: 'warning', showCancelButton: true,
            confirmButtonColor: '#5E6A43', cancelButtonColor: '#9b948e', confirmButtonText: 'Yes, delete it!'
        });
        if (!result.isConfirmed) return;
        try {
            await deletePeriod(id);
            loadPeriods();
        } catch {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete period', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        }
    };

    const handleGenerateYear = async () => {
        const year = parseInt(genYear, 10);
        if (!year) return;
        setGenerating(true);
        try {
            for (let month = 0; month < 12; month++) {
                const start = new Date(year, month, 1);
                const end = new Date(year, month + 1, 0);
                const startStr = start.toISOString().split('T')[0];
                const endStr = end.toISOString().split('T')[0];
                await createPeriod({ name: `${MONTH_NAMES[month]} ${year}`, start_date: startStr, end_date: endStr });
            }
            await loadPeriods();
            Swal.fire({ icon: 'success', title: 'Generated', text: `Created 12 periods for ${year}.`, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 });
        } finally {
            setGenerating(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading periods...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border">
                    <CalendarRange className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <p className="text-base font-semibold">Periods</p>
                    <p className="text-sm text-muted-foreground">Define the time windows goals are tracked against.</p>
                </div>
            </div>

            <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                <h3 className="font-medium text-lg border-b pb-2">Generate a Year</h3>
                <div className="flex items-end gap-3 max-w-md">
                    <div className="space-y-2">
                        <Label>Year</Label>
                        <Input type="number" value={genYear} onChange={e => setGenYear(e.target.value)} className="w-32" />
                    </div>
                    <Button type="button" onClick={handleGenerateYear} disabled={generating} variant="secondary">
                        {generating ? "Generating..." : "Generate 12 Months"}
                    </Button>
                </div>
            </div>

            <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
                <h3 className="font-medium text-lg border-b pb-2">New Period</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2 md:col-span-2">
                        <Label>Name</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q1 2026" />
                    </div>
                    <div className="space-y-2">
                        <Label>Start Date</Label>
                        <DateInput value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>End Date</Label>
                        <DateInput value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                </div>
                <Button type="button" onClick={handleAdd} disabled={!name.trim() || !startDate || !endDate}>
                    Add Period
                </Button>
            </div>

            <div className="bg-card p-6 rounded-lg border shadow-sm space-y-2">
                <h3 className="font-medium text-lg border-b pb-2">All Periods</h3>
                {periods.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No periods yet.</p>
                ) : (
                    periods.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-muted/20 border rounded-md">
                            <div>
                                <span className="text-sm font-medium">{p.name}</span>
                                <span className="text-xs text-muted-foreground ml-2">{p.start_date} → {p.end_date}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="h-6 w-6 p-0 text-red-500 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
