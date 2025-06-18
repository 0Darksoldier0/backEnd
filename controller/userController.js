import database from '../config/database.js';
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import validator from 'validator'

const createToken = (username, type) => {
    return jwt.sign({ username, type }, process.env.ACCESS_TOKEN);
}

const adminSignIn = async (req, res) => {
    const { username, password } = req.body;
    const select_query = "SELECT * FROM users WHERE (username = ? AND type = 0) OR (username = ? and type = 1)";
    try {
        const [results] = await database.promise().query(select_query, [username, username]);
        if (results.length <= 0) {
            console.log("(AdminSignIn) Invalid username");
            return res.status(401).json({ message: "Invalid Username or Password" })
        }
        // if (results[0].type !== 0 || results[0].type !== 1) {
        //     console.log("(AdminSignIn) Not employee account");
        //     return res.status(403).json({ message: "Invalid Username or Password" })
        // }
        const isPasswordMatch = await bcrypt.compare(password, results[0].password);
        if (!isPasswordMatch) {
            console.log("(AdminSignIn) Invalid password");
            return res.status(401).json({ message: "Invalid Username or Password" });
        }

        const token = createToken(results[0].username, results[0].type);
        return res.status(200).json({ token });
    }
    catch (error) {
        console.error("(AdminSignIn) Error signing in user: ", error);
        return res.status(500).json({ message: "Error logging in user" });
    }
}

// user sign in
const userSignIn = async (req, res) => {
    const { username, password } = req.body;
    const select_query = "SELECT * FROM users WHERE username = ? AND type = 2";
    try {
        const [results] = await database.promise().query(select_query, [username]);
        if (results.length <= 0) {
            console.log("(UserSignIn) Invalid username");
            return res.status(401).json({ message: "Invalid Username or Password" })
        }

        const isPasswordMatch = await bcrypt.compare(password, results[0].password);
        if (!isPasswordMatch) {
            console.log("(UserSignIn) Invalid password");
            return res.status(401).json({ message: "Invalid Username or Password" });
        }

        const token = createToken(results[0].username, results[0].type);
        return res.status(200).json({ token });
    }
    catch (error) {
        console.error("(UserSignIn) Error signing in user: ", error);
        return res.status(500).json({ message: "Error logging in user" });
    }
}

// user sign up
const userSignUp = async (req, res) => {
    const { username, first_name, last_name, phone_number, password, retype_password } = req.body;
    const select_query = "SELECT * FROM users where username = ?";
    const insert_query = "INSERT INTO users(username, first_name, last_name, phone_number, password, type) VALUES(?, ?, ?, ?, ?, ?)";
    try {

        const [results] = await database.promise().query(select_query, [username])

        if (results.length > 0) {
            console.log("(UserSignUp) Username has already existed");
            return res.status(409).json({ message: "Username has already existed" })
        }

        if (phone_number != "") {
            if (!validator.isMobilePhone(phone_number, 'vi-VN')) {
                return res.status(406).json({ message: "Invalid phone number" });
            }
        }

        if (password !== retype_password) {
            console.log("(UserSignUp) Password does not match");
            return res.status(406).json({ message: "Pasword does not match" });
        }

        if (password.length < 8) {
            console.log("(UserSignUp) Password is too short");
            return res.status(406).json({ message: "Password is too short" });
        }


        // hashing user password
        const salt = await bcrypt.genSalt(10);
        const encryptedPassword = await bcrypt.hash(password, salt);

        await database.promise().query(insert_query, [username, first_name, last_name, phone_number, encryptedPassword, process.env.USER_PRIVILEGE_ACCOUNT]);
        return res.status(200).json({ message: "User added" });
    }
    catch (error) {
        console.error("(UserSignUp) Error signing up user: ", error);
        res.status(500).json({ message: "Error signing up user" });
    }
}

const staffSignUp = async (req, res) => {
    const { username, first_name, last_name, phone_number, password, retype_password } = req.body;
    const select_query = "SELECT * FROM users where username = ?";
    const insert_query = "INSERT INTO users(username, first_name, last_name, phone_number, password, type) VALUES(?, ?, ?, ?, ?, ?)";
    try {

        const [results] = await database.promise().query(select_query, [username])

        if (results.length > 0) {
            console.log("(UserSignUp) Username has already existed");
            return res.status(409).json({ message: "Username has already existed" })
        }

        if (phone_number != "") {
            if (!validator.isMobilePhone(phone_number, 'vi-VN')) {
                return res.status(406).json({ message: "Invalid phone number" });
            }
        }

        if (password !== retype_password) {
            console.log("(UserSignUp) Password does not match");
            return res.status(406).json({ message: "Pasword does not match" });
        }

        if (password.length < 8) {
            console.log("(UserSignUp) Password is too short");
            return res.status(406).json({ message: "Password is too short" });
        }


        // hashing user password
        const salt = await bcrypt.genSalt(10);
        const encryptedPassword = await bcrypt.hash(password, salt);

        await database.promise().query(insert_query, [username, first_name, last_name, phone_number, encryptedPassword, process.env.STAFF_PRIVILEGE_ACCOUNT]);
        return res.status(200).json({ message: "User added" });
    }
    catch (error) {
        console.error("(UserSignUp) Error signing up user: ", error);
        res.status(500).json({ message: "Error signing up user" });
    }
}

const getUserData = async (req, res) => {
    const { username } = req.user;
    const select_query = "SELECT username, first_name, last_name FROM users WHERE username = ?";

    try {
        const [results] = await database.promise().query(select_query, [username]);
        return res.status(200).json({ userData: results[0] })
    }
    catch (error) {
        console.error("(GetUserData) Error fetching user data: ", error);
        return res.status(500).json({ message: "Error fetching user data" });
    }
}

const getUsers = async (req, res) => {
    const { username } = req.user;
    const select_query = "SELECT * FROM users WHERE type = 1";

    try {
        const [results] = await database.promise().query(select_query, [username]);
        return res.status(200).json({ users: results, message: "Users fetched" });
    }
    catch (error) {
        console.log("(GetUsers) Error fetching users: ", error);
        return res.status(500).json({ message: "Error fetching users" });
    }
}

const removeUser = async (req, res) => {
    const { username } = req.user;
    const delele_query = 'DELETE FROM users WHERE username = ?';

    try {
        await database.promise().query(delele_query, [username]);
        return res.status(200).json({ message: "User deleted" })
    }
    catch (error) {
        console.log("(RemoveUsers) Error removing users: ", error);
        return res.status(500).json({ message: "Error removing users" });
    }
}

const updateUserFirstName = async (req, res) => {
    const { username } = req.user;
    const { first_name } = req.body;
    const update_query = "UPDATE users SET first_name = ? WHERE username = ?";

    try {
        await database.promise().query(update_query, [first_name, username]);
        return res.status(200).json({ message: "First name updated" });
    }
    catch (error) {
        console.error("(UpdateUserFirstname) Error updating user first name: ", error);
        return res.status(500).json({ message: "Error updating user first name" });
    }
}

const updateUserLastName = async (req, res) => {
    const { username } = req.user;
    const { last_name } = req.body;
    const update_query = "UPDATE users SET last_name = ? WHERE username = ?";

    try {
        await database.promise().query(update_query, [last_name, username]);
        return res.status(200).json({ message: "Last name updated" });
    }
    catch (error) {
        console.error("(UpdateUserLastname) Error updating user last name: ", error);
        return res.status(500).json({ message: "Error updating user last name" });
    }
}

const updateUserPassword = async (req, res) => {
    const { username } = req.user;
    const { old_password, new_password, retype_new_password } = req.body;
    const select_query = "SELECT * FROM users WHERE username = ?";
    const update_query = "UPDATE users SET password = ? WHERE username = ?";

    try {
        const [results] = await database.promise().query(select_query, [username]);

        const isPasswordMatch = await bcrypt.compare(old_password, results[0].password);

        if (!isPasswordMatch) {
            console.log("(UpdateUserPassword) Invalid password");
            return res.status(401).json({ message: "Invalid password" });
        }

        if (new_password !== retype_new_password) {
            console.log("(UpdateUserPassword) New password does not match");
            return res.status(406).json({ message: "New password does not match" })
        }

        if (new_password.length < 8) {
            console.log("(UpdateUserPassword) New password is too short");
            return res.status(406).json({ message: "New password is too short" });
        }

        const salt = await bcrypt.genSalt(10);
        const encryptedPassword = await bcrypt.hash(new_password, salt);

        await database.promise().query(update_query, [encryptedPassword, username]);
        return res.status(200).json({ message: "Password updated" });
    }
    catch (error) {
        console.error("(UpdateUserPassword) Error updating user password: ", error);
        return res.status(500).json({ message: "Error updating user password" });
    }

}

const updateStaffData = async (req, res) => {
    const { username, first_name, last_name, phone_number } = req.body

    const update_query = 'UPDATE users SET first_name = ?, last_name = ?, phone_number = ? WHERE username = ?';

    try {
        
        if (!validator.isMobilePhone(phone_number, 'vi-VN')) {
            return res.status(406).json({message: "Invalid phone number"});
        }

        await database.promise().query(update_query, [first_name, last_name, phone_number, username]);
        return res.status(200).json({message: "User data updated"});
    }
    catch (error) {
        console.error("(UpdateStaffData) Error updating staff data: ", error);
        return res.status(500).json({message: "Error updating staff data"})
    }
}

const updateStaffPassword = async (req, res) => {
    const { username, old_password, new_password, retype_new_password } = req.body;
    const select_query = "SELECT * FROM users WHERE username = ?";
    const update_query = "UPDATE users SET password = ? WHERE username = ?";

    try {
        const [results] = await database.promise().query(select_query, [username]);

        const isPasswordMatch = await bcrypt.compare(old_password, results[0].password);

        if (!isPasswordMatch) {
            console.log("(UpdateUserPassword) Invalid password");
            return res.status(401).json({ message: "Invalid password" });
        }

        if (new_password !== retype_new_password) {
            console.log("(UpdateUserPassword) New password does not match");
            return res.status(406).json({ message: "New password does not match" })
        }

        if (new_password.length < 8) {
            console.log("(UpdateUserPassword) New password is too short");
            return res.status(406).json({ message: "New password is too short" });
        }

        const salt = await bcrypt.genSalt(10);
        const encryptedPassword = await bcrypt.hash(new_password, salt);

        await database.promise().query(update_query, [encryptedPassword, username]);
        return res.status(200).json({ message: "Password updated" });
    }
    catch (error) {
        console.error("(UpdateStaffPassword) Error updating staff password: ", error);
        return res.status(500).json({ message: "Error updating staff password" });
    }
}

export { adminSignIn, userSignIn, staffSignUp, userSignUp, getUserData, getUsers, updateUserFirstName, updateUserLastName, updateUserPassword, removeUser, updateStaffData, updateStaffPassword }