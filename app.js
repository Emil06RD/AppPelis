require('dotenv').config();
const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const methodOverride = require('method-override');
const session = require('express-session');
const { requireAuth, setLocals } = require('./src/middleware/auth');
const authRoutes = require('./src/routes/authRoutes');
const seriesRoutes = require('./src/routes/seriesRoutes');
const genreRoutes = require('./src/routes/genreRoutes');
const messageRoutes = require('./src/routes/messageRoutes');
const placeRoutes = require('./src/routes/placeRoutes');
const dateRoutes = require('./src/routes/dateRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(methodOverride('_method'));

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'love-view-super-secret-key-1234',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set true in production if HTTPS
}));

// Apply Global Auth Middleware
app.use(setLocals);

// Static folder
app.use(express.static(path.join(__dirname, 'public')));

// Handlebars
const hbs = engine({
    extname: '.hbs',
    defaultLayout: 'main',
    helpers: {
        eq: (a, b) => a === b
    }
});
app.engine('.hbs', hbs);
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'src/views'));

// Authentication Routes
app.use('/', authRoutes);

// Protected Routes
app.get('/', requireAuth, (req, res) => {
    res.render('hub', { 
        title: 'Central Hub',
        isHub: true 
    });
});

app.use('/love-view', requireAuth, seriesRoutes);
app.use('/love-view/genres', requireAuth, genreRoutes);
app.use('/messages', requireAuth, messageRoutes);
app.use('/places', requireAuth, placeRoutes);
app.use('/dates', requireAuth, dateRoutes);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Supabase Integration: ACTIVE');
});
