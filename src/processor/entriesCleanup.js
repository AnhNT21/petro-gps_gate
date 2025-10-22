import { getLastRecentEntries, deleteEntry, updateEntry } from '../database/supabase.js';

const MS_FIVE_MINUTES = 5 * 60 * 1000;

export const entriesCleanup = async () => {
    const rawEntries = await getLastRecentEntries();

    // Group by plate_number
    const grouped = {};
    for (const entry of rawEntries) {
        if (!grouped[entry.plate_number]) {
            grouped[entry.plate_number] = [];
        }
        grouped[entry.plate_number].push(entry);
    }

    for (const plate in grouped) {
        const entries = grouped[plate].slice().sort((a, b) => new Date(a.in_time) - new Date(b.in_time));

        for (let i = 0; i < entries.length; i++) {
            const current = entries[i];
            const prev = entries[i - 1];

            // 🔁 Rule 1: Remove duplicate (in_time < 2min apart)
            if (prev && new Date(current.in_time) - new Date(prev.in_time) < MS_FIVE_MINUTES) {
                console.log(`🗑️ Deleting duplicate in_time: ${current.id}`);
                await deleteEntry(current.id);
                entries.splice(i, 1);
                i--;
                continue;
            }

            // 🔁 Rule 2: Merge close consecutive sessions
            if (prev && prev.out_time && new Date(current.in_time) - new Date(prev.out_time) < MS_FIVE_MINUTES) {
                const updated = { ...prev };

                if (current.out_time) {
                    updated.out_time = current.out_time;
                } else if (current.isInside === false) {
                    updated.out_time = null;
                    updated.isInside = false;
                }

                await updateEntry(updated);
                await deleteEntry(current.id);

                console.log(`🔁 Merged ${prev.id} + deleted ${current.id}`);
                entries.splice(i, 1);
                i--;
                continue;
            }

            // 🔁 Rule 3: Delete short stays (inside < 2min)
            if (current.out_time && new Date(current.out_time) - new Date(current.in_time) < MS_FIVE_MINUTES) {
                console.log(`🗑️ Deleting short stay under 5min: ${current.id}`);
                await deleteEntry(current.id);
                entries.splice(i, 1);
                i--;
                continue;
            }
        }
    }

    console.log('✅ Cleanup complete.');
};
