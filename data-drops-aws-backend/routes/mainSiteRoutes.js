import express from 'express';
import { 
    getAllSites, 
    getSiteById, 
    createSite, 
    updateSite, 
    deleteSite 
} from '../controllers/mainSiteController.js';

const router = express.Router();

// Get all sites
router.get('/sites', getAllSites);

// Get site by ID
router.get('/sites/:id', getSiteById);

// Create new site
router.post('/sites', createSite);

// Update site
router.put('/sites/:id', updateSite);

// Delete site
router.delete('/sites/:id', deleteSite);

export default router;