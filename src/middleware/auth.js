const requireAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/login');
};

const requireEditor = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'editor') {
        return next();
    }
    // If they are logged in but not an editor, just redirect them back to safety
    res.redirect('/love-view');
};

const setLocals = (req, res, next) => {
    if (req.session && req.session.user) {
        res.locals.user = req.session.user;
        res.locals.canEdit = req.session.user.role === 'editor';
    } else {
        res.locals.user = null;
        res.locals.canEdit = false;
    }
    next();
};

module.exports = {
    requireAuth,
    requireEditor,
    setLocals
};
