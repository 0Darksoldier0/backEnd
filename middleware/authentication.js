import jwt from 'jsonwebtoken'

const authenticateToken = (req, res, next) => {
    const {token} = req.headers;

    if (token == null) {
        console.log("No token provided, sending 401");
        return res.status(401).json({message: "Not Signed In"});
    }

    try {
        const response = jwt.verify(token, process.env.ACCESS_TOKEN);
        
        req.user = { 
            username: response.username,
            type: response.type
        };
        // console.log("Token successfully verified. User:", req.user.username, "Type:", req.user.type);
        next();
    }
    catch (error) {
        console.error("JWT verification failed:", error.message);
        return res.sendStatus(403);
    }
}

export {authenticateToken};

