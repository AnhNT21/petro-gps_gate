import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const getAllEntries = async () => {
    try {
        const { data, error } = await supabase.from('entries').select('*');
        if (error) {
            console.error('Error fetching entries:', error);
            throw new Error('Failed to fetch entries');
        }
        return data;
    } catch (error) {
        console.error('Error in getAllEntries:', error);
        throw error;
    }
};

export const getLastRecentEntries = async (limit = 100) => {
    try {
        const { data, error } = await supabase.from('entries').select('*').order('id', { ascending: false }).limit(limit);
        if (error) {
            console.error('Error fetching entries:', error);
            throw new Error('Failed to fetch entries');
        }
        return data;
    } catch (error) {
        console.error('Error in getAllEntries:', error);
        throw error;
    }
};

export const getEntryByPlateNumber = async (plateNumber) => {
    try {
        const { data, error } = await supabase.from('entries').select('*').eq('plate_number', plateNumber).single();
        if (error) {
            console.error(`Error fetching entry for plate number ${plateNumber}:`, error);
            throw new Error(`Failed to fetch entry for plate number ${plateNumber}`);
        }
        return data;
    } catch (error) {
        console.error('Error in getEntryByPlateNumber:', error);
        throw error;
    }
};

export const insertEntry = async (entry) => {
    try {
        const { data, error } = await supabase.from('entries').insert(entry);
        if (error) {
            console.error('Error inserting entry:', error);
            throw new Error('Failed to insert entry');
        }
        return true;
    } catch (error) {
        console.error('Error in insertEntry:', error);
        throw error;
    }
};

export const updateEntry = async (entry) => {
    try {
        const { data, error } = await supabase.from('entries').update(entry).eq('id', entry.id);
        if (error) {
            console.error('Error updating entry:', error);
            throw new Error('Failed to update entry');
        }
        return true;
    } catch (error) {
        console.error('Error in updateEntry:', error);
        throw error;
    }
};

export const deleteEntry = async (id) => {
    try {
        const { data, error } = await supabase.from('entries').delete().eq('id', id);
        if (error) {
            console.error('Error deleting entry:', error);
            throw new Error('Failed to delete entry');
        }
        return true;
    } catch (error) {
        console.error('Error in deleteEntry:', error);
        throw error;
    }
};
