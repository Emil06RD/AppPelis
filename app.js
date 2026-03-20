require('dotenv').config();
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

// Database Sync (Sequelize kept for legacy components if any)
sequelize.sync().then(() => {
    console.log('Local Database (SQLite) synced');
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log('Supabase Integration: ACTIVE');
    });
}).catch(err => {
    console.error('Unable to connect to the local database:', err);
});
