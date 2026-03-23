const users = {
    emi: { role: 'editor', password: 'rinoceronte', name: 'Emi' },
    deli: { role: 'editor', password: 'transistores', name: 'Deli' },
    invitado: { role: 'guest', password: '', name: 'Invitado' }
};

const AuthController = {
    getLogin: (req, res) => {
        // If already logged in, go straight to hub
        if (req.session && req.session.user) {
            return res.redirect('/');
        }
        // Use a special layout or empty layout if desired, but we can just use main with isHub logic
        res.render('login', { 
            title: 'Login',
            layout: 'main', 
            isLogin: true // flag to hide nav bars completely on login
        });
    },

    postLogin: (req, res) => {
        const { username, password } = req.body;
        const guestLogin = req.body.guestLogin === 'true';

        if (guestLogin) {
            req.session.user = { 
                username: 'invitado', 
                name: 'Invitado', 
                role: 'guest' 
            };
            return res.redirect('/');
        }

        if (!username || !password) {
            return res.render('login', { title: 'Login', error: 'Please enter both username and password', isLogin: true });
        }

        const user = users[username.toLowerCase()];

        if (user && user.password === password && user.role === 'editor') {
            req.session.user = { 
                username: username.toLowerCase(), 
                name: user.name, 
                role: user.role 
            };
            return res.redirect('/');
        }

        return res.render('login', { title: 'Login', error: 'Invalid credentials', isLogin: true });
    },

    getLogout: (req, res) => {
        req.session.destroy();
        res.redirect('/login');
    }
};

module.exports = AuthController;
