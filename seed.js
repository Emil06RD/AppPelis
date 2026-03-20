require('dotenv').config();
const Genre = require('./src/models/Genre');
const sequelize = require('./src/config/db');

async function seed() {
    await sequelize.sync();
    await Genre.findOrCreate({ where: { name: 'Acción' } });
    await Genre.findOrCreate({ where: { name: 'Comedia' } });
    await Genre.findOrCreate({ where: { name: 'Drama' } });
    await Genre.findOrCreate({ where: { name: 'Ciencia Ficción' } });
    console.log('Seeded genres');
    process.exit(0);
}

seed();
