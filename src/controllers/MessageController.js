const supabase = require('../config/supabase');

const MessageController = {
    getIndex: async (req, res) => {
        try {
            // Fetch messages for EMI
            const { data: messagesEmi, error: emiError } = await supabase
                .from('MessagesEmi')
                .select('*')
                .order('created_at', { ascending: false });

            if (emiError) throw emiError;

            // Fetch messages for DELI
            const { data: messagesDeli, error: deliError } = await supabase
                .from('MessagesDeli')
                .select('*')
                .order('created_at', { ascending: false });

            if (deliError) throw deliError;

            // Simple date formatter
            const formatDates = (msgs) => msgs.map(m => ({
                ...m,
                formattedDate: new Date(m.created_at).toLocaleString('es-ES', { 
                    day: '2-digit', month: 'short', year: 'numeric', 
                    hour: '2-digit', minute: '2-digit'
                })
            }));

            res.render('messages', {
                title: 'Messages',
                messagesEmi: formatDates(messagesEmi || []),
                messagesDeli: formatDates(messagesDeli || [])
            });
        } catch (error) {
            console.error('Error fetching messages:', error);
            res.status(500).send('Error fetching messages');
        }
    },

    postCreate: async (req, res) => {
        try {
            const target = req.params.target; // 'emi' or 'deli'
            const content = req.body.content;

            if (!content || !content.trim()) {
                return res.redirect('/messages');
            }

            const tableName = target === 'emi' ? 'MessagesEmi' : 'MessagesDeli';

            const { error } = await supabase
                .from(tableName)
                .insert([{ content: content.trim() }]);

            if (error) throw error;
            res.redirect('/messages');
        } catch (error) {
            console.error('Error posting message:', error);
            res.status(500).send('Error posting message');
        }
    },

    getDelete: async (req, res) => {
        try {
            const target = req.params.target;
            const id = req.params.id;
            const tableName = target === 'emi' ? 'MessagesEmi' : 'MessagesDeli';

            const { error } = await supabase
                .from(tableName)
                .delete()
                .eq('id', id);

            if (error) throw error;
            res.redirect('/messages');
        } catch (error) {
            console.error('Error deleting message:', error);
            res.status(500).send('Error deleting message');
        }
    },

    getMyMessages: async (req, res) => {
        try {
            if (!req.session || !req.session.user) {
                return res.json([]);
            }
            const username = req.session.user.username;
            if (username !== 'emi' && username !== 'deli') {
                return res.json([]);
            }
            
            const tableName = username === 'emi' ? 'MessagesEmi' : 'MessagesDeli';
            
            const { data, error } = await supabase
                .from(tableName)
                .select('content')
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            res.json(data || []);
        } catch (error) {
            console.error('Error fetching API messages:', error);
            res.status(500).json({ error: 'Failed to fetch messages' });
        }
    }
};

module.exports = MessageController;
