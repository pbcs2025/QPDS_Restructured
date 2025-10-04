// testFetchDepartments.js
const axios = require("axios");

const API_BASE = "http://localhost:5000"; // change to your backend URL

const fetchDepartments = async () => {
  try {
    const res = await axios.get(`${API_BASE}/departments`);
    console.log("Fetched departments:", res.data);
  } catch (err) {
    console.error("Error fetching departments:", err.message);
  }
};

// Run the function
fetchDepartments();
