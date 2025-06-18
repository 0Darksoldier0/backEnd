import { getMaintenanceMode } from '../utils/maintenanceMode.js'; // Import the check function

const checkMaintenanceMode  = (req, res, next) => {
    if (getMaintenanceMode()) {
        console.log("Update attempt is canceled");

        return res.status(503).json({
            message: "Maintenance mode is active. Please try again after 00:05."
        });
    }
    next(); 
}

export { checkMaintenanceMode };