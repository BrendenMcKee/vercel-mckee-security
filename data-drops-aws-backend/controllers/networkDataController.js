// Network data controller for date_data and drops_data tables

import { pool } from '../app.js';
import nodemailer from 'nodemailer';

export const initializeNewSite = async (req, res) => {
    try {
        const { site_name, date, site_domain } = req.body;

        if (!site_name || !site_domain) {
            return res.status(400).json({
                message: 'Site name and site domain are required',
                success: false
            });
        }

        // Begin transaction
        await pool.query('START TRANSACTION');

        // Check if site exists for this specific date
        const [existingSiteForDate] = await pool.query(
            'SELECT * FROM date_data WHERE site_name = ? AND date = ? AND site_domain = ?',
            [site_name, date, site_domain]
        );

        if (existingSiteForDate.length > 0) {
            await pool.query('COMMIT');
            return res.status(409).json({
                message: 'Site already exists for this date',
                success: false,
                existingSite: existingSiteForDate[0]
            });
        }

        // Create new entry for this date
        const [result] = await pool.query(
            `INSERT INTO date_data (
                site_name,
                total_drops,
                signature_tech,
                signature_admin,
                req_signature_date,
                req_signature_email,
                date,
                site_domain
            ) VALUES (?, 0, NULL, NULL, NULL, NULL, ?, ?)`,
            [site_name, date, site_domain]
        );

        // Get the newly created record
        const [newSite] = await pool.query(
            'SELECT * FROM date_data WHERE site_name = ? AND date = ? AND site_domain = ?',
            [site_name, date, site_domain]
        );

        await pool.query('COMMIT');

        res.status(201).json({
            message: 'New site date entry initialized successfully',
            success: true,
            siteData: newSite[0]
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        res.status(500).json({ 
            message: 'Error initializing new site', 
            error: error.message,
            success: false
        });
    }
};

export const addDropsData = async (req, res) => {
    try {
        const { site_name, data_label, data_location, data_techs, date, site_domain } = req.body;

        // Validate required fields
        if (!site_name || !data_label || !data_location || !date || !site_domain) {
            return res.status(400).json({
                message: 'All fields (site_name, data_label, data_location, date, site_domain) are required',
                success: false
            });
        }

        // Begin transaction
        await pool.query('START TRANSACTION');

        // Check for existing label for this site
        const [existingLabel] = await pool.query(
            'SELECT * FROM drops_data WHERE site_name = ? AND data_label = ? AND site_domain = ?',
            [site_name, data_label, site_domain]
        );

        if (existingLabel.length > 0) {
            await pool.query('COMMIT');
            return res.status(409).json({
                message: 'A drop with this label already exists for this site',
                success: false,
                existingDrop: existingLabel[0]
            });
        }

        // Add new entry to drops_data
        const [dropResult] = await pool.query(
            `INSERT INTO drops_data (
                site_name,
                data_label,
                data_location,
                data_techs,
                date,
                site_domain
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [site_name, data_label, data_location, data_techs || null, date, site_domain]
        );

        // Get total count of drops for this site and date
        const [dropsCount] = await pool.query(
            'SELECT COUNT(*) as total FROM drops_data WHERE site_name = ? AND date = ? AND site_domain = ?',
            [site_name, date, site_domain]
        );
        const total_drops = dropsCount[0].total;

        // Check if site exists in date_data for this date
        const [dateData] = await pool.query(
            'SELECT * FROM date_data WHERE site_name = ? AND date = ? AND site_domain = ?',
            [site_name, date, site_domain]
        );

        if (dateData.length === 0) {
            // Create new date_data entry if it doesn't exist
            await pool.query(
                `INSERT INTO date_data (
                    site_name,
                    total_drops,
                    signature_tech,
                    signature_admin,
                    req_signature_date,
                    req_signature_email,
                    date,
                    site_domain
                ) VALUES (?, ?, NULL, NULL, NULL, NULL, ?, ?)`,
                [site_name, total_drops, date, site_domain]
            );
        } else {
            // Update existing date_data entry (only update total_drops)
            await pool.query(
                `UPDATE date_data 
                 SET total_drops = ?
                 WHERE site_name = ? AND date = ? AND site_domain = ?`,
                [total_drops, site_name, date, site_domain]
            );
        }

        // Get updated records
        const [updatedDropsData] = await pool.query(
            'SELECT * FROM drops_data WHERE id = ?',
            [dropResult.insertId]
        );

        const [updatedDateData] = await pool.query(
            'SELECT * FROM date_data WHERE site_name = ? AND date = ? AND site_domain = ?',
            [site_name, date, site_domain]
        );

        await pool.query('COMMIT');

        res.status(201).json({
            message: 'Drops data added and totals updated successfully',
            success: true,
            newDropsData: updatedDropsData[0],
            updatedDateData: updatedDateData[0],
            totalDrops: total_drops
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        res.status(500).json({ 
            message: 'Error adding drops data', 
            error: error.message,
            success: false
        });
    }
};

export const getDropsDataBySite = async (req, res) => {
    try {
        const { site_name } = req.params;
        const { site_domain } = req.body;

        if (!site_name || !site_domain) {
            return res.status(400).json({
                message: 'Site name and site domain are required',
                success: false
            });
        }

        // Get all drops data for the site ordered by date descending (newest first)
        // Using LEFT JOIN to ensure we get all drops regardless of signature status
        const [dropsData] = await pool.query(
            `SELECT d.*, dd.signature_tech, dd.signature_admin 
             FROM drops_data d
             LEFT JOIN date_data dd ON d.site_name = dd.site_name 
                 AND d.date = dd.date 
                 AND d.site_domain = dd.site_domain
             WHERE d.site_name = ? AND d.site_domain = ?
             ORDER BY d.date DESC`,
            [site_name, site_domain]
        );

        // Get the site's date_data entry for reference
        const [dateData] = await pool.query(
            'SELECT * FROM date_data WHERE site_name = ? AND site_domain = ?',
            [site_name, site_domain]
        );

        // Format dateData for frontend (handle req_signature fields)
        let formattedDateData = null;
        if (dateData[0]) {
            const bothSigned = dateData[0].signature_tech && dateData[0].signature_admin;
            formattedDateData = {
                ...dateData[0],
                req_signature_date: bothSigned ? null : dateData[0].req_signature_date,
                req_signature_email: bothSigned ? null : dateData[0].req_signature_email
            };
        }

        // Return appropriate response based on whether data was found
        if (dropsData.length === 0) {
            return res.status(200).json({
                message: 'No drops data found for this site',
                success: true,
                dropsData: [],
                dateData: formattedDateData,
                totalDrops: 0
            });
        }

        res.status(200).json({
            message: 'Drops data retrieved successfully',
            success: true,
            dropsData: dropsData.map(drop => ({
                ...drop,
                data_techs: drop.data_techs || '', // Convert null to empty string for frontend
                signature_tech: drop.signature_tech || null,
                signature_admin: drop.signature_admin || null
            })),
            dateData: formattedDateData,
            totalDrops: dropsData.length
        });

    } catch (error) {
        res.status(500).json({ 
            message: 'Error fetching drops data', 
            error: error.message,
            success: false
        });
    }
};

export const getDateDataBySite = async (req, res) => {
    try {
        const { site_name } = req.params;
        const { site_domain } = req.body;

        if (!site_domain) {
            return res.status(400).json({
                message: 'Site domain is required',
                success: false
            });
        }

        // Get all date_data entries for the site
        const [dateData] = await pool.query(
            'SELECT * FROM date_data WHERE site_name = ? AND site_domain = ? ORDER BY date DESC',
            [site_name, site_domain]
        );

        if (dateData.length === 0) {
            return res.status(200).json({
                message: 'No date data found for this site',
                success: true,
                dateData: []
            });
        }

        // Format all dates and handle req_signature fields
        const formattedDateData = dateData.map(entry => {
            const bothSigned = entry.signature_tech && entry.signature_admin;
            return {
                ...entry,
                date: new Date(entry.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                req_signature_date: bothSigned ? null : entry.req_signature_date,
                req_signature_email: bothSigned ? null : entry.req_signature_email
            };
        });

        res.status(200).json({
            message: 'Date data retrieved successfully',
            success: true,
            dateData: formattedDateData
        });

    } catch (error) {
        res.status(500).json({ 
            message: 'Error fetching date data', 
            error: error.message,
            success: false
        });
    }
};

export const getDropsDataBySiteAndDate = async (req, res) => {
    try {
        const { site_name, date, site_domain } = req.body;

        if (!site_name || !date || !site_domain) {
            return res.status(400).json({
                message: 'Site name, date, and site domain are required',
                success: false
            });
        }

        // Format the date to ensure YYYY-MM-DD format with leading zeros
        const formattedDate = new Date(date).toISOString().split('T')[0];

        // Get drops data for the site on the specified date, ordered by ID descending
        // Using LEFT JOIN to ensure we get all drops regardless of signature status
        const [dropsData] = await pool.query(
            `SELECT d.*, dd.signature_tech, dd.signature_admin 
             FROM drops_data d
             LEFT JOIN date_data dd ON d.site_name = dd.site_name 
                 AND d.date = dd.date 
                 AND d.site_domain = dd.site_domain
             WHERE d.site_name = ? AND d.date = ? AND d.site_domain = ?
             ORDER BY d.id DESC`,
            [site_name, formattedDate, site_domain]
        );

        // Return appropriate response based on whether data was found
        if (dropsData.length === 0) {
            return res.status(200).json({
                message: 'No drops data found for this site and date',
                success: true,
                dropsData: [],
                totalDrops: 0
            });
        }

        // Format the data for response
        const formattedDropsData = dropsData.map(drop => {
            const bothSigned = drop.signature_tech && drop.signature_admin;
            return {
                ...drop,
                data_techs: drop.data_techs || '', // Convert null to empty string for frontend
                signature_tech: drop.signature_tech || null,
                signature_admin: drop.signature_admin || null,
                req_signature_date: bothSigned ? null : drop.req_signature_date,
                req_signature_email: bothSigned ? null : drop.req_signature_email
            };
        });

        res.status(200).json({
            message: 'Drops data retrieved successfully',
            success: true,
            dropsData: formattedDropsData,
            totalDrops: dropsData.length
        });

    } catch (error) {
        res.status(500).json({ 
            message: 'Error fetching drops data', 
            error: error.message,
            success: false
        });
    }
};

export const deleteDropData = async (req, res) => {
    try {
        const { site_name, data_label, admin_password, site_domain } = req.body;

        // Validate required fields
        if (!site_name || !data_label || !admin_password || !site_domain) {
            return res.status(400).json({
                message: 'site_name, data_label, admin_password, and site_domain are required',
                success: false
            });
        }

        // Validate administrative password
        if (admin_password !== process.env.ADMIN_DELETE_PASSWORD) {
            console.log(`Failed deletion attempt for site: ${site_name}, drop: ${data_label}`);
            return res.status(401).json({
                message: 'Invalid administrative password',
                success: false
            });
        }

        // Begin transaction
        await pool.query('START TRANSACTION');

        // Check if drop exists and get its date
        const [existingDrop] = await pool.query(
            'SELECT * FROM drops_data WHERE site_name = ? AND data_label = ? AND site_domain = ?',
            [site_name, data_label, site_domain]
        );

        if (existingDrop.length === 0) {
            await pool.query('COMMIT');
            return res.status(404).json({
                message: 'Drop not found',
                success: false
            });
        }

        const dropDate = existingDrop[0].date;

        // Delete the drop
        await pool.query(
            'DELETE FROM drops_data WHERE site_name = ? AND data_label = ? AND site_domain = ?',
            [site_name, data_label, site_domain]
        );

        // Get new total count of drops for this site and specific date
        const [dropsCount] = await pool.query(
            'SELECT COUNT(*) as total FROM drops_data WHERE site_name = ? AND date = ? AND site_domain = ?',
            [site_name, dropDate, site_domain]
        );
        const total_drops = dropsCount[0].total;

        // Update total_drops in date_data for the specific date
        await pool.query(
            `UPDATE date_data 
             SET total_drops = ?
             WHERE site_name = ? AND date = ? AND site_domain = ?`,
            [total_drops, site_name, dropDate, site_domain]
        );

        await pool.query('COMMIT');

        // Log successful deletion
        console.log(`Successfully deleted drop for site: ${site_name}, drop: ${data_label}`);

        res.status(200).json({
            message: 'Drop deleted successfully',
            success: true,
            deletedDrop: existingDrop[0],
            totalDrops: total_drops
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error(`Error deleting drop: ${error.message}`);
        res.status(500).json({ 
            message: 'Error deleting drop', 
            error: error.message,
            success: false
        });
    }
};

export const deleteSiteDataByDate = async (req, res) => {
    try {
        const { site_name, date, admin_password, site_domain } = req.body;

        // Validate required fields
        if (!site_name || !date || !admin_password || !site_domain) {
            return res.status(400).json({
                message: 'site_name, date, admin_password, and site_domain are required',
                success: false
            });
        }

        // Validate administrative password
        if (admin_password !== process.env.ADMIN_DELETE_PASSWORD) {
            console.log(`Failed deletion attempt for site: ${site_name}, date: ${date}`);
            return res.status(401).json({
                message: 'Invalid administrative password',
                success: false
            });
        }

        // Format the date to ensure YYYY-MM-DD format with leading zeros
        const formattedDate = new Date(date).toISOString().split('T')[0];

        // Begin transaction
        await pool.query('START TRANSACTION');

        // Check if any drops exist for this site and date
        const [existingDrops] = await pool.query(
            'SELECT * FROM drops_data WHERE site_name = ? AND date = ? AND site_domain = ?',
            [site_name, formattedDate, site_domain]
        );

        if (existingDrops.length === 0) {
            await pool.query('COMMIT');
            return res.status(404).json({
                message: 'No drops found for this site and date',
                success: false
            });
        }

        // Delete all drops for this site and date
        await pool.query(
            'DELETE FROM drops_data WHERE site_name = ? AND date = ? AND site_domain = ?',
            [site_name, formattedDate, site_domain]
        );

        // Delete the date_data entry for this specific site and date
        await pool.query(
            'DELETE FROM date_data WHERE site_name = ? AND date = ? AND site_domain = ?',
            [site_name, formattedDate, site_domain]
        );

        await pool.query('COMMIT');

        // Log successful deletion
        console.log(`Successfully deleted site data for site: ${site_name}, date: ${date}`);

        res.status(200).json({
            message: 'Site data deleted successfully',
            success: true,
            deletedDrops: existingDrops,
            dateDataDeleted: true
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error(`Error deleting site data: ${error.message}`);
        res.status(500).json({ 
            message: 'Error deleting site data', 
            error: error.message,
            success: false
        });
    }
};

export const updateSiteDate = async (req, res) => {
    try {
        const { site_name, old_date, new_date, site_domain } = req.body;

        // Validate required fields
        if (!site_name || !old_date || !new_date || !site_domain) {
            return res.status(400).json({
                message: 'site_name, old_date, new_date, and site_domain are required',
                success: false
            });
        }

        // Begin transaction to ensure all updates happen atomically
        await pool.query('START TRANSACTION');

        // Check if entries exist for the old date
        const [dateData] = await pool.query(
            'SELECT * FROM date_data WHERE site_name = ? AND date = ? AND site_domain = ?',
            [site_name, old_date, site_domain]
        );

        const [dropsData] = await pool.query(
            'SELECT * FROM drops_data WHERE site_name = ? AND date = ? AND site_domain = ?',
            [site_name, old_date, site_domain]
        );

        if (dateData.length === 0 && dropsData.length === 0) {
            await pool.query('COMMIT');
            return res.status(404).json({
                message: 'No data found for this site and date',
                success: false
            });
        }

        // First, update all drops to point to the new date
        await pool.query(
            'UPDATE drops_data SET date = ? WHERE site_name = ? AND date = ? AND site_domain = ?',
            [new_date, site_name, old_date, site_domain]
        );

        // Get the total drops count for the new date after updating
        const [totalDropsResult] = await pool.query(
            'SELECT COUNT(*) as total FROM drops_data WHERE site_name = ? AND date = ? AND site_domain = ?',
            [site_name, new_date, site_domain]
        );
        const totalDrops = totalDropsResult[0].total;

        // Check if there's already an entry for the new date
        const [existingNewDateData] = await pool.query(
            'SELECT * FROM date_data WHERE site_name = ? AND date = ? AND site_domain = ?',
            [site_name, new_date, site_domain]
        );

        if (existingNewDateData.length > 0) {
            // Update only the total_drops - leave existing signature values unchanged
            await pool.query(
                'UPDATE date_data SET total_drops = ? WHERE site_name = ? AND date = ? AND site_domain = ?',
                [totalDrops, site_name, new_date, site_domain]
            );
        } else {
            // Create new date entry with just the calculated total drops, don't carry over signatures
            await pool.query(
                'INSERT INTO date_data (site_name, date, total_drops, site_domain) VALUES (?, ?, ?, ?)',
                [site_name, new_date, totalDrops, site_domain]
            );
        }

        // Delete the old date entry since we've moved everything to the new date
        await pool.query(
            'DELETE FROM date_data WHERE site_name = ? AND date = ? AND site_domain = ?',
            [site_name, old_date, site_domain]
        );

        // Get updated records
        const [updatedDateData] = await pool.query(
            'SELECT * FROM date_data WHERE site_name = ? AND date = ? AND site_domain = ?',
            [site_name, new_date, site_domain]
        );

        const [updatedDropsData] = await pool.query(
            'SELECT * FROM drops_data WHERE site_name = ? AND date = ? AND site_domain = ?',
            [site_name, new_date, site_domain]
        );

        await pool.query('COMMIT');

        res.status(200).json({
            message: 'Date updated successfully',
            success: true,
            updatedData: {
                dateData: updatedDateData,
                dropsData: updatedDropsData,
                totalEntries: {
                    dateData: updatedDateData.length,
                    dropsData: updatedDropsData.length,
                    totalDrops: totalDrops
                }
            }
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        res.status(500).json({ 
            message: 'Error updating date', 
            error: error.message,
            success: false
        });
    }
};

export const updateDropData = async (req, res) => {
    try {
        const { site_name, old_label, new_label, location, techs_data, date, site_domain } = req.body;

        // Validate required fields
        if (!site_name || !old_label || !new_label || !location || !date || !site_domain) {
            return res.status(400).json({
                message: 'site_name, old_label, new_label, location, date, and site_domain are required',
                success: false
            });
        }

        // Begin transaction
        await pool.query('START TRANSACTION');

        // Check if drop exists with old label
        const [existingDrop] = await pool.query(
            'SELECT * FROM drops_data WHERE site_name = ? AND data_label = ? AND site_domain = ?',
            [site_name, old_label, site_domain]
        );

        if (existingDrop.length === 0) {
            await pool.query('COMMIT');
            return res.status(404).json({
                message: 'Drop not found with the specified label',
                success: false
            });
        }

        // Check if new label already exists (if it's different from old label)
        if (old_label !== new_label) {
            const [existingNewLabel] = await pool.query(
                'SELECT * FROM drops_data WHERE site_name = ? AND data_label = ? AND site_domain = ?',
                [site_name, new_label, site_domain]
            );

            if (existingNewLabel.length > 0) {
                await pool.query('COMMIT');
                return res.status(409).json({
                    message: 'A drop with this new label already exists',
                    success: false
                });
            }
        }

        // Get the old date before updating
        const oldDate = existingDrop[0].date;

        // Update the drop with new information
        await pool.query(
            `UPDATE drops_data 
             SET data_label = ?, data_location = ?, data_techs = ?, date = ?
             WHERE site_name = ? AND data_label = ? AND site_domain = ?`,
            [new_label, location, techs_data, date, site_name, old_label, site_domain]
        );

        // Handle date_data table updates
        if (oldDate !== date) {
            // 1. Check if there are any remaining drops for the old date
            const [remainingDropsOldDate] = await pool.query(
                'SELECT COUNT(*) as total FROM drops_data WHERE site_name = ? AND date = ? AND site_domain = ?',
                [site_name, oldDate, site_domain]
            );

            if (remainingDropsOldDate[0].total === 0) {
                // Delete the old date entry if no drops remain
                await pool.query(
                    'DELETE FROM date_data WHERE site_name = ? AND date = ? AND site_domain = ?',
                    [site_name, oldDate, site_domain]
                );
            } else {
                // Update total_drops for the old date
                await pool.query(
                    'UPDATE date_data SET total_drops = ? WHERE site_name = ? AND date = ? AND site_domain = ?',
                    [remainingDropsOldDate[0].total, site_name, oldDate, site_domain]
                );
            }

            // 2. Check if there's an entry for the new date
            const [existingNewDate] = await pool.query(
                'SELECT * FROM date_data WHERE site_name = ? AND date = ? AND site_domain = ?',
                [site_name, date, site_domain]
            );

            // Get total drops for the new date
            const [totalDropsNewDate] = await pool.query(
                'SELECT COUNT(*) as total FROM drops_data WHERE site_name = ? AND date = ? AND site_domain = ?',
                [site_name, date, site_domain]
            );

            if (existingNewDate.length === 0) {
                // Create new date entry if it doesn't exist
                await pool.query(
                    'INSERT INTO date_data (site_name, date, total_drops, site_domain) VALUES (?, ?, ?, ?)',
                    [site_name, date, totalDropsNewDate[0].total, site_domain]
                );
            } else {
                // Update total_drops for the new date
                await pool.query(
                    'UPDATE date_data SET total_drops = ? WHERE site_name = ? AND date = ? AND site_domain = ?',
                    [totalDropsNewDate[0].total, site_name, date, site_domain]
                );
            }
        }

        // Get the updated drop
        const [updatedDrop] = await pool.query(
            'SELECT * FROM drops_data WHERE site_name = ? AND data_label = ? AND site_domain = ?',
            [site_name, new_label, site_domain]
        );

        await pool.query('COMMIT');

        res.status(200).json({
            message: 'Drop updated successfully',
            success: true,
            updatedDrop: updatedDrop[0]
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        res.status(500).json({ 
            message: 'Error updating drop', 
            error: error.message,
            success: false
        });
    }
};

export const notifySigner = async (req, res) => {
    try {
        const { email, site_name, date, domain, site_domain } = req.body;

        // Validate required fields
        if (!email || !site_name || !date || !domain || !site_domain) {
            return res.status(400).json({
                message: 'email, site_name, date, domain, and site_domain are required',
                success: false
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: 'Invalid email format',
                success: false
            });
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                message: 'Invalid date format. Please use YYYY-MM-DD',
                success: false
            });
        }

        // Generate signature URL
        const baseUrl = process.env.SITE_URL || 'https://mckeesecurity.ca';
        const signatureUrl = `${baseUrl}${domain}?site=${encodeURIComponent(site_name)}&date=${encodeURIComponent(date)}&domain=${encodeURIComponent(site_domain)}&action=sign`;

        // Create email transporter
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // HTML email template
        const htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Signature Request</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    line-height: 1.6; 
                    color: #333; 
                    max-width: 600px; 
                    margin: 0 auto; 
                    padding: 20px; 
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 30px; 
                }
                .logo { 
                    max-width: 200px; 
                    height: auto; 
                }
                .button {
                    display: inline-block;
                    background-color: #007bff;
                    color: white !important;
                    text-decoration: none;
                    padding: 12px 24px;
                    border-radius: 4px;
                    font-weight: bold;
                    margin: 20px 0;
                }
                .footer {
                    margin-top: 40px;
                    font-size: 12px;
                    color: #666;
                    border-top: 1px solid #eee;
                    padding-top: 20px;
                }
                .important-note {
                    background-color: #f8f9fa;
                    border-left: 4px solid #007bff;
                    padding: 15px;
                    margin: 20px 0;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="https://mckeesecurity.ca/wp-content/uploads/2021/03/NEW-LOGO-PNG.png" alt="McKee Security Logo" class="logo">
                <h2>Signature Request</h2>
            </div>
            
            <p>Hello,</p>
            
            <p>Your signature is requested for network data collected at <strong>${site_name}</strong> on <strong>${new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>.</p>
            
            <p>Please review the data and provide your digital signature by clicking the button below:</p>
            
            <div style="text-align: center;">
                <a href="${signatureUrl}" class="button">Review and Sign Data</a>
            </div>
            
            <div class="important-note">
                <p><strong>Important:</strong> You will need to enter the site password to access the page. If you don't have the password, please contact your administrator.</p>
            </div>
            
            <p>If you have any questions or concerns, please contact us at web@mckeesecurity.ca.</p>
            
            <div class="footer">
                <p>McKee Security & Audio Systems Inc.</p>
                <p>This email was sent automatically. Please do not reply directly to this message.</p>
            </div>
        </body>
        </html>
        `;

        // Set up email options
        const mailOptions = {
            from: '"McKee Security" <mckee.network.inquiry@gmail.com>',
            to: email,
            subject: `Signature Request: ${site_name} - ${new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
            html: htmlTemplate
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        
        console.log(`Email notification sent to ${email} for site ${site_name}, date ${date}`);
        console.log(`Message ID: ${info.messageId}`);

        // Store signature request info in date_data
        const today = new Date().toISOString().split('T')[0];
        await pool.query(
            `UPDATE date_data SET req_signature_date = ?, req_signature_email = ? WHERE site_name = ? AND date = ? AND site_domain = ?`,
            [today, email, site_name, date, site_domain]
        );

        res.status(200).json({
            message: 'Signature request email sent successfully',
            success: true,
            emailInfo: {
                messageId: info.messageId,
                recipient: email,
                site: site_name,
                date: date,
                site_domain: site_domain
            }
        });

    } catch (error) {
        console.error(`Error sending signature request email: ${error.message}`);
        res.status(500).json({ 
            message: 'Error sending signature request email', 
            error: error.message,
            success: false
        });
    }
};

// Update tech and admin signatures
export const updateSignatures = async (req, res) => {
    const { site_name, date, signature_tech, signature_admin, site_domain } = req.body;

    // Validate required fields
    if (!site_name || !date || !site_domain) {
        return res.status(400).json({
            message: 'Site name, date, and site domain are required',
            success: false
        });
    }

    // Check if at least one signature field is provided
    if (signature_tech === undefined && signature_admin === undefined) {
        return res.status(400).json({
            message: 'At least one signature (tech or admin) must be provided',
            success: false
        });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.query('START TRANSACTION');

        // Check if entry exists
        const [dateEntries] = await connection.query(
            'SELECT * FROM date_data WHERE site_name = ? AND date = ? AND site_domain = ?',
            [site_name, date, site_domain]
        );

        if (dateEntries.length === 0) {
            await connection.query('COMMIT');
            return res.status(404).json({
                message: 'No entry found for the specified site and date',
                success: false
            });
        }

        // Build update query dynamically based on which signatures are provided
        let updateQuery = 'UPDATE date_data SET ';
        const updateValues = [];
        const updateFields = [];

        // Handle signature_tech
        if (signature_tech === "REVOKE_SIGNATURE") {
            // Set to NULL to revoke the signature
            updateFields.push('signature_tech = NULL');
        } else if (signature_tech !== undefined) {
            // Normal signature update
            updateFields.push('signature_tech = ?');
            updateValues.push(signature_tech);
        }

        // Handle signature_admin
        if (signature_admin === "REVOKE_SIGNATURE") {
            // Set to NULL to revoke the signature
            updateFields.push('signature_admin = NULL');
        } else if (signature_admin !== undefined) {
            // Normal signature update
            updateFields.push('signature_admin = ?');
            updateValues.push(signature_admin);
        }

        updateQuery += updateFields.join(', ');
        updateQuery += ' WHERE site_name = ? AND date = ? AND site_domain = ?';
        updateValues.push(site_name, date, site_domain);

        // Execute update
        const [updateResult] = await connection.query(updateQuery, updateValues);

        // Get updated entry
        const [updatedEntries] = await connection.query(
            'SELECT * FROM date_data WHERE site_name = ? AND date = ? AND site_domain = ?',
            [site_name, date, site_domain]
        );

        // If both signatures are present, clear req_signature fields
        if (updatedEntries.length > 0 && updatedEntries[0].signature_tech && updatedEntries[0].signature_admin) {
            await connection.query(
                'UPDATE date_data SET req_signature_date = NULL, req_signature_email = NULL WHERE site_name = ? AND date = ? AND site_domain = ?',
                [site_name, date, site_domain]
            );
            updatedEntries[0].req_signature_date = null;
            updatedEntries[0].req_signature_email = null;
        }

        await connection.query('COMMIT');

        return res.status(200).json({
            message: 'Signatures updated successfully',
            success: true,
            updatedEntry: updatedEntries[0],
            fieldsUpdated: {
                signature_tech: signature_tech !== undefined,
                signature_admin: signature_admin !== undefined
            }
        });
    } catch (error) {
        if (connection) {
            await connection.query('ROLLBACK');
        }
        return res.status(500).json({
            message: 'Error updating signatures',
            error: error.message,
            success: false
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};