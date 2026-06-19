import express from 'express';
import * as networkDataController from '../controllers/networkDataController.js';

const router = express.Router();

// Initialize new site
router.post('/network-data/site/initialize', networkDataController.initializeNewSite);

// Add drops data
router.post('/network-data/drops', networkDataController.addDropsData);

// Get drops data by site (now using POST to accept request body)
router.post('/network-data/drops/:site_name', networkDataController.getDropsDataBySite);

// Get date data by site (now using POST to accept request body)
router.post('/network-data/date/:site_name', networkDataController.getDateDataBySite);

// Get drops data by site and date
router.post('/network-data/drops-by-date', networkDataController.getDropsDataBySiteAndDate);

// Delete specific drop
router.delete('/network-data/drops', networkDataController.deleteDropData);

// Delete all site data for a specific date
router.delete('/network-data/site-data-by-date', networkDataController.deleteSiteDataByDate);

// Update site date
router.put('/network-data/update-date', networkDataController.updateSiteDate);

// Update specific drop
router.put('/network-data/drops', networkDataController.updateDropData);

// Send email notification to signer
router.post('/notify-signer', networkDataController.notifySigner);

// Update signatures
router.put('/network-data/signatures', networkDataController.updateSignatures);

export default router;