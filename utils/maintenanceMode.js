let isMaintenanceModeActive = false;

const setMaintenanceMode = (status) => {
    isMaintenanceModeActive = status;
    console.log(`[Maintenance Mode] Set to: ${isMaintenanceModeActive ? 'ACTIVE' : 'INACTIVE'}`);
};

const getMaintenanceMode = () => {
    return isMaintenanceModeActive;
};

export {setMaintenanceMode, getMaintenanceMode}