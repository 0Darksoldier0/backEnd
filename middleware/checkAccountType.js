
const checkAdminAccountType = (req, res, next) => {
    const {type} = req.user;
    // console.log(type);
    if (type == process.env.ADMIN_PRIVILEGE_ACCOUNT) {
        next();
    }
    else {
        return res.sendStatus(403);
    }
}

const checkAdminAndStaffAccountType = (req, res, next) => {
    const {type} = req.user;
    // console.log(type);
    if (type == process.env.ADMIN_PRIVILEGE_ACCOUNT || type == process.env.STAFF_PRIVILEGE_ACCOUNT) {
        next();
    }
    else {
        return res.sendStatus(403);
    }
}

export {checkAdminAccountType, checkAdminAndStaffAccountType};