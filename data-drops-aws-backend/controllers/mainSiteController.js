import { pool } from '../app.js';

/**
 * Get all sites from the database
 * @route GET /api/sites
 * @returns {Object[]} 200 - Array of site objects
 * @returns {Error} 500 - Server error
 */
export const getAllSites = async (req, res) => {
    try {
        const { site_domain } = req.body;

        let query = 'SELECT * FROM site_locations';
        const queryParams = [];

        if (site_domain) {
            query += ' WHERE site_domain = ?';
            queryParams.push(site_domain);
        }

        query += ' ORDER BY created_at DESC';
        
        const [sites] = await pool.query(query, queryParams);
        res.status(200).json(sites);
    } catch (error) {
        console.error('Error fetching sites:', error);
        res.status(500).json({ message: 'Error fetching sites', error: error.message });
    }
};

/**
 * Get a single site by ID
 * @route GET /api/sites/:id
 * @param {string} id.path.required - Site ID
 * @returns {Object} 200 - Site object
 * @returns {Error} 404 - Site not found
 * @returns {Error} 500 - Server error
 */
export const getSiteById = async (req, res) => {
    try {
        const { id } = req.params;
        const { site_domain } = req.body;

        if (!site_domain) {
            return res.status(400).json({
                message: 'Site domain is required',
                success: false
            });
        }

        // Get site by ID and site_domain
        const [sites] = await pool.query(
            'SELECT * FROM site_locations WHERE id = ? AND site_domain = ?',
            [id, site_domain]
        );
        
        if (sites.length === 0) {
            return res.status(404).json({ 
                message: 'Site not found',
                success: false
            });
        }

        res.status(200).json({
            message: 'Site retrieved successfully',
            success: true,
            site: sites[0]
        });
    } catch (error) {
        console.error('Error fetching site:', error);
        res.status(500).json({ 
            message: 'Error fetching site', 
            error: error.message,
            success: false
        });
    }
};

/**
 * Create a new site
 * @route POST /api/sites
 * @param {Object} request.body.required - Site information
 * @param {string} request.body.site_name.required - Site name
 * @param {string} request.body.site_code.required - Site code
 * @param {string} request.body.site_domain.required - Site domain
 * @returns {Object} 201 - Created site object
 * @returns {Error} 400 - Missing required fields
 * @returns {Error} 500 - Server error
 */
export const createSite = async (req, res) => {
    try {
        const { site_name, site_code, site_domain } = req.body;

        if (!site_name || !site_code || !site_domain) {
            return res.status(400).json({ message: 'Site name, code, and domain are required' });
        }

        // Check for existing site with same name or code in the same domain
        const [existing] = await pool.query(
            'SELECT * FROM site_locations WHERE (site_name = ? OR site_code = ?) AND site_domain = ?',
            [site_name, site_code, site_domain]
        );

        if (existing.length > 0) {
            const isDuplicateName = existing.some(site => site.site_name === site_name);
            const isDuplicateCode = existing.some(site => site.site_code === site_code);
            
            let message = '';
            if (isDuplicateName && isDuplicateCode) {
                message = 'Site name and code already exist in this domain';
            } else if (isDuplicateName) {
                message = 'Site name already exists in this domain';
            } else {
                message = 'Site code already exists in this domain';
            }
            
            return res.status(409).json({ message });
        }

        // Insert the new site and get the created_at timestamp
        const [result] = await pool.query(
            'INSERT INTO site_locations (site_name, site_code, site_domain, created_at) VALUES (?, ?, ?, NOW())',
            [site_name, site_code, site_domain]
        );

        // Fetch the newly created site to get the created_at timestamp
        const [newSite] = await pool.query(
            'SELECT * FROM site_locations WHERE id = ?',
            [result.insertId]
        );

        res.status(200).json([{
            id: newSite[0].id,
            site_name: newSite[0].site_name,
            site_code: newSite[0].site_code,
            site_domain: newSite[0].site_domain,
            created_at: newSite[0].created_at
        }]);
    } catch (error) {
        console.error('Error creating site:', error);
        res.status(500).json({ message: 'Error creating site', error: error.message });
    }
};

/**
 * Update an existing site
 * @route PUT /api/sites/:id
 * @param {string} id.path.required - Site ID
 * @param {Object} request.body.required - Updated site information
 * @param {string} request.body.site_name.required - Updated site name
 * @param {string} request.body.site_code.required - Updated site code
 * @param {string} request.body.site_domain.required - Site domain (can't be changed)
 * @returns {Object} 200 - Updated site object
 * @returns {Error} 404 - Site not found
 * @returns {Error} 500 - Server error
 */
export const updateSite = async (req, res) => {
    try {
        // Get the site ID from URL params (sent by frontend in URL: /api/sites/:id)
        // The frontend gets this ID from the initial site list fetch
        const { id } = req.params;
        
        // Get the new site data and old site name from request body
        // old_site_name is sent by frontend to ensure we're updating the correct site
        const { site_name, site_code, old_site_name, site_domain } = req.body;

        // Validate that old_site_name and site_domain were provided
        if (!old_site_name || !site_domain) {
            return res.status(400).json({
                message: 'Old site name and site domain are required for update',
                success: false
            });
        }

        // Begin transaction to ensure all updates happen atomically
        await pool.query('START TRANSACTION');

        // Verify the site exists and matches both the ID, old name, and site_domain
        // This verification prevents accidental updates to wrong sites
        const [currentSite] = await pool.query(
            'SELECT site_name FROM site_locations WHERE id = ? AND site_name = ? AND site_domain = ?',
            [id, old_site_name, site_domain]
        );

        if (currentSite.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ 
                message: 'Site not found or site name mismatch',
                success: false
            });
        }

        // Update the main site_locations table
        // Using both ID, old_site_name, and site_domain in WHERE clause for extra safety
        const [result] = await pool.query(
            `UPDATE site_locations 
             SET site_name = ?, site_code = ?
             WHERE id = ? AND site_name = ? AND site_domain = ?`,
            [site_name, site_code, id, old_site_name, site_domain]
        );

        if (result.affectedRows === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ 
                message: 'Site not found or site name mismatch',
                success: false
            });
        }

        // Update all matching site names in date_data table
        // Using old_site_name and site_domain to find all entries that need updating
        await pool.query(
            `UPDATE date_data 
             SET site_name = ?
             WHERE site_name = ? AND site_domain = ?`,
            [site_name, old_site_name, site_domain]
        );

        // Update all matching site names in drops_data table
        // Using old_site_name and site_domain to find all entries that need updating
        await pool.query(
            `UPDATE drops_data 
             SET site_name = ?
             WHERE site_name = ? AND site_domain = ?`,
            [site_name, old_site_name, site_domain]
        );

        // Commit the transaction if all updates succeeded
        await pool.query('COMMIT');

        res.status(200).json({
            message: 'Site updated successfully across all tables',
            success: true,
            site: { 
                id, 
                site_name, 
                site_code,
                site_domain
            }
        });

    } catch (error) {
        // Rollback the transaction if any error occurs
        await pool.query('ROLLBACK');
        console.error('Error updating site:', error);
        res.status(500).json({ 
            message: 'Error updating site', 
            error: error.message,
            success: false
        });
    }
};

/**
 * Delete a site
 * @route DELETE /api/sites/:id
 * @param {string} id.path.required - Site ID
 * @returns {Object} 200 - Success message
 * @returns {Error} 404 - Site not found
 * @returns {Error} 500 - Server error
 */
export const deleteSite = async (req, res) => {
    try {
        const { id } = req.params;
        const { admin_password, site_domain } = req.body;

        // Validate required fields
        if (!id || !admin_password || !site_domain) {
            return res.status(400).json({
                message: 'Site ID, admin_password, and site_domain are required',
                success: false
            });
        }

        // Validate administrative password
        if (admin_password !== process.env.ADMIN_DELETE_PASSWORD) {
            console.log(`Failed site deletion attempt for site ID: ${id}`);
            return res.status(401).json({
                message: 'Invalid administrative password',
                success: false
            });
        }

        // Begin transaction to ensure all deletions happen atomically
        await pool.query('START TRANSACTION');

        // First get the site name before deleting
        const [site] = await pool.query(
            'SELECT site_name FROM site_locations WHERE id = ? AND site_domain = ?',
            [id, site_domain]
        );

        if (site.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({
                message: 'Site not found',
                success: false
            });
        }

        const site_name = site[0].site_name;

        // Delete from site_locations table
        const [result] = await pool.query(
            'DELETE FROM site_locations WHERE id = ? AND site_domain = ?',
            [id, site_domain]
        );

        if (result.affectedRows === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ 
                message: 'Site not found',
                success: false
            });
        }

        // Delete all entries from date_data table for this site
        await pool.query(
            'DELETE FROM date_data WHERE site_name = ? AND site_domain = ?',
            [site_name, site_domain]
        );

        // Delete all entries from drops_data table for this site
        await pool.query(
            'DELETE FROM drops_data WHERE site_name = ? AND site_domain = ?',
            [site_name, site_domain]
        );

        // Commit the transaction if all deletions succeeded
        await pool.query('COMMIT');

        res.status(200).json({
            message: 'Site and all related data deleted successfully',
            success: true,
            deletedSite: {
                id,
                site_name,
                site_domain
            }
        });

    } catch (error) {
        // Rollback the transaction if any error occurs
        await pool.query('ROLLBACK');
        console.error('Error deleting site:', error);
        res.status(500).json({ 
            message: 'Error deleting site', 
            error: error.message,
            success: false
        });
    }
}; 