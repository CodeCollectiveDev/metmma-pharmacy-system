const express = require('express');
const bodyParser = require('body-parser');

const employeesRoutes = require('./api/routes/employeesRoutes');
const reportsRoutes = require('./api/routes/reportsRoutes');
const attendanceRoutes = require('./api/routes/attendanceRoutes');

const app = express();
app.use(bodyParser.json());

//register routes
app.use('/api/employees', employeesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/attendance', attendanceRoutes);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Pharmacy HR & Reports API running on port ${PORT}`);
});