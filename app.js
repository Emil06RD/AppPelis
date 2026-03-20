const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const methodOverride = require('method-override');
const sequelize = require('./src/config/db');
const seriesRoutes = require('./src/routes/seriesRoutes');
const genreRoutes = require('./src/routes/genreRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(methodOverride('_method'));

// Static folder
app.use(express.static(path.join(__dirname, 'public')));

// Handlebars
app.engine('.hbs', engine({
    extname: '.hbs',
    defaultLayout: 'main',
    helpers: {
        eq: (a, b) => a === b
    }
}));
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'src/views'));

// Routes
app.use('/', seriesRoutes);
app.use('/genres', genreRoutes);

// Database Sync
sequelize.sync({ alter: true }).then(() => {
    console.log('Database synced');
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Unable to connect to the database:', err);
});
